/**
 * Workflow Executor - Runs Bilko workflows
 */

import type {
  Workflow,
  WorkflowContext,
  AnyNode,
  NodeResult,
  DisplayNode,
  WaitNode,
  AgentNode,
  DecisionNode,
  ActionNode,
} from "./types";

export type NodeHandler = (
  node: AnyNode,
  context: WorkflowContext,
  input?: unknown
) => Promise<NodeResult>;

// Default handlers for each node type
const defaultHandlers: Record<string, NodeHandler> = {
  start: async (node, context) => {
    const startNode = node as AnyNode & { initialContext?: Record<string, unknown>; next: string };
    return {
      success: true,
      nextNodeId: startNode.next,
      updates: startNode.initialContext,
    };
  },

  end: async () => {
    return { success: true };
  },

  display: async (node) => {
    const displayNode = node as DisplayNode;
    return {
      success: true,
      nextNodeId: displayNode.next,
      output: displayNode.content,
    };
  },

  wait: async (node, _context, input) => {
    const waitNode = node as WaitNode;
    if (input === undefined) {
      // Still waiting for input
      return { success: true };
    }
    return {
      success: true,
      nextNodeId: waitNode.next,
      updates: { [waitNode.storeAs]: input },
    };
  },

  decision: async (node, context, input) => {
    const decisionNode = node as DecisionNode;

    // If input provided, use it as the branch key
    if (input !== undefined) {
      const branchKey = String(input);
      const nextNode = decisionNode.branches[branchKey] || decisionNode.defaultBranch;
      if (nextNode) {
        return { success: true, nextNodeId: nextNode };
      }
    }

    // Otherwise, evaluate condition if specified
    if (decisionNode.condition && context.variables[decisionNode.condition]) {
      const conditionValue = String(context.variables[decisionNode.condition]);
      const nextNode = decisionNode.branches[conditionValue] || decisionNode.defaultBranch;
      if (nextNode) {
        return { success: true, nextNodeId: nextNode };
      }
    }

    // Default branch
    if (decisionNode.defaultBranch) {
      return { success: true, nextNodeId: decisionNode.defaultBranch };
    }

    return { success: false, error: "No matching branch found" };
  },

  action: async (node) => {
    const actionNode = node as ActionNode;
    // Actions are handled by custom handlers
    return {
      success: true,
      nextNodeId: actionNode.next,
    };
  },

  agent: async (node) => {
    const agentNode = node as AgentNode;
    // Agent nodes require custom implementation with LLM
    // For now, return default next
    const nextNodeId = typeof agentNode.next === "string"
      ? agentNode.next
      : Object.values(agentNode.next)[0];
    return {
      success: true,
      nextNodeId,
    };
  },
};

export class WorkflowExecutor {
  private workflow: Workflow;
  private context: WorkflowContext;
  private customHandlers: Record<string, NodeHandler>;
  private onNodeEnter?: (node: AnyNode, context: WorkflowContext) => void;
  private onNodeExit?: (node: AnyNode, result: NodeResult) => void;

  constructor(
    workflow: Workflow,
    options?: {
      customHandlers?: Record<string, NodeHandler>;
      initialContext?: Record<string, unknown>;
      onNodeEnter?: (node: AnyNode, context: WorkflowContext) => void;
      onNodeExit?: (node: AnyNode, result: NodeResult) => void;
    }
  ) {
    this.workflow = workflow;
    this.customHandlers = options?.customHandlers || {};
    this.onNodeEnter = options?.onNodeEnter;
    this.onNodeExit = options?.onNodeExit;

    this.context = {
      workflowId: workflow.id,
      currentNodeId: workflow.startNodeId,
      variables: options?.initialContext || {},
      history: [],
      startedAt: new Date(),
    };
  }

  getCurrentNode(): AnyNode | undefined {
    return this.workflow.nodes[this.context.currentNodeId];
  }

  getContext(): WorkflowContext {
    return { ...this.context };
  }

  async executeNode(input?: unknown): Promise<NodeResult> {
    const node = this.getCurrentNode();
    if (!node) {
      return { success: false, error: `Node not found: ${this.context.currentNodeId}` };
    }

    // Notify node entry
    this.onNodeEnter?.(node, this.context);

    // Get handler (custom or default)
    const handler = this.customHandlers[node.id]
      || this.customHandlers[node.type]
      || defaultHandlers[node.type];

    if (!handler) {
      return { success: false, error: `No handler for node type: ${node.type}` };
    }

    // Execute node
    const result = await handler(node, this.context, input);

    // Update context
    if (result.updates) {
      this.context.variables = { ...this.context.variables, ...result.updates };
    }

    // Record in history
    this.context.history.push(this.context.currentNodeId);

    // Move to next node if specified
    if (result.nextNodeId) {
      this.context.currentNodeId = result.nextNodeId;
    }

    // Notify node exit
    this.onNodeExit?.(node, result);

    return result;
  }

  async run(onWait?: (node: WaitNode | DecisionNode) => Promise<unknown>): Promise<WorkflowContext> {
    let maxIterations = 100; // Safety limit

    while (maxIterations-- > 0) {
      const node = this.getCurrentNode();
      if (!node) break;

      if (node.type === "end") {
        await this.executeNode();
        break;
      }

      if (node.type === "wait" || (node.type === "decision" && !this.context.variables[(node as DecisionNode).condition || ""])) {
        // Need user input
        if (onWait) {
          const input = await onWait(node as WaitNode | DecisionNode);
          await this.executeNode(input);
        } else {
          // Pause execution, waiting for external input
          break;
        }
      } else {
        const result = await this.executeNode();
        if (!result.success) {
          console.error("Workflow error:", result.error);
          break;
        }
      }
    }

    return this.context;
  }

  // Provide input to current wait node
  async provideInput(input: unknown): Promise<NodeResult> {
    return this.executeNode(input);
  }

  // Reset workflow to start
  reset(): void {
    this.context = {
      workflowId: this.workflow.id,
      currentNodeId: this.workflow.startNodeId,
      variables: {},
      history: [],
      startedAt: new Date(),
    };
  }
}

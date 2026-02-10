/**
 * Bilko Workflow Framework - Types
 *
 * A simplified flow system for building dynamic, agentic experiences.
 * Inspired by n8n but focused on user-facing conversational flows.
 */

// Node types that can exist in a workflow
export type NodeType =
  | "start"      // Entry point - initializes flow context
  | "decision"   // Branch based on condition or user choice
  | "action"     // Execute deterministic action
  | "agent"      // AI-driven node (generates content, makes decisions)
  | "wait"       // Wait for user input (voice, click, text)
  | "display"    // Show content to user (visual, audio, both)
  | "end";       // Terminal node

// Input types the system can wait for
export type InputType = "voice" | "click" | "text" | "any";

// Display modes for content
export type DisplayMode = "visual" | "audio" | "both";

// Base node interface
export interface WorkflowNode {
  id: string;
  type: NodeType;
  name: string;
  description?: string;
  next?: string | string[] | Record<string, string>; // Next node(s) - can be conditional
}

// Start node - entry point
export interface StartNode extends WorkflowNode {
  type: "start";
  initialContext?: Record<string, unknown>;
  next: string;
}

// Decision node - branches based on condition or user choice
export interface DecisionNode extends WorkflowNode {
  type: "decision";
  // Map of option key -> next node ID
  branches: Record<string, string>;
  // Optional: condition function name to evaluate
  condition?: string;
  // Default branch if no match
  defaultBranch?: string;
}

// Action node - executes deterministic action
export interface ActionNode extends WorkflowNode {
  type: "action";
  action: string; // Action identifier
  params?: Record<string, unknown>;
  next: string;
}

// Agent node - AI-driven decision/generation
export interface AgentNode extends WorkflowNode {
  type: "agent";
  // What the agent should do
  task: "generate" | "decide" | "converse" | "analyze";
  // Prompt template or instruction
  prompt: string;
  // Model to use (optional, defaults to gemini-2.5-flash)
  model?: string;
  // For 'decide' tasks - possible outcomes
  outcomes?: string[];
  next: string | Record<string, string>; // Can branch based on agent decision
}

// Wait node - waits for user input
export interface WaitNode extends WorkflowNode {
  type: "wait";
  inputType: InputType;
  // Options to present to user (for choice-based waits)
  options?: WaitOption[];
  // Timeout in ms (optional)
  timeout?: number;
  // Variable to store input in
  storeAs: string;
  next: string;
}

export interface WaitOption {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  voiceTriggers?: string[]; // Words that trigger this option via voice
}

// Display node - shows content to user
export interface DisplayNode extends WorkflowNode {
  type: "display";
  mode: DisplayMode;
  // Content can be static or reference context variables
  content: {
    text?: string;
    speech?: string; // Text-to-speech content
    component?: string; // React component to render
    data?: Record<string, unknown>;
  };
  // Auto-advance after duration (ms)
  duration?: number;
  next: string;
}

// End node - terminal
export interface EndNode extends WorkflowNode {
  type: "end";
  // Final action to take
  finalAction?: "redirect" | "reset" | "login" | "none";
  redirectTo?: string;
}

// Union type for all nodes
export type AnyNode =
  | StartNode
  | DecisionNode
  | ActionNode
  | AgentNode
  | WaitNode
  | DisplayNode
  | EndNode;

// Workflow definition
export interface Workflow {
  id: string;
  name: string;
  description: string;
  version: string;
  nodes: Record<string, AnyNode>;
  startNodeId: string;
}

// Runtime context during workflow execution
export interface WorkflowContext {
  workflowId: string;
  currentNodeId: string;
  variables: Record<string, unknown>;
  history: string[]; // Node IDs visited
  startedAt: Date;
  user?: {
    id: string;
    name: string;
    isAuthenticated: boolean;
  };
}

// Execution result from a node
export interface NodeResult {
  success: boolean;
  nextNodeId?: string;
  updates?: Record<string, unknown>; // Updates to context variables
  output?: unknown; // Node output (for display, etc.)
  error?: string;
}

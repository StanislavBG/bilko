/**
 * CanvasBuilder — Voice-first flow building panel.
 *
 * The user selects nodes on the canvas and speaks to Bilko.
 * Bilko interprets the intent, proposes a mutation, and the
 * user confirms by voice or click. No traditional builder UI.
 *
 * Interaction flow:
 * 1. User selects node(s) on canvas (click / shift+click)
 * 2. User speaks or types what they want ("make this an LLM step")
 * 3. Bilko calls chatJSON to interpret intent → FlowMutation
 * 4. Panel shows the proposed change + validation status
 * 5. User confirms ("yes", "do it") or refines ("actually, name it X")
 * 6. Mutation applied, canvas re-renders
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mic,
  MicOff,
  Send,
  Check,
  X,
  AlertTriangle,
  Loader2,
  Sparkles,
  Undo2,
} from "lucide-react";
import { useVoice } from "@/contexts/voice-context";
import { chatJSON, jsonPrompt } from "@/lib/flow-engine";
import {
  applyMutation,
  createBlankStep,
  type FlowMutation,
  type MutationResult,
} from "@/lib/flow-engine/flow-mutations";
import type { FlowDefinition, FlowStep, StepType } from "@/lib/flow-inspector/types";

// ── Types ────────────────────────────────────────────────

interface BuilderMessage {
  role: "bilko" | "user";
  text: string;
}

interface CanvasBuilderProps {
  flow: FlowDefinition;
  selectedStepIds: Set<string>;
  onApplyMutation: (result: MutationResult) => void;
  onClose: () => void;
}

// ── LLM intent parsing ──────────────────────────────────

interface ParsedIntent {
  action: "add" | "remove" | "update" | "connect" | "disconnect" | "change-type" | "unknown";
  stepType?: StepType;
  stepName?: string;
  targetStepIds: string[];
  changes?: Record<string, string>;
  description: string;
}

const INTENT_SYSTEM_PROMPT = `You are Bilko's flow builder assistant. The user is looking at a DAG flow and has selected some nodes.
They will tell you what change they want. Parse their intent into a structured action.

Available step types: llm, user-input, transform, validate, display

Return ONLY valid JSON. Example:
{"action":"add","stepType":"llm","stepName":"Generate Summary","targetStepIds":["research-topics"],"changes":{},"description":"Add an LLM step called Generate Summary after research-topics"}

Rules:
- action must be one of: add, remove, update, connect, disconnect, change-type, unknown
- targetStepIds are the step IDs the user is referring to (from the selected nodes or their speech)
- For "add": include stepType and stepName
- For "change-type": include stepType (the new type)
- For "update": include changes object with field names and new values
- For "connect" or "disconnect": targetStepIds should have exactly 2 IDs [from, to]
- description is a human-readable summary of what will happen
- If you can't understand the request, use action: "unknown"
- No markdown, ONLY the JSON object`;

function buildIntentUserMessage(
  userText: string,
  selectedIds: string[],
  steps: FlowStep[],
): string {
  const selectedSteps = steps
    .filter((s) => selectedIds.includes(s.id))
    .map((s) => `- ${s.id}: "${s.name}" (${s.type}, depends on: [${s.dependsOn.join(", ")}])`)
    .join("\n");

  const allStepIds = steps.map((s) => s.id).join(", ");

  return `Selected nodes:\n${selectedSteps || "(none selected)"}\n\nAll step IDs in the flow: ${allStepIds}\n\nUser says: "${userText}"`;
}

// ── Component ────────────────────────────────────────────

export function CanvasBuilder({
  flow,
  selectedStepIds,
  onApplyMutation,
  onClose,
}: CanvasBuilderProps) {
  const [messages, setMessages] = useState<BuilderMessage[]>([
    { role: "bilko", text: getGreeting(selectedStepIds.size) },
  ]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingResult, setPendingResult] = useState<MutationResult | null>(null);
  const [pendingMutation, setPendingMutation] = useState<FlowMutation | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isListening, toggleListening, transcript, isSupported: voiceSupported } = useVoice();

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // When voice transcript updates, fill the input
  useEffect(() => {
    if (transcript && isListening) {
      setInput(transcript);
    }
  }, [transcript, isListening]);

  // Update greeting when selection changes
  useEffect(() => {
    if (messages.length === 1 && messages[0].role === "bilko") {
      setMessages([{ role: "bilko", text: getGreeting(selectedStepIds.size) }]);
    }
  }, [selectedStepIds.size]); // eslint-disable-line react-hooks/exhaustive-deps

  const addMessage = useCallback((msg: BuilderMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  // ── Process user input ─────────────────────────────────

  const handleSubmit = useCallback(async () => {
    const text = input.trim();
    if (!text || isProcessing) return;

    setInput("");
    addMessage({ role: "user", text });
    setIsProcessing(true);

    try {
      // Check for confirmation of pending mutation
      if (pendingResult && isConfirmation(text)) {
        onApplyMutation(pendingResult);
        addMessage({ role: "bilko", text: `Done. ${pendingResult.description}` });
        setPendingResult(null);
        setPendingMutation(null);
        setIsProcessing(false);
        return;
      }

      // Check for rejection of pending mutation
      if (pendingResult && isRejection(text)) {
        addMessage({ role: "bilko", text: "No problem. What would you like instead?" });
        setPendingResult(null);
        setPendingMutation(null);
        setIsProcessing(false);
        return;
      }

      // Parse the intent via LLM
      const selectedIds = Array.from(selectedStepIds);
      const userMessage = buildIntentUserMessage(text, selectedIds, flow.steps);
      const llmResult = await chatJSON<ParsedIntent>(
        jsonPrompt(INTENT_SYSTEM_PROMPT, userMessage),
      );
      const intent = llmResult.data;

      if (intent.action === "unknown") {
        addMessage({ role: "bilko", text: "I'm not sure what you mean. Try something like 'add an LLM step after this' or 'remove this step'." });
        setIsProcessing(false);
        return;
      }

      // Build the mutation
      const mutation = intentToMutation(intent, flow, selectedIds);
      if (!mutation) {
        addMessage({ role: "bilko", text: "I understand what you want but I can't build that mutation. Can you be more specific?" });
        setIsProcessing(false);
        return;
      }

      // Apply (dry run) and validate
      const result = applyMutation(flow, mutation);
      setPendingMutation(mutation);
      setPendingResult(result);

      if (result.valid) {
        addMessage({
          role: "bilko",
          text: `${result.description}. The flow is still valid. Say "yes" to apply or tell me what to change.`,
        });
      } else {
        const errorSummary = result.errors.slice(0, 3).map((e) => e.message).join("; ");
        addMessage({
          role: "bilko",
          text: `${result.description}. But there are validation issues: ${errorSummary}. Say "yes" to apply anyway, or tell me how to fix it.`,
        });
      }
    } catch (err) {
      addMessage({ role: "bilko", text: "Something went wrong. Let's try again." });
      console.error("[CanvasBuilder]", err);
    }

    setIsProcessing(false);
  }, [input, isProcessing, flow, selectedStepIds, pendingResult, addMessage, onApplyMutation]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Voice Builder</span>
          {selectedStepIds.size > 0 && (
            <Badge variant="secondary" className="text-xs">
              {selectedStepIds.size} selected
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto px-3 py-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {/* Pending mutation preview */}
        {pendingResult && (
          <div className={`rounded-lg border p-3 text-xs ${
            pendingResult.valid ? "border-green-500/30 bg-green-500/5" : "border-yellow-500/30 bg-yellow-500/5"
          }`}>
            <div className="flex items-center gap-2 mb-1.5">
              {pendingResult.valid ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
              )}
              <span className="font-medium">
                {pendingResult.valid ? "Valid change" : "Has warnings"}
              </span>
            </div>
            <p className="text-muted-foreground">{pendingResult.description}</p>
            {pendingResult.errors.length > 0 && (
              <ul className="mt-1.5 space-y-0.5 text-yellow-600 dark:text-yellow-400">
                {pendingResult.errors.slice(0, 3).map((e, i) => (
                  <li key={i}>[{e.invariant}] {e.message}</li>
                ))}
              </ul>
            )}
            <div className="flex gap-2 mt-2">
              <Button
                size="sm"
                variant="default"
                className="h-6 text-xs px-2"
                onClick={() => {
                  onApplyMutation(pendingResult);
                  addMessage({ role: "bilko", text: `Applied. ${pendingResult.description}` });
                  setPendingResult(null);
                  setPendingMutation(null);
                }}
              >
                <Check className="h-3 w-3 mr-1" /> Apply
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-xs px-2"
                onClick={() => {
                  addMessage({ role: "bilko", text: "Cancelled. What else?" });
                  setPendingResult(null);
                  setPendingMutation(null);
                }}
              >
                <Undo2 className="h-3 w-3 mr-1" /> Cancel
              </Button>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Bilko is thinking...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t p-2">
        <div className="flex items-center gap-2">
          {voiceSupported && (
            <Button
              variant={isListening ? "destructive" : "ghost"}
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={toggleListening}
            >
              {isListening ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
          )}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={selectedStepIds.size > 0
              ? "Tell Bilko what to change..."
              : "Select nodes first, then speak..."}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            disabled={!input.trim() || isProcessing}
            onClick={handleSubmit}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────

function getGreeting(selectionCount: number): string {
  if (selectionCount === 0) {
    return "Select a node on the canvas (shift+click for multiple), then tell me what you want to change.";
  }
  if (selectionCount === 1) {
    return "Got it — one node selected. What do you want to do with it?";
  }
  return `${selectionCount} nodes selected. What would you like to do?`;
}

function isConfirmation(text: string): boolean {
  const t = text.toLowerCase().trim();
  return ["yes", "y", "do it", "apply", "confirm", "go", "ok", "sure", "yep", "yeah"].includes(t);
}

function isRejection(text: string): boolean {
  const t = text.toLowerCase().trim();
  return ["no", "n", "cancel", "undo", "nope", "nevermind", "never mind", "nah"].includes(t);
}

function intentToMutation(
  intent: ParsedIntent,
  flow: FlowDefinition,
  selectedIds: string[],
): FlowMutation | null {
  const existingIds = new Set(flow.steps.map((s) => s.id));

  switch (intent.action) {
    case "add": {
      const type = intent.stepType ?? "transform";
      const name = intent.stepName ?? `New ${type} step`;
      const afterId = intent.targetStepIds[0] ?? selectedIds[0];
      const step = createBlankStep(type, name, existingIds, afterId ? [afterId] : []);
      return { type: "add-step", step, afterStepId: afterId };
    }

    case "remove": {
      const targets = intent.targetStepIds.length > 0 ? intent.targetStepIds : selectedIds;
      if (targets.length === 1) {
        return { type: "remove-step", stepId: targets[0] };
      }
      return {
        type: "batch",
        mutations: targets.map((id) => ({ type: "remove-step" as const, stepId: id })),
        description: `Remove ${targets.length} steps`,
      };
    }

    case "update": {
      const targets = intent.targetStepIds.length > 0 ? intent.targetStepIds : selectedIds;
      if (targets.length === 0) return null;
      const changes: Partial<FlowStep> = {};
      if (intent.changes) {
        for (const [key, val] of Object.entries(intent.changes)) {
          if (key === "name" || key === "description" || key === "prompt" || key === "userMessage") {
            (changes as Record<string, string>)[key] = val;
          }
        }
      }
      if (targets.length === 1) {
        return { type: "update-step", stepId: targets[0], changes };
      }
      return {
        type: "batch",
        mutations: targets.map((id) => ({ type: "update-step" as const, stepId: id, changes })),
        description: `Update ${targets.length} steps`,
      };
    }

    case "connect": {
      const ids = intent.targetStepIds.length >= 2 ? intent.targetStepIds : selectedIds;
      if (ids.length < 2) return null;
      return { type: "connect", fromId: ids[0], toId: ids[1] };
    }

    case "disconnect": {
      const ids = intent.targetStepIds.length >= 2 ? intent.targetStepIds : selectedIds;
      if (ids.length < 2) return null;
      return { type: "disconnect", fromId: ids[0], toId: ids[1] };
    }

    case "change-type": {
      const newType = intent.stepType;
      if (!newType) return null;
      const targets = intent.targetStepIds.length > 0 ? intent.targetStepIds : selectedIds;
      if (targets.length === 0) return null;
      if (targets.length === 1) {
        return { type: "change-type", stepId: targets[0], newType };
      }
      return {
        type: "batch",
        mutations: targets.map((id) => ({ type: "change-type" as const, stepId: id, newType })),
        description: `Change ${targets.length} steps to ${newType}`,
      };
    }

    default:
      return null;
  }
}

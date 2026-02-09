/**
 * Flow Chat — Message channel for flow-driven conversations.
 *
 * Flows push messages to the chat through this channel.
 * Only two sources populate the chat:
 * 1. Flow steps (via pushMessage) — speaker + text as explicit params
 * 2. User speaking/typing
 *
 * Each message carries a speaker identity and text.
 * TTS is triggered only for bilko/agent speakers.
 *
 * This is part of the flow framework per ARCH-005 C1-C4:
 * - C1: Bilko speaks first (flow greeting step pushes to chat)
 * - C2: Options are responses (rendered in main app, not chat)
 * - C3: Voice parity (voice triggers on options, not in chat)
 * - C4: Contextual follow-up (flow steps push contextual messages)
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";

// ── Types ────────────────────────────────────────────────

export interface FlowChatMessage {
  id: string;
  /** Who is speaking — determines rendering style and TTS eligibility */
  speaker: "bilko" | "agent" | "user" | "system";
  /** The text content of the message */
  text: string;
  /** Optional TTS text — only spoken for bilko/agent speakers */
  speech?: string;
  /** Agent identity when speaker is "agent" */
  agentName?: string;
  agentDisplayName?: string;
  agentAccent?: string;
  /** Handoff metadata when speaker is "system" */
  handoff?: {
    fromName: string;
    toName: string;
    toChatName?: string;
  };
  timestamp: number;
}

/** Parameters for pushing a message — id and timestamp are auto-generated */
export type PushMessageParams = Omit<FlowChatMessage, "id" | "timestamp">;

/** The function flow steps call to push messages to the chat */
export type PushMessageFn = (msg: PushMessageParams) => void;

// ── Context ──────────────────────────────────────────────

interface FlowChatContextValue {
  /** All messages in the current flow conversation */
  messages: FlowChatMessage[];
  /** Push a message to the chat from a flow step or user input */
  pushMessage: PushMessageFn;
  /** Clear all messages (e.g. on flow reset) */
  clearMessages: () => void;
  /** Whether voice should auto-start (default ON) */
  voiceDefaultOn: boolean;
}

const FlowChatCtx = createContext<FlowChatContextValue | undefined>(undefined);

function generateId(): string {
  return `fcm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ── Provider ─────────────────────────────────────────────

interface FlowChatProviderProps {
  children: ReactNode;
  /** Whether voice should default to ON (default: true) */
  voiceDefaultOn?: boolean;
}

export function FlowChatProvider({
  children,
  voiceDefaultOn = true,
}: FlowChatProviderProps) {
  const [messages, setMessages] = useState<FlowChatMessage[]>([]);
  const messagesRef = useRef<FlowChatMessage[]>([]);

  const pushMessage = useCallback((msg: PushMessageParams) => {
    const full: FlowChatMessage = {
      ...msg,
      id: generateId(),
      timestamp: Date.now(),
    };
    messagesRef.current = [...messagesRef.current, full];
    setMessages(messagesRef.current);
  }, []);

  const clearMessages = useCallback(() => {
    messagesRef.current = [];
    setMessages([]);
  }, []);

  return (
    <FlowChatCtx.Provider
      value={{ messages, pushMessage, clearMessages, voiceDefaultOn }}
    >
      {children}
    </FlowChatCtx.Provider>
  );
}

// ── Hooks ────────────────────────────────────────────────

/** Access the flow chat context */
export function useFlowChat(): FlowChatContextValue {
  const ctx = useContext(FlowChatCtx);
  if (ctx === undefined) {
    throw new Error("useFlowChat must be used within a FlowChatProvider");
  }
  return ctx;
}

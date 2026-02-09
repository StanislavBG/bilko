/**
 * Flow Chat — Owned message channel for flow-driven conversations.
 *
 * The chat has an OWNER. Only the current owner (or user/system messages)
 * can push messages. This prevents desync when subflows are running —
 * the main flow can't accidentally push agent messages while a subflow
 * owns the conversation.
 *
 * Ownership lifecycle:
 * 1. "bilko-main" owns the chat by default (greeting, mode selection)
 * 2. On handoff, ownership transfers to the subflow (e.g. "video-discovery")
 * 3. The subflow pushes its own agent messages directly
 * 4. On back/return, ownership returns to "bilko-main"
 *
 * Rules:
 * - speaker:"user" and speaker:"system" messages are ALWAYS accepted (no ownership check)
 * - speaker:"bilko" and speaker:"agent" messages require the sender to be the current owner
 * - Rejected messages are logged in development for debugging
 *
 * Message direction:
 * - "top-down" (default): messages start at the top, new ones push below
 * - "bottom-up": messages gravity-stick to the bottom (iMessage style)
 * - Stored in localStorage, configurable by the user
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
  useEffect,
  type ReactNode,
} from "react";

// ── Types ────────────────────────────────────────────────

export type MessageDirection = "top-down" | "bottom-up";

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
  /** Which flow pushed this message */
  ownerId: string;
  timestamp: number;
}

/** Parameters for pushing a message — id, timestamp, ownerId are auto-generated */
export type PushMessageParams = Omit<FlowChatMessage, "id" | "timestamp" | "ownerId">;

/** The function flow steps call to push messages to the chat */
export type PushMessageFn = (ownerId: string, msg: PushMessageParams) => boolean;

// ── Constants ────────────────────────────────────────────

const DEFAULT_OWNER = "bilko-main";
const DIRECTION_STORAGE_KEY = "bilko-chat-direction";

/** Speakers that bypass ownership checks */
const BYPASS_SPEAKERS: Set<FlowChatMessage["speaker"]> = new Set(["user", "system"]);

// ── Context ──────────────────────────────────────────────

interface FlowChatContextValue {
  /** All messages in the current flow conversation */
  messages: FlowChatMessage[];
  /** Who currently owns the chat (only they can push bilko/agent messages) */
  activeOwner: string;
  /**
   * Push a message to the chat.
   * @param ownerId - Who is pushing this message (must match activeOwner for bilko/agent)
   * @param msg - The message content
   * @returns true if accepted, false if rejected due to ownership
   */
  pushMessage: PushMessageFn;
  /** Transfer chat ownership to a new flow */
  claimChat: (ownerId: string) => void;
  /** Release chat back to the default owner (bilko-main) */
  releaseChat: () => void;
  /** Clear all messages (e.g. on flow reset) */
  clearMessages: () => void;
  /** Whether voice should auto-start (default ON) */
  voiceDefaultOn: boolean;
  /** Message rendering direction */
  messageDirection: MessageDirection;
  /** Update message direction preference */
  setMessageDirection: (dir: MessageDirection) => void;
}

const FlowChatCtx = createContext<FlowChatContextValue | undefined>(undefined);

function generateId(): string {
  return `fcm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function loadDirection(): MessageDirection {
  try {
    const stored = localStorage.getItem(DIRECTION_STORAGE_KEY);
    if (stored === "top-down" || stored === "bottom-up") return stored;
  } catch {
    // localStorage unavailable
  }
  return "top-down";
}

// ── Provider ─────────────────────────────────────────────

interface FlowChatProviderProps {
  children: ReactNode;
  /** Whether voice should default to ON (default: false — voice is opt-in) */
  voiceDefaultOn?: boolean;
}

export function FlowChatProvider({
  children,
  voiceDefaultOn = false,
}: FlowChatProviderProps) {
  const [messages, setMessages] = useState<FlowChatMessage[]>([]);
  const [activeOwner, setActiveOwner] = useState<string>(DEFAULT_OWNER);
  const [messageDirection, setMessageDirectionState] = useState<MessageDirection>(loadDirection);
  const messagesRef = useRef<FlowChatMessage[]>([]);
  const activeOwnerRef = useRef<string>(DEFAULT_OWNER);

  // Keep ref in sync
  useEffect(() => {
    activeOwnerRef.current = activeOwner;
  }, [activeOwner]);

  const pushMessage = useCallback((ownerId: string, msg: PushMessageParams): boolean => {
    // Ownership check: user/system bypass, bilko/agent require matching owner
    if (!BYPASS_SPEAKERS.has(msg.speaker) && ownerId !== activeOwnerRef.current) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `[FlowChat] Rejected message from "${ownerId}" (speaker: ${msg.speaker}). ` +
          `Active owner: "${activeOwnerRef.current}". Text: "${msg.text.slice(0, 60)}..."`,
        );
      }
      return false;
    }

    const full: FlowChatMessage = {
      ...msg,
      id: generateId(),
      ownerId,
      timestamp: Date.now(),
    };
    messagesRef.current = [...messagesRef.current, full];
    setMessages(messagesRef.current);
    return true;
  }, []);

  const claimChat = useCallback((ownerId: string) => {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[FlowChat] Ownership transferred: "${activeOwnerRef.current}" → "${ownerId}"`);
    }
    activeOwnerRef.current = ownerId;
    setActiveOwner(ownerId);
  }, []);

  const releaseChat = useCallback(() => {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[FlowChat] Ownership released: "${activeOwnerRef.current}" → "${DEFAULT_OWNER}"`);
    }
    activeOwnerRef.current = DEFAULT_OWNER;
    setActiveOwner(DEFAULT_OWNER);
  }, []);

  const clearMessages = useCallback(() => {
    messagesRef.current = [];
    setMessages([]);
  }, []);

  const setMessageDirection = useCallback((dir: MessageDirection) => {
    setMessageDirectionState(dir);
    try {
      localStorage.setItem(DIRECTION_STORAGE_KEY, dir);
    } catch {
      // localStorage unavailable
    }
  }, []);

  return (
    <FlowChatCtx.Provider
      value={{
        messages,
        activeOwner,
        pushMessage,
        claimChat,
        releaseChat,
        clearMessages,
        voiceDefaultOn,
        messageDirection,
        setMessageDirection,
      }}
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

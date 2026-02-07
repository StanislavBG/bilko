/**
 * ConversationContext — Session-scoped conversation memory.
 *
 * Stores the running dialogue between Bilko and the user,
 * persisted to sessionStorage so it survives page reloads
 * but not browser close.
 *
 * Two layers:
 * - Serializable state (messages + selectedMode) → sessionStorage
 * - Rendered turns (ConversationTurn[]) → derived at render time by consumers
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { LearningModeId } from "@/lib/workflow";

// ── Serializable message model ──────────────────────────

export interface ConversationMessage {
  id: string;
  role: "bilko" | "user";
  text: string;
  speech?: string;
  timestamp: number;
  meta?: {
    /** What kind of message this is */
    type?: "greeting" | "question" | "acknowledgment" | "choice" | "back" | "voice" | "guidance" | "subflow-summary";
    /** If user chose a mode */
    modeId?: string;
    modeLabel?: string;
    [key: string]: unknown;
  };
}

interface SessionState {
  messages: ConversationMessage[];
  selectedMode: LearningModeId | null;
}

// ── Context interface ───────────────────────────────────

interface ConversationContextValue {
  /** All messages in the current conversation */
  messages: ConversationMessage[];
  /** Currently selected training mode */
  selectedMode: LearningModeId | null;
  /** Whether this session was restored from storage (not a fresh visit) */
  isRestored: boolean;
  /** Append a message to the conversation */
  addMessage: (msg: Omit<ConversationMessage, "id" | "timestamp">) => void;
  /** Set the selected training mode */
  selectMode: (mode: LearningModeId) => void;
  /** Clear the selected mode (back to options) */
  clearMode: () => void;
  /** Reset the entire conversation */
  reset: () => void;
}

// ── Storage helpers ─────────────────────────────────────

const STORAGE_KEY = "bilko-conversation";

function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function loadSession(): SessionState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.messages && Array.isArray(parsed.messages)) {
        return parsed as SessionState;
      }
    }
  } catch {
    /* corrupt data — start fresh */
  }
  return null;
}

function saveSession(state: SessionState): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage full or unavailable */
  }
}

// ── Provider ────────────────────────────────────────────

const ConversationCtx = createContext<ConversationContextValue | undefined>(
  undefined,
);

export function ConversationProvider({ children }: { children: ReactNode }) {
  const restored = loadSession();
  const [state, setState] = useState<SessionState>(
    restored ?? { messages: [], selectedMode: null },
  );
  const [isRestored] = useState(restored !== null && restored.messages.length > 0);

  // Persist on every state change
  useEffect(() => {
    saveSession(state);
  }, [state]);

  const addMessage = useCallback(
    (msg: Omit<ConversationMessage, "id" | "timestamp">) => {
      setState((prev) => ({
        ...prev,
        messages: [
          ...prev.messages,
          { ...msg, id: generateId(), timestamp: Date.now() },
        ],
      }));
    },
    [],
  );

  const selectMode = useCallback((mode: LearningModeId) => {
    setState((prev) => ({ ...prev, selectedMode: mode }));
  }, []);

  const clearMode = useCallback(() => {
    setState((prev) => ({ ...prev, selectedMode: null }));
  }, []);

  const reset = useCallback(() => {
    setState({ messages: [], selectedMode: null });
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <ConversationCtx.Provider
      value={{
        messages: state.messages,
        selectedMode: state.selectedMode,
        isRestored,
        addMessage,
        selectMode,
        clearMode,
        reset,
      }}
    >
      {children}
    </ConversationCtx.Provider>
  );
}

export function useConversation(): ConversationContextValue {
  const ctx = useContext(ConversationCtx);
  if (ctx === undefined) {
    throw new Error("useConversation must be used within a ConversationProvider");
  }
  return ctx;
}

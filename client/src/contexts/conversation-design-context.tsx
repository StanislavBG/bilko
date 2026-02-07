/**
 * Conversation Design — ONE framework for the entire site.
 *
 * Governs turn-taking, TTS, auto-listen, and timing between Bilko
 * and the user. Every conversation surface uses this context so the
 * experience is consistent — same cadence, same voice, same flow.
 *
 * Turn lifecycle:
 * 1. Bilko speaks (TTS + typewriter)
 * 2. Brief pause (POST_TTS_BUFFER_MS)
 * 3. Mic activates automatically (if user has opted in)
 * 4. User speaks → silence detected → utterance captured
 * 5. Bilko processes → go to 1
 *
 * This is NOT a chat framework. It's a conversation director —
 * it coordinates timing so the site feels like talking to a person.
 */

import {
  createContext,
  useContext,
  useCallback,
  useRef,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useVoice } from "@/contexts/voice-context";
import { POST_TTS_BUFFER_MS } from "@/lib/bilko-persona/pacing";

// ── Types ────────────────────────────────────────────────

export type ConversationFloor = "bilko" | "user" | "idle";

interface ConversationDesignValue {
  /** Who currently has the conversational floor */
  floor: ConversationFloor;

  /** Whether auto-listen is enabled (user opted in to voice) */
  autoListenEnabled: boolean;

  /** Enable/disable auto-listen globally */
  setAutoListen: (enabled: boolean) => void;

  /** Signal that Bilko has started speaking (TTS active) */
  bilkoStartedSpeaking: () => void;

  /** Signal that Bilko finished speaking — triggers auto-listen after delay */
  bilkoFinishedSpeaking: () => void;

  /** Signal that the user has been given the floor (e.g. choice turn) */
  giveFloorToUser: () => void;

  /** Signal that the user's turn is done (e.g. they made a choice, or silence detected) */
  userTurnDone: () => void;

  /** Register a callback for when the user finishes an utterance.
   *  The callback receives the transcribed text. Returns unsubscribe fn. */
  onUserUtterance: (cb: (text: string) => void) => () => void;
}

// ── Context ──────────────────────────────────────────────

const ConversationDesignCtx = createContext<ConversationDesignValue | undefined>(undefined);

const AUTO_LISTEN_KEY = "bilko-auto-listen";

export function ConversationDesignProvider({ children }: { children: ReactNode }) {
  const { startListening, stopListening, isListening, onUtteranceEnd, isSpeaking } = useVoice();

  const [floor, setFloor] = useState<ConversationFloor>("idle");
  const [autoListenEnabled, setAutoListenState] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(AUTO_LISTEN_KEY) !== "false";
  });

  const autoListenRef = useRef(autoListenEnabled);
  const floorRef = useRef(floor);
  const userUtteranceCbsRef = useRef<Set<(text: string) => void>>(new Set());
  const autoListenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep refs in sync
  useEffect(() => { autoListenRef.current = autoListenEnabled; }, [autoListenEnabled]);
  useEffect(() => { floorRef.current = floor; }, [floor]);

  const setAutoListen = useCallback((enabled: boolean) => {
    setAutoListenState(enabled);
    localStorage.setItem(AUTO_LISTEN_KEY, String(enabled));
    if (!enabled) {
      stopListening();
    }
  }, [stopListening]);

  const bilkoStartedSpeaking = useCallback(() => {
    setFloor("bilko");
    // Clear any pending auto-listen timer
    if (autoListenTimerRef.current) {
      clearTimeout(autoListenTimerRef.current);
      autoListenTimerRef.current = null;
    }
  }, []);

  const bilkoFinishedSpeaking = useCallback(() => {
    // After Bilko stops speaking, give the floor to the user
    // with a brief pause so TTS audio clears before mic opens
    autoListenTimerRef.current = setTimeout(() => {
      setFloor("user");
      if (autoListenRef.current && !isListening) {
        startListening();
      }
      autoListenTimerRef.current = null;
    }, POST_TTS_BUFFER_MS + 200);
  }, [startListening, isListening]);

  const giveFloorToUser = useCallback(() => {
    setFloor("user");
    if (autoListenRef.current && !isListening) {
      startListening();
    }
  }, [startListening, isListening]);

  const userTurnDone = useCallback(() => {
    setFloor("idle");
  }, []);

  const onUserUtterance = useCallback((cb: (text: string) => void) => {
    userUtteranceCbsRef.current.add(cb);
    return () => { userUtteranceCbsRef.current.delete(cb); };
  }, []);

  // Wire utterance end from voice context → conversation design callbacks
  useEffect(() => {
    const unsub = onUtteranceEnd((text: string) => {
      if (floorRef.current === "user") {
        for (const cb of userUtteranceCbsRef.current) {
          cb(text);
        }
      }
    });
    return unsub;
  }, [onUtteranceEnd]);

  // Sync: when voice context detects Bilko is speaking, update floor
  useEffect(() => {
    if (isSpeaking && floorRef.current !== "bilko") {
      setFloor("bilko");
    }
  }, [isSpeaking]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (autoListenTimerRef.current) clearTimeout(autoListenTimerRef.current);
    };
  }, []);

  return (
    <ConversationDesignCtx.Provider
      value={{
        floor,
        autoListenEnabled,
        setAutoListen,
        bilkoStartedSpeaking,
        bilkoFinishedSpeaking,
        giveFloorToUser,
        userTurnDone,
        onUserUtterance,
      }}
    >
      {children}
    </ConversationDesignCtx.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────

export function useConversationDesign(): ConversationDesignValue {
  const ctx = useContext(ConversationDesignCtx);
  if (ctx === undefined) {
    throw new Error("useConversationDesign must be used within a ConversationDesignProvider");
  }
  return ctx;
}

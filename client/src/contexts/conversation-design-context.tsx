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
 * 4. User speaks → turn-end detected → utterance captured
 * 5. Bilko processes → go to 1
 *
 * Turn-end detection (two mechanisms):
 * A. Silence — after SILENCE_TIMEOUT_MS of no speech, fire utterance
 * B. Keywords — user says a trigger phrase and we submit immediately
 *    Examples: "go ahead", "over to you", "Bilko", "that's it", "done"
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

// ── Screen Options Registry ─────────────────────────────
// The whole site is the conversation. Whatever's on screen — topic cards,
// video choices, buttons — should be voice-navigable. Components register
// their interactive options here so the conversation can match against them.

export interface ScreenOption {
  id: string;
  label: string;
  keywords?: string[];
  action: () => void;
}

/**
 * Try to match user speech against registered screen options.
 * Returns the matched option or null.
 */
export function matchScreenOption(text: string, options: ScreenOption[]): ScreenOption | null {
  const lower = text.toLowerCase();
  for (const opt of options) {
    const label = opt.label.toLowerCase();
    // Exact label match
    if (lower.includes(label)) return opt;
    // Individual words from the label (>3 chars)
    if (label.split(/\s+/).some((w) => w.length > 3 && lower.includes(w))) return opt;
    // Explicit keywords
    if (opt.keywords?.some((kw) => lower.includes(kw.toLowerCase()))) return opt;
  }
  return null;
}

// ── Turn-end keywords ───────────────────────────────────
// When the user says one of these, we immediately submit
// whatever they've said so far (minus the keyword) and hand
// the floor to Bilko. Keywords are matched case-insensitive
// at the END of the transcript.

export const TURN_END_KEYWORDS = [
  "go ahead",
  "go ahead bilko",
  "over to you",
  "over to you bilko",
  "your turn",
  "your turn bilko",
  "bilko go",
  "that's it",
  "that is it",
  "done",
  "i'm done",
  "im done",
  "send it",
  "ok bilko",
  "okay bilko",
] as const;

/**
 * Check if text ends with a turn-end keyword.
 * Returns the keyword matched (for stripping) or null.
 */
// Sort longest-first so "i'm done" matches before "done"
const SORTED_KEYWORDS = [...TURN_END_KEYWORDS].sort((a, b) => b.length - a.length);

export function matchTurnEndKeyword(text: string): string | null {
  const lower = text.toLowerCase().trim();
  for (const kw of SORTED_KEYWORDS) {
    if (lower.endsWith(kw)) {
      return kw;
    }
  }
  return null;
}

/**
 * Strip the turn-end keyword from the end of the text,
 * returning the user's actual message.
 */
export function stripTurnEndKeyword(text: string, keyword: string): string {
  const idx = text.toLowerCase().lastIndexOf(keyword);
  if (idx === -1) return text.trim();
  return text.slice(0, idx).trim();
}

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

  /** Currently registered screen options (from whatever's visible on the right panel) */
  screenOptions: ScreenOption[];

  /** Register interactive options for voice matching. Returns unregister fn.
   *  Call this from any component that shows clickable options (topic cards, etc.) */
  registerScreenOptions: (options: ScreenOption[]) => () => void;
}

// ── Context ──────────────────────────────────────────────

const ConversationDesignCtx = createContext<ConversationDesignValue | undefined>(undefined);

const AUTO_LISTEN_KEY = "bilko-auto-listen";

export function ConversationDesignProvider({ children }: { children: ReactNode }) {
  const { startListening, stopListening, isListening, onUtteranceEnd, isSpeaking, transcript } = useVoice();

  const [floor, setFloor] = useState<ConversationFloor>("idle");
  const [autoListenEnabled, setAutoListenState] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(AUTO_LISTEN_KEY) !== "false";
  });

  const autoListenRef = useRef(autoListenEnabled);
  const floorRef = useRef(floor);
  const userUtteranceCbsRef = useRef<Set<(text: string) => void>>(new Set());
  const autoListenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keywordFiredRef = useRef(false);

  // ── Screen Options Registry ──
  const [screenOptions, setScreenOptions] = useState<ScreenOption[]>([]);
  const screenOptionSetsRef = useRef<Map<number, ScreenOption[]>>(new Map());
  const nextScreenOptionIdRef = useRef(0);

  const registerScreenOptions = useCallback((options: ScreenOption[]) => {
    const regId = nextScreenOptionIdRef.current++;
    screenOptionSetsRef.current.set(regId, options);
    // Flatten all registered sets into a single list
    setScreenOptions(Array.from(screenOptionSetsRef.current.values()).flat());
    return () => {
      screenOptionSetsRef.current.delete(regId);
      setScreenOptions(Array.from(screenOptionSetsRef.current.values()).flat());
    };
  }, []);

  // Keep refs in sync
  useEffect(() => { autoListenRef.current = autoListenEnabled; }, [autoListenEnabled]);
  useEffect(() => { floorRef.current = floor; }, [floor]);

  // ── Dispatch helper ───────────────────────────────────
  const dispatchUtterance = useCallback((text: string) => {
    const cleaned = text.trim();
    if (!cleaned) return;
    for (const cb of userUtteranceCbsRef.current) {
      cb(cleaned);
    }
  }, []);

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
      keywordFiredRef.current = false;
      if (autoListenRef.current && !isListening) {
        startListening();
      }
      autoListenTimerRef.current = null;
    }, POST_TTS_BUFFER_MS + 200);
  }, [startListening, isListening]);

  const giveFloorToUser = useCallback(() => {
    setFloor("user");
    keywordFiredRef.current = false;
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

  // ── Mechanism A: Silence-based turn end ───────────────
  // VoiceContext fires onUtteranceEnd after SILENCE_TIMEOUT_MS
  useEffect(() => {
    const unsub = onUtteranceEnd((text: string) => {
      if (floorRef.current === "user" && !keywordFiredRef.current) {
        dispatchUtterance(text);
      }
    });
    return unsub;
  }, [onUtteranceEnd, dispatchUtterance]);

  // ── Mechanism B: Keyword-based turn end ───────────────
  // Watch the live transcript for turn-end keywords.
  // When detected, immediately submit and hand floor to Bilko.
  useEffect(() => {
    if (floorRef.current !== "user" || !transcript || keywordFiredRef.current) return;

    const keyword = matchTurnEndKeyword(transcript);
    if (keyword) {
      keywordFiredRef.current = true;
      const message = stripTurnEndKeyword(transcript, keyword);
      // Dispatch even if message is empty — the keyword itself signals intent
      dispatchUtterance(message || `[${keyword}]`);
    }
  }, [transcript, dispatchUtterance]);

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
        screenOptions,
        registerScreenOptions,
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

/**
 * Register screen options for voice matching. Auto-cleans up on unmount.
 * Call from any component that shows interactive choices the user could
 * refer to by voice (topic cards, video cards, menu buttons, etc.).
 *
 * Options are re-registered whenever the array reference changes.
 */
export function useScreenOptions(options: ScreenOption[]) {
  const { registerScreenOptions } = useConversationDesign();
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (options.length === 0) return;
    return registerScreenOptions(options);
  }, [options, registerScreenOptions]);
}

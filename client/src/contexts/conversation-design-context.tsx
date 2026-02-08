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
 * 3. Mic auto-resumes (if user has it on — one button controls everything)
 * 4. User speaks → turn-end detected → utterance captured
 * 5. Bilko processes → go to 1
 *
 * Auto-listen: derived from mic state. When the user turns mic ON,
 * the full conversational flow activates — auto-resume after Bilko,
 * mute during TTS, floor-aware listening. Mic OFF = voice off.
 * One button. No separate toggle.
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

// ── Ordinal / positional matching ────────────────────────
// Users say "the first one", "number two", "third option" etc.
const ORDINAL_MAP: Record<string, number> = {
  first: 0, "1st": 0, one: 0, "number one": 0, "number 1": 0,
  second: 0, "2nd": 1, two: 1, "number two": 1, "number 2": 1,
  third: 2, "3rd": 2, three: 2, "number three": 2, "number 3": 2,
  fourth: 3, "4th": 3, four: 3, "number four": 3, "number 4": 3,
  fifth: 4, "5th": 4, five: 4, "number five": 4, "number 5": 4,
  sixth: 5, "6th": 5, six: 5, last: -1, bottom: -1,
  top: 0,
};
// Fix: "second" should map to 1
ORDINAL_MAP["second"] = 1;

// Contextual phrases that signal an ordinal pick
const ORDINAL_CONTEXT_PHRASES = [
  "the $ORD one", "the $ORD option", "the $ORD choice",
  "$ORD one", "$ORD option", "$ORD choice",
  "option $ORD", "choice $ORD", "pick $ORD",
  "go with $ORD", "try $ORD", "select $ORD",
  "let's do $ORD", "lets do $ORD", "do $ORD",
  "i'll take $ORD", "i want $ORD", "show me $ORD",
];

function matchOrdinal(text: string, options: ScreenOption[]): ScreenOption | null {
  if (options.length === 0) return null;
  const lower = text.toLowerCase();

  // Check each ordinal word/phrase
  for (const [word, index] of Object.entries(ORDINAL_MAP)) {
    // Check if ordinal appears in a contextual phrase
    for (const pattern of ORDINAL_CONTEXT_PHRASES) {
      const phrase = pattern.replace("$ORD", word);
      if (lower.includes(phrase)) {
        const resolvedIndex = index === -1 ? options.length - 1 : index;
        if (resolvedIndex >= 0 && resolvedIndex < options.length) {
          return options[resolvedIndex];
        }
      }
    }

    // Bare ordinal with contextual words nearby (e.g., "the first", "number two")
    if (lower.includes(word) && (
      lower.includes("the ") || lower.includes("that ") ||
      lower.includes("this ") || lower.includes("pick") ||
      lower.includes("go") || lower.includes("try") ||
      lower.includes("want") || lower.includes("choose") ||
      lower.includes("select") || lower.includes("option") ||
      lower.includes("show") || lower.includes("let")
    )) {
      const resolvedIndex = index === -1 ? options.length - 1 : index;
      if (resolvedIndex >= 0 && resolvedIndex < options.length) {
        return options[resolvedIndex];
      }
    }
  }

  return null;
}

// ── Fuzzy word matching ─────────────────────────────────
// Handles partial matches, close misses from speech-to-text errors.
// "discovry" → "discovery", "consultashun" → "consultation"
function fuzzyWordMatch(spoken: string, target: string): boolean {
  if (spoken.length < 4 || target.length < 4) return spoken === target;
  // If one is a substring of the other (handles truncations from STT)
  if (spoken.includes(target) || target.includes(spoken)) return true;
  // Simple edit distance check: allow 1-2 character differences for words > 5 chars
  if (Math.abs(spoken.length - target.length) > 2) return false;
  let mismatches = 0;
  const maxLen = Math.max(spoken.length, target.length);
  for (let i = 0; i < maxLen; i++) {
    if (spoken[i] !== target[i]) mismatches++;
    if (mismatches > 2) return false;
  }
  return mismatches <= (target.length > 6 ? 2 : 1);
}

// ── Referential matching ────────────────────────────────
// "that one about videos", "the discovery thing", "something with interview"
const REFERENTIAL_PREFIXES = [
  "that one about", "the one about", "the one with", "something about",
  "something with", "the", "that",
];
const REFERENTIAL_SUFFIXES = [
  "one", "thing", "option", "thingy", "mode", "choice",
];

/**
 * Try to match user speech against registered screen options.
 * Uses multiple strategies: exact match, word match, keywords,
 * ordinal/positional, fuzzy, and referential matching.
 * Returns the matched option or null.
 */
export function matchScreenOption(text: string, options: ScreenOption[]): ScreenOption | null {
  if (options.length === 0) return null;
  const lower = text.toLowerCase().trim();

  // ── Pass 1: Exact label match (highest confidence) ──
  for (const opt of options) {
    const label = opt.label.toLowerCase();
    if (lower.includes(label)) return opt;
  }

  // ── Pass 2: Explicit keywords ──
  for (const opt of options) {
    if (opt.keywords?.some((kw) => lower.includes(kw.toLowerCase()))) return opt;
  }

  // ── Pass 3: Significant words from label (>3 chars) ──
  for (const opt of options) {
    const label = opt.label.toLowerCase();
    const words = label.split(/\s+/).filter((w) => w.length > 3);
    if (words.some((w) => lower.includes(w))) return opt;
  }

  // ── Pass 4: Ordinal / positional matching ──
  const ordinalMatch = matchOrdinal(lower, options);
  if (ordinalMatch) return ordinalMatch;

  // ── Pass 5: Fuzzy word matching (handles STT transcription errors) ──
  const spokenWords = lower.split(/\s+/);
  for (const opt of options) {
    const labelWords = opt.label.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    for (const labelWord of labelWords) {
      for (const spokenWord of spokenWords) {
        if (spokenWord.length > 3 && fuzzyWordMatch(spokenWord, labelWord)) {
          return opt;
        }
      }
    }
    // Also fuzzy-match keywords
    if (opt.keywords) {
      for (const kw of opt.keywords) {
        const kwLower = kw.toLowerCase();
        for (const spokenWord of spokenWords) {
          if (spokenWord.length > 3 && fuzzyWordMatch(spokenWord, kwLower)) {
            return opt;
          }
        }
      }
    }
  }

  // ── Pass 6: Referential matching ("the video thing", "that discovery one") ──
  // Strip referential prefixes and suffixes, then try to match the core
  let core = lower;
  for (const prefix of REFERENTIAL_PREFIXES) {
    if (core.startsWith(prefix + " ")) {
      core = core.slice(prefix.length).trim();
      break;
    }
  }
  for (const suffix of REFERENTIAL_SUFFIXES) {
    if (core.endsWith(" " + suffix)) {
      core = core.slice(0, -(suffix.length + 1)).trim();
      break;
    }
  }
  if (core && core !== lower) {
    // Try matching the stripped core against labels and keywords
    for (const opt of options) {
      const label = opt.label.toLowerCase();
      if (label.includes(core) || core.includes(label)) return opt;
      const labelWords = label.split(/\s+/).filter((w) => w.length > 3);
      if (labelWords.some((w) => core.includes(w))) return opt;
      if (opt.keywords?.some((kw) => core.includes(kw.toLowerCase()))) return opt;
    }
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

  /** Signal that Bilko has started speaking (TTS active) */
  bilkoStartedSpeaking: () => void;

  /** Signal that Bilko finished speaking — triggers auto-resume if mic is on */
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

export function ConversationDesignProvider({ children }: { children: ReactNode }) {
  const { startListening, isListening, onUtteranceEnd, isSpeaking, transcript } = useVoice();

  const [floor, setFloor] = useState<ConversationFloor>("idle");

  // Auto-listen is derived from mic state — when the mic is on,
  // the full conversational flow activates. One button, no separate toggle.
  const micActiveRef = useRef(isListening);
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
  useEffect(() => { micActiveRef.current = isListening; }, [isListening]);
  useEffect(() => { floorRef.current = floor; }, [floor]);

  // ── Dispatch helper ───────────────────────────────────
  const dispatchUtterance = useCallback((text: string) => {
    const cleaned = text.trim();
    if (!cleaned) return;
    for (const cb of userUtteranceCbsRef.current) {
      cb(cleaned);
    }
  }, []);

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
    // with a brief pause so TTS audio clears before mic opens.
    // If the mic is on (user toggled it), auto-resume listening.
    autoListenTimerRef.current = setTimeout(() => {
      setFloor("user");
      keywordFiredRef.current = false;
      // Mic is on = user wants voice conversation. Ensure it's active.
      if (micActiveRef.current && !isListening) {
        startListening();
      }
      autoListenTimerRef.current = null;
    }, POST_TTS_BUFFER_MS + 200);
  }, [startListening, isListening]);

  const giveFloorToUser = useCallback(() => {
    setFloor("user");
    keywordFiredRef.current = false;
    // Mic is on = user wants voice. Ensure it's listening.
    if (micActiveRef.current && !isListening) {
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

  // Sync: keep floor in sync with voice context's isSpeaking state.
  // When Bilko starts speaking → floor = "bilko".
  // When Bilko stops speaking → trigger bilkoFinishedSpeaking() to
  // hand the floor back to the user (with the standard TTS buffer).
  useEffect(() => {
    if (isSpeaking && floorRef.current !== "bilko") {
      setFloor("bilko");
    } else if (!isSpeaking && floorRef.current === "bilko") {
      // isSpeaking went false but floor is still "bilko" — release it.
      // Use the same deferred handoff as bilkoFinishedSpeaking().
      autoListenTimerRef.current = setTimeout(() => {
        setFloor("user");
        keywordFiredRef.current = false;
        if (micActiveRef.current && !isListening) {
          startListening();
        }
        autoListenTimerRef.current = null;
      }, POST_TTS_BUFFER_MS + 200);
    }
  }, [isSpeaking, startListening, isListening]);

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

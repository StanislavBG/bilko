/**
 * Conversation Design — ONE framework for the entire site.
 *
 * Governs turn-taking between Bilko and the user.
 * Every conversation surface uses this context so the experience
 * is consistent — same cadence, same flow.
 *
 * Turn lifecycle:
 * 1. Bilko speaks (typewriter)
 * 2. Brief pause
 * 3. Floor passes to user (click-based interaction)
 * 4. User picks an option → go to 1
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

// ── Types ────────────────────────────────────────────────

export type ConversationFloor = "bilko" | "user" | "idle";

// ── Screen Options Registry ─────────────────────────────

export interface ScreenOption {
  id: string;
  label: string;
  keywords?: string[];
  action: () => void;
}

// ── Ordinal / positional matching ────────────────────────
const ORDINAL_MAP: Record<string, number> = {
  first: 0, "1st": 0, one: 0, "number one": 0, "number 1": 0,
  second: 1, "2nd": 1, two: 1, "number two": 1, "number 2": 1,
  third: 2, "3rd": 2, three: 2, "number three": 2, "number 3": 2,
  fourth: 3, "4th": 3, four: 3, "number four": 3, "number 4": 3,
  fifth: 4, "5th": 4, five: 4, "number five": 4, "number 5": 4,
  sixth: 5, "6th": 5, six: 5, last: -1, bottom: -1,
  top: 0,
};

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

  for (const [word, index] of Object.entries(ORDINAL_MAP)) {
    for (const pattern of ORDINAL_CONTEXT_PHRASES) {
      const phrase = pattern.replace("$ORD", word);
      if (lower.includes(phrase)) {
        const resolvedIndex = index === -1 ? options.length - 1 : index;
        if (resolvedIndex >= 0 && resolvedIndex < options.length) {
          return options[resolvedIndex];
        }
      }
    }

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
function fuzzyWordMatch(spoken: string, target: string): boolean {
  if (spoken.length < 4 || target.length < 4) return spoken === target;
  if (spoken.includes(target) || target.includes(spoken)) return true;
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
const REFERENTIAL_PREFIXES = [
  "that one about", "the one about", "the one with", "something about",
  "something with", "the", "that",
];
const REFERENTIAL_SUFFIXES = [
  "one", "thing", "option", "thingy", "mode", "choice",
];

/**
 * Try to match user text against registered screen options.
 * Uses multiple strategies: exact match, word match, keywords,
 * ordinal/positional, fuzzy, and referential matching.
 */
export function matchScreenOption(text: string, options: ScreenOption[]): ScreenOption | null {
  if (options.length === 0) return null;
  const lower = text.toLowerCase().trim();

  // Pass 1: Exact label match
  for (const opt of options) {
    const label = opt.label.toLowerCase();
    if (lower.includes(label)) return opt;
  }

  // Pass 2: Explicit keywords
  for (const opt of options) {
    if (opt.keywords?.some((kw) => lower.includes(kw.toLowerCase()))) return opt;
  }

  // Pass 3: Significant words from label (>3 chars)
  for (const opt of options) {
    const label = opt.label.toLowerCase();
    const words = label.split(/\s+/).filter((w) => w.length > 3);
    if (words.some((w) => lower.includes(w))) return opt;
  }

  // Pass 4: Ordinal / positional matching
  const ordinalMatch = matchOrdinal(lower, options);
  if (ordinalMatch) return ordinalMatch;

  // Pass 5: Fuzzy word matching
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

  // Pass 6: Referential matching
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

// ── Turn-end keywords (kept for text-based matching if needed) ──

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

export function stripTurnEndKeyword(text: string, keyword: string): string {
  const idx = text.toLowerCase().lastIndexOf(keyword);
  if (idx === -1) return text.trim();
  return text.slice(0, idx).trim();
}

interface ConversationDesignValue {
  /** Who currently has the conversational floor */
  floor: ConversationFloor;

  /** Signal that Bilko has started speaking (typewriter active) */
  bilkoStartedSpeaking: () => void;

  /** Signal that Bilko finished speaking (typewriter complete) */
  bilkoFinishedSpeaking: () => void;

  /** Signal that the user has been given the floor */
  giveFloorToUser: () => void;

  /** Signal that the user's turn is done */
  userTurnDone: () => void;

  /** Register a callback for when the user finishes an utterance.
   *  Returns unsubscribe fn. */
  onUserUtterance: (cb: (text: string) => void) => () => void;

  /** Currently registered screen options */
  screenOptions: ScreenOption[];

  /** Register interactive options for matching. Returns unregister fn. */
  registerScreenOptions: (options: ScreenOption[]) => () => void;
}

// ── Context ──────────────────────────────────────────────

const ConversationDesignCtx = createContext<ConversationDesignValue | undefined>(undefined);

export function ConversationDesignProvider({ children }: { children: ReactNode }) {
  const [floor, setFloor] = useState<ConversationFloor>("idle");

  const floorRef = useRef(floor);
  const userUtteranceCbsRef = useRef<Set<(text: string) => void>>(new Set());
  const autoListenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Screen Options Registry ──
  const [screenOptions, setScreenOptions] = useState<ScreenOption[]>([]);
  const screenOptionSetsRef = useRef<Map<number, ScreenOption[]>>(new Map());
  const nextScreenOptionIdRef = useRef(0);

  const registerScreenOptions = useCallback((options: ScreenOption[]) => {
    const regId = nextScreenOptionIdRef.current++;
    screenOptionSetsRef.current.set(regId, options);
    setScreenOptions(Array.from(screenOptionSetsRef.current.values()).flat());
    return () => {
      screenOptionSetsRef.current.delete(regId);
      setScreenOptions(Array.from(screenOptionSetsRef.current.values()).flat());
    };
  }, []);

  useEffect(() => { floorRef.current = floor; }, [floor]);

  const bilkoStartedSpeaking = useCallback(() => {
    setFloor("bilko");
    if (autoListenTimerRef.current) {
      clearTimeout(autoListenTimerRef.current);
      autoListenTimerRef.current = null;
    }
  }, []);

  const bilkoFinishedSpeaking = useCallback(() => {
    autoListenTimerRef.current = setTimeout(() => {
      setFloor("user");
      autoListenTimerRef.current = null;
    }, 200);
  }, []);

  const giveFloorToUser = useCallback(() => {
    setFloor("user");
  }, []);

  const userTurnDone = useCallback(() => {
    setFloor("idle");
  }, []);

  const onUserUtterance = useCallback((cb: (text: string) => void) => {
    userUtteranceCbsRef.current.add(cb);
    return () => { userUtteranceCbsRef.current.delete(cb); };
  }, []);

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
 * Register screen options for matching. Auto-cleans up on unmount.
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

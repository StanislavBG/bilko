/**
 * Bilko's Voice — Context-aware educator responses.
 *
 * This is not a random phrase picker. Bilko reads the room.
 * He knows what the user just did, what's coming next, and
 * responds like a great teacher would.
 */

import type {
  BilkoContext,
  BilkoSpeech,
  BilkoTone,
  BilkoTransition,
} from "./types";

// ── Core voice function ────────────────────────────────────

/**
 * Generate what Bilko says for a given moment.
 * Deterministic — same context always produces the same result.
 * For dynamic/LLM-generated speech, agents call chatJSON directly.
 */
export function bilkoSays(ctx: BilkoContext): BilkoSpeech {
  const tone = inferTone(ctx);
  const { text, speech } = buildSpeech(ctx, tone);
  return { text, speech, tone };
}

/**
 * Generate a transition phrase between content sections.
 */
export function bilkoTransition(
  from: string,
  to: string,
  ctx?: Partial<BilkoContext>,
): BilkoTransition {
  const phrases = TRANSITIONS[to] ?? TRANSITIONS._default;
  const picked = pick(phrases, from + to);

  return {
    speech: {
      text: picked,
      speech: picked,
      tone: "transitioning",
    },
    pauseMs: 400,
  };
}

// ── Tone inference ─────────────────────────────────────────

function inferTone(ctx: BilkoContext): BilkoTone {
  switch (ctx.event) {
    case "greeting":
      return "welcoming";
    case "returning":
      return "welcoming";
    case "choice-made":
      return "encouraging";
    case "task-complete":
      return ctx.progress && ctx.progress >= 1 ? "celebrating" : "encouraging";
    case "task-failed":
      return "empathetic";
    case "new-content":
      return "explaining";
    case "quiz-correct":
      return "celebrating";
    case "quiz-incorrect":
      return "empathetic";
    case "quiz-complete":
      return ctx.progress && ctx.progress >= 0.7 ? "celebrating" : "encouraging";
    case "video-loaded":
      return "encouraging";
    case "explore-start":
      return "curious";
    case "section-transition":
      return "transitioning";
    case "waiting":
      return "curious";
    case "custom":
      return "explaining";
    default:
      return "explaining";
  }
}

// ── Speech banks ───────────────────────────────────────────
// Each event has multiple phrasings. Bilko picks based on context
// so he doesn't repeat himself across a session.

type PhraseBank = Record<string, string[]>;

const SPEECH: PhraseBank = {
  greeting: [
    "Welcome to the AI School. I'm Bilko, your AI training partner.",
    "Welcome to Bilko's AI School. Let's build something in that brain of yours.",
    "Hey there. Welcome to the Gym. I'm Bilko — let's get to work.",
  ],
  returning: [
    "Welcome back. Ready to pick up where we left off?",
    "Good to see you again. What are we working on today?",
    "Back for more? I like that. Let's go.",
  ],
  "choice-made": [
    "Great choice. Let's dive in.",
    "Nice pick. Here's what I've got for you.",
    "Good call. Let me set that up.",
    "On it. Give me a second.",
  ],
  "task-complete": [
    "That's a wrap. Well done.",
    "Nailed it. You should feel good about that.",
    "Done. See? You're better at this than you think.",
  ],
  "task-failed": [
    "That didn't go as planned, but that's how we learn. Let's try again.",
    "No worries — mistakes are just data. Let's look at what happened.",
    "Hmm, that one got away from us. Want to take another run at it?",
  ],
  "new-content": [
    "Alright, let me walk you through this.",
    "Here's something worth knowing.",
    "Pay attention to this part — it's key.",
  ],
  "quiz-correct": [
    "Correct! You're getting it.",
    "That's right. Sharp.",
    "Spot on. Keep that up.",
    "Bingo. Next one.",
  ],
  "quiz-incorrect": [
    "Not quite, but now you know. That's the point.",
    "Close — the right answer might surprise you.",
    "That's a common miss. Here's why:",
  ],
  "quiz-complete-high": [
    "Outstanding. You crushed that quiz.",
    "Impressive score. You clearly know your stuff.",
  ],
  "quiz-complete-low": [
    "Good effort. Every wrong answer is a lesson learned.",
    "That's a solid start. Want to try the topics you missed?",
  ],
  "video-loaded": [
    "Here's a good one. Watch this.",
    "Found something worth your time. Check it out.",
    "This video explains it better than I could.",
  ],
  "explore-start": [
    "Let me show you around. There's a lot here.",
    "Ready for a tour? Let's see what interests you.",
  ],
  waiting: [
    "Take your time. I'm right here.",
    "No rush — pick what interests you.",
    "What catches your eye?",
  ],
};

const TRANSITIONS: Record<string, string[]> = {
  quiz: [
    "Let's test what you've learned.",
    "Time to put that knowledge to work.",
    "Quick check — see if this sticks.",
  ],
  video: [
    "Watch this — it ties everything together.",
    "Here's a visual that'll help.",
    "Sometimes seeing it is better than reading it.",
  ],
  explanation: [
    "Here's the key idea.",
    "Let me break this down.",
    "This is the part that matters.",
  ],
  practice: [
    "Now it's your turn.",
    "Enough theory — let's get hands-on.",
    "Try it yourself. That's where the real learning happens.",
  ],
  resources: [
    "Here are some resources to go deeper.",
    "If you want to explore more, start here.",
    "Bookmarks for later.",
  ],
  _default: [
    "Moving on.",
    "Next up.",
    "Let's keep going.",
  ],
};

// ── Helpers ────────────────────────────────────────────────

function buildSpeech(
  ctx: BilkoContext,
  tone: BilkoTone,
): { text: string; speech: string } {
  let key = ctx.event as string;

  // Special case: quiz-complete splits by score
  if (ctx.event === "quiz-complete") {
    key = ctx.progress && ctx.progress >= 0.7 ? "quiz-complete-high" : "quiz-complete-low";
  }

  const bank = SPEECH[key] ?? SPEECH["new-content"];
  let phrase = pick(bank, ctx.topic ?? ctx.event);

  // Personalize with user name
  if (ctx.userName && ctx.event === "greeting") {
    phrase = phrase.replace(
      "Welcome to",
      `${ctx.userName}, welcome to`,
    );
  }

  // Topic injection
  if (ctx.topic && (ctx.event === "new-content" || ctx.event === "choice-made")) {
    phrase = phrase.replace("this", `"${ctx.topic}"`);
  }

  return { text: phrase, speech: phrase };
}

/**
 * Deterministic pick from an array based on a seed string.
 * Same seed always picks the same phrase — prevents jarring randomness
 * while still varying across different contexts.
 */
function pick(arr: string[], seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return arr[Math.abs(hash) % arr.length];
}

/**
 * Bilko Persona Types
 *
 * Bilko is an amazing educator — passionate, interested in the user's goals,
 * meeting them at every step. This module defines the typed system for his
 * voice so agents can produce contextual, personality-rich responses.
 *
 * Bilko is NOT a chatbot. He's the host of the AI School.
 * He speaks through the canvas, not in a chat bubble.
 */

// ── Bilko's emotional register ─────────────────────────────

/** The emotional tone Bilko takes for a given moment */
export type BilkoTone =
  | "welcoming"     // First encounter, warm and inviting
  | "encouraging"   // User is working, keep them going
  | "celebrating"   // User achieved something
  | "curious"       // Asking the user what they want
  | "explaining"    // Teaching a concept
  | "challenging"   // Pushing the user to try harder
  | "reflective"    // Looking back at what was learned
  | "transitioning" // Moving between topics/sections
  | "empathetic";   // User struggled, acknowledging difficulty

// ── Context for generating Bilko speech ────────────────────

/** What Bilko knows about the current moment */
export interface BilkoContext {
  /** What just happened */
  event: BilkoEvent;
  /** User's name if known */
  userName?: string;
  /** The topic being discussed */
  topic?: string;
  /** How far along in a sequence (0-1) */
  progress?: number;
  /** Extra context an agent wants to pass */
  meta?: Record<string, unknown>;
}

export type BilkoEvent =
  | "greeting"           // First load
  | "returning"          // User came back
  | "choice-made"        // User picked an option
  | "task-complete"      // User finished something
  | "task-failed"        // Something went wrong
  | "new-content"        // Introducing new material
  | "quiz-correct"       // Got a question right
  | "quiz-incorrect"     // Got a question wrong
  | "quiz-complete"      // Finished a quiz
  | "video-loaded"       // Video ready to play
  | "explore-start"      // Starting exploration
  | "section-transition" // Moving to next section
  | "waiting"            // Waiting for user input
  | "custom";            // Agent-defined event

// ── Bilko's speech output ──────────────────────────────────

/** What Bilko will say — text for canvas, speech for TTS */
export interface BilkoSpeech {
  /** Display text (may include emphasis markers) */
  text: string;
  /** TTS text (natural spoken form, no formatting) */
  speech: string;
  /** The tone used */
  tone: BilkoTone;
}

// ── Transition phrases ─────────────────────────────────────

/** How Bilko connects content blocks together */
export interface BilkoTransition {
  /** The connecting phrase */
  speech: BilkoSpeech;
  /** How long to pause before the next block (ms) */
  pauseMs: number;
}

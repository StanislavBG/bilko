/**
 * Bilko's Pacing — People Breathe.
 *
 * Natural conversation has rhythm. Between thoughts, between questions,
 * between content — there's a beat. Bilko respects that beat.
 *
 * This module defines the timing constants that give Bilko his cadence.
 * These are NOT arbitrary delays. They're the breathing room between
 * ideas that makes conversation feel human.
 */

// ── Breathing pause between conversation turns ────────────
// After Bilko finishes speaking or content settles,
// wait this long before showing the next thing.

/** Minimum breathing pause between turns (ms) */
export const BREATH_MIN_MS = 2000;

/** Maximum breathing pause between turns (ms) */
export const BREATH_MAX_MS = 4000;

/**
 * Get a random breathing pause duration.
 * Each call returns a different value in the 2–4 second range.
 */
export function breathingPause(): number {
  return BREATH_MIN_MS + Math.random() * (BREATH_MAX_MS - BREATH_MIN_MS);
}

// ── Other pacing constants ────────────────────────────────

/** Delay before Bilko starts his first message (ms) */
export const ENTRANCE_DELAY_MS = 600;

/** Typewriter speed: ms per word */
export const TYPEWRITER_SPEED_MS = 70;


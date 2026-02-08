/**
 * BilkoMessage — Bilko speaks to the user.
 *
 * Full-canvas text that types itself out word-by-word, with optional TTS.
 * This is NOT a chat bubble. It's a first-class page element —
 * the website talking to you.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useVoice } from "@/contexts/voice-context";
import { useConversationDesign } from "@/contexts/conversation-design-context";
import { ENTRANCE_DELAY_MS, TYPEWRITER_SPEED_MS } from "@/lib/bilko-persona/pacing";

interface BilkoMessageProps {
  /** The text Bilko says */
  text: string;
  /** Optional different text for TTS (e.g. more natural spoken form) */
  speech?: string;
  /** Whether to speak aloud via TTS */
  speakAloud?: boolean;
  /** Called when the typewriter + speech finishes */
  onComplete?: () => void;
  /** Delay before starting (ms) */
  delay?: number;
  /** CSS class for the text container */
  className?: string;
  /** Speed: ms per word */
  speed?: number;
}

export function BilkoMessage({
  text,
  speech,
  speakAloud = true,
  onComplete,
  delay = ENTRANCE_DELAY_MS,
  className = "",
  speed = TYPEWRITER_SPEED_MS,
}: BilkoMessageProps) {
  const [displayedWords, setDisplayedWords] = useState(0);
  const [started, setStarted] = useState(false);
  const [complete, setComplete] = useState(false);
  const { speak, ttsSupported } = useVoice();
  const { bilkoStartedSpeaking, bilkoFinishedSpeaking } = useConversationDesign();
  const completeCalled = useRef(false);
  const words = text.split(/\s+/);

  // Start after delay
  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  // Typewriter: reveal word by word
  useEffect(() => {
    if (!started) return;
    if (displayedWords >= words.length) {
      setComplete(true);
      return;
    }
    const timer = setTimeout(() => {
      setDisplayedWords((w) => w + 1);
    }, speed);
    return () => clearTimeout(timer);
  }, [started, displayedWords, words.length, speed]);

  // TTS: speak when the typewriter starts
  useEffect(() => {
    if (!started || !speakAloud || !ttsSupported) return;
    bilkoStartedSpeaking();
    speak(speech || text)
      .then(() => {
        bilkoFinishedSpeaking();
      })
      .catch(() => {
        // If TTS fails for any reason, still release the floor
        bilkoFinishedSpeaking();
      });
  }, [started, speakAloud, ttsSupported]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fire onComplete once
  useEffect(() => {
    if (complete && !completeCalled.current) {
      completeCalled.current = true;
      onComplete?.();
    }
  }, [complete, onComplete]);

  if (!started) return null;

  return (
    <div className={className}>
      <p className="leading-relaxed">
        {words.slice(0, displayedWords).join(" ")}
        {!complete && (
          <span className="inline-block w-[3px] h-[1em] bg-primary ml-1 align-text-bottom animate-pulse" />
        )}
      </p>
    </div>
  );
}

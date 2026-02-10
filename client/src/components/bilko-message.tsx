/**
 * BilkoMessage — Bilko speaks to the user.
 *
 * Full-canvas text that types itself out word-by-word.
 * This is NOT a chat bubble. It's a first-class page element —
 * the website talking to you.
 */

import { useState, useEffect, useRef, useMemo } from "react";
import { useConversationDesign } from "@/contexts/conversation-design-context";
import { ENTRANCE_DELAY_MS, TYPEWRITER_SPEED_MS } from "@/lib/bilko-persona/pacing";

interface BilkoMessageProps {
  /** The text Bilko says */
  text: string;
  /** Called when the typewriter finishes */
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
  onComplete,
  delay = ENTRANCE_DELAY_MS,
  className = "",
  speed = TYPEWRITER_SPEED_MS,
}: BilkoMessageProps) {
  const [displayedWords, setDisplayedWords] = useState(0);
  const [started, setStarted] = useState(false);
  const [complete, setComplete] = useState(false);
  const { bilkoStartedSpeaking, bilkoFinishedSpeaking } = useConversationDesign();
  const completeCalled = useRef(false);
  const words = useMemo(() => text.split(/\s+/), [text]);

  // Start after delay
  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  // Signal that Bilko started when typewriter begins
  useEffect(() => {
    if (!started) return;
    bilkoStartedSpeaking();
  }, [started]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Fire onComplete once and signal Bilko finished
  useEffect(() => {
    if (complete && !completeCalled.current) {
      completeCalled.current = true;
      bilkoFinishedSpeaking();
      onComplete?.();
    }
  }, [complete, onComplete]); // eslint-disable-line react-hooks/exhaustive-deps

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

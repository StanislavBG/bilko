/**
 * ConversationCanvas — The website IS the conversation.
 *
 * A full-page layout engine that renders a dialogue between Bilko and the user.
 * No chat frame. The main content area IS the conversation.
 *
 * Each "turn" is either:
 * - Bilko speaking (typewriter text + TTS)
 * - The user responding (clicking option cards or voice)
 * - A content panel (experience rendered after user's choice)
 */

import { useState, useCallback, useRef, useEffect, type ReactNode } from "react";
import { BilkoMessage } from "@/components/bilko-message";
import { useVoice, useVoiceCommands } from "@/contexts/voice-context";
import type { VoiceTriggerOption } from "@/hooks/use-voice-recognition";

// ── Turn types ───────────────────────────────────────────

export interface BilkoTurn {
  type: "bilko";
  text: string;
  speech?: string;
  /** Delay before showing (ms) */
  delay?: number;
}

export interface OptionChoice {
  id: string;
  label: string;
  description: string;
  icon: ReactNode;
  voiceTriggers: readonly string[];
}

export interface UserChoiceTurn {
  type: "user-choice";
  options: OptionChoice[];
}

export interface ContentTurn {
  type: "content";
  render: () => ReactNode;
}

export type ConversationTurn = BilkoTurn | UserChoiceTurn | ContentTurn;

// ── Conversation state ───────────────────────────────────

interface ConversationEntry {
  turn: ConversationTurn;
  /** For user-choice turns: what the user picked */
  chosenId?: string;
  /** Has this entry finished animating/speaking */
  settled: boolean;
}

// ── Props ────────────────────────────────────────────────

interface ConversationCanvasProps {
  /** The sequence of turns. Can grow dynamically. */
  turns: ConversationTurn[];
  /** Called when user picks an option */
  onChoice: (choiceId: string) => void;
  /** Optional class on the outer wrapper */
  className?: string;
}

// ── Component ────────────────────────────────────────────

export function ConversationCanvas({
  turns,
  onChoice,
  className = "",
}: ConversationCanvasProps) {
  const [settledCount, setSettledCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new content appears
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [settledCount, turns.length]);

  const handleSettled = useCallback(() => {
    setSettledCount((c) => c + 1);
  }, []);

  // Determine how many turns to render: all settled + the next unsettled one
  const visibleCount = Math.min(settledCount + 1, turns.length);

  return (
    <div className={`flex-1 flex flex-col overflow-auto ${className}`}>
      <div className="flex-1 flex flex-col justify-end min-h-0">
        <div className="max-w-3xl mx-auto w-full px-4 py-8 space-y-8">
          {turns.slice(0, visibleCount).map((turn, i) => {
            const isLatest = i === visibleCount - 1;
            const isSettled = i < settledCount;

            return (
              <TurnRenderer
                key={i}
                turn={turn}
                index={i}
                isSettled={isSettled}
                isLatest={isLatest}
                onSettled={handleSettled}
                onChoice={onChoice}
              />
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}

// ── Turn renderer ────────────────────────────────────────

interface TurnRendererProps {
  turn: ConversationTurn;
  index: number;
  isSettled: boolean;
  isLatest: boolean;
  onSettled: () => void;
  onChoice: (id: string) => void;
}

function TurnRenderer({
  turn,
  index,
  isSettled,
  isLatest,
  onSettled,
  onChoice,
}: TurnRendererProps) {
  if (turn.type === "bilko") {
    return (
      <BilkoTurnView
        turn={turn}
        isSettled={isSettled}
        onSettled={onSettled}
      />
    );
  }

  if (turn.type === "user-choice") {
    return (
      <UserChoiceView
        turn={turn}
        isSettled={isSettled}
        isLatest={isLatest}
        onChoice={onChoice}
        onSettled={onSettled}
      />
    );
  }

  if (turn.type === "content") {
    return <ContentView turn={turn} onSettled={onSettled} />;
  }

  return null;
}

// ── Bilko's turn ─────────────────────────────────────────

function BilkoTurnView({
  turn,
  isSettled,
  onSettled,
}: {
  turn: BilkoTurn;
  isSettled: boolean;
  onSettled: () => void;
}) {
  if (isSettled) {
    // Already done — show static text
    return (
      <div className="animate-in fade-in duration-300">
        <p className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-tight text-foreground">
          {turn.text}
        </p>
      </div>
    );
  }

  return (
    <BilkoMessage
      text={turn.text}
      speech={turn.speech}
      speakAloud
      delay={turn.delay ?? 300}
      speed={70}
      onComplete={onSettled}
      className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-tight text-foreground"
    />
  );
}

// ── User choice turn ─────────────────────────────────────

function UserChoiceView({
  turn,
  isSettled,
  isLatest,
  onChoice,
  onSettled,
}: {
  turn: UserChoiceTurn;
  isSettled: boolean;
  isLatest: boolean;
  onChoice: (id: string) => void;
  onSettled: () => void;
}) {
  const [pickedId, setPickedId] = useState<string | null>(null);
  const settledCalled = useRef(false);

  // Voice commands — active only when this is the latest unsettled choice
  const voiceOptions: VoiceTriggerOption[] = turn.options.map((o) => ({
    id: o.id,
    voiceTriggers: o.voiceTriggers,
  }));

  const handlePick = useCallback(
    (id: string) => {
      if (pickedId) return; // Already picked
      setPickedId(id);
      onChoice(id);
      // Settle after a brief flash so the user sees their pick
      setTimeout(() => {
        if (!settledCalled.current) {
          settledCalled.current = true;
          onSettled();
        }
      }, 600);
    },
    [pickedId, onChoice, onSettled],
  );

  useVoiceCommands(
    `conv-choice-${turn.options[0]?.id}`,
    voiceOptions,
    handlePick,
    isLatest && !isSettled,
  );

  // If already settled (scrolled past), show compact "you chose X"
  if (isSettled && pickedId) {
    const chosen = turn.options.find((o) => o.id === pickedId);
    if (chosen) {
      return (
        <div className="flex items-center gap-3 opacity-60">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            {chosen.icon}
          </div>
          <span className="text-sm text-muted-foreground">{chosen.label}</span>
        </div>
      );
    }
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {turn.options.map((option, i) => {
        const isPicked = pickedId === option.id;
        const isDimmed = pickedId !== null && !isPicked;

        return (
          <button
            key={option.id}
            onClick={() => handlePick(option.id)}
            disabled={!!pickedId}
            className={`
              group relative text-left rounded-xl border-2 p-5 transition-all duration-300
              ${isPicked
                ? "border-primary bg-primary/5 scale-[1.02] shadow-lg"
                : isDimmed
                  ? "border-muted opacity-30 scale-95"
                  : "border-border hover:border-primary/50 hover:bg-muted/50 hover:shadow-md"
              }
            `}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-start gap-3">
              <div className={`
                w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors
                ${isPicked ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"}
              `}>
                {option.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm">{option.label}</h3>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {option.description}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Content turn ─────────────────────────────────────────

function ContentView({
  turn,
  onSettled,
}: {
  turn: ContentTurn;
  onSettled: () => void;
}) {
  // Content turns settle immediately — they're just rendered
  const settledRef = useRef(false);
  useEffect(() => {
    if (!settledRef.current) {
      settledRef.current = true;
      onSettled();
    }
  }, [onSettled]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {turn.render()}
    </div>
  );
}

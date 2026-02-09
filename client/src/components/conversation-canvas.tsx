/**
 * ConversationCanvas — The website IS the conversation.
 *
 * A full-page layout engine that renders a dialogue between Bilko, specialist
 * agents, and the user. No chat frame. The main content area IS the conversation.
 *
 * Speaker hierarchy (three tiers):
 * 1. Bilko (primary)    — Full-width bold text. The page IS Bilko.
 * 2. Sub-agents          — Left-border accent, name badge, surface tint.
 * 3. User (tertiary)     — Right-aligned iMessage-style bubble.
 *
 * Plus system messages for handoffs and status updates.
 *
 * Turn types:
 * - bilko: Bilko speaking (typewriter text + TTS)
 * - agent: Sub-agent speaking (left-border accent + badge + typewriter)
 * - user: User message (right-aligned bubble)
 * - user-choice: User responding (clicking option cards or voice)
 * - system: Meta-message for handoffs, status, returns
 * - content: Raw React content (escape hatch)
 * - content-blocks: Structured agent results rendered via block system
 *
 * Design principles:
 * - Color is NEVER the only differentiator (WCAG 1.4.1)
 * - Every agent gets: colored left border + name label + icon
 * - Consecutive same-speaker messages collapse redundant headers
 * - ARIA role="log" with aria-live="polite" for screen readers
 */

import { useState, useCallback, useRef, useEffect, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { BilkoMessage } from "@/components/bilko-message";
import { AgentBadge, getAgentColors } from "@/components/speaker-identity";
import { BlockSequence } from "@/components/content-blocks";
import type { ContentBlock, AgentContentResult } from "@/components/content-blocks/types";
import { useVoiceCommands } from "@/contexts/voice-context";
import { useConversationDesign } from "@/contexts/conversation-design-context";
import type { VoiceTriggerOption } from "@/hooks/use-voice-recognition";
import { breathingPause } from "@/lib/bilko-persona/pacing";

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
  /** Optional badge rendered at top-right of the tile */
  badge?: ReactNode;
}

export interface UserChoiceTurn {
  type: "user-choice";
  options: OptionChoice[];
  /** Pre-selected option ID (for session restore) */
  selectedId?: string;
}

export interface AgentTurn {
  type: "agent";
  text: string;
  speech?: string;
  /** Agent chat name (e.g. "YoutubeExpert") */
  agentName: string;
  /** Agent display name (e.g. "YouTube Librarian") */
  agentDisplayName: string;
  /** Accent color class */
  accentColor?: string;
  /** Delay before showing (ms) */
  delay?: number;
}

export interface UserTurn {
  type: "user";
  text: string;
}

export interface ContentTurn {
  type: "content";
  render: () => ReactNode;
}

/**
 * Structured content blocks from an agent result.
 * The canvas renders these using the block system.
 */
export interface ContentBlocksTurn {
  type: "content-blocks";
  blocks: ContentBlock[];
  /** Quiz answer callback */
  onQuizAnswer?: (blockId: string, correct: boolean) => void;
  /** Widget registry for custom components */
  widgets?: Record<string, React.ComponentType<Record<string, unknown>>>;
}

/**
 * System message — meta-information about conversation flow.
 * Rendered as centered divider-style text (like Slack's "X joined").
 * Used for agent handoffs, returns, and status updates.
 */
export interface SystemTurn {
  type: "system";
  text: string;
  /** Optional: show a from → to handoff badge */
  handoff?: {
    fromName: string;
    fromChatName?: string;
    toName: string;
    toChatName?: string;
  };
}

export type ConversationTurn =
  | BilkoTurn
  | AgentTurn
  | UserTurn
  | UserChoiceTurn
  | SystemTurn
  | ContentTurn
  | ContentBlocksTurn;

// ── Props ────────────────────────────────────────────────

interface ConversationCanvasProps {
  /** The sequence of turns. Can grow dynamically. */
  turns: ConversationTurn[];
  /** Called when user picks an option */
  onChoice: (choiceId: string) => void;
  /** Optional class on the outer wrapper */
  className?: string;
  /** Compact mode for side-panel usage (smaller text, tighter spacing) */
  compact?: boolean;
  /** Number of turns already settled on mount (restored from session) */
  initialSettledCount?: number;
}

// ── Helper: build turns from AgentContentResult ──────────

/**
 * Convert an AgentContentResult into conversation turns.
 * Use this when an agent returns structured content.
 */
export function agentResultToTurns(
  result: AgentContentResult,
): ConversationTurn[] {
  const turns: ConversationTurn[] = [];

  // Bilko introduces the content
  if (result.introduction) {
    turns.push({
      type: "bilko",
      text: result.introduction.text,
      speech: result.introduction.speech ?? result.introduction.text,
      delay: 200,
    });
  }

  // The content blocks
  if (result.blocks.length > 0) {
    turns.push({
      type: "content-blocks",
      blocks: result.blocks,
    });
  }

  // Follow-up options
  if (result.followUp && result.followUp.length > 0) {
    turns.push({
      type: "user-choice",
      options: result.followUp.map((f) => ({
        id: f.id,
        label: f.label,
        description: f.description,
        icon: <span className="text-lg">{f.icon ?? ">"}</span>,
        voiceTriggers: f.voiceTriggers ?? [],
      })),
    });
  }

  return turns;
}

// ── Component ────────────────────────────────────────────

export function ConversationCanvas({
  turns,
  onChoice,
  className = "",
  compact = false,
  initialSettledCount = 0,
}: ConversationCanvasProps) {
  const [settledCount, setSettledCount] = useState(initialSettledCount);
  const [isBreathing, setIsBreathing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const breathTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { giveFloorToUser } = useConversationDesign();

  // Auto-scroll to bottom when new content appears
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [settledCount, turns.length]);

  // Clean up breathing timer on unmount
  useEffect(() => {
    return () => {
      if (breathTimerRef.current) clearTimeout(breathTimerRef.current);
    };
  }, []);

  const handleSettled = useCallback(() => {
    // After a turn settles, add a breathing pause before showing the next.
    // People breathe. Bilko does too.
    setIsBreathing(true);
    breathTimerRef.current = setTimeout(() => {
      setSettledCount((c) => {
        const nextCount = c + 1;
        // If Bilko just finished and there's no next turn, or the next turn
        // is a user-choice, give the floor to the user (auto-listen kicks in)
        const nextTurn = turns[nextCount];
        if (!nextTurn || nextTurn.type === "user-choice") {
          giveFloorToUser();
        }
        return nextCount;
      });
      setIsBreathing(false);
      breathTimerRef.current = null;
    }, breathingPause());
  }, [turns, giveFloorToUser]);

  // Determine how many turns to render: all settled + the next unsettled one
  // During breathing, don't show the next turn yet
  const visibleCount = isBreathing
    ? settledCount
    : Math.min(settledCount + 1, turns.length);

  // Build visible turns slice
  const visibleTurns = turns.slice(0, visibleCount);

  return (
    <div className={`flex-1 flex flex-col overflow-auto ${className}`}>
      <div className="flex-1 flex flex-col justify-end min-h-0">
        <div
          role="log"
          aria-label="Conversation with Bilko and assistant agents"
          aria-live="polite"
          className={compact
            ? "w-full px-4 py-6 space-y-5"
            : "max-w-3xl mx-auto w-full px-4 py-8 space-y-8"
          }
        >
          {visibleTurns.map((turn, i) => {
            const isLatest = i === visibleCount - 1;
            const isSettled = i < settledCount;
            const prevTurn = i > 0 ? visibleTurns[i - 1] : undefined;

            // Message grouping: consecutive same-speaker messages
            // collapse the redundant identity header
            const isGrouped = isSameSpeaker(turn, prevTurn);

            return (
              <TurnRenderer
                key={i}
                turn={turn}
                index={i}
                isSettled={isSettled}
                isLatest={isLatest}
                isGrouped={isGrouped}
                onSettled={handleSettled}
                onChoice={onChoice}
                compact={compact}
              />
            );
          })}

          {/* Breathing indicator — Bilko pauses between thoughts */}
          {isBreathing && settledCount < turns.length && (
            <div className="flex items-center gap-1.5 py-2">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-pulse" />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-pulse [animation-delay:200ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-pulse [animation-delay:400ms]" />
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}

// ── Message grouping ─────────────────────────────────────
// When the same speaker sends consecutive messages, we collapse
// the identity header on subsequent messages for cleaner visuals.

function isSameSpeaker(
  current: ConversationTurn,
  previous: ConversationTurn | undefined,
): boolean {
  if (!previous) return false;
  // Bilko → Bilko
  if (current.type === "bilko" && previous.type === "bilko") return true;
  // Same agent → same agent
  if (
    current.type === "agent" &&
    previous.type === "agent" &&
    current.agentName === previous.agentName
  )
    return true;
  return false;
}

// ── Turn renderer ────────────────────────────────────────

interface TurnRendererProps {
  turn: ConversationTurn;
  index: number;
  isSettled: boolean;
  isLatest: boolean;
  /** True when this turn follows the same speaker — collapse header */
  isGrouped: boolean;
  onSettled: () => void;
  onChoice: (id: string) => void;
  compact?: boolean;
}

function TurnRenderer({
  turn,
  isSettled,
  isLatest,
  isGrouped,
  onSettled,
  onChoice,
  compact,
}: TurnRendererProps) {
  if (turn.type === "bilko") {
    return (
      <BilkoTurnView
        turn={turn}
        isSettled={isSettled}
        onSettled={onSettled}
        compact={compact}
      />
    );
  }

  if (turn.type === "agent") {
    return (
      <AgentTurnView
        turn={turn}
        isSettled={isSettled}
        onSettled={onSettled}
        compact={compact}
        isGrouped={isGrouped}
      />
    );
  }

  if (turn.type === "user") {
    return <UserTurnView turn={turn} onSettled={onSettled} compact={compact} />;
  }

  if (turn.type === "user-choice") {
    return (
      <UserChoiceView
        turn={turn}
        isSettled={isSettled}
        isLatest={isLatest}
        onChoice={onChoice}
        onSettled={onSettled}
        compact={compact}
      />
    );
  }

  if (turn.type === "system") {
    return <SystemTurnView turn={turn} onSettled={onSettled} />;
  }

  if (turn.type === "content-blocks") {
    return <ContentBlocksView turn={turn} onSettled={onSettled} />;
  }

  if (turn.type === "content") {
    return <ContentView turn={turn} onSettled={onSettled} />;
  }

  return null;
}

// ── Bilko's turn ─────────────────────────────────────────
// Bilko is the page itself — full-width bold text, no frame, no avatar.

function BilkoTurnView({
  turn,
  isSettled,
  onSettled,
  compact,
}: {
  turn: BilkoTurn;
  isSettled: boolean;
  onSettled: () => void;
  compact?: boolean;
}) {
  const textClass = compact
    ? "text-base md:text-lg font-bold tracking-tight leading-tight text-foreground"
    : "text-xl md:text-2xl font-bold tracking-tight leading-tight text-foreground";

  if (isSettled) {
    return (
      <article aria-label={`Bilko says: ${turn.text}`} className="animate-in fade-in duration-300">
        <p className={textClass}>
          {turn.text}
        </p>
      </article>
    );
  }

  return (
    <article aria-label={`Bilko says: ${turn.text}`}>
      <BilkoMessage
        text={turn.text}
        speech={turn.speech}
        speakAloud
        delay={turn.delay ?? 300}
        speed={70}
        onComplete={onSettled}
        className={textClass}
      />
    </article>
  );
}

// ── Agent turn (subflow specialist, attributed message) ──
// Left-border accent + agent badge + surface tint.
// When grouped (consecutive same agent), skip the badge for cleaner flow.

function AgentTurnView({
  turn,
  isSettled,
  onSettled,
  compact,
  isGrouped,
}: {
  turn: AgentTurn;
  isSettled: boolean;
  onSettled: () => void;
  compact?: boolean;
  isGrouped?: boolean;
}) {
  const colors = getAgentColors(turn.agentName);

  const textClass = compact
    ? "text-sm md:text-base font-semibold tracking-tight leading-tight text-foreground"
    : "text-lg md:text-xl font-semibold tracking-tight leading-tight text-foreground";

  // Outer frame: left-border accent + subtle surface tint
  // When grouped (consecutive same agent), tighten the spacing by overriding
  // the parent's space-y gap with a negative top margin.
  const frameClass = `
    border-l-[3px] ${colors.border}
    ${colors.surface} rounded-r-lg
    ${compact ? "pl-3 pr-3 py-2 ml-1" : "pl-4 pr-4 py-3 ml-2"}
    ${isGrouped ? (compact ? "-mt-3" : "-mt-5") : ""}
    animate-in fade-in slide-in-from-left-2 duration-300
  `;

  if (isSettled) {
    return (
      <article
        aria-label={`${turn.agentDisplayName} says: ${turn.text}`}
        className={frameClass}
      >
        {!isGrouped && (
          <AgentBadge
            chatName={turn.agentName}
            displayName={turn.agentDisplayName}
            colors={colors}
          />
        )}
        <p className={textClass}>{turn.text}</p>
      </article>
    );
  }

  return (
    <article
      aria-label={`${turn.agentDisplayName} says: ${turn.text}`}
      className={frameClass}
    >
      {!isGrouped && (
        <AgentBadge
          chatName={turn.agentName}
          displayName={turn.agentDisplayName}
          colors={colors}
          thinking={!isSettled}
        />
      )}
      <BilkoMessage
        text={turn.text}
        speech={turn.speech}
        speakAloud
        delay={turn.delay ?? 200}
        speed={70}
        onComplete={onSettled}
        className={textClass}
      />
    </article>
  );
}

// ── User's turn (iMessage-style bubble, right-aligned) ──

function UserTurnView({
  turn,
  onSettled,
  compact,
}: {
  turn: UserTurn;
  onSettled: () => void;
  compact?: boolean;
}) {
  const settledRef = useRef(false);
  useEffect(() => {
    if (!settledRef.current) {
      settledRef.current = true;
      onSettled();
    }
  }, [onSettled]);

  return (
    <article
      aria-label={`You said: ${turn.text}`}
      className="flex justify-end animate-in fade-in slide-in-from-right-2 duration-300"
    >
      <div
        className={`max-w-[80%] rounded-2xl rounded-br-sm px-4 py-2 bg-primary text-primary-foreground ${
          compact ? "text-sm" : "text-base"
        }`}
      >
        {turn.text}
      </div>
    </article>
  );
}

// ── User choice turn ─────────────────────────────────────

function UserChoiceView({
  turn,
  isSettled,
  isLatest,
  onChoice,
  onSettled,
  compact,
}: {
  turn: UserChoiceTurn;
  isSettled: boolean;
  isLatest: boolean;
  onChoice: (id: string) => void;
  onSettled: () => void;
  compact?: boolean;
}) {
  const [pickedId, setPickedId] = useState<string | null>(turn.selectedId ?? null);
  const settledCalled = useRef(!!turn.selectedId);

  // If pre-selected (restored from session), fire settled immediately
  useEffect(() => {
    if (turn.selectedId && !isSettled) {
      onSettled();
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const voiceOptions: VoiceTriggerOption[] = turn.options.map((o) => ({
    id: o.id,
    voiceTriggers: o.voiceTriggers,
  }));

  const handlePick = useCallback(
    (id: string) => {
      if (pickedId) return;
      setPickedId(id);
      onChoice(id);
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
    <div className={`animate-in fade-in slide-in-from-bottom-4 duration-500 ${
      compact
        ? "grid grid-cols-1 sm:grid-cols-2 gap-3"
        : "grid grid-cols-2 md:grid-cols-3 gap-3"
    }`}>
      {turn.options.map((option, i) => {
        const isPicked = pickedId === option.id;
        const isDimmed = pickedId !== null && !isPicked;

        return (
          <button
            key={option.id}
            onClick={() => handlePick(option.id)}
            disabled={!!pickedId}
            className={`
              group relative text-left rounded-xl border-2 transition-all duration-300
              ${compact ? "p-4" : "p-5"}
              ${isPicked
                ? "border-primary bg-primary/5 scale-[1.02] shadow-lg"
                : isDimmed
                  ? "border-muted opacity-30 scale-95"
                  : "border-border hover:border-primary/50 hover:bg-muted/50 hover:shadow-md"
              }
            `}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            {option.badge && (
              <div className="absolute top-2 right-2">{option.badge}</div>
            )}
            <div className="flex items-start gap-3">
              <div className={`
                w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors
                ${isPicked ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"}
              `}>
                {option.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`font-semibold ${compact ? "text-sm" : "text-sm"}`}>{option.label}</h3>
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

// ── System turn (handoff / status / meta) ────────────────
// Centered divider-style message — like Slack's "X joined the channel".

function SystemTurnView({
  turn,
  onSettled,
}: {
  turn: SystemTurn;
  onSettled: () => void;
}) {
  const settledRef = useRef(false);
  useEffect(() => {
    if (!settledRef.current) {
      settledRef.current = true;
      onSettled();
    }
  }, [onSettled]);

  return (
    <div
      role="status"
      aria-label={turn.text}
      className="flex items-center gap-3 py-1 animate-in fade-in duration-500"
    >
      <div className="flex-1 h-px bg-border" />
      <div className="flex items-center gap-2 px-2">
        {turn.handoff ? (
          <HandoffBadge handoff={turn.handoff} />
        ) : (
          <span className="text-[11px] text-muted-foreground font-medium">
            {turn.text}
          </span>
        )}
      </div>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function HandoffBadge({
  handoff,
}: {
  handoff: NonNullable<SystemTurn["handoff"]>;
}) {
  const fromColors = handoff.fromChatName
    ? getAgentColors(handoff.fromChatName)
    : null;
  const toColors = handoff.toChatName
    ? getAgentColors(handoff.toChatName)
    : null;

  return (
    <span className="flex items-center gap-1.5 text-[11px] font-medium">
      <span className={fromColors?.accent ?? "text-foreground"}>
        {handoff.fromName}
      </span>
      <ArrowRight className="w-3 h-3 text-muted-foreground" />
      <span className={toColors?.accent ?? "text-foreground"}>
        {handoff.toName}
      </span>
    </span>
  );
}

// ── Content blocks turn ──────────────────────────────────

function ContentBlocksView({
  turn,
  onSettled,
}: {
  turn: ContentBlocksTurn;
  onSettled: () => void;
}) {
  const settledRef = useRef(false);
  useEffect(() => {
    if (!settledRef.current) {
      settledRef.current = true;
      onSettled();
    }
  }, [onSettled]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <BlockSequence
        blocks={turn.blocks}
        onQuizAnswer={turn.onQuizAnswer}
        widgets={turn.widgets}
      />
    </div>
  );
}

// ── Content turn (raw React — escape hatch) ──────────────

function ContentView({
  turn,
  onSettled,
}: {
  turn: ContentTurn;
  onSettled: () => void;
}) {
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

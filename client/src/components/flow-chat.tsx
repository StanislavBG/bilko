/**
 * FlowChat — Chat for flow-driven conversations.
 *
 * Chat ownership:
 * - The chat has an activeOwner (from FlowChatContext)
 * - Only the owner can push bilko/agent messages
 * - User and system messages are always accepted
 * - This component shows the owner badge and direction toggle
 *
 * Message direction (configurable):
 * - "top-down" (default): messages start at the top and grow downward
 * - "bottom-up": messages gravity-stick to the bottom (iMessage style)
 * - Stored in localStorage, toggled via the direction button
 *
 * Rules:
 * - ONLY messages render here (NO options, NO interactive cards)
 * - Messages come from flow steps (speaker + text) or user typing
 */

import { useEffect, useRef, useState } from "react";
import { User, ArrowRight, ArrowDown, ArrowUp } from "lucide-react";
import { BilkoMessage } from "@/components/bilko-message";
import { AgentBadge, getAgentColors } from "@/components/speaker-identity";
import { useFlowChat, type FlowChatMessage } from "@/lib/bilko-flow/runtime/flow-chat";
import { ENTRANCE_DELAY_MS } from "@/lib/bilko-persona/pacing";

// ── Main FlowChat component ─────────────────────────────

export function FlowChat() {
  const { messages, activeOwner, messageDirection, setMessageDirection } = useFlowChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [settledIds, setSettledIds] = useState<Set<string>>(new Set());

  const isBottomUp = messageDirection === "bottom-up";

  // Default (top-down): newest messages at top, old ones pushed down
  // Bottom-up: traditional chat — oldest at top, newest at bottom
  const displayMessages = isBottomUp ? messages : [...messages].reverse();

  // Track the first chronological message for entrance delay
  const firstMessageId = messages.length > 0 ? messages[0].id : null;

  // Auto-scroll: to top in top-down mode, to bottom in bottom-up mode
  useEffect(() => {
    if (isBottomUp) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    } else {
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [messages.length, settledIds.size, isBottomUp]);

  const handleSettled = (msgId: string) => {
    setSettledIds((prev) => new Set(prev).add(msgId));
  };

  const toggleDirection = () => {
    setMessageDirection(isBottomUp ? "top-down" : "bottom-up");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header bar with direction toggle */}
      <div className="border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="px-4 py-1.5 flex items-center justify-end">
          <button
            onClick={toggleDirection}
            className="p-1 rounded hover:bg-foreground/10 transition-colors"
            title={isBottomUp ? "Switch to newest-first" : "Switch to classic chat order"}
          >
            {isBottomUp ? (
              <ArrowUp className="h-3.5 w-3.5 text-muted-foreground/50" />
            ) : (
              <ArrowDown className="h-3.5 w-3.5 text-muted-foreground/50" />
            )}
          </button>
        </div>
      </div>

      {/* Message list — only messages, no options */}
      <div className="flex-1 overflow-auto" ref={scrollRef}>
        <div className={`flex flex-col min-h-full ${isBottomUp ? "justify-end" : ""}`}>
          <div
            role="log"
            aria-label="Conversation with Bilko"
            aria-live="polite"
            className="max-w-3xl mx-auto w-full px-4 py-6 space-y-5"
          >
            {displayMessages.map((msg, i) => {
              const isSettled = settledIds.has(msg.id);
              const prevMsg = i > 0 ? displayMessages[i - 1] : undefined;
              const isGrouped = isSameSpeaker(msg, prevMsg);
              const isFirst = msg.id === firstMessageId;

              return (
                <MessageRenderer
                  key={msg.id}
                  message={msg}
                  isFirst={isFirst}
                  isSettled={isSettled}
                  isGrouped={isGrouped}
                  onSettled={() => handleSettled(msg.id)}
                />
              );
            })}

            <div ref={bottomRef} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Message grouping ────────────────────────────────────

function isSameSpeaker(
  current: FlowChatMessage,
  previous: FlowChatMessage | undefined,
): boolean {
  if (!previous) return false;
  if (current.speaker === "bilko" && previous.speaker === "bilko") return true;
  if (
    current.speaker === "agent" &&
    previous.speaker === "agent" &&
    current.agentName === previous.agentName
  )
    return true;
  return false;
}

// ── Individual message renderer ─────────────────────────

function MessageRenderer({
  message,
  isFirst,
  isSettled,
  isGrouped,
  onSettled,
}: {
  message: FlowChatMessage;
  isFirst: boolean;
  isSettled: boolean;
  isGrouped: boolean;
  onSettled: () => void;
}) {
  switch (message.speaker) {
    case "bilko":
      return (
        <BilkoMessageView
          message={message}
          isFirst={isFirst}
          isSettled={isSettled}
          onSettled={onSettled}
        />
      );
    case "agent":
      return (
        <AgentMessageView
          message={message}
          isSettled={isSettled}
          isGrouped={isGrouped}
          onSettled={onSettled}
        />
      );
    case "user":
      return <UserMessageView message={message} onSettled={onSettled} />;
    case "system":
      return <SystemMessageView message={message} onSettled={onSettled} />;
    default:
      return null;
  }
}

// ── Bilko message ───────────────────────────────────────

function BilkoMessageView({
  message,
  isFirst,
  isSettled,
  onSettled,
}: {
  message: FlowChatMessage;
  isFirst: boolean;
  isSettled: boolean;
  onSettled: () => void;
}) {
  const textClass =
    "text-base md:text-lg font-bold tracking-tight leading-snug text-foreground";

  if (isSettled) {
    return (
      <article
        aria-label={`Bilko says: ${message.text}`}
        className="animate-in fade-in duration-300"
      >
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
            Bilko
          </span>
        </div>
        <p className={textClass}>{message.text}</p>
      </article>
    );
  }

  return (
    <article aria-label={`Bilko says: ${message.text}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
          Bilko
        </span>
      </div>
      <BilkoMessage
        text={message.text}
        delay={isFirst ? ENTRANCE_DELAY_MS : 200}
        speed={70}
        onComplete={onSettled}
        className={textClass}
      />
    </article>
  );
}

// ── Agent message ────────────────────────────────────────

function AgentMessageView({
  message,
  isSettled,
  isGrouped,
  onSettled,
}: {
  message: FlowChatMessage;
  isSettled: boolean;
  isGrouped: boolean;
  onSettled: () => void;
}) {
  const colors = getAgentColors(message.agentName ?? "");
  const textClass =
    "text-sm md:text-base font-semibold tracking-tight leading-snug text-foreground";

  const frameClass = `
    border-l-2 ${colors.border}
    ${colors.surface} rounded-r-lg
    pl-3 pr-3 py-2 ml-1
    ${isGrouped ? "-mt-2" : ""}
    animate-in fade-in slide-in-from-left-2 duration-300
  `;

  if (isSettled) {
    return (
      <article
        aria-label={`${message.agentDisplayName ?? "Agent"} says: ${message.text}`}
        className={frameClass}
      >
        {!isGrouped && (
          <AgentBadge
            chatName={message.agentName ?? "Agent"}
            displayName={message.agentDisplayName ?? "Agent"}
            colors={colors}
          />
        )}
        <p className={textClass}>{message.text}</p>
      </article>
    );
  }

  return (
    <article
      aria-label={`${message.agentDisplayName ?? "Agent"} says: ${message.text}`}
      className={frameClass}
    >
      {!isGrouped && (
        <AgentBadge
          chatName={message.agentName ?? "Agent"}
          displayName={message.agentDisplayName ?? "Agent"}
          colors={colors}
          thinking
        />
      )}
      <BilkoMessage
        text={message.text}
        delay={200}
        speed={70}
        onComplete={onSettled}
        className={textClass}
      />
    </article>
  );
}

// ── User message ─────────────────────────────────────────

function UserMessageView({
  message,
  onSettled,
}: {
  message: FlowChatMessage;
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
    <article
      aria-label={`You said: ${message.text}`}
      className="flex justify-end animate-in fade-in slide-in-from-right-2 duration-300"
    >
      <div className="flex items-end gap-2 max-w-[80%]">
        <div className="rounded-2xl rounded-br-sm px-4 py-2 bg-primary text-primary-foreground text-base">
          {message.text}
        </div>
        <User className="h-4 w-4 text-muted-foreground/50 shrink-0 mb-1" />
      </div>
    </article>
  );
}

// ── System message ──────────────────────────────────────

function SystemMessageView({
  message,
  onSettled,
}: {
  message: FlowChatMessage;
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
      aria-label={message.text}
      className="flex items-center gap-3 py-1 animate-in fade-in duration-500"
    >
      <div className="flex-1 h-px bg-border" />
      <div className="flex items-center gap-2 px-2">
        {message.handoff ? (
          <span className="flex items-center gap-1.5 text-xs font-medium">
            <span className="text-foreground">{message.handoff.fromName}</span>
            <ArrowRight className="w-3 h-3 text-muted-foreground" />
            <span className="text-foreground">{message.handoff.toName}</span>
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground font-medium">
            {message.text}
          </span>
        )}
      </div>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

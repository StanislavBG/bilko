/**
 * FlowChat — Voice-aware chat for flow-driven conversations.
 *
 * Rules:
 * - ONLY messages render here (NO options, NO interactive cards)
 * - Messages come from flow steps (speaker + text) or user speaking/typing
 * - TTS triggers only for bilko/agent messages (not user, not system)
 * - Prominent speaker/listener indicators
 * - Voice defaults to ON
 *
 * This is the chat half of the landing page. The main app area handles
 * options, sub-flows, and interactive content separately.
 */

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Volume2, User, ArrowRight } from "lucide-react";
import { BilkoMessage } from "@/components/bilko-message";
import { AgentBadge, getAgentColors } from "@/components/speaker-identity";
import { useFlowChat, type FlowChatMessage } from "@/lib/flow-engine/flow-chat";
import { useVoice } from "@/contexts/voice-context";
import { useConversationDesign } from "@/contexts/conversation-design-context";
import { ENTRANCE_DELAY_MS } from "@/lib/bilko-persona/pacing";

// ── Main FlowChat component ─────────────────────────────

export function FlowChat() {
  const { messages } = useFlowChat();
  const { isListening, isSpeaking, isMuted, transcript, toggleListening } = useVoice();
  const { floor } = useConversationDesign();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [settledIds, setSettledIds] = useState<Set<string>>(new Set());

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, settledIds.size]);

  const handleSettled = (msgId: string) => {
    setSettledIds((prev) => new Set(prev).add(msgId));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Speaker/Listener indicator — prominent bar at top */}
      <SpeakerIndicator
        floor={floor}
        isListening={isListening}
        isSpeaking={isSpeaking}
        isMuted={isMuted}
        transcript={transcript}
        onToggleMic={toggleListening}
      />

      {/* Message list — only messages, no options */}
      <div className="flex-1 overflow-auto">
        <div className="flex flex-col justify-end min-h-full">
          <div
            role="log"
            aria-label="Conversation with Bilko"
            aria-live="polite"
            className="max-w-3xl mx-auto w-full px-4 py-6 space-y-5"
          >
            {messages.map((msg, i) => {
              const isSettled = settledIds.has(msg.id);
              const prevMsg = i > 0 ? messages[i - 1] : undefined;
              const isGrouped = isSameSpeaker(msg, prevMsg);

              return (
                <MessageRenderer
                  key={msg.id}
                  message={msg}
                  isFirst={i === 0}
                  isSettled={isSettled}
                  isGrouped={isGrouped}
                  onSettled={() => handleSettled(msg.id)}
                />
              );
            })}

            {/* Live transcript preview while user is speaking */}
            {isListening && transcript && !isMuted && (
              <div className="flex justify-end animate-in fade-in duration-200">
                <div className="max-w-[80%] rounded-2xl rounded-br-sm px-4 py-2 bg-primary/20 text-primary-foreground/70 text-base italic border border-primary/30">
                  {transcript}
                  <span className="inline-block w-[3px] h-[1em] bg-primary/50 ml-1 align-text-bottom animate-pulse" />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>
      </div>

      {/* Bottom mic bar — compact toggle */}
      <BottomMicBar
        isListening={isListening}
        isMuted={isMuted}
        isSpeaking={isSpeaking}
        onToggle={toggleListening}
      />
    </div>
  );
}

// ── Speaker/Listener Indicator (prominent) ───────────────

function SpeakerIndicator({
  floor,
  isListening,
  isSpeaking,
  isMuted,
  transcript,
  onToggleMic,
}: {
  floor: string;
  isListening: boolean;
  isSpeaking: boolean;
  isMuted: boolean;
  transcript: string;
  onToggleMic: () => void;
}) {
  const micActive = isListening && !isMuted;

  // Determine the state label and color
  let stateLabel: string;
  let stateColor: string;
  let bgColor: string;
  let icon: React.ReactNode;

  if (isSpeaking || (isMuted && isListening)) {
    stateLabel = "Bilko is speaking";
    stateColor = "text-amber-400";
    bgColor = "bg-amber-500/10 border-amber-500/20";
    icon = <Volume2 className="h-4 w-4 text-amber-400 animate-pulse" />;
  } else if (micActive && floor === "user") {
    stateLabel = "Your turn — listening";
    stateColor = "text-green-400";
    bgColor = "bg-green-500/10 border-green-500/20";
    icon = <Mic className="h-4 w-4 text-green-400" />;
  } else if (micActive) {
    stateLabel = "Listening";
    stateColor = "text-green-400/70";
    bgColor = "bg-green-500/5 border-green-500/10";
    icon = <Mic className="h-4 w-4 text-green-400/70" />;
  } else {
    stateLabel = "Voice off — tap to enable";
    stateColor = "text-muted-foreground/60";
    bgColor = "bg-muted/50 border-border";
    icon = <MicOff className="h-4 w-4 text-muted-foreground/40" />;
  }

  return (
    <div className={`border-b ${bgColor} transition-colors duration-300`}>
      <div className="px-4 py-2.5 flex items-center gap-3">
        {/* Mic toggle */}
        <button
          onClick={onToggleMic}
          className="p-1.5 rounded-full hover:bg-foreground/10 transition-colors"
          title={isListening ? "Turn off microphone" : "Turn on microphone"}
        >
          {icon}
        </button>

        {/* State label */}
        <span className={`text-sm font-medium ${stateColor} flex-1`}>
          {stateLabel}
        </span>

        {/* Live transcript snippet */}
        {micActive && transcript && (
          <span className="text-xs text-foreground/60 truncate max-w-[200px]">
            "{transcript}"
          </span>
        )}

        {/* Voice mode badge */}
        {isListening && (
          <span className="text-[10px] font-mono font-bold text-green-500/70 bg-green-500/10 px-1.5 py-0.5 rounded">
            VOICE ON
          </span>
        )}
      </div>
    </div>
  );
}

// ── Bottom mic bar ───────────────────────────────────────

function BottomMicBar({
  isListening,
  isMuted,
  isSpeaking,
  onToggle,
}: {
  isListening: boolean;
  isMuted: boolean;
  isSpeaking: boolean;
  onToggle: () => void;
}) {
  const micActive = isListening && !isMuted;

  return (
    <div className="border-t border-border bg-background/95 backdrop-blur-sm px-4 py-2 flex items-center gap-2">
      <button
        onClick={onToggle}
        className={`p-2 rounded-full transition-all ${
          micActive
            ? "bg-green-500/20 text-green-500 ring-2 ring-green-500/30"
            : isMuted
              ? "bg-amber-500/10 text-amber-500"
              : "text-muted-foreground/50 hover:text-foreground hover:bg-muted"
        }`}
        title={
          isListening
            ? isMuted
              ? "Mic paused — Bilko is speaking"
              : "Mic on — click to turn off"
            : "Mic off — click to start voice"
        }
      >
        {isListening ? (
          <Mic className="h-4 w-4" />
        ) : (
          <MicOff className="h-4 w-4" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        {isSpeaking ? (
          <p className="text-xs text-amber-500/80 font-medium">
            Bilko is speaking...
          </p>
        ) : micActive ? (
          <p className="text-xs text-green-500/70 font-medium">
            Listening — speak or type
          </p>
        ) : (
          <p className="text-xs text-muted-foreground/40">
            Tap mic to talk to Bilko
          </p>
        )}
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
    "text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight leading-tight text-foreground";

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
        speech={message.speech}
        speakAloud
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
    "text-xl md:text-2xl lg:text-3xl font-semibold tracking-tight leading-tight text-foreground";

  const frameClass = `
    border-l-[3px] ${colors.border}
    ${colors.surface} rounded-r-lg
    pl-4 pr-4 py-3 ml-2
    ${isGrouped ? "-mt-3" : ""}
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
        speech={message.speech}
        speakAloud
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

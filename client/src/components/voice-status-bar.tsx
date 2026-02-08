/**
 * Voice Status Bar — Unified voice protocol for the entire site.
 *
 * Single reusable component that shows mic state, conversational floor,
 * live transcript, and "Bilko Speaking" / "Your turn" indicators.
 *
 * Uses the global VoiceContext and ConversationDesignContext directly,
 * so it's truly singleton: no matter how many instances appear on screen,
 * they all reflect and control the same underlying voice stream.
 *
 * Drop this into any surface — landing page chat panel, interviewer flows,
 * future pages — and the voice protocol stays consistent everywhere.
 */

import { Mic, MicOff } from "lucide-react";
import { useVoice } from "@/contexts/voice-context";
import { useConversationDesign } from "@/contexts/conversation-design-context";

/**
 * Compact voice status bar with mic toggle + conversational state.
 *
 * The mic button is the ONE control for voice everywhere. When it's on,
 * Bilko's full conversational awareness kicks in — auto-resume, mute
 * during TTS, floor tracking. All instances share the same VoiceContext.
 */
export function VoiceStatusBar() {
  const { isListening, isMuted, isSpeaking, transcript, toggleListening } =
    useVoice();
  const { floor } = useConversationDesign();

  const micActive = isListening && !isMuted;
  const micMuted = isListening && isMuted;

  return (
    <div className="border-t border-border bg-background/95 backdrop-blur-sm">
      <div className="px-4 py-2 flex items-center gap-2">
        {/* Single mic toggle — the ONE control for voice */}
        <button
          onClick={toggleListening}
          className={`p-1.5 rounded-md transition-colors ${
            micActive
              ? "bg-green-500/15 text-green-500"
              : micMuted
              ? "bg-amber-500/10 text-amber-500"
              : "text-muted-foreground/50 hover:text-foreground hover:bg-muted"
          }`}
          title={
            isListening
              ? isMuted
                ? "Mic paused \u2014 Bilko is speaking"
                : "Mic on \u2014 click to turn off"
              : "Mic off \u2014 click to start voice conversation"
          }
        >
          {isListening ? (
            <Mic className="h-3.5 w-3.5" />
          ) : (
            <MicOff className="h-3.5 w-3.5" />
          )}
        </button>

        {/* Conversational status — shows what's happening */}
        <div className="flex-1 min-w-0">
          {isListening && isMuted && isSpeaking ? (
            <p className="text-xs text-amber-500/80">
              Bilko is speaking... mic will resume
            </p>
          ) : isListening && transcript ? (
            <p className="text-xs text-foreground truncate animate-in fade-in duration-200">
              {transcript}
            </p>
          ) : isListening && floor === "user" ? (
            <p className="text-xs text-green-500/70">
              Your turn &mdash; listening...
            </p>
          ) : isListening ? (
            <p className="text-xs text-muted-foreground/60">Listening...</p>
          ) : floor === "bilko" ? (
            <p className="text-xs text-muted-foreground/60">
              Bilko is speaking...
            </p>
          ) : (
            <p className="text-xs text-muted-foreground/40">
              Tap mic to talk to Bilko
            </p>
          )}
        </div>

        {/* Voice mode indicator */}
        {isListening && (
          <span className="text-[10px] font-mono text-green-500/60 shrink-0">
            VOICE
          </span>
        )}
      </div>
    </div>
  );
}

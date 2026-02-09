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
 * Voice is OFF by default. This bar provides an opt-in toggle.
 * When voice is on, shows full conversational awareness — auto-resume,
 * mute during TTS, floor tracking. All instances share the same VoiceContext.
 */
export function VoiceStatusBar() {
  const { isListening, isMuted, isSpeaking, transcript, toggleListening } =
    useVoice();
  const { floor } = useConversationDesign();

  const micActive = isListening && !isMuted;
  const micMuted = isListening && isMuted;

  // Voice OFF — compact opt-in toggle
  if (!isListening) {
    return (
      <div className="border-t border-border bg-background/95 backdrop-blur-sm">
        <div className="px-4 py-2">
          <button
            onClick={toggleListening}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full
              text-muted-foreground/60 hover:text-foreground
              bg-muted/40 hover:bg-muted
              transition-all duration-200"
            title="Enable voice — talk to Bilko"
          >
            <MicOff className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Enable voice</span>
          </button>
        </div>
      </div>
    );
  }

  // Voice ON — full status bar
  return (
    <div className="border-t border-border bg-background/95 backdrop-blur-sm">
      <div className="px-4 py-2 flex items-center gap-2">
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
            isMuted
              ? "Mic paused \u2014 Bilko is speaking"
              : "Mic on \u2014 click to turn off"
          }
        >
          <Mic className="h-3.5 w-3.5" />
        </button>

        <div className="flex-1 min-w-0">
          {isMuted && isSpeaking ? (
            <p className="text-xs text-amber-500/80">
              Bilko is speaking... mic will resume
            </p>
          ) : transcript ? (
            <p className="text-xs text-foreground truncate animate-in fade-in duration-200">
              {transcript}
            </p>
          ) : floor === "user" ? (
            <p className="text-xs text-green-500/70">
              Your turn &mdash; listening...
            </p>
          ) : (
            <p className="text-xs text-muted-foreground/60">Listening...</p>
          )}
        </div>

        <span className="text-[10px] font-mono text-green-500/60 shrink-0">
          VOICE
        </span>
      </div>
    </div>
  );
}

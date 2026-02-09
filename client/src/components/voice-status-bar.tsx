/**
 * Voice Status Bar — TTS-only indicator.
 *
 * Shows a subtle "Bilko is speaking" indicator when TTS is active.
 * STT (mic/listening) has been removed.
 */

import { Volume2 } from "lucide-react";
import { useVoice } from "@/contexts/voice-context";

export function VoiceStatusBar() {
  const { isSpeaking } = useVoice();

  if (!isSpeaking) return null;

  return (
    <div className="border-t border-border bg-background/95 backdrop-blur-sm">
      <div className="px-4 py-2 flex items-center gap-2">
        <Volume2 className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
        <p className="text-xs text-amber-500/80">
          Bilko is speaking...
        </p>
      </div>
    </div>
  );
}

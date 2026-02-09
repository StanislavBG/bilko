/**
 * Global Voice Context — TTS only.
 *
 * Manages Gemini TTS via /api/tts/speak.
 * STT (browser SpeechRecognition) has been removed.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
/** A single TTS utterance waiting in the queue. */
interface TtsQueueItem {
  text: string;
  voice?: string;
  resolve: () => void;
}

interface VoiceContextType {
  isSpeaking: boolean;
  ttsSupported: boolean;
  /** True after first user interaction unlocked audio playback */
  ttsUnlocked: boolean;
  /** Bilko speaks — uses Gemini TTS exclusively. Optional voice param selects Gemini voice. */
  speak: (text: string, voice?: string) => Promise<void>;
  stopSpeaking: () => void;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

export function VoiceProvider({ children }: { children: ReactNode }) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsUnlocked, setTtsUnlocked] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);

  // Gemini TTS refs
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const doSpeakRef = useRef<(text: string, voice?: string) => Promise<void>>(async () => {});
  const ttsUnlockedRef = useRef(false);
  const ttsSupportedRef = useRef(false);

  // TTS queue — messages are played sequentially, FIFO order.
  const ttsQueueRef = useRef<TtsQueueItem[]>([]);
  const processingQueueRef = useRef(false);
  const processQueueRef = useRef<() => void>(() => {});

  // ── Check if Gemini TTS is available on mount ──
  useEffect(() => {
    fetch("/api/tts/status")
      .then((r) => r.json())
      .then((data) => {
        if (data.available) {
          console.info("[TTS] Gemini TTS available — using server-side TTS");
          ttsSupportedRef.current = true;
          setTtsSupported(true);
        } else {
          console.warn("[TTS] Gemini TTS unavailable — GEMINI_API_KEY not configured");
        }
      })
      .catch(() => {
        console.warn("[TTS] Could not reach TTS status endpoint");
      });
  }, []);

  // ── TTS auto-unlock ──
  useEffect(() => {
    if (ttsUnlockedRef.current) return;

    const gestureUnlock = () => {
      if (ttsUnlockedRef.current) return;

      // Warm up the AudioContext
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        ctx.resume().then(() => ctx.close()).catch(() => {});
      } catch {
        const silence = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=");
        silence.play().catch(() => {});
      }

      ttsUnlockedRef.current = true;
      setTtsUnlocked(true);
      // Flush the TTS queue
      setTimeout(() => processQueueRef.current(), 100);

      document.removeEventListener("click", gestureUnlock, true);
      document.removeEventListener("touchstart", gestureUnlock, true);
      document.removeEventListener("keydown", gestureUnlock, true);
    };

    document.addEventListener("click", gestureUnlock, true);
    document.addEventListener("touchstart", gestureUnlock, true);
    document.addEventListener("keydown", gestureUnlock, true);

    return () => {
      document.removeEventListener("click", gestureUnlock, true);
      document.removeEventListener("touchstart", gestureUnlock, true);
      document.removeEventListener("keydown", gestureUnlock, true);
    };
  }, []);

  // ── Get or create a shared AudioContext for Web Audio API playback ──
  const getAudioContext = useCallback((): AudioContext => {
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      return audioContextRef.current;
    }
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = ctx;
    return ctx;
  }, []);

  // ── Gemini TTS: fetch audio from server and play via Web Audio API ──
  const doSpeak = useCallback(async (text: string, voice?: string): Promise<void> => {
    const preview = text.length > 60 ? text.slice(0, 60) + "..." : text;
    const selectedVoice = voice || "Kore";
    console.info(`[TTS:Gemini] Speaking (${selectedVoice}): "${preview}" (${text.split(/\s+/).length} words)`);

    const response = await fetch("/api/tts/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice: selectedVoice }),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.error || `TTS request failed: ${response.status}`);
    }

    const contentType = response.headers.get("Content-Type") || "audio/wav";
    const arrayBuffer = await response.arrayBuffer();
    console.info(`[TTS:Gemini] Received ${arrayBuffer.byteLength} bytes (${contentType})`);

    if (arrayBuffer.byteLength === 0) {
      throw new Error("Received empty audio response");
    }

    // Try Web Audio API first, fall back to HTML Audio element if decoding fails.
    try {
      await this_playViaWebAudio(arrayBuffer);
      return;
    } catch (webAudioErr) {
      console.warn("[TTS:Gemini] Web Audio API failed, trying Audio element fallback:", webAudioErr);
    }

    await this_playViaAudioElement(arrayBuffer, contentType);

    async function this_playViaWebAudio(data: ArrayBuffer): Promise<void> {
      const ctx = getAudioContext();
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      const audioBuffer = await ctx.decodeAudioData(data.slice(0));
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      currentSourceRef.current = source;

      return new Promise<void>((resolve, reject) => {
        source.onended = () => {
          console.info("[TTS:Gemini] Playback complete (Web Audio)");
          if (currentSourceRef.current === source) {
            currentSourceRef.current = null;
          }
          resolve();
        };

        try {
          source.start(0);
        } catch (startErr) {
          if (currentSourceRef.current === source) {
            currentSourceRef.current = null;
          }
          reject(startErr);
        }
      });
    }

    async function this_playViaAudioElement(data: ArrayBuffer, mime: string): Promise<void> {
      const blob = new Blob([data], { type: mime });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudioRef.current = audio;

      return new Promise<void>((resolve, reject) => {
        const cleanup = (ok: boolean) => {
          URL.revokeObjectURL(url);
          if (currentAudioRef.current === audio) {
            currentAudioRef.current = null;
          }
          ok ? resolve() : reject(new Error("Audio playback failed"));
        };

        audio.onended = () => {
          console.info("[TTS:Gemini] Playback complete (Audio element)");
          cleanup(true);
        };

        audio.onerror = () => {
          console.error("[TTS:Gemini] Audio element playback error");
          cleanup(false);
        };

        audio.play().catch((playError) => {
          console.error("[TTS:Gemini] play() rejected:", playError);
          cleanup(false);
        });
      });
    }
  }, [getAudioContext]);

  // ── Queue processor — drains items sequentially ──
  const processQueue = useCallback(async () => {
    if (processingQueueRef.current) return;
    if (!ttsUnlockedRef.current) return;
    processingQueueRef.current = true;

    setIsSpeaking(true);

    while (ttsQueueRef.current.length > 0) {
      const item = ttsQueueRef.current.shift()!;
      try {
        await doSpeak(item.text, item.voice);
      } catch {
        // doSpeak handles its own errors — just keep draining
      }
      item.resolve();
    }

    processingQueueRef.current = false;
    setIsSpeaking(false);
  }, [doSpeak]);

  // Keep refs in sync
  useEffect(() => {
    doSpeakRef.current = doSpeak;
  }, [doSpeak]);
  useEffect(() => {
    processQueueRef.current = processQueue;
  }, [processQueue]);

  // ── Public speak: pushes to the FIFO queue ──
  const speak = useCallback(async (text: string, voice?: string) => {
    if (!ttsSupportedRef.current) {
      console.info("[TTS] speak() called but Gemini TTS not available");
      return;
    }

    if (!ttsUnlockedRef.current) {
      console.info("[TTS] speak() called before unlock — queuing");
    }

    return new Promise<void>((resolve) => {
      ttsQueueRef.current.push({ text, voice, resolve });
      processQueueRef.current();
    });
  }, []);

  const stopSpeaking = useCallback(() => {
    // Drain the queue
    for (const item of ttsQueueRef.current) {
      item.resolve();
    }
    ttsQueueRef.current = [];
    processingQueueRef.current = false;

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
      } catch {
        // Ignore
      }
      currentSourceRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  return (
    <VoiceContext.Provider
      value={{
        isSpeaking,
        ttsSupported,
        ttsUnlocked,
        speak,
        stopSpeaking,
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
}

/** Access the global voice state */
export function useVoice() {
  const context = useContext(VoiceContext);
  if (context === undefined) {
    throw new Error("useVoice must be used within a VoiceProvider");
  }
  return context;
}

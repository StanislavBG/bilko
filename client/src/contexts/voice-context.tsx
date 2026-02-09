/**
 * Global Voice Context
 *
 * First-class voice abstraction for the entire site.
 * Manages a single SpeechRecognition instance, persists mic preference,
 * and lets any page register/unregister voice command handlers.
 *
 * TTS: Gemini TTS exclusively via /api/tts/speak (no browser fallback).
 * STT: Web Speech API (SpeechRecognition).
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
import type { VoiceTriggerOption } from "@/hooks/use-voice-recognition";
import {
  POST_TTS_BUFFER_MS,
  SILENCE_TIMEOUT_MS as PACING_SILENCE_TIMEOUT_MS,
} from "@/lib/bilko-persona/pacing";

const VOICE_STORAGE_KEY = "bilko-voice-enabled";

interface VoiceHandler {
  options: readonly VoiceTriggerOption[];
  onMatch: (matchedId: string) => void;
}

interface TranscriptEntry {
  text: string;
  timestamp: number;
}

interface VoiceContextType {
  isListening: boolean;
  isSpeaking: boolean;
  /** True when mic is suppressed during TTS playback */
  isMuted: boolean;
  isSupported: boolean;
  ttsSupported: boolean;
  /** True after first user interaction unlocked audio playback */
  ttsUnlocked: boolean;
  permissionDenied: boolean;
  transcript: string;
  /** Accumulated session transcript log (all final results) */
  transcriptLog: TranscriptEntry[];
  toggleListening: () => Promise<void>;
  startListening: () => Promise<void>;
  stopListening: () => void;
  /** Bilko speaks — uses Gemini TTS exclusively. Optional voice param selects Gemini voice. */
  speak: (text: string, voice?: string) => Promise<void>;
  stopSpeaking: () => void;
  registerHandler: (id: string, handler: VoiceHandler) => () => void;
  clearTranscriptLog: () => void;
  /**
   * Register a callback for when the user finishes speaking.
   * Fires after a silence gap following final speech results.
   * Returns unsubscribe function.
   */
  onUtteranceEnd: (callback: (text: string) => void) => () => void;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

const getSpeechRecognition = () => {
  if (typeof window === "undefined") return null;
  return (
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition ||
    null
  );
};

export function VoiceProvider({ children }: { children: ReactNode }) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [transcriptLog, setTranscriptLog] = useState<TranscriptEntry[]>([]);
  const [ttsUnlocked, setTtsUnlocked] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);

  const recognitionRef = useRef<any>(null);
  const handlersRef = useRef<Map<string, VoiceHandler>>(new Map());
  const isListeningRef = useRef(false);
  const permissionDeniedRef = useRef(false);
  const isMutedRef = useRef(false);
  const autoStartedRef = useRef(false);
  const ttsUnlockedRef = useRef(false);
  const ttsSupportedRef = useRef(false);
  const pendingSpeakRef = useRef<string | null>(null);
  const pendingSpeakVoiceRef = useRef<string | undefined>(undefined);
  const pendingSpeakResolveRef = useRef<(() => void) | null>(null);

  // Gemini TTS refs
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const doSpeakRef = useRef<(text: string, voice?: string) => Promise<void>>(async () => {});
  const startListeningRef = useRef<() => Promise<void>>(async () => {});

  // End-of-speech detection
  const utteranceEndCallbacksRef = useRef<Set<(text: string) => void>>(new Set());
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingFinalTextRef = useRef("");
  const SILENCE_TIMEOUT_MS = PACING_SILENCE_TIMEOUT_MS;

  const isSupported = getSpeechRecognition() !== null;

  // ── Check if OpenAI TTS is available on mount ──
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
  // Audio playback requires a user gesture (autoplay policy).
  // First user interaction marks TTS as unlocked.
  useEffect(() => {
    if (ttsUnlockedRef.current) return;

    const markUnlocked = () => {
      if (ttsUnlockedRef.current) return;
      ttsUnlockedRef.current = true;
      setTtsUnlocked(true);
    };

    const flushPending = () => {
      if (pendingSpeakRef.current !== null) {
        const text = pendingSpeakRef.current;
        const voice = pendingSpeakVoiceRef.current;
        const resolve = pendingSpeakResolveRef.current;
        pendingSpeakRef.current = null;
        pendingSpeakVoiceRef.current = undefined;
        pendingSpeakResolveRef.current = null;
        setTimeout(() => {
          doSpeakRef.current(text, voice).then(() => resolve?.());
        }, 100);
      }
    };

    // Unlock on first user interaction
    const gestureUnlock = () => {
      if (ttsUnlockedRef.current) return;
      markUnlocked();
      flushPending();

      // Auto-start mic on first user gesture if not already listening
      // and user hasn't explicitly disabled voice
      if (!isListeningRef.current && localStorage.getItem(VOICE_STORAGE_KEY) !== "false") {
        setTimeout(() => startListeningRef.current(), 300);
      }

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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep refs in sync with state so event handlers see current values
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);
  useEffect(() => {
    permissionDeniedRef.current = permissionDenied;
  }, [permissionDenied]);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Initialize speech recognition once on mount
  useEffect(() => {
    const SR = getSpeechRecognition();
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      // Suppress recognition results while Bilko is speaking (echo cancellation)
      if (isMutedRef.current) return;

      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      setTranscript(finalTranscript || interimTranscript);

      // Accumulate final transcripts into the session log
      if (finalTranscript) {
        const trimmed = finalTranscript.trim();
        if (trimmed) {
          setTranscriptLog((prev) => [
            ...prev,
            { text: trimmed, timestamp: Date.now() },
          ]);
        }
      }

      // On final transcript, check all registered handlers for matches
      if (finalTranscript) {
        const normalized = finalTranscript.toLowerCase().trim();
        for (const handler of Array.from(handlersRef.current.values())) {
          for (const option of handler.options) {
            for (const trigger of option.voiceTriggers) {
              if (normalized.includes(trigger.toLowerCase())) {
                handler.onMatch(option.id);
                return; // First match wins
              }
            }
          }
        }
      }

      // ── End-of-speech detection ──
      // Reset the silence timer on any speech activity.
      // After SILENCE_TIMEOUT_MS of no new results, fire utteranceEnd.
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      if (finalTranscript) {
        // Accumulate final text for the full utterance
        pendingFinalTextRef.current =
          (pendingFinalTextRef.current + " " + finalTranscript).trim();
      }

      if (pendingFinalTextRef.current) {
        silenceTimerRef.current = setTimeout(() => {
          const fullText = pendingFinalTextRef.current.trim();
          if (fullText) {
            for (const cb of utteranceEndCallbacksRef.current) {
              cb(fullText);
            }
            pendingFinalTextRef.current = "";
            setTranscript("");
          }
          silenceTimerRef.current = null;
        }, SILENCE_TIMEOUT_MS);
      }
    };

    recognition.onerror = (event: any) => {
      // "no-speech" and "aborted" are normal when mic is open but user isn't talking.
      // Only log real errors as errors; harmless ones go to debug.
      const harmless = ["no-speech", "aborted"];
      if (harmless.includes(event.error)) {
        console.debug("[STT] Expected:", event.error);
      } else {
        console.warn("[STT] Speech recognition error:", event.error);
      }
      if (
        event.error === "not-allowed" ||
        event.error === "permission-denied"
      ) {
        setPermissionDenied(true);
        localStorage.setItem(VOICE_STORAGE_KEY, "false");
      }
      // Don't stop listening for transient errors like no-speech
      if (!harmless.includes(event.error)) {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // Auto-restart if still meant to be listening
      if (isListeningRef.current && !permissionDeniedRef.current) {
        try {
          recognition.start();
        } catch (e) {
          // Ignore — might already be starting
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch (e) {
        // Ignore
      }
    };
  }, []);

  const startListening = useCallback(async () => {
    if (!recognitionRef.current) return;

    // Request microphone permission
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissionDenied(false);
    } catch (e) {
      setPermissionDenied(true);
      return;
    }

    // Mic permission granted — unlock TTS and flush any pending welcome speech.
    // The user just interacted with a permission dialog, so the browser may now
    // allow audio playback. This ensures Bilko's welcome message is heard.
    if (!ttsUnlockedRef.current) {
      ttsUnlockedRef.current = true;
      setTtsUnlocked(true);

      // Flush pending speak (e.g. Bilko's welcome message queued before unlock)
      if (pendingSpeakRef.current !== null) {
        const text = pendingSpeakRef.current;
        const voice = pendingSpeakVoiceRef.current;
        const resolve = pendingSpeakResolveRef.current;
        pendingSpeakRef.current = null;
        pendingSpeakVoiceRef.current = undefined;
        pendingSpeakResolveRef.current = null;
        setTimeout(() => {
          doSpeakRef.current(text, voice).then(() => resolve?.());
        }, 100);
      }
    }

    try {
      recognitionRef.current.start();
      setIsListening(true);
      setTranscript("");
      localStorage.setItem(VOICE_STORAGE_KEY, "true");
    } catch (e) {
      // Might already be started
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore
      }
    }
    setIsListening(false);
    localStorage.setItem(VOICE_STORAGE_KEY, "false");
  }, []);

  const toggleListening = useCallback(async () => {
    if (isListening) {
      stopListening();
    } else {
      await startListening();
    }
  }, [isListening, startListening, stopListening]);

  // ── Gemini TTS: fetch audio from server and play via Audio element ──
  const doSpeak = useCallback(async (text: string, voice?: string): Promise<void> => {
    const preview = text.length > 60 ? text.slice(0, 60) + "..." : text;
    const selectedVoice = voice || "Kore";
    console.info(`[TTS:Gemini] Speaking (${selectedVoice}): "${preview}" (${text.split(/\s+/).length} words)`);

    setIsMuted(true);
    setIsSpeaking(true);

    try {
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

      // Play via Audio element — more robust format support than Web Audio decodeAudioData
      const blob = new Blob([arrayBuffer], { type: contentType });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudioRef.current = audio;

      return new Promise<void>((resolve) => {
        const cleanup = () => {
          URL.revokeObjectURL(url);
          if (currentAudioRef.current === audio) {
            currentAudioRef.current = null;
          }
          setIsSpeaking(false);
          setTimeout(() => setIsMuted(false), POST_TTS_BUFFER_MS);
          resolve();
        };

        audio.onended = () => {
          console.info("[TTS:Gemini] Playback complete");
          cleanup();
        };

        audio.onerror = () => {
          console.error("[TTS:Gemini] Audio element playback error");
          cleanup();
        };

        audio.play().catch((playError) => {
          console.error("[TTS:Gemini] play() rejected:", playError);
          cleanup();
        });
      });
    } catch (error) {
      console.error("[TTS:Gemini] Error:", error);
      setIsSpeaking(false);
      setIsMuted(false);
    }
  }, []);

  // Keep refs in sync so gesture handlers can call these without circular deps
  useEffect(() => {
    doSpeakRef.current = doSpeak;
  }, [doSpeak]);
  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  // ── Public speak: gates on TTS unlock, queues if needed ──
  // If TTS hasn't been unlocked by a user gesture yet, we queue the
  // request and play it as soon as the user clicks/taps anything.
  // Latest speak always wins — if a newer message calls speak() before
  // the previous one played, the previous one is discarded.
  const speak = useCallback(async (text: string, voice?: string) => {
    // Clear any previous pending speak — newer message takes priority
    if (pendingSpeakRef.current !== null) {
      const prevResolve = pendingSpeakResolveRef.current;
      pendingSpeakRef.current = null;
      pendingSpeakVoiceRef.current = undefined;
      pendingSpeakResolveRef.current = null;
      prevResolve?.();
    }

    if (!ttsSupportedRef.current) {
      console.info("[TTS] speak() called but Gemini TTS not available");
      return;
    }

    if (ttsUnlockedRef.current) {
      return doSpeak(text, voice);
    }

    console.info("[TTS] speak() called before unlock — queuing");
    return new Promise<void>((resolve) => {
      pendingSpeakRef.current = text;
      pendingSpeakVoiceRef.current = voice;
      pendingSpeakResolveRef.current = resolve;
    });
  }, [doSpeak]);

  const stopSpeaking = useCallback(() => {
    // Stop Gemini TTS audio if playing
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    setIsSpeaking(false);
    setIsMuted(false);
  }, []);

  const registerHandler = useCallback(
    (id: string, handler: VoiceHandler) => {
      handlersRef.current.set(id, handler);
      return () => {
        handlersRef.current.delete(id);
      };
    },
    []
  );

  const clearTranscriptLog = useCallback(() => {
    setTranscriptLog([]);
  }, []);

  const onUtteranceEnd = useCallback((callback: (text: string) => void) => {
    utteranceEndCallbacksRef.current.add(callback);
    return () => {
      utteranceEndCallbacksRef.current.delete(callback);
    };
  }, []);

  // Clean up silence timer on unmount
  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, []);

  // Auto-start on mount — voice is on by default unless user explicitly disabled it
  useEffect(() => {
    if (!autoStartedRef.current && isSupported && localStorage.getItem(VOICE_STORAGE_KEY) !== "false") {
      autoStartedRef.current = true;
      startListening();
    }
  }, [isSupported, startListening]);

  return (
    <VoiceContext.Provider
      value={{
        isListening,
        isSpeaking,
        isMuted,
        isSupported,
        ttsSupported,
        ttsUnlocked,
        permissionDenied,
        transcript,
        transcriptLog,
        toggleListening,
        startListening,
        stopListening,
        speak,
        stopSpeaking,
        registerHandler,
        clearTranscriptLog,
        onUtteranceEnd,
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

/**
 * Register voice commands for a specific page/component.
 * Commands are automatically unregistered on unmount.
 */
export function useVoiceCommands(
  id: string,
  options: readonly VoiceTriggerOption[],
  onMatch: (matchedId: string) => void,
  enabled = true
) {
  const { registerHandler } = useVoice();
  const onMatchRef = useRef(onMatch);
  onMatchRef.current = onMatch;

  useEffect(() => {
    if (!enabled) return;
    return registerHandler(id, {
      options,
      onMatch: (matchedId) => onMatchRef.current(matchedId),
    });
  }, [id, options, enabled, registerHandler]);
}

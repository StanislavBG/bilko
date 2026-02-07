/**
 * Global Voice Context
 *
 * First-class voice abstraction for the entire site.
 * Manages a single SpeechRecognition instance, persists mic preference,
 * and lets any page register/unregister voice command handlers.
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
  permissionDenied: boolean;
  transcript: string;
  /** Accumulated session transcript log (all final results) */
  transcriptLog: TranscriptEntry[];
  toggleListening: () => Promise<void>;
  startListening: () => Promise<void>;
  stopListening: () => void;
  /** Bilko speaks — uses Web Speech API speechSynthesis */
  speak: (text: string) => Promise<void>;
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

  const recognitionRef = useRef<any>(null);
  const handlersRef = useRef<Map<string, VoiceHandler>>(new Map());
  const isListeningRef = useRef(false);
  const permissionDeniedRef = useRef(false);
  const isMutedRef = useRef(false);
  const autoStartedRef = useRef(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // End-of-speech detection
  const utteranceEndCallbacksRef = useRef<Set<(text: string) => void>>(new Set());
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingFinalTextRef = useRef("");
  const SILENCE_TIMEOUT_MS = 1500; // 1.5s of silence = user is done

  const isSupported = getSpeechRecognition() !== null;
  const ttsSupported = typeof window !== "undefined" && "speechSynthesis" in window;

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
      console.error("Speech recognition error:", event.error);
      if (
        event.error === "not-allowed" ||
        event.error === "permission-denied"
      ) {
        setPermissionDenied(true);
        localStorage.setItem(VOICE_STORAGE_KEY, "false");
      }
      setIsListening(false);
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

  // ── TTS: Bilko speaks (mutes mic to prevent echo) ──────
  const speak = useCallback(async (text: string) => {
    if (!ttsSupported) return;
    // Cancel any in-progress speech
    window.speechSynthesis.cancel();

    // Mute mic during TTS to prevent echo feedback
    setIsMuted(true);

    return new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.lang = "en-US";

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        // Brief delay before unmuting to avoid catching the tail end of TTS audio
        setTimeout(() => setIsMuted(false), 300);
        resolve();
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        setIsMuted(false);
        resolve();
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    });
  }, [ttsSupported]);

  const stopSpeaking = useCallback(() => {
    if (ttsSupported) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsMuted(false);
  }, [ttsSupported]);

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

  // Auto-start on mount if user previously enabled voice
  useEffect(() => {
    if (!autoStartedRef.current && isSupported && localStorage.getItem(VOICE_STORAGE_KEY) === "true") {
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

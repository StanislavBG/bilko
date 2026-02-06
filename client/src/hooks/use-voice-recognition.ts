/**
 * Voice Recognition Hook
 *
 * Uses Web Speech API to listen for voice commands and match them
 * against predefined triggers.
 */

import { useState, useEffect, useCallback, useRef } from "react";

// Type for voice triggers mapping
export interface VoiceTriggerOption {
  readonly id: string;
  readonly voiceTriggers: readonly string[];
}

interface UseVoiceRecognitionOptions<T extends string = string> {
  options: readonly VoiceTriggerOption[];
  onMatch: (matchedId: T) => void;
  continuous?: boolean;
}

interface UseVoiceRecognitionReturn {
  isListening: boolean;
  isSupported: boolean;
  permissionDenied: boolean;
  transcript: string;
  startListening: () => Promise<void>;
  stopListening: () => void;
  toggleListening: () => Promise<void>;
}

// Web Speech API types
interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: {
    [index: number]: SpeechRecognitionResult;
    isFinal: boolean;
    length: number;
  };
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

// Check if Web Speech API is supported
const getSpeechRecognition = () => {
  if (typeof window === "undefined") return null;
  return (
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition ||
    null
  );
};

export function useVoiceRecognition<T extends string = string>({
  options,
  onMatch,
  continuous = true,
}: UseVoiceRecognitionOptions<T>): UseVoiceRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const isSupported = getSpeechRecognition() !== null;

  // Find matching option from transcript
  const findMatch = useCallback(
    (text: string): T | null => {
      const normalizedText = text.toLowerCase().trim();

      for (const option of options) {
        for (const trigger of option.voiceTriggers) {
          // Check if the transcript contains the trigger word
          if (normalizedText.includes(trigger.toLowerCase())) {
            return option.id as T;
          }
        }
      }
      return null;
    },
    [options]
  );

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
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

      const currentTranscript = finalTranscript || interimTranscript;
      setTranscript(currentTranscript);

      // Check for matches in final transcript
      if (finalTranscript) {
        const matchedId = findMatch(finalTranscript);
        if (matchedId) {
          onMatch(matchedId);
          // Stop listening after a match (user can restart)
          recognition.stop();
          setIsListening(false);
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed" || event.error === "permission-denied") {
        setPermissionDenied(true);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      // Restart if still meant to be listening
      if (isListening && continuous && !permissionDenied) {
        try {
          recognition.start();
        } catch (e) {
          // Ignore - might already be starting
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore
        }
      }
    };
  }, [continuous, findMatch, onMatch, isListening, permissionDenied]);

  const startListening = useCallback(async () => {
    if (!recognitionRef.current) return;

    // First request microphone permission
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
  }, []);

  const toggleListening = useCallback(async () => {
    if (isListening) {
      stopListening();
    } else {
      await startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    isSupported,
    permissionDenied,
    transcript,
    startListening,
    stopListening,
    toggleListening,
  };
}

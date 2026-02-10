/**
 * Slideshow Video Player — image sequence + TTS narration.
 *
 * Creates a video-like experience by:
 * 1. Displaying styled scene cards that auto-advance with timing
 * 2. Using Web Speech Synthesis to narrate each scene
 * 3. Showing a progress bar and play/pause controls
 *
 * Each scene renders the image description as a visual frame
 * with cinematic styling, headline overlay, and transition effects.
 *
 * Target: ~60 seconds (10s intro + 15-20s per news story)
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export interface StoryboardScene {
  sceneNumber: number;
  headline: string;
  imageDescription: string;
  visualStyle: string;
  durationSec: number;
  narrationText: string;
  transitionIn: string;
  transitionOut: string;
}

export interface StoryboardData {
  scenes: StoryboardScene[];
}

export interface NarrativeData {
  intro: { text: string; durationSec: number };
  segments: Array<{
    storyIndex: number;
    headline: string;
    narration: string;
    durationSec: number;
  }>;
  totalDurationSec: number;
}

type PlayerState = "idle" | "playing" | "paused" | "finished";

const SCENE_GRADIENTS = [
  "from-green-900 via-emerald-800 to-green-950",
  "from-purple-900 via-indigo-800 to-purple-950",
  "from-blue-900 via-cyan-800 to-blue-950",
  "from-red-900 via-rose-800 to-red-950",
  "from-orange-900 via-amber-800 to-orange-950",
];

const TRANSITION_CLASSES: Record<string, string> = {
  "fade-in": "animate-in fade-in duration-700",
  "dissolve": "animate-in fade-in duration-1000",
  "slide-left": "animate-in slide-in-from-right duration-500",
  "slide-up": "animate-in slide-in-from-bottom duration-500",
  "zoom": "animate-in zoom-in-95 duration-500",
};

export function SlideshowPlayer({
  storyboard,
  narrative,
}: {
  storyboard: StoryboardData;
  narrative: NarrativeData;
}) {
  const [playerState, setPlayerState] = useState<PlayerState>("idle");
  const [currentScene, setCurrentScene] = useState(0);
  const [progress, setProgress] = useState(0);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [sceneKey, setSceneKey] = useState(0);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const sceneStartRef = useRef<number>(0);

  const scenes = storyboard.scenes;
  const totalDuration = narrative.totalDurationSec;

  const stopTTS = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
  }, []);

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
    timerRef.current = null;
    progressRef.current = null;
  }, []);

  const speakNarration = useCallback(
    (text: string) => {
      if (!ttsEnabled || typeof window === "undefined" || !window.speechSynthesis) return;

      stopTTS();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.volume = 0.9;
      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [ttsEnabled, stopTTS],
  );

  const getNarrationForScene = useCallback(
    (sceneIdx: number): string => {
      const scene = scenes[sceneIdx];
      if (!scene) return "";
      return scene.narrationText;
    },
    [scenes],
  );

  const getElapsedBefore = useCallback(
    (sceneIdx: number): number => {
      let elapsed = 0;
      for (let i = 0; i < sceneIdx; i++) {
        elapsed += scenes[i]?.durationSec ?? 0;
      }
      return elapsed;
    },
    [scenes],
  );

  const advanceScene = useCallback(
    (sceneIdx: number) => {
      if (sceneIdx >= scenes.length) {
        setPlayerState("finished");
        setProgress(100);
        clearTimers();
        stopTTS();
        return;
      }

      setCurrentScene(sceneIdx);
      setSceneKey((k) => k + 1);
      sceneStartRef.current = Date.now();

      const sceneDuration = scenes[sceneIdx].durationSec * 1000;
      const elapsedBefore = getElapsedBefore(sceneIdx);

      // Speak narration
      speakNarration(getNarrationForScene(sceneIdx));

      // Update progress every 100ms
      progressRef.current = setInterval(() => {
        const sceneElapsed = Date.now() - sceneStartRef.current;
        const totalElapsed = elapsedBefore + sceneElapsed / 1000;
        setProgress(Math.min((totalElapsed / totalDuration) * 100, 100));
      }, 100);

      // Schedule next scene
      timerRef.current = setTimeout(() => {
        if (progressRef.current) clearInterval(progressRef.current);
        advanceScene(sceneIdx + 1);
      }, sceneDuration);
    },
    [scenes, totalDuration, getElapsedBefore, speakNarration, getNarrationForScene, clearTimers, stopTTS],
  );

  const play = useCallback(() => {
    if (playerState === "idle" || playerState === "finished") {
      setCurrentScene(0);
      setProgress(0);
      setPlayerState("playing");
      clearTimers();
      advanceScene(0);
    } else if (playerState === "paused") {
      setPlayerState("playing");
      advanceScene(currentScene);
    }
  }, [playerState, currentScene, advanceScene, clearTimers]);

  const pause = useCallback(() => {
    setPlayerState("paused");
    clearTimers();
    stopTTS();
  }, [clearTimers, stopTTS]);

  const restart = useCallback(() => {
    clearTimers();
    stopTTS();
    setCurrentScene(0);
    setProgress(0);
    setPlayerState("playing");
    setTimeout(() => advanceScene(0), 50);
  }, [clearTimers, stopTTS, advanceScene]);

  const goToScene = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= scenes.length) return;
      clearTimers();
      stopTTS();
      if (playerState === "playing") {
        advanceScene(idx);
      } else {
        setCurrentScene(idx);
        setSceneKey((k) => k + 1);
        const elapsed = getElapsedBefore(idx);
        setProgress((elapsed / totalDuration) * 100);
      }
    },
    [scenes.length, playerState, clearTimers, stopTTS, advanceScene, getElapsedBefore, totalDuration],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers();
      stopTTS();
    };
  }, [clearTimers, stopTTS]);

  const scene = scenes[currentScene];
  const gradient = SCENE_GRADIENTS[currentScene % SCENE_GRADIENTS.length];
  const transition = scene ? TRANSITION_CLASSES[scene.transitionIn] ?? TRANSITION_CLASSES["fade-in"] : "";

  const downloadScript = useCallback(() => {
    const scriptText = [
      `# Video Script: ${narrative.intro.text.slice(0, 50)}...`,
      `# Total Duration: ${narrative.totalDurationSec}s`,
      `# Scenes: ${scenes.length}`,
      "",
      "---",
      "",
      ...scenes.map(
        (s) =>
          `## Scene ${s.sceneNumber}: ${s.headline}\n` +
          `Duration: ${s.durationSec}s\n` +
          `Visual: ${s.imageDescription}\n` +
          `Style: ${s.visualStyle}\n` +
          `Transition: ${s.transitionIn} → ${s.transitionOut}\n` +
          `\nNarration:\n"${s.narrationText}"\n`,
      ),
    ].join("\n");

    const blob = new Blob([scriptText], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `video-script-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [scenes, narrative]);

  return (
    <div className="space-y-4">
      {/* Video Screen */}
      <div className="rounded-xl overflow-hidden border-2 border-border bg-black aspect-video relative">
        {/* Scene Display */}
        {scene ? (
          <div
            key={sceneKey}
            className={`absolute inset-0 bg-gradient-to-br ${gradient} flex flex-col justify-end p-6 ${transition}`}
          >
            {/* Scene number badge */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <span className="text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded">
                {scene.sceneNumber}/{scenes.length}
              </span>
              <span className="text-[10px] text-white/50">{scene.durationSec}s</span>
            </div>

            {/* Visual style indicator */}
            <div className="absolute top-4 right-4">
              <span className="text-[10px] text-white/40 italic">{scene.visualStyle}</span>
            </div>

            {/* Image description as cinematic frame text */}
            <div className="flex-1 flex items-center justify-center px-8">
              <p className="text-center text-white/60 text-sm italic leading-relaxed max-w-md">
                {scene.imageDescription}
              </p>
            </div>

            {/* Headline overlay */}
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white drop-shadow-lg leading-tight">
                {scene.headline}
              </h3>
              {/* Narration text subtitle */}
              <p className="text-xs text-white/70 leading-relaxed line-clamp-2">
                {scene.narrationText}
              </p>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-white/50 text-sm">Press play to start</p>
          </div>
        )}

        {/* Idle overlay */}
        {playerState === "idle" && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <button
              onClick={play}
              className="w-16 h-16 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <Play className="h-8 w-8 text-white ml-1" />
            </button>
          </div>
        )}

        {/* Finished overlay */}
        {playerState === "finished" && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3">
            <p className="text-white/70 text-sm font-medium">Video Complete</p>
            <button
              onClick={restart}
              className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <RotateCcw className="h-5 w-5 text-white" />
            </button>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-green-500 h-full rounded-full transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Play/Pause */}
          {playerState === "playing" ? (
            <Button variant="outline" size="sm" onClick={pause}>
              <Pause className="h-3.5 w-3.5 mr-1" /> Pause
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={play}>
              <Play className="h-3.5 w-3.5 mr-1" />
              {playerState === "finished" ? "Replay" : "Play"}
            </Button>
          )}

          {/* Prev/Next */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => goToScene(currentScene - 1)}
            disabled={currentScene === 0}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums">
            {currentScene + 1}/{scenes.length}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => goToScene(currentScene + 1)}
            disabled={currentScene >= scenes.length - 1}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* TTS toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (ttsEnabled) stopTTS();
              setTtsEnabled(!ttsEnabled);
            }}
            className="text-muted-foreground"
          >
            {ttsEnabled ? (
              <Volume2 className="h-3.5 w-3.5" />
            ) : (
              <VolumeX className="h-3.5 w-3.5" />
            )}
          </Button>

          {/* Download script */}
          <Button variant="ghost" size="sm" onClick={downloadScript} className="text-muted-foreground">
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Scene thumbnails */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {scenes.map((s, i) => (
          <button
            key={i}
            onClick={() => goToScene(i)}
            className={`shrink-0 w-20 rounded-md p-1.5 text-left transition-colors border ${
              i === currentScene
                ? "border-green-500 bg-green-500/10"
                : "border-border bg-muted/30 hover:bg-muted/50"
            }`}
          >
            <p className="text-[9px] font-bold truncate">{s.headline}</p>
            <p className="text-[8px] text-muted-foreground">{s.durationSec}s</p>
          </button>
        ))}
      </div>
    </div>
  );
}

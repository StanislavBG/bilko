/**
 * Video Plan View — displays AI video generation prompts and continuous video.
 *
 * Shows Veo-optimized scene prompts with camera movements, visual moods,
 * duration targets, and the scene extension technique used to create a
 * continuous ~22-second AI-generated video from 3 chained clips.
 *
 * When a continuous video has been generated, displays the merged video
 * player prominently at the top, followed by the per-scene prompt details.
 */

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, Video, Camera, Clock, Palette, ArrowRightLeft, Play, Download, Link2 } from "lucide-react";
import type { ContinuousVideoResult } from "@/lib/bilko-flow";

export interface VideoPromptScene {
  sceneNumber: number;
  headline: string;
  veoPrompt: string;
  durationSec: number;
  cameraMovement: string;
  visualMood: string;
  transitionType: string;
}

export interface VideoPromptsData {
  scenes: VideoPromptScene[];
  extensionTechnique: string;
  productionNotes: string;
}

export function VideoPlanView({
  data,
  continuousVideo,
}: {
  data: VideoPromptsData;
  continuousVideo?: ContinuousVideoResult;
}) {
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedScene, setCopiedScene] = useState<number | null>(null);

  const copyAllPrompts = useCallback(() => {
    const text = [
      "# AI Video Generation Prompts (Scene Extension Chain)",
      `# Total Scenes: ${data.scenes.length}`,
      `# Target Duration: ~${data.scenes.reduce((s, sc) => s + sc.durationSec, 0)}s (continuous)`,
      `# Technique: Scene extension — each clip grounded on the last ~1s of the previous`,
      "",
      ...data.scenes.map(
        (s) =>
          `## Scene ${s.sceneNumber}: ${s.headline}\n` +
          `Type: ${s.transitionType === "initial" ? "Initial generation (8s)" : "Scene extension (~7s)"}\n` +
          `Prompt: ${s.veoPrompt}\n` +
          `Camera: ${s.cameraMovement} | Mood: ${s.visualMood}\n`,
      ),
      "---",
      `## Extension Technique\n${data.extensionTechnique}`,
      "",
      `## Production Notes\n${data.productionNotes}`,
    ].join("\n");

    navigator.clipboard.writeText(text).then(() => {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    });
  }, [data]);

  const copyScenePrompt = useCallback((scene: VideoPromptScene) => {
    navigator.clipboard.writeText(scene.veoPrompt).then(() => {
      setCopiedScene(scene.sceneNumber);
      setTimeout(() => setCopiedScene(null), 2000);
    });
  }, []);

  const totalDuration = data.scenes.reduce((s, sc) => s + sc.durationSec, 0);
  const hasMergedVideo = !!continuousVideo?.mergedVideo;
  const clipCount = continuousVideo?.clips?.filter(Boolean).length ?? 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border-2 border-border p-4 bg-gradient-to-r from-violet-500/5 to-purple-500/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Video className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">
                {hasMergedVideo ? "Continuous AI Video" : "AI Video Production Plan"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {hasMergedVideo
                  ? `~${continuousVideo!.totalDurationSeconds}s merged from ${clipCount} clips via scene extension`
                  : `${data.scenes.length} scenes \u00b7 ~${totalDuration}s target`}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={copyAllPrompts}>
            {copiedAll ? (
              <Check className="h-3.5 w-3.5 mr-1 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5 mr-1" />
            )}
            {copiedAll ? "Copied" : "Copy All"}
          </Button>
        </div>
      </div>

      {/* ── Merged Continuous Video Player ─────────────────── */}
      {hasMergedVideo && (() => {
        const merged = continuousVideo!.mergedVideo!;
        const videoUrl = `data:${merged.mimeType};base64,${merged.videoBase64}`;
        return (
          <div className="rounded-xl overflow-hidden border-2 border-violet-500/30 bg-black">
            <div className="flex items-center gap-2 px-4 py-2 bg-violet-500/10 border-b border-violet-500/20">
              <Play className="h-4 w-4 text-violet-500" />
              <span className="text-xs font-semibold text-violet-500">
                Continuous Video — ~{continuousVideo!.totalDurationSeconds}s
              </span>
              <span className="text-[10px] text-violet-500/60 ml-1">
                ({clipCount} clips chained via scene extension)
              </span>
              <a
                href={videoUrl}
                download={`continuous-video-${new Date().toISOString().slice(0, 10)}.mp4`}
                className="ml-auto"
              >
                <Download className="h-4 w-4 text-violet-500/60 hover:text-violet-500 transition-colors" />
              </a>
            </div>
            <video
              src={videoUrl}
              controls
              className="w-full aspect-video"
              preload="metadata"
            />
          </div>
        );
      })()}

      {/* ── Scene Prompts (per-clip details) ────────────────── */}
      <div className="space-y-3">
        {data.scenes.map((scene) => {
          const clipResult = continuousVideo?.clips?.[scene.sceneNumber - 1];
          const isExtension = scene.transitionType === "scene-extension";

          return (
            <div
              key={scene.sceneNumber}
              className="rounded-lg border border-border p-4 space-y-3"
            >
              {/* Scene header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold bg-violet-500/10 text-violet-500 px-1.5 py-0.5 rounded">
                      Scene {scene.sceneNumber}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{scene.durationSec}s</span>
                    {isExtension && (
                      <span className="text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <Link2 className="h-2.5 w-2.5" />
                        extends scene {scene.sceneNumber - 1}
                      </span>
                    )}
                    {clipResult && (
                      <span className="text-[10px] font-medium bg-green-500/10 text-green-600 px-1.5 py-0.5 rounded">
                        generated
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-semibold">{scene.headline}</h4>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyScenePrompt(scene)}
                  className="text-muted-foreground h-7 w-7 p-0"
                >
                  {copiedScene === scene.sceneNumber ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>

              {/* Veo Prompt */}
              <div className="bg-muted/50 rounded-md p-3">
                <p className="text-xs font-mono leading-relaxed">{scene.veoPrompt}</p>
              </div>

              {/* Metadata row */}
              <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Camera className="h-3 w-3" /> {scene.cameraMovement}
                </span>
                <span className="flex items-center gap-1">
                  <Palette className="h-3 w-3" /> {scene.visualMood}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {scene.durationSec}s
                </span>
                <span className="flex items-center gap-1">
                  <ArrowRightLeft className="h-3 w-3" /> {scene.transitionType}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Extension Technique */}
      <div className="rounded-lg border border-dashed border-violet-500/30 p-4 space-y-2 bg-violet-500/5">
        <h4 className="text-xs font-bold text-violet-500 uppercase tracking-wide">
          Scene Extension Technique
        </h4>
        <p className="text-sm text-foreground/80 leading-relaxed">
          {data.extensionTechnique}
        </p>
      </div>

      {/* Production Notes */}
      <div className="rounded-lg border border-border p-4 space-y-2">
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
          Production Notes
        </h4>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {data.productionNotes}
        </p>
      </div>
    </div>
  );
}

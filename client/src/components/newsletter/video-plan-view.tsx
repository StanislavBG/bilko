/**
 * Video Plan View — displays AI video generation prompts and production plan.
 *
 * Shows Veo-optimized scene prompts with camera movements, visual moods,
 * duration targets, and extension techniques for creating a ~30 second
 * AI-generated video from short clips.
 *
 * This is a production-ready prompt package that can be fed to Veo,
 * Runway, Pika, or similar video generation models.
 */

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, Video, Camera, Clock, Palette, ArrowRightLeft, Play, Download } from "lucide-react";

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

interface GeneratedVideo {
  videoBase64: string;
  mimeType: string;
  durationSeconds: number;
}

export function VideoPlanView({
  data,
  generatedVideos,
}: {
  data: VideoPromptsData;
  generatedVideos?: (GeneratedVideo | null)[];
}) {
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedScene, setCopiedScene] = useState<number | null>(null);

  const copyAllPrompts = useCallback(() => {
    const text = [
      "# AI Video Generation Prompts",
      `# Total Scenes: ${data.scenes.length}`,
      `# Target Duration: ~${data.scenes.reduce((s, sc) => s + sc.durationSec, 0)}s`,
      "",
      ...data.scenes.map(
        (s) =>
          `## Scene ${s.sceneNumber}: ${s.headline}\n` +
          `Prompt: ${s.veoPrompt}\n` +
          `Duration: ${s.durationSec}s | Camera: ${s.cameraMovement}\n` +
          `Mood: ${s.visualMood} | Transition: ${s.transitionType}\n`,
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
              <h3 className="text-sm font-semibold">AI Video Production Plan</h3>
              <p className="text-xs text-muted-foreground">
                {data.scenes.length} scenes &middot; ~{totalDuration}s target
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

      {/* Scene Cards */}
      <div className="space-y-3">
        {data.scenes.map((scene) => (
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

            {/* Generated Video Preview */}
            {generatedVideos?.[scene.sceneNumber - 1] && (() => {
              const video = generatedVideos[scene.sceneNumber - 1]!;
              const videoUrl = `data:${video.mimeType};base64,${video.videoBase64}`;
              return (
                <div className="rounded-md overflow-hidden border border-violet-500/20 bg-black">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-500/10 border-b border-violet-500/20">
                    <Play className="h-3 w-3 text-violet-500" />
                    <span className="text-[10px] font-medium text-violet-500">
                      AI Generated Video — {video.durationSeconds}s
                    </span>
                    <a
                      href={videoUrl}
                      download={`scene-${scene.sceneNumber}-${new Date().toISOString().slice(0, 10)}.mp4`}
                      className="ml-auto"
                    >
                      <Download className="h-3 w-3 text-violet-500/60 hover:text-violet-500" />
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
          </div>
        ))}
      </div>

      {/* Combined Video Download (if any videos generated) */}
      {generatedVideos && generatedVideos.some(Boolean) && (
        <div className="rounded-lg border border-violet-500/30 p-4 bg-violet-500/5 text-center">
          <p className="text-xs text-violet-500 font-medium mb-1">
            {generatedVideos.filter(Boolean).length} of {data.scenes.length} video clips generated with Veo
          </p>
          <p className="text-[10px] text-muted-foreground">
            Download individual clips from each scene above
          </p>
        </div>
      )}

      {/* Extension Technique */}
      <div className="rounded-lg border border-dashed border-violet-500/30 p-4 space-y-2 bg-violet-500/5">
        <h4 className="text-xs font-bold text-violet-500 uppercase tracking-wide">
          Extension Technique
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

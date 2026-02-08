import { useState } from "react";
import { ExternalLink, AlertTriangle } from "lucide-react";
import type { VideoBlock } from "./types";

export function VideoRenderer({ block }: { block: VideoBlock }) {
  const [hasError, setHasError] = useState(false);
  const watchUrl = `https://www.youtube.com/watch?v=${block.embedId}`;
  const embedUrl = `https://www.youtube.com/embed/${block.embedId}?rel=0&origin=${encodeURIComponent(window.location.origin)}`;

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      {/* Player */}
      <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
        {hasError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/50 text-muted-foreground gap-3 p-4">
            <AlertTriangle className="h-8 w-8" />
            <p className="text-sm text-center">This video couldn't be loaded in the embed player.</p>
            <a
              href={watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              Watch on YouTube <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        ) : (
          <iframe
            className="absolute inset-0 w-full h-full"
            src={embedUrl}
            title={block.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            loading="lazy"
            onError={() => setHasError(true)}
          />
        )}
      </div>
      {/* Metadata */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground line-clamp-2">{block.title}</h3>
            {block.creator && (
              <p className="text-sm text-muted-foreground mt-0.5">{block.creator}</p>
            )}
          </div>
          <a
            href={watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
        {block.description && (
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{block.description}</p>
        )}
        {block.recommendation && (
          <p className="text-xs text-primary mt-2 italic">"{block.recommendation}"</p>
        )}
      </div>
    </div>
  );
}

import { ExternalLink } from "lucide-react";
import type { VideoBlock } from "./types";

export function VideoRenderer({ block }: { block: VideoBlock }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      {/* Player */}
      <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://www.youtube-nocookie.com/embed/${block.embedId}?rel=0`}
          title={block.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
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
            href={`https://www.youtube.com/watch?v=${block.embedId}`}
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

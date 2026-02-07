import { FileText, Video, Wrench, GraduationCap, BookOpen, GitBranch, ExternalLink } from "lucide-react";
import type { ResourceListBlock } from "./types";

const TYPE_ICONS = {
  article: FileText,
  video: Video,
  tool: Wrench,
  course: GraduationCap,
  docs: BookOpen,
  repo: GitBranch,
} as const;

export function ResourceListRenderer({ block }: { block: ResourceListBlock }) {
  return (
    <div>
      {block.title && (
        <h3 className="text-lg font-semibold text-foreground mb-3">{block.title}</h3>
      )}
      <div className="space-y-2">
        {block.items.map((item, i) => {
          const Icon = TYPE_ICONS[item.type ?? "article"];
          return (
            <a
              key={i}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 hover:border-primary/30 transition-all group"
            >
              <Icon className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground group-hover:text-primary transition-colors" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-foreground">{item.title}</span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {item.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                )}
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

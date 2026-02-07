import { CheckCircle2 } from "lucide-react";
import type { InfoCardBlock } from "./types";

export function InfoCardRenderer({ block }: { block: InfoCardBlock }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="text-lg font-semibold text-foreground mb-2">{block.title}</h3>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{block.summary}</p>
      {block.points.length > 0 && (
        <ul className="space-y-2">
          {block.points.map((point, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-primary/70" />
              <span className="text-sm text-foreground">{point}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

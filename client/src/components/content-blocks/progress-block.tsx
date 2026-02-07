import type { ProgressBlock } from "./types";

export function ProgressRenderer({ block }: { block: ProgressBlock }) {
  const pct = block.total > 0 ? Math.round((block.current / block.total) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        {block.label && (
          <span className="text-sm font-medium text-foreground">{block.label}</span>
        )}
        <span className="text-sm text-muted-foreground">
          {block.current}/{block.total} ({pct}%)
        </span>
      </div>
      <div className="relative h-3 rounded-full bg-muted overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
        {/* Milestones */}
        {block.milestones?.map((m, i) => {
          const mPct = block.total > 0 ? (m.at / block.total) * 100 : 0;
          return (
            <div
              key={i}
              className="absolute top-0 bottom-0 w-px bg-background"
              style={{ left: `${mPct}%` }}
              title={m.label}
            />
          );
        })}
      </div>
      {/* Milestone labels */}
      {block.milestones && block.milestones.length > 0 && (
        <div className="relative mt-1 h-4">
          {block.milestones.map((m, i) => {
            const mPct = block.total > 0 ? (m.at / block.total) * 100 : 0;
            return (
              <span
                key={i}
                className="absolute text-[10px] text-muted-foreground -translate-x-1/2"
                style={{ left: `${mPct}%` }}
              >
                {m.label}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

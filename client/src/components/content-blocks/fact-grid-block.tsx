import type { FactGridBlock } from "./types";

export function FactGridRenderer({ block }: { block: FactGridBlock }) {
  const cols = block.columns ?? 2;

  return (
    <div>
      {block.title && (
        <h3 className="text-lg font-semibold text-foreground mb-3">{block.title}</h3>
      )}
      <div className={`grid gap-3 ${cols === 3 ? "grid-cols-2 md:grid-cols-3" : "grid-cols-2"}`}>
        {block.facts.map((fact, i) => (
          <div key={i} className="p-3 rounded-lg bg-muted/30 border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{fact.label}</p>
            <p className="text-sm font-semibold text-foreground mt-1">{fact.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

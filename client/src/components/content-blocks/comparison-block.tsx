import type { ComparisonBlock } from "./types";

export function ComparisonRenderer({ block }: { block: ComparisonBlock }) {
  return (
    <div>
      {block.title && (
        <h3 className="text-lg font-semibold text-foreground mb-3">{block.title}</h3>
      )}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="px-4 py-3 text-left font-semibold text-foreground" />
              {block.columns.map((col, i) => (
                <th key={i} className="px-4 py-3 text-left font-semibold text-foreground">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-card" : "bg-muted/20"}>
                <td className="px-4 py-3 font-medium text-foreground">{row.label}</td>
                {row.values.map((val, j) => (
                  <td key={j} className="px-4 py-3 text-muted-foreground">{val}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

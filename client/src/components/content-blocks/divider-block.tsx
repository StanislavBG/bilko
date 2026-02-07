import type { DividerBlock } from "./types";

export function DividerRenderer({ block }: { block: DividerBlock }) {
  if (block.label) {
    return (
      <div className="relative my-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-3 bg-background text-xs text-muted-foreground uppercase tracking-wider">
            {block.label}
          </span>
        </div>
      </div>
    );
  }
  return <hr className="border-border my-2" />;
}

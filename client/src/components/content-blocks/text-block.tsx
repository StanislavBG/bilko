import type { TextBlock } from "./types";

const VARIANT = {
  body: "text-base text-muted-foreground leading-relaxed",
  lead: "text-lg text-foreground leading-relaxed font-medium",
  caption: "text-sm text-muted-foreground",
} as const;

export function TextRenderer({ block }: { block: TextBlock }) {
  return (
    <p className={VARIANT[block.variant ?? "body"]}>{block.content}</p>
  );
}

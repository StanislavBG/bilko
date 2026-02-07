import type { HeadingBlock } from "./types";

const SIZE = {
  1: "text-3xl md:text-4xl font-bold tracking-tight",
  2: "text-2xl md:text-3xl font-bold tracking-tight",
  3: "text-xl md:text-2xl font-semibold",
} as const;

export function HeadingRenderer({ block }: { block: HeadingBlock }) {
  const level = block.level ?? 2;
  const Tag = `h${level}` as const;
  return <Tag className={`${SIZE[level]} text-foreground`}>{block.text}</Tag>;
}

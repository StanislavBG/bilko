import type { ImageBlock } from "./types";

const ASPECT = {
  square: "aspect-square",
  video: "aspect-video",
  wide: "aspect-[2/1]",
  tall: "aspect-[3/4]",
} as const;

export function ImageRenderer({ block }: { block: ImageBlock }) {
  return (
    <figure>
      <div className={`rounded-lg overflow-hidden bg-muted ${ASPECT[block.aspect ?? "video"]}`}>
        <img
          src={block.src}
          alt={block.alt}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
      {block.caption && (
        <figcaption className="text-xs text-muted-foreground mt-2 text-center">
          {block.caption}
        </figcaption>
      )}
    </figure>
  );
}

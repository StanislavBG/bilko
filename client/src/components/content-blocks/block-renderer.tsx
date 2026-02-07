/**
 * BlockRenderer — The universal content block renderer.
 *
 * Takes a ContentBlock data structure and renders the correct component.
 * This is the single entry point for all block rendering.
 * Agents produce blocks; this component renders them.
 */

import type { ContentBlock } from "./types";
import { HeadingRenderer } from "./heading-block";
import { TextRenderer } from "./text-block";
import { CalloutRenderer } from "./callout-block";
import { InfoCardRenderer } from "./info-card-block";
import { StepsRenderer } from "./steps-block";
import { CodeRenderer } from "./code-block";
import { ComparisonRenderer } from "./comparison-block";
import { VideoRenderer } from "./video-block";
import { ResourceListRenderer } from "./resource-list-block";
import { ProgressRenderer } from "./progress-block";
import { QuizRenderer } from "./quiz-block";
import { FactGridRenderer } from "./fact-grid-block";
import { ImageRenderer } from "./image-block";
import { DividerRenderer } from "./divider-block";

interface BlockRendererProps {
  block: ContentBlock;
  /** Quiz answer callback */
  onQuizAnswer?: (blockId: string, correct: boolean) => void;
  /** Widget registry — maps widget names to components */
  widgets?: Record<string, React.ComponentType<Record<string, unknown>>>;
}

export function BlockRenderer({ block, onQuizAnswer, widgets }: BlockRendererProps) {
  switch (block.type) {
    case "heading":
      return <HeadingRenderer block={block} />;
    case "text":
      return <TextRenderer block={block} />;
    case "callout":
      return <CalloutRenderer block={block} />;
    case "info-card":
      return <InfoCardRenderer block={block} />;
    case "steps":
      return <StepsRenderer block={block} />;
    case "code":
      return <CodeRenderer block={block} />;
    case "comparison":
      return <ComparisonRenderer block={block} />;
    case "video":
      return <VideoRenderer block={block} />;
    case "resource-list":
      return <ResourceListRenderer block={block} />;
    case "progress":
      return <ProgressRenderer block={block} />;
    case "quiz":
      return (
        <QuizRenderer
          block={block}
          onAnswer={onQuizAnswer ? (correct) => onQuizAnswer(block.id, correct) : undefined}
        />
      );
    case "fact-grid":
      return <FactGridRenderer block={block} />;
    case "image":
      return <ImageRenderer block={block} />;
    case "divider":
      return <DividerRenderer block={block} />;
    case "widget": {
      const Widget = widgets?.[block.widget];
      if (!Widget) {
        return (
          <div className="p-4 rounded-lg border border-dashed border-yellow-500/50 bg-yellow-500/5 text-sm text-yellow-600">
            Unknown widget: "{block.widget}"
          </div>
        );
      }
      return <Widget {...block.props} />;
    }
    default:
      return null;
  }
}

/**
 * Render a sequence of content blocks with consistent spacing.
 */
export function BlockSequence({
  blocks,
  onQuizAnswer,
  widgets,
  className = "",
}: {
  blocks: ContentBlock[];
  onQuizAnswer?: (blockId: string, correct: boolean) => void;
  widgets?: Record<string, React.ComponentType<Record<string, unknown>>>;
  className?: string;
}) {
  return (
    <div className={`space-y-5 ${className}`}>
      {blocks.map((block) => (
        <BlockRenderer
          key={block.id}
          block={block}
          onQuizAnswer={onQuizAnswer}
          widgets={widgets}
        />
      ))}
    </div>
  );
}

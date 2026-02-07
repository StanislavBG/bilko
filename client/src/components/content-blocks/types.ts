/**
 * Content Block Types
 *
 * The vocabulary of renderable content blocks that agents produce.
 * Every block is a typed data structure — no React in here.
 * Components render them; agents produce them.
 *
 * This is the contract between AI agents and the UI.
 */

// ── Base block ─────────────────────────────────────────────

interface BaseBlock {
  /** Unique ID within the content sequence */
  id: string;
}

// ── Block definitions ──────────────────────────────────────

/** Hero heading text — big, bold, attention-grabbing */
export interface HeadingBlock extends BaseBlock {
  type: "heading";
  text: string;
  level?: 1 | 2 | 3;
}

/** Paragraph or rich text explanation */
export interface TextBlock extends BaseBlock {
  type: "text";
  content: string;
  /** Optional emphasis style */
  variant?: "body" | "lead" | "caption";
}

/** Highlighted callout — tip, warning, note, or insight */
export interface CalloutBlock extends BaseBlock {
  type: "callout";
  variant: "tip" | "warning" | "note" | "insight" | "success" | "error";
  title?: string;
  body: string;
}

/** Concept card with key points */
export interface InfoCardBlock extends BaseBlock {
  type: "info-card";
  title: string;
  summary: string;
  points: string[];
  /** Optional icon name from lucide */
  icon?: string;
}

/** Numbered step-by-step walkthrough */
export interface StepsBlock extends BaseBlock {
  type: "steps";
  title?: string;
  steps: Array<{
    title: string;
    body: string;
    /** Optional: step complete state for interactive walkthroughs */
    complete?: boolean;
  }>;
}

/** Code sample with syntax highlighting */
export interface CodeBlock extends BaseBlock {
  type: "code";
  language: string;
  code: string;
  /** Optional plain-language explanation */
  explanation?: string;
  /** File name shown in header */
  filename?: string;
}

/** Side-by-side comparison table */
export interface ComparisonBlock extends BaseBlock {
  type: "comparison";
  title?: string;
  columns: string[];
  rows: Array<{
    label: string;
    values: string[];
  }>;
}

/** YouTube video embed with metadata */
export interface VideoBlock extends BaseBlock {
  type: "video";
  embedId: string;
  title: string;
  creator?: string;
  description?: string;
  /** Why Bilko recommends this */
  recommendation?: string;
}

/** Curated list of resources/links */
export interface ResourceListBlock extends BaseBlock {
  type: "resource-list";
  title?: string;
  items: Array<{
    title: string;
    url: string;
    description?: string;
    type?: "article" | "video" | "tool" | "course" | "docs" | "repo";
  }>;
}

/** Visual progress indicator */
export interface ProgressBlock extends BaseBlock {
  type: "progress";
  current: number;
  total: number;
  label?: string;
  /** Optional milestone markers */
  milestones?: Array<{
    at: number;
    label: string;
  }>;
}

/** Image with caption and optional annotation */
export interface ImageBlock extends BaseBlock {
  type: "image";
  src: string;
  alt: string;
  caption?: string;
  /** Aspect ratio hint */
  aspect?: "square" | "video" | "wide" | "tall";
}

/** Quiz question — single or multi-choice */
export interface QuizBlock extends BaseBlock {
  type: "quiz";
  question: string;
  options: Array<{
    id: string;
    text: string;
  }>;
  /** Index of correct option */
  correctIndex: number;
  /** Explanation shown after answering */
  explanation?: string;
}

/** Key-value fact grid (definitions, stats, metadata) */
export interface FactGridBlock extends BaseBlock {
  type: "fact-grid";
  title?: string;
  facts: Array<{
    label: string;
    value: string;
  }>;
  /** Layout: 2 or 3 columns */
  columns?: 2 | 3;
}

/** Horizontal divider with optional label */
export interface DividerBlock extends BaseBlock {
  type: "divider";
  label?: string;
}

/** Embedded interactive component by registered name */
export interface WidgetBlock extends BaseBlock {
  type: "widget";
  /** Registered widget component name */
  widget: string;
  /** Props passed to the widget */
  props: Record<string, unknown>;
}

// ── Union type ─────────────────────────────────────────────

export type ContentBlock =
  | HeadingBlock
  | TextBlock
  | CalloutBlock
  | InfoCardBlock
  | StepsBlock
  | CodeBlock
  | ComparisonBlock
  | VideoBlock
  | ResourceListBlock
  | ProgressBlock
  | ImageBlock
  | QuizBlock
  | FactGridBlock
  | DividerBlock
  | WidgetBlock;

/** Extract a block type by its discriminant */
export type BlockOfType<T extends ContentBlock["type"]> = Extract<
  ContentBlock,
  { type: T }
>;

// ── Agent result shape ─────────────────────────────────────

/**
 * What an agent returns when it produces renderable content.
 * The conversation orchestrator consumes this to build turns.
 */
export interface AgentContentResult {
  /** Blocks to render, in order */
  blocks: ContentBlock[];
  /** Optional Bilko speech to introduce the content */
  introduction?: {
    text: string;
    speech?: string;
  };
  /** Follow-up options to offer the user */
  followUp?: Array<{
    id: string;
    label: string;
    description: string;
    icon?: string;
    voiceTriggers?: string[];
  }>;
}

/**
 * Newsletter + Infographic + Video Workflow — bilko-flow DSL definition
 *
 * Translates the test-newsletter flow (8-step DAG with parallel branches)
 * into the bilko-flow deterministic workflow format.
 *
 * Inspired by the [EFD] European Football Daily n8n workflow
 * that generates cinematic infographics with stat overlays.
 *
 * Steps:
 *   1. discover-stories       (ai.generate-text) — Find 3 trending stories
 *   2. write-articles         (ai.generate-text) — Write articles + image descriptions
 *   3. newsletter-summary     (ai.generate-text) — Distill into experience report
 *   4. rank-stories           (ai.generate-text) — Rank by newsworthiness
 *   5. design-infographic     (ai.generate-text) — Create infographic data model
 *   6. create-narrative       (ai.generate-text) — Write 60s broadcast narration
 *   7. generate-storyboard    (ai.generate-text) — Visual shot list for slideshow
 *   8. generate-video-prompts (ai.generate-text) — Veo-optimized video prompts
 *
 * DAG:
 *   discover-stories → write-articles → [newsletter-summary ∥ rank-stories]
 *   rank-stories → [design-infographic ∥ create-narrative]
 *   create-narrative → [generate-storyboard ∥ generate-video-prompts]
 */

import type { Step, CreateWorkflowInput } from "bilko-flow/dist/domain/workflow";
import type { DeterminismConfig } from "bilko-flow/dist/domain/determinism";

const determinism: DeterminismConfig = {
  targetGrade: "best-effort" as any,
  externalDependencies: [
    {
      name: "gemini-llm",
      kind: "http-api",
      deterministic: false,
      evidenceCapture: "full-response",
      nondeterminismDescription:
        "LLM outputs are inherently nondeterministic even with temperature=0",
    },
  ],
};

const llmDeterminism = {
  usesTime: false,
  usesExternalApis: true,
  pureFunction: false,
  externalDependencies: [
    {
      name: "gemini-llm",
      kind: "http-api",
      deterministic: false,
      evidenceCapture: "full-response",
    },
  ],
};

const defaultPolicy = {
  timeoutMs: 30000,
  maxAttempts: 2,
  backoffStrategy: "exponential" as const,
  backoffBaseMs: 1000,
};

/**
 * Create the test-newsletter workflow definition for bilko-flow.
 * Requires accountId, projectId, environmentId from the bilko-flow context.
 */
export function createNewsletterWorkflowInput(
  accountId: string,
  projectId: string,
  environmentId: string,
): CreateWorkflowInput {
  const steps: Omit<Step, "workflowId">[] = [
    {
      id: "discover-stories",
      name: "Discover Trending Stories",
      type: "ai.generate-text",
      description: "Discovers 3 trending European football stories across major leagues.",
      dependsOn: [],
      inputs: {
        systemPrompt: `Senior European football journalist. Identify 3 compelling stories. Return JSON: {"stories":[{"headline","summary","league","keyStat"}]}`,
        userMessage: "Discover 3 trending European football stories for today's newsletter.",
        model: "gemini-2.5-flash",
      },
      outputs: { schema: { type: "object", properties: { stories: { type: "array" } } } },
      policy: defaultPolicy,
      determinism: llmDeterminism,
    },
    {
      id: "write-articles",
      name: "Write Articles & Image Descriptions",
      type: "ai.generate-text",
      description: "Writes 3 newspaper articles with cinematic image descriptions.",
      dependsOn: ["discover-stories"],
      inputs: {
        systemPromptTemplate: `Sports editor. Write 3 articles (60-80 words each) with image descriptions (max 30 words).`,
        userMessageTemplate: "Write 3 newspaper articles with image descriptions.",
        model: "gemini-2.5-flash",
        templateSource: "discover-stories",
      },
      outputs: { schema: { type: "object", properties: { articles: { type: "array" } } } },
      policy: defaultPolicy,
      determinism: llmDeterminism,
    },
    {
      id: "newsletter-summary",
      name: "Generate Newsletter Summary",
      type: "ai.generate-text",
      description: "Distills the newsletter into an experience summary with mood and takeaway. Parallel with rank-stories.",
      dependsOn: ["write-articles"],
      inputs: {
        systemPromptTemplate: `Experience designer. Summarize newsletter: editionTitle, topStory, leaguesCovered, mood, takeaway.`,
        userMessageTemplate: "Create a newsletter experience summary.",
        model: "gemini-2.5-flash",
        templateSources: ["write-articles"],
      },
      outputs: { schema: { type: "object", properties: { newsletter: { type: "object" } } } },
      policy: defaultPolicy,
      determinism: llmDeterminism,
    },
    {
      id: "rank-stories",
      name: "Rank Stories by Newsworthiness",
      type: "ai.generate-text",
      description: "Ranks 3 stories: #1 main + #2,#3 supporting with stat callouts. Parallel with newsletter-summary.",
      dependsOn: ["write-articles"],
      inputs: {
        systemPromptTemplate: `News editor. Rank stories: main (60% space) + 2 supporting. Extract stat numbers and labels.`,
        userMessageTemplate: "Rank the 3 stories for infographic and video production.",
        model: "gemini-2.5-flash",
        templateSources: ["discover-stories", "write-articles"],
      },
      outputs: { schema: { type: "object", properties: { ranked: { type: "object" } } } },
      policy: defaultPolicy,
      determinism: llmDeterminism,
    },
    {
      id: "design-infographic",
      name: "Design Infographic Layout",
      type: "ai.generate-text",
      description: "Creates structured infographic data: title, main story (large stat callout), 2 supporting cards, colors. Parallel with create-narrative.",
      dependsOn: ["rank-stories"],
      inputs: {
        systemPromptTemplate: `Data visualization designer. Create infographic: title, mainStory with stat, 2 supporting, accent colors.`,
        userMessageTemplate: "Design a sports infographic layout.",
        model: "gemini-2.5-flash",
        templateSource: "rank-stories",
      },
      outputs: { schema: { type: "object", properties: { infographic: { type: "object" } } } },
      policy: defaultPolicy,
      determinism: llmDeterminism,
    },
    {
      id: "create-narrative",
      name: "Create 60s Broadcast Narrative",
      type: "ai.generate-text",
      description: "Writes a 60-second sports TV narration: intro(10s) + main(20s) + 2 supporting(15s each). Parallel with design-infographic.",
      dependsOn: ["rank-stories"],
      inputs: {
        systemPromptTemplate: `Sports TV narrator. Write 60s script: intro(10s), main(20s), supporting1(15s), supporting2(15s).`,
        userMessageTemplate: "Write a 60-second broadcast narration script.",
        model: "gemini-2.5-flash",
        templateSource: "rank-stories",
      },
      outputs: { schema: { type: "object", properties: { narrative: { type: "object" } } } },
      policy: defaultPolicy,
      determinism: llmDeterminism,
    },
    {
      id: "generate-storyboard",
      name: "Generate Video Storyboard",
      type: "ai.generate-text",
      description: "Creates 4-scene visual storyboard: image descriptions, visual styles, transitions. Parallel with generate-video-prompts.",
      dependsOn: ["create-narrative"],
      inputs: {
        systemPromptTemplate: `Video storyboard artist. Create 4 scenes: imageDescription, visualStyle, transitions, narrationText.`,
        userMessageTemplate: "Create a visual storyboard for the video slideshow.",
        model: "gemini-2.5-flash",
        templateSources: ["create-narrative", "rank-stories"],
      },
      outputs: { schema: { type: "object", properties: { storyboard: { type: "object" } } } },
      policy: defaultPolicy,
      determinism: llmDeterminism,
    },
    {
      id: "generate-video-prompts",
      name: "Generate Veo Video Prompts",
      type: "ai.generate-text",
      description: "Creates Veo-optimized prompts for ~30s AI video (10s per story) with extension techniques. Parallel with generate-storyboard.",
      dependsOn: ["create-narrative"],
      inputs: {
        systemPromptTemplate: `AI video production expert. Create 3 Veo prompts (8-10s clips) with camera movements, moods, extension technique.`,
        userMessageTemplate: "Generate Veo-optimized video prompts.",
        model: "gemini-2.5-flash",
        templateSources: ["create-narrative", "rank-stories"],
      },
      outputs: { schema: { type: "object", properties: { videoPrompts: { type: "object" } } } },
      policy: defaultPolicy,
      determinism: llmDeterminism,
    },
  ];

  return {
    accountId,
    projectId,
    environmentId,
    name: "DEMO European Football Newsletter + Media Pipeline",
    description:
      "The full media pipeline — discovers 3 trending European football stories, writes articles, then produces 4 outputs: newsletter, infographic, slideshow video storyboard, and Veo-optimized AI video prompts. 8-step DAG with 3 parallel branch points. Powered by bilko-flow engine.",
    specVersion: "1.0.0",
    determinism,
    entryStepId: "discover-stories",
    steps,
    secrets: [],
  };
}

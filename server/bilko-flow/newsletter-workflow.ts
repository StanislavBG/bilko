/**
 * Newsletter + Infographic + Video Workflow — bilko-flow DSL definition
 *
 * Translates the test-newsletter flow (12-step DAG with parallel branches)
 * into the bilko-flow deterministic workflow format.
 *
 * Inspired by the [EFD] European Football Daily n8n workflow
 * that generates cinematic infographics with stat overlays.
 *
 * Steps:
 *   1. discover-stories            (ai.generate-text)  — Find 3 trending stories
 *   2. write-articles              (ai.generate-text)  — Write articles + image descriptions
 *   3. newsletter-summary          (ai.generate-text)  — Distill into experience report
 *   4. rank-stories                (ai.generate-text)  — Rank by newsworthiness
 *   5. design-infographic          (ai.generate-text)  — Create infographic data + imagePrompt
 *   6. create-narrative            (ai.generate-text)  — Write 60s broadcast narration
 *   7. generate-storyboard         (ai.generate-text)  — Visual shot list for slideshow
 *   8. generate-video-prompts      (ai.generate-text)  — Veo-optimized video prompts
 *   9. generate-infographic-image  (ai.generate-image) — Nano Banana cinematic infographic
 *  10. generate-scene-images       (ai.generate-image) — Nano Banana scene images
 *  11. generate-video-clips        (ai.generate-video) — Veo 7-8s video clips
 *
 * DAG:
 *   discover-stories → write-articles → [newsletter-summary ∥ rank-stories]
 *   rank-stories → [design-infographic ∥ create-narrative]
 *   create-narrative → [generate-storyboard ∥ generate-video-prompts]
 *   [design-infographic, generate-storyboard] → generate-infographic-image
 *   generate-storyboard → generate-scene-images
 *   generate-video-prompts → generate-video-clips
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
      description: "Creates structured infographic data emphasizing SCORES, TRANSFER FEES, and numerical data, plus a rich imagePrompt for Nano Banana cinematic wallpaper generation. Parallel with create-narrative.",
      dependsOn: ["rank-stories"],
      inputs: {
        systemPromptTemplate: `Data visualization designer focused on SCORES, TRANSFER FEES, and NUMERICAL DATA. Create infographic: title, mainStory with prominent stat, 2 supporting with stats, accent colors, and a cinematic imagePrompt (40-80 words) for AI wallpaper generation.`,
        userMessageTemplate: "Design a sports infographic layout with scores and transfer fee emphasis.",
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
    // ── Image Generation Phase (Nano Banana) ──
    {
      id: "generate-infographic-image",
      name: "Generate Cinematic Infographic Image",
      type: "ai.generate-image",
      description: "Generates a cinematic wallpaper-style infographic image using Nano Banana. Focuses on scores, transfer fees, dramatic stadium lighting.",
      dependsOn: ["design-infographic", "generate-storyboard"],
      inputs: {
        promptTemplate: "{{design-infographic.infographic.imagePrompt}}",
        aspectRatio: "16:9",
        model: "gemini-2.5-flash-image",
      },
      outputs: { schema: { type: "object", properties: { imageBase64: { type: "string" }, mimeType: { type: "string" } } } },
      policy: { ...defaultPolicy, timeoutMs: 120000 },
      determinism: {
        ...llmDeterminism,
        externalDependencies: [
          {
            name: "nano-banana-image-gen",
            kind: "http-api",
            deterministic: false,
            evidenceCapture: "full-response",
          },
        ],
      },
    },
    {
      id: "generate-scene-images",
      name: "Generate Slideshow Scene Images",
      type: "ai.generate-image",
      description: "Generates cinematic AI images for each storyboard scene using Nano Banana. Each image focuses on one key football event.",
      dependsOn: ["generate-storyboard"],
      inputs: {
        promptsTemplate: "{{generate-storyboard.storyboard.scenes|map:imageDescription}}",
        aspectRatio: "16:9",
        model: "gemini-2.5-flash-image",
      },
      outputs: { schema: { type: "object", properties: { images: { type: "array" } } } },
      policy: { ...defaultPolicy, timeoutMs: 120000 },
      determinism: {
        ...llmDeterminism,
        externalDependencies: [
          {
            name: "nano-banana-image-gen",
            kind: "http-api",
            deterministic: false,
            evidenceCapture: "full-response",
          },
        ],
      },
    },
    // ── Video Generation Phase (Veo) ──
    {
      id: "generate-video-clips",
      name: "Generate AI Video Clips",
      type: "ai.generate-video",
      description: "Generates 7-8 second AI video clips using Veo for each scene prompt. Creates cinematic football footage.",
      dependsOn: ["generate-video-prompts"],
      inputs: {
        promptsTemplate: "{{generate-video-prompts.videoPrompts.scenes|map:veoPrompt}}",
        durationSeconds: 8,
        aspectRatio: "16:9",
        model: "veo-3.0-generate-preview",
      },
      outputs: { schema: { type: "object", properties: { videos: { type: "array" } } } },
      policy: { ...defaultPolicy, timeoutMs: 300000, maxAttempts: 1 },
      determinism: {
        ...llmDeterminism,
        externalDependencies: [
          {
            name: "veo-video-gen",
            kind: "http-api",
            deterministic: false,
            evidenceCapture: "full-response",
          },
        ],
      },
    },
  ];

  return {
    accountId,
    projectId,
    environmentId,
    name: "DEMO European Football Newsletter + Media Pipeline v3",
    description:
      "The full media pipeline — discovers 3 trending European football stories, writes articles, then produces a complete package: newsletter, cinematic AI infographic (Nano Banana), slideshow with AI scene images, and Veo video clips. 12-step DAG with image/video generation. Powered by bilko-flow engine.",
    specVersion: "1.0.0",
    determinism,
    entryStepId: "discover-stories",
    steps,
    secrets: [],
  };
}

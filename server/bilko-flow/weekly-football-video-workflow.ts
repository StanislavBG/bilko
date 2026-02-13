/**
 * Weekly Football Highlight Video Workflow — bilko-flow DSL definition
 *
 * Translates the weekly-football-video flow (8-step sequential chain)
 * into the bilko-flow deterministic workflow format.
 *
 * Pipeline:
 *   1. deep-research              (ai.generate-text)  — Find the biggest event (last 7 weeks)
 *   2. write-video-script         (ai.generate-text)  — 20s script with 8-6-6 transitions
 *   3. generate-clip-1            (ai.generate-video)  — 8s initial Veo clip
 *   4. generate-clip-2            (ai.generate-video)  — 8s grounded on clip 1
 *   5. generate-clip-3            (ai.generate-video)  — 8s grounded on clip 2
 *   6. concatenate-clips          (transform)           — FFmpeg concat → ~20s video
 *   7. preview-video              (display)             — Final output
 *
 * DAG:
 *   deep-research → write-video-script → generate-clip-1 → generate-clip-2
 *     → generate-clip-3 → concatenate-clips → preview-video
 */

import type { Step, CreateWorkflowInput, DeterminismConfig } from "bilko-flow";

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
    {
      name: "veo-video-gen",
      kind: "http-api",
      deterministic: false,
      evidenceCapture: "full-response",
      nondeterminismDescription:
        "Veo video generation is nondeterministic by nature",
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

const veoDeterminism = {
  usesTime: false,
  usesExternalApis: true,
  pureFunction: false,
  externalDependencies: [
    {
      name: "veo-video-gen",
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

const videoPolicy = {
  timeoutMs: 900000,
  maxAttempts: 1,
  backoffStrategy: "exponential" as const,
  backoffBaseMs: 1000,
};

/**
 * Create the weekly-football-video workflow definition for bilko-flow.
 * Requires accountId, projectId, environmentId from the bilko-flow context.
 */
export function createWeeklyFootballVideoWorkflowInput(
  accountId: string,
  projectId: string,
  environmentId: string,
): CreateWorkflowInput {
  const steps: Omit<Step, "workflowId">[] = [
    {
      id: "deep-research",
      name: "Deep Research — Top Event",
      type: "ai.generate-text",
      description:
        "Researches European football across Premier League, La Liga, Serie A, Bundesliga, Ligue 1, and Champions League over the last 7 weeks. Identifies the single most important event with deep facts, stats, and social-media hooks.",
      dependsOn: [],
      inputs: {
        systemPrompt: `Senior European football journalist and social media strategist. Research the last 7 weeks. Identify the MOST IMPORTANT event. Return JSON: {"research":{"headline","league","summary","keyFacts":[{"fact","number"}],"socialHook"}}`,
        userMessage:
          "What is the biggest European football event in the last 7 weeks? Deep-research it with interesting facts and stats for a social media video.",
        model: "gemini-2.5-flash",
      },
      outputs: {
        schema: {
          type: "object",
          properties: { research: { type: "object" } },
        },
      },
      policy: defaultPolicy,
      determinism: llmDeterminism,
    },
    {
      id: "write-video-script",
      name: "Write 20s Video Script (8-6-6 transitions)",
      type: "ai.generate-text",
      description:
        "Writes a precisely timed 20-second video script pre-planned for 8-6-6 second transitions. Each segment ends with stable motion for Veo grounding.",
      dependsOn: ["deep-research"],
      inputs: {
        systemPromptTemplate: `Social media video scriptwriter. Write a 20-SECOND script with 3 segments: Segment 1 (8s), Segment 2 (6s), Segment 3 (6s). Each segment must end with stable visual scene for grounding. Return JSON: {"script":{"title","segments":[{"segmentNumber","durationSec","narration","visualDescription","transitionNote","keyStat"}],"totalDurationSec":20,"veoStyleTokens"}}`,
        userMessageTemplate:
          "Write the 20-second video script with 8-6-6 transition planning based on the research.",
        model: "gemini-2.5-flash",
        templateSource: "deep-research",
      },
      outputs: {
        schema: {
          type: "object",
          properties: { script: { type: "object" } },
        },
      },
      policy: defaultPolicy,
      determinism: llmDeterminism,
    },
    {
      id: "generate-clip-1",
      name: "Generate Clip 1 (8s initial)",
      type: "ai.generate-video",
      description:
        "Generates the initial 8-second video clip using Veo. Fresh text-to-video from segment 1's visual description. Must end with stable motion for grounding.",
      dependsOn: ["write-video-script"],
      inputs: {
        promptTemplate:
          "{{write-video-script.script.segments[0].visualDescription}}. Style: {{write-video-script.script.veoStyleTokens}}. End with stable, continuing motion for grounding.",
        durationSeconds: 8,
        aspectRatio: "16:9",
        model: "veo-3.1-generate-preview",
      },
      outputs: {
        schema: {
          type: "object",
          properties: {
            videoBase64: { type: "string" },
            mimeType: { type: "string" },
            durationSeconds: { type: "number" },
          },
        },
      },
      policy: videoPolicy,
      determinism: veoDeterminism,
    },
    {
      id: "generate-clip-2",
      name: "Generate Clip 2 (8s, grounded on clip 1)",
      type: "ai.generate-video",
      description:
        "Generates the second 8-second clip grounded on the last 2 seconds of clip 1 for visual continuity. Effective new content is ~6s.",
      dependsOn: ["generate-clip-1"],
      inputs: {
        promptTemplate:
          "Continue from previous scene. {{write-video-script.script.segments[1].visualDescription}}. Style: {{write-video-script.script.veoStyleTokens}}. End with stable motion for grounding.",
        sourceVideoTemplate: "{{generate-clip-1.videoBase64}}",
        durationSeconds: 8,
        aspectRatio: "16:9",
        model: "veo-3.1-generate-preview",
      },
      outputs: {
        schema: {
          type: "object",
          properties: {
            videoBase64: { type: "string" },
            mimeType: { type: "string" },
            durationSeconds: { type: "number" },
          },
        },
      },
      policy: videoPolicy,
      determinism: veoDeterminism,
    },
    {
      id: "generate-clip-3",
      name: "Generate Clip 3 (8s, grounded on clip 2)",
      type: "ai.generate-video",
      description:
        "Generates the final 8-second clip grounded on the last 2 seconds of clip 2. Concludes the video with a satisfying visual ending.",
      dependsOn: ["generate-clip-2"],
      inputs: {
        promptTemplate:
          "Continue from previous scene. {{write-video-script.script.segments[2].visualDescription}}. Style: {{write-video-script.script.veoStyleTokens}}. Conclude with a satisfying visual ending.",
        sourceVideoTemplate: "{{generate-clip-2.videoBase64}}",
        durationSeconds: 8,
        aspectRatio: "16:9",
        model: "veo-3.1-generate-preview",
      },
      outputs: {
        schema: {
          type: "object",
          properties: {
            videoBase64: { type: "string" },
            mimeType: { type: "string" },
            durationSeconds: { type: "number" },
          },
        },
      },
      policy: videoPolicy,
      determinism: veoDeterminism,
    },
    {
      id: "concatenate-clips",
      name: "Concatenate Clips (FFmpeg)",
      type: "transform",
      description:
        "Concatenates the 3 individual 8-second Veo clips into a single ~20-second continuous video using server-side FFmpeg concat demuxer. Container-level copy, no re-encoding.",
      dependsOn: ["generate-clip-3"],
      inputs: {
        clipsSource:
          "[{{generate-clip-1.videoBase64}}, {{generate-clip-2.videoBase64}}, {{generate-clip-3.videoBase64}}]",
        method: "ffmpeg-concat-demuxer",
      },
      outputs: {
        schema: {
          type: "object",
          properties: {
            videoBase64: { type: "string" },
            mimeType: { type: "string" },
            durationSeconds: { type: "number" },
          },
        },
      },
      policy: { ...defaultPolicy, timeoutMs: 120000 },
      determinism: { deterministic: true, externalDependencies: [] },
    },
    {
      id: "preview-video",
      name: "Preview & Export",
      type: "display",
      description:
        "Displays the final ~20-second continuous video with the script overlay, key facts, and social media export options.",
      dependsOn: ["concatenate-clips"],
      inputs: {
        researchSource: "{{deep-research.research}}",
        scriptSource: "{{write-video-script.script}}",
        videoSource: "{{concatenate-clips}}",
      },
      outputs: {
        schema: {
          type: "object",
          properties: {
            exitSummary: { type: "string" },
          },
        },
      },
      policy: defaultPolicy,
      determinism: { deterministic: true, externalDependencies: [] },
    },
  ];

  return {
    accountId,
    projectId,
    environmentId,
    name: "Weekly Football Highlight Video Pipeline",
    description:
      "Deep-researches the biggest European football event of the last 7 weeks, writes a 20-second script with 8-6-6 transition planning, generates 3 Veo clips chained via last-2-second grounding, and concatenates into a single continuous social-media video. 8-step sequential DAG. Powered by bilko-flow engine.",
    specVersion: "1.0.0",
    determinism,
    entryStepId: "deep-research",
    steps,
    secrets: [],
  };
}

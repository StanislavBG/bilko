/**
 * Newsletter Workflow — bilko-flow DSL definition
 *
 * Translates the test-newsletter flow (3-step LLM chain) into
 * the bilko-flow deterministic workflow format.
 *
 * Inspired by the [EFD] European Football Daily n8n workflow
 * that generates cinematic infographics with stat overlays.
 *
 * Steps:
 *   1. discover-stories    (ai.generate-text) — Find 3 trending European football stories
 *   2. write-articles      (ai.generate-text) — Write 3 articles with image descriptions
 *   3. newsletter-summary  (ai.generate-text) — Distill into experience report
 */

import type { Workflow, Step, CreateWorkflowInput } from "bilko-flow/dist/domain/workflow";
import type { DeterminismConfig } from "bilko-flow/dist/domain/determinism";

// Determinism config: this workflow uses an external LLM API
// so the best achievable grade is best-effort
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
      description:
        "Discovers 3 trending European football stories across major leagues.",
      dependsOn: [],
      inputs: {
        systemPrompt: `You are a senior European football journalist with deep knowledge of the Premier League, La Liga, Serie A, Bundesliga, Ligue 1, and UEFA Champions League.

MISSION: Identify 3 compelling stories that European football fans would want to read right now. Mix different leagues and story types — transfers, match results, tactical analysis, player milestones, managerial changes, or breaking news.

For each story provide:
- A punchy newspaper headline (max 10 words)
- A brief summary of what happened (max 30 words)
- Which league or competition it relates to
- One key stat or fact that makes the story compelling

Return ONLY valid JSON:
{"stories":[{"headline":"...","summary":"...","league":"...","keyStat":"..."},{"headline":"...","summary":"...","league":"...","keyStat":"..."},{"headline":"...","summary":"...","league":"...","keyStat":"..."}]}

Rules: exactly 3 stories. headline max 10 words, summary max 30 words, league max 4 words, keyStat max 15 words. No markdown.`,
        userMessage:
          "Discover 3 trending European football stories for today's newsletter.",
        model: "gemini-2.5-flash",
      },
      outputs: {
        schema: {
          type: "object",
          properties: {
            stories: {
              type: "array",
            },
          },
        },
      },
      policy: {
        timeoutMs: 30000,
        maxAttempts: 2,
        backoffStrategy: "exponential",
        backoffBaseMs: 1000,
      },
      determinism: {
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
      },
    },
    {
      id: "write-articles",
      name: "Write Articles & Image Descriptions",
      type: "ai.generate-text",
      description:
        "Writes 3 newspaper articles with cinematic image descriptions for each story.",
      dependsOn: ["discover-stories"],
      inputs: {
        systemPromptTemplate: `You are a sports editor producing a daily European football newsletter. You write punchy, engaging articles and commission vivid editorial images.

INPUT: You have 3 trending European football stories to write about.

MISSION: For each of the 3 stories, produce:
1. A short newspaper article (60-80 words) — factual, engaging, with a hook opening and the key stat woven in naturally
2. A cinematic image description (max 30 words) — describe a striking editorial photo or infographic that would accompany this article. Think bold compositions, team colors, dramatic lighting, stadium atmospheres.

Return ONLY valid JSON:
{"articles":[{"headline":"...","article":"...","imageDescription":"...","league":"..."},{"headline":"...","article":"...","imageDescription":"...","league":"..."},{"headline":"...","article":"...","imageDescription":"...","league":"..."}]}

Rules: exactly 3 articles. article 60-80 words, imageDescription max 30 words. No markdown.`,
        userMessageTemplate:
          "Write 3 newspaper articles with image descriptions for these European football stories.",
        model: "gemini-2.5-flash",
        templateSource: "discover-stories",
      },
      outputs: {
        schema: {
          type: "object",
          properties: {
            articles: {
              type: "array",
            },
          },
        },
      },
      policy: {
        timeoutMs: 30000,
        maxAttempts: 2,
        backoffStrategy: "exponential",
        backoffBaseMs: 1000,
      },
      determinism: {
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
      },
    },
    {
      id: "newsletter-summary",
      name: "Generate Newsletter Summary",
      type: "ai.generate-text",
      description:
        "Distills the newsletter into an experience summary with mood and takeaway.",
      dependsOn: ["write-articles"],
      inputs: {
        systemPromptTemplate: `You are an experience designer summarizing a newsletter reading session.

INPUT: Today's European Football Newsletter contained 3 articles about various leagues.

MISSION: Create a concise experience summary capturing:
1. The overall theme (what leagues/stories dominated)
2. The most exciting story and why
3. Inferred mood: transfer news → "buzzing"; dramatic results → "thrilled"; tactical stories → "informed"; mixed → "engaged"
4. A one-line takeaway

Return ONLY valid JSON:
{"newsletter":{"editionTitle":"...","topStory":"...","leaguesCovered":["..."],"mood":"...","takeaway":"..."}}

Rules: editionTitle max 8 words, topStory max 20 words, mood single word, takeaway max 15 words. No markdown.`,
        userMessageTemplate:
          "Create a newsletter experience summary for today's European football edition.",
        model: "gemini-2.5-flash",
        templateSources: ["discover-stories", "write-articles"],
      },
      outputs: {
        schema: {
          type: "object",
          properties: {
            newsletter: {
              type: "object",
            },
          },
        },
      },
      policy: {
        timeoutMs: 30000,
        maxAttempts: 2,
        backoffStrategy: "exponential",
        backoffBaseMs: 1000,
      },
      determinism: {
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
      },
    },
  ];

  return {
    accountId,
    projectId,
    environmentId,
    name: "DEMO European Football Newsletter",
    description:
      "A daily newspaper for European football fans — discovers 3 trending stories, writes articles with image descriptions, and summarizes the edition. Powered by bilko-flow engine.",
    specVersion: "1.0.0",
    determinism,
    entryStepId: "discover-stories",
    steps,
    secrets: [],
  };
}

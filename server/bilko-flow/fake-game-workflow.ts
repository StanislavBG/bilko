/**
 * Fake Game Workflow — bilko-flow DSL definition
 *
 * Translates the existing fake-game flow (3-step LLM chain) into
 * the bilko-flow deterministic workflow format.
 *
 * Steps:
 *   1. select-game       (ai.generate-text) — Pick a brain teaser
 *   2. generate-summary   (ai.generate-text) — Simulate a game round
 *   3. experience-summary (ai.generate-text) — Distill into experience report
 */

import type { Workflow, Step, CreateWorkflowInput, DeterminismConfig } from "bilko-flow";

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
 * Create the fake-game workflow definition for bilko-flow.
 * Requires accountId, projectId, environmentId from the bilko-flow context.
 */
export function createFakeGameWorkflowInput(
  accountId: string,
  projectId: string,
  environmentId: string,
): CreateWorkflowInput {
  const steps: Omit<Step, "workflowId">[] = [
    {
      id: "select-game",
      name: "Research & Select Brain Teaser",
      type: "ai.generate-text",
      description:
        "Picks a neuroscientist-recommended brain-teaser game with cognitive benefits.",
      dependsOn: [],
      inputs: {
        systemPrompt: `You are a cognitive neuroscience researcher specializing in brain training and neuroplasticity.

MISSION: Select ONE brain-teaser game that neuroscientists have validated as beneficial for cognitive health. These include games that exercise:
- Working memory (e.g. N-back variants, memory matrix)
- Pattern recognition (e.g. Set, Raven's matrices)
- Mental flexibility (e.g. Wisconsin card sort variants)
- Creative problem-solving (e.g. lateral thinking puzzles)
- Processing speed (e.g. speed matching, visual search)

Return ONLY valid JSON:
{"game":{"name":"...","description":"...","cognitiveDomain":"...","whyBeneficial":"...","difficulty":"easy|medium|hard"}}

Rules: name max 5 words, description max 30 words, cognitiveDomain max 4 words, whyBeneficial max 25 words. No markdown.`,
        userMessage:
          "Select a random neuroscientist-recommended brain teaser game for me to play.",

      },
      outputs: {
        schema: {
          type: "object",
          properties: {
            game: {
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
    {
      id: "generate-summary",
      name: "Simulate Game Round",
      type: "ai.generate-text",
      description:
        "Generates a fictional play-by-play of a brain-teaser match between user and AI opponent Cortex.",
      dependsOn: ["select-game"],
      inputs: {
        systemPromptTemplate: `You are a witty sports commentator narrating a brain-teaser game between a human player and an AI opponent named "Cortex".

INPUT: The game is "{{game.name}}" — {{game.description}}. Difficulty: {{game.difficulty}}.

MISSION: Generate a short, entertaining play-by-play summary including:
1. A brief setup (what the game looked like at the start)
2. 2-3 key moments during play
3. The final result — randomly pick a winner (user wins ~60%)
4. A memorable highlight moment

Return ONLY valid JSON:
{"gameSummary":{"setup":"...","keyMoments":["...","..."],"winner":"user|cortex","userScore":0,"aiScore":0,"highlight":"...","duration":"Xm Ys"}}

Rules: setup max 25 words, each keyMoment max 20 words, highlight max 20 words. No markdown.`,
        userMessageTemplate:
          'Simulate a round of "{{game.name}}" at {{game.difficulty}} difficulty between the user and Cortex.',

        // The upstream step ID whose output provides template variables
        templateSource: "select-game",
      },
      outputs: {
        schema: {
          type: "object",
          properties: {
            gameSummary: {
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
    {
      id: "experience-summary",
      name: "Generate Experience Summary",
      type: "ai.generate-text",
      description:
        "Distills the game session into an experience summary with mood and takeaway.",
      dependsOn: ["generate-summary"],
      inputs: {
        systemPromptTemplate: `You are an experience designer summarizing a brain-training session.

INPUT: The user played "{{game.name}}" ({{game.cognitiveDomain}}). Result: {{gameSummary.winner}} won {{gameSummary.userScore}}-{{gameSummary.aiScore}}. Highlight: {{gameSummary.highlight}}

MISSION: Create a concise experience summary capturing:
1. What game and cognitive skill
2. How it went (winner, score, key moment)
3. Inferred mood: user won decisively → "energized"; narrowly → "focused"; lost close → "challenged"; lost big → "humbled"
4. A one-line takeaway

Return ONLY valid JSON:
{"experience":{"gameName":"...","cognitiveDomain":"...","outcome":"win|loss","summary":"...","mood":"...","takeaway":"..."}}

Rules: summary max 40 words, takeaway max 15 words, mood single word. No markdown.`,
        userMessageTemplate:
          'Create an experience summary for the {{game.name}} session. Result: {{gameSummary.winner}} won {{gameSummary.userScore}}-{{gameSummary.aiScore}}. Highlight: {{gameSummary.highlight}}',

        // This step needs outputs from both select-game and generate-summary
        templateSources: ["select-game", "generate-summary"],
      },
      outputs: {
        schema: {
          type: "object",
          properties: {
            experience: {
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
    name: "DEMO Brain Teaser Game",
    description:
      "A quick brain-teaser game — Bilko picks a neuroscientist-recommended cognitive challenge, simulates a round between you and an AI opponent, and reports the experience. Powered by bilko-flow engine.",
    specVersion: "1.0.0",
    determinism,
    entryStepId: "select-game",
    steps,
    secrets: [],
  };
}

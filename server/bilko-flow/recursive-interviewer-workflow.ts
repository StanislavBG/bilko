/**
 * Recursive Interviewer Workflow — bilko-flow DSL definition
 *
 * Translates the recursive-interviewer flow into the bilko-flow
 * deterministic workflow format. A deep-dive strategy session where
 * each question builds recursively on the user's previous answer.
 *
 * Steps:
 *   1. first-question       (ai.generate-text) — Establish context
 *   2. recursive-questions   (ai.generate-text) — Each question references prior answers
 *   3. user-answers          (user.text-input)  — Free-text or voice responses
 *   4. analysis              (ai.generate-text) — 2 confirmed + 2 hidden insights
 *   5. display-results       (ui.display)       — Render insights with tool recs
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
  ],
};

export function createRecursiveInterviewerWorkflowInput(
  accountId: string,
  projectId: string,
  environmentId: string,
): CreateWorkflowInput {
  const steps: Omit<Step, "workflowId">[] = [
    {
      id: "first-question",
      name: "Establish Context",
      type: "ai.generate-text",
      description:
        "Opens with a question to understand who the user is and what challenge brought them here. Uses the Recursive Interviewer framework: role anchoring, constraint-based iteration, success criteria.",
      dependsOn: [],
      inputs: {
        systemPrompt: `You are an elite AI expert using the "Recursive Interviewer" framework. This framework has three mechanics:

1. ROLE ANCHORING — You are the authority. You guide the conversation.
2. CONSTRAINT-BASED ITERATION — One question at a time, each building recursively on prior answers.
3. SUCCESS CRITERIA — You decide when you have enough context. Don't rush.

Your job: Interview the user to deeply understand their situation, then provide structured recommendations.

INTERVIEW RULES:
- Ask exactly ONE question at a time
- Each question MUST reference or build on something from a previous answer (recursive logic)
- Cover breadth first (role, context, challenges), then depth (specifics, edge cases, hidden patterns)
- 5-7 questions total. Quality over quantity.
- After gathering sufficient context, set done=true

RESPONSE FORMAT — return ONLY valid JSON:
{
  "done": false,
  "nextQuestion": "Your single question here",
  "questionContext": "Brief note on why you're asking (1 sentence)",
  "questionsRemaining": 4
}

When done=true, omit nextQuestion/questionContext/questionsRemaining.
No markdown. No explanation. ONLY the JSON object.`,
        userMessage:
          "Begin the Recursive Interviewer process. Your first question should establish the user's context — who they are, what domain they operate in, and what challenge or goal brought them here today. Be direct but warm.",

      },
      outputs: {
        schema: {
          type: "object",
          properties: {
            nextQuestion: { type: "string" },
            done: { type: "boolean" },
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
      id: "recursive-questions",
      name: "Recursive Follow-ups",
      type: "ai.generate-text",
      description:
        "Each question references prior answers. Breadth first, then depth. 5-7 total. Each question MUST build recursively on something from a previous answer.",
      dependsOn: ["first-question"],
      inputs: {
        systemPromptTemplate: `You are continuing a Recursive Interviewer session. Build recursively on prior answers. Each question MUST reference something specific the user said previously.

RESPONSE FORMAT — return ONLY valid JSON:
{
  "done": false,
  "nextQuestion": "Your single question here",
  "questionContext": "Brief note on why you're asking (1 sentence)",
  "questionsRemaining": 4
}

When done=true, omit nextQuestion/questionContext/questionsRemaining.
No markdown. ONLY the JSON object.`,
        userMessageTemplate: "Full conversation history",

        templateSource: "first-question",
      },
      outputs: {
        schema: {
          type: "object",
          properties: {
            nextQuestion: { type: "string" },
            done: { type: "boolean" },
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
      id: "user-answers",
      name: "User Answers",
      type: "user.text-input" as any,
      description:
        "Free-text or voice responses to each interview question.",
      dependsOn: ["first-question"],
      inputs: {
        inputMode: "text-or-voice",
        placeholder: "Type your answer or use voice...",
      },
      outputs: {
        schema: {
          type: "object",
          properties: {
            answer: { type: "string" },
          },
        },
      },
      policy: { timeoutMs: 300000, maxAttempts: 1 },
      determinism: {
        usesTime: false,
        usesExternalApis: false,
        pureFunction: false,
        externalDependencies: [],
      },
    },
    {
      id: "analysis",
      name: "Generate Insights",
      type: "ai.generate-text",
      description:
        "Delivers 2 confirmed insights (things the user likely suspects, confirmed with evidence) and 2 hidden patterns (creative angles, unconventional approaches) with tools and impact.",
      dependsOn: ["recursive-questions", "user-answers"],
      inputs: {
        systemPrompt: `You are an elite AI expert delivering the output of a Recursive Interviewer session. Based on the interview transcript, provide exactly 2 OBVIOUS insights (things the user likely already suspects but you're confirming with evidence) and exactly 2 NON-OBVIOUS insights (creative angles, hidden patterns, or unconventional approaches they haven't considered).

RESPONSE FORMAT — return ONLY valid JSON:
{
  "summary": "2-3 sentence synthesis of what you learned",
  "obvious": [
    {
      "title": "Short title (max 6 words)",
      "description": "The insight and recommended action (2-3 sentences)",
      "impact": "Expected impact (1 sentence)",
      "tools": ["Tool1", "Tool2"]
    }
  ],
  "nonObvious": [
    {
      "title": "Short title (max 6 words)",
      "description": "The hidden insight and recommended action (2-3 sentences)",
      "impact": "Expected impact (1 sentence)",
      "tools": ["Tool1", "Tool2"]
    }
  ]
}

Rules:
- obvious array must have exactly 2 items
- nonObvious array must have exactly 2 items
- Be specific to THEIR situation — reference things they actually said
- For tools, suggest real products, frameworks, or methodologies
- No markdown. ONLY the JSON object.`,
        userMessageTemplate:
          "Interview transcript:\n\n{{transcript}}\n\nProvide your analysis.",

        templateSources: ["recursive-questions", "user-answers"],
      },
      outputs: {
        schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            obvious: { type: "array" },
            nonObvious: { type: "array" },
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
      id: "display-results",
      name: "Display Insights",
      type: "ui.display" as any,
      description:
        "Renders confirmed insights and hidden patterns with tool recommendations.",
      dependsOn: ["analysis"],
      inputs: {
        sourceFields: ["summary", "obvious", "nonObvious"],
      },
      outputs: {
        schema: {
          type: "object",
          properties: {},
        },
      },
      policy: { timeoutMs: 300000, maxAttempts: 1 },
      determinism: {
        usesTime: false,
        usesExternalApis: false,
        pureFunction: true,
        externalDependencies: [],
      },
    },
  ];

  return {
    accountId,
    projectId,
    environmentId,
    name: "The Recursive Interviewer",
    description:
      "Choose a topic — career change, product launch, team productivity, or business growth — then have a deep conversation where each question builds on your last answer. The AI digs deeper until it truly understands your situation, then delivers confirmed insights and hidden patterns. Powered by bilko-flow engine.",
    specVersion: "1.0.0",
    determinism,
    entryStepId: "first-question",
    steps,
    secrets: [],
  };
}

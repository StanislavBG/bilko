/**
 * AI Consultation Workflow — bilko-flow DSL definition
 *
 * Translates the ai-consultation flow into the bilko-flow deterministic
 * workflow format. A multi-turn conversational interview where an AI
 * strategy consultant asks questions about the user's work, then delivers
 * 2 obvious + 2 non-obvious AI leverage recommendations.
 *
 * Steps:
 *   1. first-question      (ai.generate-text) — Opening question to understand role/industry
 *   2. follow-up-questions  (ai.generate-text) — Iterative questions building on answers (5-7 rounds)
 *   3. user-answers         (user.text-input)  — User provides free-text answers
 *   4. analysis             (ai.generate-text) — Generate 2+2 recommendations from transcript
 *   5. display-results      (ui.display)       — Render consultation results
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

export function createAiConsultationWorkflowInput(
  accountId: string,
  projectId: string,
  environmentId: string,
): CreateWorkflowInput {
  const steps: Omit<Step, "workflowId">[] = [
    {
      id: "first-question",
      name: "Ask First Question",
      type: "ai.generate-text",
      description:
        "Generates the opening question to understand who the user is and what they do. Warm and conversational tone.",
      dependsOn: [],
      inputs: {
        systemPrompt: `You are an elite AI strategy consultant. Your job is to interview the user to deeply understand their work, then recommend where AI can create the most impact.

INTERVIEW RULES:
- Ask exactly ONE question at a time
- Build on previous answers — show you're listening
- Cover these areas across 5-7 questions: role/industry, daily workflows, pain points, KPIs/objectives, tools they use, team size/structure, data they work with
- Questions should be conversational, not interrogative
- After gathering sufficient context (5-7 questions), set done=true

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
          "Start the consultation. Ask your first question to understand who this person is and what they do. Make it warm and conversational — they're here because they want to leverage AI better.",

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
      id: "follow-up-questions",
      name: "Follow-up Questions (iterative)",
      type: "ai.generate-text",
      description:
        "For each user answer, evaluates context completeness and generates the next question. Covers: role/industry, daily workflows, pain points, KPIs, tools, team, data. Sets done=true after 5-7 questions.",
      dependsOn: ["first-question"],
      inputs: {
        systemPromptTemplate: `You are an elite AI strategy consultant continuing an interview.

Given the interview so far, ask the next question OR set done=true if you have enough context for recommendations.

RESPONSE FORMAT — return ONLY valid JSON:
{
  "done": false,
  "nextQuestion": "Your single question here",
  "questionContext": "Brief note on why you're asking (1 sentence)",
  "questionsRemaining": 4
}

When done=true, omit nextQuestion/questionContext/questionsRemaining.
No markdown. ONLY the JSON object.`,
        userMessageTemplate: "User's latest answer + full conversation history",

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
      name: "User Answers (voice/text)",
      type: "user.text-input" as any,
      description:
        "User provides free-text answers via keyboard or voice input. Each answer feeds back into the follow-up question step.",
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
      name: "Generate Recommendations",
      type: "ai.generate-text",
      description:
        "Analyzes the complete interview transcript and generates 2 obvious + 2 non-obvious AI leverage recommendations, each with title, description, impact, and suggested tools.",
      dependsOn: ["follow-up-questions", "user-answers"],
      inputs: {
        systemPrompt: `You are an elite AI strategy consultant. Based on the interview transcript below, provide exactly 2 OBVIOUS recommendations (things the user probably suspects) and exactly 2 NON-OBVIOUS recommendations (creative applications they haven't considered).

RESPONSE FORMAT — return ONLY valid JSON:
{
  "summary": "2-3 sentence summary of their situation",
  "obvious": [
    {
      "title": "Short title (max 6 words)",
      "description": "What to do and why (2-3 sentences)",
      "impact": "Expected impact (1 sentence)",
      "tools": ["Tool1", "Tool2"]
    }
  ],
  "nonObvious": [
    {
      "title": "Short title (max 6 words)",
      "description": "What to do and why (2-3 sentences)",
      "impact": "Expected impact (1 sentence)",
      "tools": ["Tool1", "Tool2"]
    }
  ]
}

Rules:
- obvious array must have exactly 2 items
- nonObvious array must have exactly 2 items
- Be specific to THEIR workflows, not generic advice
- Tools should be real products (ChatGPT, Claude, Zapier, n8n, etc.)
- No markdown. ONLY the JSON object.`,
        userMessageTemplate:
          "Interview transcript:\n\n{{transcript}}\n\nProvide your analysis and recommendations.",

        templateSources: ["follow-up-questions", "user-answers"],
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
      name: "Display Recommendations",
      type: "ui.display" as any,
      description:
        "Renders the final consultation results: summary, 2 obvious wins, and 2 hidden opportunities with tool suggestions and impact estimates.",
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
    name: "AI Leverage Consultation",
    description:
      "Pick your field and an AI expert asks simple questions about your daily work. You'll get 2 quick wins you can start using right away, plus 2 surprising AI opportunities you probably haven't thought of. Powered by bilko-flow engine.",
    specVersion: "1.0.0",
    determinism,
    entryStepId: "first-question",
    steps,
    secrets: [],
  };
}

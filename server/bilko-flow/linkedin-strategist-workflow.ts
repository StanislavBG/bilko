/**
 * LinkedIn Strategist Workflow — bilko-flow DSL definition
 *
 * Translates the linkedin-strategist flow into the bilko-flow
 * deterministic workflow format. A goal-driven flow: user picks
 * "Improve LinkedIn" or "Interview Based on Roles", provides their
 * URL, then has a multi-turn conversation before getting tailored output.
 *
 * Steps:
 *   1. goal-selection          (user.menu-select)   — Pick improve or interview
 *   2. linkedin-input          (user.text-input)    — Provide LinkedIn URL
 *   3. conversation-start      (ai.generate-text)   — Opening LLM question
 *   4. conversation-turns      (ai.generate-text)   — Multi-turn Q&A (6-12 rounds)
 *   5. user-responses          (user.text-input)    — User answers per turn
 *   6. generate-results        (ai.generate-text)   — Final deliverable (descriptions or feedback)
 *   7. display-results         (ui.display)         — Render results with copy actions
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

export function createLinkedInStrategistWorkflowInput(
  accountId: string,
  projectId: string,
  environmentId: string,
): CreateWorkflowInput {
  const steps: Omit<Step, "workflowId">[] = [
    {
      id: "goal-selection",
      name: "Choose Your Goal",
      type: "user.menu-select" as any,
      description:
        "User selects between two modes: 'Improve your LinkedIn' (exploratory conversation + description options per role) or 'Interview me based on my roles' (dynamic interview + feedback).",
      dependsOn: [],
      inputs: {
        options: [
          {
            id: "improve",
            label: "Improve your LinkedIn",
            description:
              "Exploratory questions about your roles, then multiple description options per role to copy to LinkedIn",
            icon: "Target",
            accentColor: "blue",
          },
          {
            id: "interview",
            label: "Interview me based on my roles",
            description:
              "Dynamic professional interview adapted to your experience, then detailed feedback on strengths and areas to develop",
            icon: "MessageSquare",
            accentColor: "violet",
          },
        ],
      },
      outputs: {
        schema: {
          type: "object",
          properties: {
            goal: { type: "string", enum: ["improve", "interview"] } as any,
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
      id: "linkedin-input",
      name: "Enter LinkedIn URL",
      type: "user.text-input" as any,
      description:
        "User provides their LinkedIn profile URL. Validated against linkedin.com/in/ pattern.",
      dependsOn: ["goal-selection"],
      inputs: {
        placeholder: "https://www.linkedin.com/in/your-name",
        validationRegex: "^https?://(www\\.)?linkedin\\.com/in/[\\w-]+/?",
        errorMessage:
          "That doesn't look like a LinkedIn profile URL. It should look like: linkedin.com/in/your-name",
      },
      outputs: {
        schema: {
          type: "object",
          properties: {
            linkedinUrl: { type: "string" },
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
      id: "conversation-start",
      name: "Start Conversation",
      type: "ai.generate-text",
      description:
        "Opens the multi-turn conversation. For 'improve' mode: asks about current and past roles. For 'interview' mode: begins a professional interview.",
      dependsOn: ["linkedin-input"],
      inputs: {
        systemPromptTemplate: `{{#if goal == "improve"}}You are a world-class LinkedIn career strategist. The user wants to improve their LinkedIn profile descriptions. Their profile is at: {{linkedinUrl}}

Your job is to have an exploratory conversation to understand their roles and achievements. Ask about current and past professional roles. For each role, dig into specific achievements, metrics, impact, responsibilities. Ask ONE question at a time.

RESPONSE FORMAT — return ONLY valid JSON:
{
  "message": "Your question",
  "context": "Why you're asking (1 sentence)",
  "done": false,
  "rolesDiscovered": [
    { "id": "role-1", "title": "Job Title", "company": "Company", "duration": "Period", "notes": "Details so far" }
  ]
}
{{else}}You are a dynamic interviewer conducting a professional interview based on the user's LinkedIn roles. Their profile is at: {{linkedinUrl}}

Start by asking about their current role. Dive deep into experiences, decisions, leadership. Ask behavioral questions tailored to what they share. Ask ONE question at a time.

RESPONSE FORMAT — return ONLY valid JSON:
{
  "message": "Your interview question",
  "context": "Area you're exploring (1 sentence)",
  "done": false,
  "rolesDiscovered": [
    { "id": "role-1", "title": "Job Title", "company": "Company", "duration": "Period", "notes": "Observations" }
  ]
}
{{/if}}

No markdown. ONLY the JSON object.`,
        userMessageTemplate:
          "I'd like to {{#if goal == 'improve'}}improve my LinkedIn profile{{else}}be interviewed based on my professional roles{{/if}}. My profile URL is {{linkedinUrl}}. Let's start.",

        templateSources: ["goal-selection", "linkedin-input"],
      },
      outputs: {
        schema: {
          type: "object",
          properties: {
            message: { type: "string" },
            done: { type: "boolean" },
            rolesDiscovered: { type: "array" },
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
      id: "conversation-turns",
      name: "Multi-turn Conversation",
      type: "ai.generate-text",
      description:
        "Iterative LLM calls building on user answers. Maintains cumulative role list. For improve: 6-10 exchanges covering all roles. For interview: 8-12 exchanges with behavioral questions.",
      dependsOn: ["conversation-start"],
      inputs: {
        systemPromptTemplate:
          "Continue the conversation. Build on the user's answers. Maintain the cumulative rolesDiscovered list. Set done=true when enough context is gathered.",
        userMessageTemplate: "User's latest answer + roles context",

        templateSource: "conversation-start",
      },
      outputs: {
        schema: {
          type: "object",
          properties: {
            message: { type: "string" },
            done: { type: "boolean" },
            rolesDiscovered: { type: "array" },
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
      id: "user-responses",
      name: "User Responses",
      type: "user.text-input" as any,
      description:
        "Free-text answers to each conversation turn. Supports keyboard and voice input.",
      dependsOn: ["conversation-start"],
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
      id: "generate-results",
      name: "Generate Final Output",
      type: "ai.generate-text",
      description:
        "Branches on goal. Improve: generates 2-3 description options per role (impact-focused, leadership-focused, technical). Interview: generates summary, strengths, areas to explore, and role-specific insights.",
      dependsOn: ["conversation-turns", "user-responses"],
      inputs: {
        systemPromptTemplate: `{{#if goal == "improve"}}You are a world-class LinkedIn copywriter. Using the conversation insights, generate improved LinkedIn role descriptions.

For EACH role, create 2-3 different description OPTIONS:
- Option A: Impact-focused (metrics, outcomes)
- Option B: Leadership-focused (team, strategy)
- Option C: Technical depth (only if relevant)

RESPONSE FORMAT — return ONLY valid JSON:
{
  "roles": [
    {
      "roleId": "role-1",
      "title": "Job Title",
      "company": "Company Name",
      "duration": "Time period",
      "options": [
        {
          "id": "option-a",
          "label": "Impact-focused",
          "description": "Updated description (2-4 paragraphs, 150-300 words)",
          "keyHighlights": ["3-5 key achievements"]
        }
      ]
    }
  ]
}
{{else}}You are a senior interview coach providing feedback.

RESPONSE FORMAT — return ONLY valid JSON:
{
  "summary": "2-3 sentence overall assessment",
  "strengths": ["3-5 specific things communicated well"],
  "areasToExplore": ["2-4 areas for more detail or reframing"],
  "roleInsights": [
    { "role": "Title at Company", "insight": "Specific feedback about this role" }
  ]
}
{{/if}}

Be specific. Reference actual things said. No markdown. ONLY the JSON object.`,
        userMessageTemplate:
          "Conversation transcript and discovered roles. Generate the final deliverable.",

        templateSources: [
          "goal-selection",
          "linkedin-input",
          "conversation-turns",
          "user-responses",
        ],
      },
      outputs: {
        schema: {
          type: "object",
          properties: {
            roles: { type: "array" },
            summary: { type: "string" },
            strengths: { type: "array" },
            areasToExplore: { type: "array" },
            roleInsights: { type: "array" },
          },
        },
      },
      policy: {
        timeoutMs: 45000,
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
      name: "Display Results",
      type: "ui.display" as any,
      description:
        "Improve mode: role cards with selectable description options and copy-to-clipboard. Interview mode: summary, strengths, areas to explore, and role-specific insights.",
      dependsOn: ["generate-results"],
      inputs: {
        sourceFields: ["roles", "summary", "strengths", "areasToExplore", "roleInsights"],
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
    name: "LinkedIn Strategist",
    description:
      "Pick a goal (Improve or Interview), share your LinkedIn URL, and have a focused conversation with the agent. For Improve: get multiple description options per role to copy straight to LinkedIn. For Interview: get strengths, areas to explore, and role-specific coaching. Powered by bilko-flow engine.",
    specVersion: "1.0.0",
    determinism,
    entryStepId: "goal-selection",
    steps,
    secrets: [],
  };
}

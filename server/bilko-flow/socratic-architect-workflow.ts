/**
 * Socratic Architect Workflow — bilko-flow DSL definition
 *
 * Translates the socratic-architect flow into the bilko-flow
 * deterministic workflow format. A fully configurable expert session:
 * user either picks a preset expert (Business Coach, Career Advisor,
 * Writing Coach, Tech Advisor, Wellness Coach) or designs their own
 * via a setup phase. The AI then conducts a Socratic interview and
 * delivers structured findings.
 *
 * Steps:
 *   1. setup              (user.form-input)    — Pick preset or define expert role/goal/output
 *   2. first-question     (ai.generate-text)   — Opening Socratic question
 *   3. socratic-questions (ai.generate-text)   — Recursive follow-ups building on answers
 *   4. user-answers       (user.text-input)    — Free-text or voice responses
 *   5. analysis           (ai.generate-text)   — 2 confirmed + 2 hidden findings
 *   6. display-results    (ui.display)         — Render personalized insights
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

export function createSocraticArchitectWorkflowInput(
  accountId: string,
  projectId: string,
  environmentId: string,
): CreateWorkflowInput {
  const steps: Omit<Step, "workflowId">[] = [
    {
      id: "setup",
      name: "Define Your Expert",
      type: "user.form-input" as any,
      description:
        "User picks a preset expert (Business Coach, Career Advisor, Writing Coach, Tech Advisor, Wellness Coach) or fills in custom fields: Expert Role, Your Goal, Desired Output. Presets pre-fill all three fields and skip directly to the interview.",
      dependsOn: [],
      inputs: {
        presets: [
          {
            id: "business-coach",
            label: "Business Coach",
            description: "Get strategic advice on growing or improving your business",
            setupValues: {
              expertise:
                "Business Strategy Consultant with 20 years of experience advising startups and SMBs",
              goal: "Create an actionable growth plan for my business",
              output:
                "2 obvious growth strategies I should double down on + 2 non-obvious opportunities I'm missing",
            },
          },
          {
            id: "career-advisor",
            label: "Career Advisor",
            description: "Map out your next career move with expert guidance",
            setupValues: {
              expertise:
                "Senior Career Development Coach who specializes in career transitions and professional growth",
              goal: "Map out my best career options and next steps",
              output:
                "2 confirmed career paths that fit my skills + 2 unexpected opportunities I should explore",
            },
          },
          {
            id: "writing-coach",
            label: "Writing Coach",
            description: "Improve your writing, storytelling, or content strategy",
            setupValues: {
              expertise:
                "Creative Writing Expert and Content Strategist with published work and editorial experience",
              goal: "Improve my writing quality and develop a stronger voice",
              output:
                "2 key structural improvements for my writing + 2 creative techniques to make it stand out",
            },
          },
          {
            id: "tech-advisor",
            label: "Tech Strategy Advisor",
            description: "Get advice on technology choices, tools, or architecture",
            setupValues: {
              expertise:
                "Technology Strategy Consultant and Solutions Architect with deep experience across cloud, AI, and modern stacks",
              goal: "Choose the right technology approach for my project or business",
              output:
                "2 solid technology choices I should commit to + 2 innovative alternatives I haven't considered",
            },
          },
          {
            id: "wellness-coach",
            label: "Wellness & Productivity Coach",
            description: "Optimize your energy, habits, and daily routine",
            setupValues: {
              expertise:
                "Holistic Wellness and Productivity Coach combining behavioral science with practical habit design",
              goal: "Design a sustainable routine that improves my energy and output",
              output:
                "2 obvious habit changes for immediate impact + 2 surprising adjustments that create long-term results",
            },
          },
        ],
        customFields: [
          {
            id: "expertise",
            label: "Expert Role",
            placeholder:
              "e.g., Clinical Psychologist, Business Consultant, Script Writer",
          },
          {
            id: "goal",
            label: "Your Goal",
            placeholder:
              "e.g., Build a character profile, Create a business plan",
          },
          {
            id: "output",
            label: "Desired Output",
            placeholder:
              "e.g., 2 obvious + 2 non-obvious insights, A 10-point action plan",
          },
        ],
      },
      outputs: {
        schema: {
          type: "object",
          properties: {
            expertise: { type: "string" },
            goal: { type: "string" },
            output: { type: "string" },
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
      id: "first-question",
      name: "Ask First Question",
      type: "ai.generate-text",
      description:
        "Opens the Socratic interview using the configured expert persona. System prompt is built dynamically from setup values: expert role, goal, and desired output.",
      dependsOn: ["setup"],
      inputs: {
        systemPromptTemplate: `You are an expert {{expertise}}. The user wants to achieve: "{{goal}}".

You will conduct a Socratic deep-dive interview to gather all necessary data for delivering: {{output}}.

INTERVIEW RULES:
- Ask exactly ONE question at a time
- Each question should build on the previous answer (Recursive Logic)
- You are the judge of when context is "Complete" — do not rush
- Cover 5-7 questions, going from broad context to specific details
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
        userMessageTemplate:
          'Begin the Socratic interview. You are an expert {{expertise}} helping the user achieve: "{{goal}}". Ask your first question to establish their current situation and context. Be warm and professional.',

        templateSource: "setup",
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
      id: "socratic-questions",
      name: "Socratic Follow-ups",
      type: "ai.generate-text",
      description:
        "Each question builds recursively on previous answers. Uses Socratic method: asking, not telling. 5-7 questions total before setting done=true.",
      dependsOn: ["first-question"],
      inputs: {
        systemPromptTemplate:
          "Continue the Socratic interview. Build recursively on prior answers. Each question MUST reference something specific the user said.",
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
        "Free-text or voice responses to each Socratic question.",
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
      name: "Generate Findings",
      type: "ai.generate-text",
      description:
        "Delivers the requested output using the configured expert persona. Default structure: 2 obvious findings (confirmed suspicions) + 2 non-obvious findings (unexpected insights).",
      dependsOn: ["socratic-questions", "user-answers"],
      inputs: {
        systemPromptTemplate: `You are an expert {{expertise}}. Based on the Socratic interview transcript below, deliver the requested output: {{output}}.

Structure your response as exactly 2 "obvious" findings (things that confirm what the user likely suspects) and exactly 2 "nonObvious" findings (unexpected insights, hidden patterns, or creative angles).

RESPONSE FORMAT — return ONLY valid JSON:
{
  "summary": "2-3 sentence synthesis of what you discovered",
  "obvious": [
    {
      "title": "Short title (max 6 words)",
      "description": "The finding and recommended action (2-3 sentences)",
      "impact": "Expected impact (1 sentence)",
      "tools": ["Relevant method or tool"]
    }
  ],
  "nonObvious": [
    {
      "title": "Short title (max 6 words)",
      "description": "The hidden insight and recommended action (2-3 sentences)",
      "impact": "Expected impact (1 sentence)",
      "tools": ["Relevant method or tool"]
    }
  ]
}

Rules:
- obvious array must have exactly 2 items
- nonObvious array must have exactly 2 items
- Be specific — reference actual things they said
- No markdown. ONLY the JSON object.`,
        userMessageTemplate:
          "Interview transcript:\n\n{{transcript}}\n\nProvide your analysis.",

        templateSources: ["setup", "socratic-questions", "user-answers"],
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
      name: "Display Findings",
      type: "ui.display" as any,
      description:
        "Renders the expert's findings: summary, 2 confirmed insights (Primary Insights), and 2 unexpected discoveries (Unexpected Discoveries) with tools and impact.",
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
    name: "The Socratic Architect",
    description:
      "Pick a ready-made expert (Business Coach, Career Advisor, Writing Coach, Tech Advisor, Wellness Coach) or design your own. The AI becomes your specialist, interviews you with the Socratic method, and delivers confirmed insights plus unexpected discoveries. Powered by bilko-flow engine.",
    specVersion: "1.0.0",
    determinism,
    entryStepId: "setup",
    steps,
    secrets: [],
  };
}

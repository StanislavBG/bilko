/**
 * Work With Me Workflow — bilko-flow DSL definition
 *
 * Translates the work-with-me flow into the bilko-flow deterministic
 * workflow format. This is a guided web-task assistant: user provides
 * an objective, LLM researches step-by-step links, then for each step
 * the page is fetched, analyzed, and presented as a wireframe with
 * element-level guidance.
 *
 * Steps:
 *   1. objective-input   (user.text-input)   — User enters their goal
 *   2. research-steps    (ai.generate-text)   — LLM finds step-by-step plan with URLs
 *   3. select-step       (user.menu-select)   — User picks which step to work on
 *   4. fetch-page        (data.http-fetch)     — Proxy fetches + structures the page
 *   5. analyze-page      (ai.generate-text)   — LLM reads page, generates guidance
 *   6. guided-view       (ui.display)         — Wireframe with guidance overlays
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
    {
      name: "web-proxy",
      kind: "http-api",
      deterministic: false,
      evidenceCapture: "full-response",
      nondeterminismDescription:
        "External website content changes over time",
    },
  ],
};

export function createWorkWithMeWorkflowInput(
  accountId: string,
  projectId: string,
  environmentId: string,
): CreateWorkflowInput {
  const steps: Omit<Step, "workflowId">[] = [
    {
      id: "objective-input",
      name: "User Enters Objective",
      type: "user.text-input",
      description:
        "User describes their goal in natural language (e.g. 'Register a business in Washington State'). Free-text input with example suggestions.",
      dependsOn: [],
      inputs: {
        placeholder:
          "e.g., Register an LLC in Washington State, Apply for a US passport renewal",
        exampleSuggestions: [
          "Register an LLC in Washington State",
          "Apply for a US passport renewal",
          "File for a small business tax extension",
          "Set up a Google Workspace for my team",
        ],
      },
      outputs: {
        schema: {
          type: "object",
          properties: {
            objective: { type: "string" },
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
      id: "research-steps",
      name: "Research Step-by-Step Plan",
      type: "ai.generate-text",
      description:
        "Agent analyzes the objective and finds 3-7 concrete steps with real, actionable URLs from official sources. Each step includes a title, description, URL, estimated time, and justification.",
      dependsOn: ["objective-input"],
      inputs: {
        systemPrompt: `You are a task research specialist. Given a user's objective, find the exact steps they need to complete it online.

Return ONLY valid JSON with this structure:
{
  "taskTitle": "Short title for the task",
  "overview": "1-2 sentence overview of what needs to be done",
  "steps": [
    {
      "stepNumber": 1,
      "title": "Step title",
      "description": "What to do in this step (1-2 sentences)",
      "url": "https://exact-url-to-visit",
      "estimatedTime": "5 min",
      "whyThisStep": "Why this step is necessary (1 sentence)"
    }
  ]
}

Rules:
- Find 3-7 concrete steps with REAL, working URLs
- URLs must be official government, organization, or service websites
- Each step should be actionable
- Order steps logically
- No markdown, ONLY the JSON object`,
        userMessageTemplate:
          'Find the step-by-step process for: "{{objective}}"',
        model: "gemini-2.5-flash",
        templateSource: "objective-input",
      },
      outputs: {
        schema: {
          type: "object",
          properties: {
            taskTitle: { type: "string" },
            overview: { type: "string" },
            steps: { type: "array" },
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
      id: "select-step",
      name: "User Picks Step",
      type: "user.menu-select",
      description:
        "Displays the step-by-step plan as cards. User picks which step to work on. Completed steps are shown with a green checkmark.",
      dependsOn: ["research-steps"],
      inputs: {
        sourceField: "steps",
      },
      outputs: {
        schema: {
          type: "object",
          properties: {
            selectedStep: { type: "object" },
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
      id: "fetch-page",
      name: "Fetch & Parse Website",
      type: "data.http-fetch",
      description:
        "Server-side proxy fetches the selected URL, parses the HTML with jsdom, and extracts a structured representation of the page: headings, links, buttons, form fields, paragraphs, lists, and images.",
      dependsOn: ["select-step"],
      inputs: {
        urlSource: "selectedStep.url",
      },
      outputs: {
        schema: {
          type: "object",
          properties: {
            pageStructure: { type: "object" },
          },
        },
      },
      policy: {
        timeoutMs: 15000,
        maxAttempts: 2,
        backoffStrategy: "exponential",
        backoffBaseMs: 1000,
      },
      determinism: {
        usesTime: true,
        usesExternalApis: true,
        pureFunction: false,
        externalDependencies: [
          {
            name: "web-proxy",
            kind: "http-api",
            deterministic: false,
            evidenceCapture: "full-response",
          },
        ],
      },
    },
    {
      id: "analyze-page",
      name: "Generate Visual Guidance",
      type: "ai.generate-text",
      description:
        "Agent reads the page structure and generates element-level guidance: which elements to click, fill, or read — each with a justification explaining why that action matters for the user's goal.",
      dependsOn: ["fetch-page"],
      inputs: {
        systemPromptTemplate: `You are guiding a user through a website to help them achieve their goal.

USER'S OBJECTIVE: {{objective}}
CURRENT STEP: Step {{selectedStep.stepNumber}} — {{selectedStep.title}}
STEP DESCRIPTION: {{selectedStep.description}}

The user is now viewing this page:
PAGE TITLE: {{pageStructure.title}}
PAGE URL: {{pageStructure.finalUrl}}

Return ONLY valid JSON with this structure:
{
  "pageSummary": "What this page is about (1-2 sentences)",
  "currentStepContext": "Where the user is in their journey (1 sentence)",
  "guidanceItems": [
    {
      "elementId": "the-element-id",
      "action": "click|fill|read|select|scroll-to",
      "instruction": "Clear instruction",
      "justification": "Why this matters",
      "order": 1,
      "priority": "primary|secondary|info"
    }
  ],
  "nextAction": "What happens after (1 sentence)"
}

Rules: 3-5 guidance items, primary=must do, secondary=should do, info=good to know. No markdown.`,
        userMessageTemplate:
          'Guide the user through this page to help them: "{{selectedStep.description}}"',
        model: "gemini-2.5-flash",
        templateSources: [
          "objective-input",
          "select-step",
          "fetch-page",
        ],
      },
      outputs: {
        schema: {
          type: "object",
          properties: {
            pageSummary: { type: "string" },
            currentStepContext: { type: "string" },
            guidanceItems: { type: "array" },
            nextAction: { type: "string" },
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
      id: "guided-view",
      name: "Interactive Wireframe",
      type: "ui.display",
      description:
        "Renders the website as a wireframe with guidance overlays. Highlighted elements have colored borders and inline tooltips. Links are clickable and navigate to the next page.",
      dependsOn: ["analyze-page"],
      inputs: {
        sourceFields: ["pageStructure", "guidanceItems"],
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
    name: "Work With Me — Guided Web Task Assistant",
    description:
      "Tell Bilko your objective and it finds every step, then wireframes each website inside the app so the agent can see through your eyes and guide you with element-level overlays. Powered by bilko-flow engine.",
    specVersion: "1.0.0",
    determinism,
    entryStepId: "objective-input",
    steps,
    secrets: [],
  };
}

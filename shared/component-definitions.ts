/**
 * Component Definitions — Backend-driven config for step type descriptions.
 *
 * This is the single source of truth for the Components catalog in the Flow Explorer.
 * Each entry describes a flow step type's purpose, inputs, outputs, use cases,
 * and internal codebase references so the UI can render dynamically without
 * hardcoding any domain knowledge.
 *
 * Referenced by: GET /api/components
 */

export interface ComponentFieldSpec {
  name: string;
  type: string;
  description: string;
  required: boolean;
}

export interface ComponentUseCase {
  title: string;
  description: string;
  /** Flow ID in the registry that demonstrates this use case */
  exampleFlowId?: string;
  /** Step ID within that flow */
  exampleStepId?: string;
}

export interface ComponentReference {
  label: string;
  /** Internal codebase path */
  path: string;
  description: string;
}

export interface ComponentDefinition {
  /** Matches StepType: "llm" | "user-input" | "transform" | "validate" | "display" */
  type: string;
  name: string;
  summary: string;
  description: string;
  category: "ai" | "interaction" | "data" | "quality" | "presentation";
  inputs: ComponentFieldSpec[];
  outputs: ComponentFieldSpec[];
  /** ARCH-005 contract requirements for this step type */
  contractRules: string[];
  useCases: ComponentUseCase[];
  references: ComponentReference[];
}

export const componentDefinitions: ComponentDefinition[] = [
  {
    type: "llm",
    name: "LLM Call",
    summary: "Sends a structured prompt to an AI model and receives typed JSON output.",
    description:
      "The LLM step is the core AI primitive in every flow. It sends a system prompt and user message to a language model (Gemini 2.5 Flash by default) and expects a structured JSON response matching the outputSchema. All LLM calls go through chatJSON<T>() which handles the server proxy, response cleaning, and JSON parsing. This is the only step type that communicates with an AI model.",
    category: "ai",
    inputs: [
      { name: "prompt", type: "string", description: "System prompt that defines the AI's role and output format", required: true },
      { name: "userMessage", type: "string", description: "The user-facing message or query sent to the model", required: true },
      { name: "model", type: "string", description: "Model identifier (e.g. 'gemini-2.5-flash')", required: false },
      { name: "inputSchema", type: "SchemaField[]", description: "Schema describing data this step receives from upstream dependencies", required: false },
      { name: "outputSchema", type: "SchemaField[]", description: "Schema describing the expected structured JSON output (ARCH-005 required)", required: true },
    ],
    outputs: [
      { name: "content", type: "T (generic)", description: "Parsed JSON matching the outputSchema type parameter", required: true },
      { name: "usage", type: "TokenUsage", description: "Token counts: promptTokens, completionTokens, totalTokens", required: false },
      { name: "rawResponse", type: "string", description: "Raw LLM text before JSON parsing (captured in execution trace)", required: false },
    ],
    contractRules: [
      "Must have a non-empty prompt (system prompt)",
      "Must have a non-empty outputSchema",
      "Should specify a model (defaults to gemini-2.5-flash)",
      "All calls must use chatJSON<T>() — never raw fetch",
    ],
    useCases: [
      {
        title: "Research & Discovery",
        description: "Generate trending topics, find relevant content, or research a domain. The LLM analyzes a broad space and returns structured findings.",
        exampleFlowId: "video-discovery",
        exampleStepId: "research-topics",
      },
      {
        title: "Content Generation",
        description: "Produce written content like role descriptions, recommendations, or summaries based on gathered context.",
        exampleFlowId: "linkedin-strategist",
        exampleStepId: "generate-descriptions",
      },
      {
        title: "Iterative Interviewing",
        description: "Conduct multi-turn conversations where each question builds on prior answers. The LLM decides when enough context is gathered.",
        exampleFlowId: "ai-consultation",
        exampleStepId: "follow-up-questions",
      },
    ],
    references: [
      { label: "chatJSON<T>()", path: "client/src/lib/flow-engine/llm-client.ts", description: "The typed LLM call function — all flows must use this" },
      { label: "LLM Server Routes", path: "server/llm/routes.ts", description: "POST /api/llm/chat endpoint that proxies to Gemini" },
      { label: "ARCH-005 LLM Contract", path: "client/src/lib/flow-inspector/validate.ts", description: "Steel frame validator enforcing prompt + outputSchema requirements" },
      { label: "Flow Registry Examples", path: "client/src/lib/flow-inspector/registry.ts", description: "All registered flows with LLM step definitions" },
    ],
  },
  {
    type: "user-input",
    name: "User Input",
    summary: "Collects data from the user through clicks, forms, or voice input.",
    description:
      "The User Input step pauses flow execution to collect information from the user. It can render as topic selection cards, checkboxes, free-text fields, or voice capture. The inputSchema defines what context is shown to the user, while the outputSchema defines what the user's response looks like. Execution resumes when resolveUserInput() is called with the user's selection.",
    category: "interaction",
    inputs: [
      { name: "inputSchema", type: "SchemaField[]", description: "Schema describing data presented to the user (e.g. topic cards, role lists)", required: true },
      { name: "outputSchema", type: "SchemaField[]", description: "Schema describing the shape of the user's response", required: true },
    ],
    outputs: [
      { name: "userSelection", type: "varies", description: "The user's choice or input, matching the outputSchema shape", required: true },
    ],
    contractRules: [
      "Must have a non-empty inputSchema (what to show the user)",
      "Must have a non-empty outputSchema (what the user provides)",
      "Execution pauses until resolveUserInput() is called",
      "Can accept click, form, or voice input",
    ],
    useCases: [
      {
        title: "Selection from Generated Options",
        description: "Present AI-generated options (topics, videos, roles) and let the user pick. Commonly follows an LLM step that generates the choices.",
        exampleFlowId: "video-discovery",
        exampleStepId: "select-topic",
      },
      {
        title: "Free-text / Voice Answers",
        description: "Collect open-ended responses during interviews or consultations. Supports both keyboard and voice input via VoiceContext.",
        exampleFlowId: "ai-consultation",
        exampleStepId: "user-answers",
      },
      {
        title: "Configuration Setup",
        description: "Gather structured configuration (expert role, goals, output format) before the flow's main logic begins.",
        exampleFlowId: "socratic-architect",
        exampleStepId: "setup",
      },
    ],
    references: [
      { label: "resolveUserInput()", path: "client/src/lib/flow-engine/use-flow-execution.ts", description: "Hook method that completes a user-input step with the user's data" },
      { label: "ConversationDesignContext", path: "client/src/contexts/conversation-design-context.tsx", description: "Turn-taking context for conversation-driven user input" },
      { label: "ARCH-005 User-Input Contract", path: "client/src/lib/flow-inspector/validate.ts", description: "Steel frame validator enforcing inputSchema + outputSchema requirements" },
    ],
  },
  {
    type: "transform",
    name: "Transform",
    summary: "Reshapes, maps, or restructures data between steps without calling an AI model.",
    description:
      "The Transform step performs pure data transformations — no LLM calls, no user interaction. It takes structured input from upstream steps and produces reshaped output for downstream consumption. Use this for mapping arrays, extracting fields, merging data from parallel branches, or converting formats. Transforms are deterministic and fast.",
    category: "data",
    inputs: [
      { name: "inputSchema", type: "SchemaField[]", description: "Schema describing the data received from upstream dependencies", required: true },
      { name: "outputSchema", type: "SchemaField[]", description: "Schema describing the transformed output shape", required: true },
    ],
    outputs: [
      { name: "transformedData", type: "varies", description: "The reshaped data matching the outputSchema", required: true },
    ],
    contractRules: [
      "Must have a non-empty inputSchema",
      "Must have a non-empty outputSchema",
      "Must not make LLM calls (use llm step instead)",
      "Should be deterministic — same input always produces same output",
    ],
    useCases: [
      {
        title: "Data Merging",
        description: "Combine outputs from parallel branches (e.g. merge video results from multiple topic searches into a single collection).",
      },
      {
        title: "Format Conversion",
        description: "Convert between data shapes — flatten nested objects, extract specific fields, or map arrays to a different structure.",
      },
      {
        title: "Filtering & Sorting",
        description: "Apply business rules to filter or reorder data before presenting it to the user or passing it to another step.",
      },
    ],
    references: [
      { label: "Flow Types", path: "client/src/lib/flow-inspector/types.ts", description: "FlowStep interface with inputSchema/outputSchema fields" },
      { label: "ARCH-005 Transform Contract", path: "client/src/lib/flow-inspector/validate.ts", description: "Steel frame validator enforcing inputSchema + outputSchema requirements" },
      { label: "Flow Mutations", path: "client/src/lib/flow-engine/flow-mutations.ts", description: "Pure flow transformation functions (add/remove/update steps)" },
    ],
  },
  {
    type: "validate",
    name: "Validate",
    summary: "Checks data integrity, filters invalid entries, or enforces constraints.",
    description:
      "The Validate step acts as a quality gate in the flow. It receives data from upstream steps, applies validation rules, and outputs only the data that passes. Common uses include checking if AI-generated content is real (e.g. YouTube oEmbed validation), enforcing business rules, or filtering out malformed entries. Validate steps protect downstream steps from bad data.",
    category: "quality",
    inputs: [
      { name: "inputSchema", type: "SchemaField[]", description: "Schema describing the data to validate", required: true },
      { name: "outputSchema", type: "SchemaField[]", description: "Schema describing the validated/filtered output", required: true },
    ],
    outputs: [
      { name: "validatedData", type: "varies", description: "Only the data that passed validation, matching the outputSchema", required: true },
    ],
    contractRules: [
      "Must have a non-empty inputSchema",
      "Must have a non-empty outputSchema",
      "Should filter or verify — not generate new data",
      "May call external APIs for verification (e.g. oEmbed)",
    ],
    useCases: [
      {
        title: "External API Verification",
        description: "Verify AI-generated content against real APIs. For example, checking YouTube embed IDs against the oEmbed endpoint to filter out hallucinated videos.",
        exampleFlowId: "video-discovery",
        exampleStepId: "validate-videos",
      },
      {
        title: "Schema Compliance",
        description: "Ensure data from LLM steps matches expected structure before passing it to user-facing display steps.",
      },
      {
        title: "Business Rule Enforcement",
        description: "Apply domain-specific rules (e.g. minimum engagement thresholds, content length limits) to filter results.",
      },
    ],
    references: [
      { label: "validateVideos()", path: "client/src/lib/flow-engine/api-client.ts", description: "YouTube oEmbed validation via POST /api/llm/validate-videos" },
      { label: "ARCH-005 Validate Contract", path: "client/src/lib/flow-inspector/validate.ts", description: "Steel frame validator enforcing inputSchema + outputSchema requirements" },
      { label: "ARCH-005 Steel Frame", path: "rules/architecture/005-flow-steel-frame.md", description: "The architectural rule defining validation step requirements" },
    ],
  },
  {
    type: "display",
    name: "Display",
    summary: "Renders final output to the user — videos, cards, results, or formatted content.",
    description:
      "The Display step is the terminal node of most flows. It takes the final processed data and renders it as a rich UI component — embedded videos, recommendation cards, copyable text panes, or formatted results. Display steps have no outputSchema (they're leaf nodes) and their inputSchema is advisory (SHOULD, not MUST per ARCH-005). They focus purely on presentation.",
    category: "presentation",
    inputs: [
      { name: "inputSchema", type: "SchemaField[]", description: "Schema describing the data to render (advisory — not strictly required)", required: false },
    ],
    outputs: [],
    contractRules: [
      "No required fields per ARCH-005 (most relaxed contract)",
      "inputSchema is recommended but not enforced",
      "Should be a leaf node (no downstream dependencies)",
      "Focuses on presentation — no data transformation or LLM calls",
    ],
    useCases: [
      {
        title: "Video Player",
        description: "Embed a YouTube video with autoplay, showing creator info, engagement stats, and recommendation rationale.",
        exampleFlowId: "video-discovery",
        exampleStepId: "play-video",
      },
      {
        title: "Recommendation Cards",
        description: "Render structured recommendations with titles, descriptions, impact estimates, and tool suggestions.",
        exampleFlowId: "ai-consultation",
        exampleStepId: "display-results",
      },
      {
        title: "Copyable Content Panes",
        description: "Display generated text (e.g. LinkedIn descriptions) in styled panes with one-click copy buttons.",
        exampleFlowId: "linkedin-strategist",
        exampleStepId: "display-results",
      },
    ],
    references: [
      { label: "Flow Types", path: "client/src/lib/flow-inspector/types.ts", description: "FlowStep interface — display steps use inputSchema only" },
      { label: "Conversation Canvas", path: "client/src/components/conversation-canvas.tsx", description: "The full-page conversational layout where display steps render inline" },
      { label: "ARCH-005 Display Contract", path: "client/src/lib/flow-inspector/validate.ts", description: "Steel frame validator — display has the most relaxed contract" },
    ],
  },
];

/** Look up a component definition by step type */
export function getComponentByType(type: string): ComponentDefinition | undefined {
  return componentDefinitions.find((c) => c.type === type);
}

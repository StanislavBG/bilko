/**
 * Bilko Flow API — LLM Client
 *
 * The core primitive for all LLM interactions.
 * chatJSON<T>() is the muscle: send messages, get typed JSON back.
 * Handles request formatting, error handling, and JSON extraction.
 * Every flow step that talks to Gemini goes through here.
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface LLMResult<T = string> {
  data: T;
  raw: string;
  model: string;
  usage?: TokenUsage;
}

export interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

const DEFAULT_MODEL = "gemini-2.5-flash";

/**
 * Raw LLM chat — returns the cleaned string response.
 */
export async function chat(
  messages: ChatMessage[],
  options?: LLMOptions,
): Promise<LLMResult<string>> {
  const response = await fetch("/api/llm/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      model: options?.model ?? DEFAULT_MODEL,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
    }),
    signal: options?.signal,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new LLMError(
      err.error || `LLM request failed (${response.status})`,
      response.status,
    );
  }

  const data = await response.json();

  return {
    data: data.content ?? "",
    raw: data.content ?? "",
    model: data.model ?? options?.model ?? DEFAULT_MODEL,
    usage: data.usage,
  };
}

/**
 * chatJSON<T>() — THE core primitive.
 *
 * Sends a chat request and parses the response as JSON of type T.
 * The server already strips markdown fences and extracts JSON,
 * so this is the reliable path for structured LLM output.
 *
 * @example
 * const { data } = await chatJSON<{ topics: AITopic[] }>([
 *   { role: "system", content: "Return JSON with a topics array." },
 *   { role: "user", content: "List 5 AI trends." },
 * ]);
 * // data.topics is AITopic[]
 */
export async function chatJSON<T>(
  messages: ChatMessage[],
  options?: LLMOptions,
): Promise<LLMResult<T>> {
  const result = await chat(messages, options);

  try {
    const parsed = JSON.parse(result.raw) as T;
    return {
      data: parsed,
      raw: result.raw,
      model: result.model,
      usage: result.usage,
    };
  } catch {
    throw new LLMParseError(
      "Failed to parse LLM response as JSON",
      result.raw,
    );
  }
}

/**
 * Build a prompt/user message pair for a structured JSON request.
 * Convenience for the common pattern of system-prompt + user-question.
 */
export function jsonPrompt(
  systemPrompt: string,
  userMessage: string,
): ChatMessage[] {
  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];
}

/**
 * LLM-specific error with status code.
 */
export class LLMError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "LLMError";
  }
}

/**
 * Thrown when LLM response can't be parsed as JSON.
 * Carries the raw response for debugging.
 */
export class LLMParseError extends Error {
  constructor(
    message: string,
    public readonly rawResponse: string,
  ) {
    super(message);
    this.name = "LLMParseError";
  }
}

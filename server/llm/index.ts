/**
 * LLM Service - Gemini via OpenAI-compatible endpoint
 *
 * Uses GEMINI_API_KEY with Google's OpenAI-compatible API.
 * Model: gemini-2.5-flash (free tier)
 */

import OpenAI from "openai";

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not configured. Add it to your Replit Secrets."
      );
    }

    _client = new OpenAI({
      apiKey,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    });
  }
  return _client;
}

export interface LLMModel {
  id: string;
  name: string;
  provider: "google";
  description: string;
  contextWindow: number;
  inputPrice: number;
  outputPrice: number;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "json_object" | "text";
}

export interface ChatResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export const AVAILABLE_MODELS: LLMModel[] = [
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "google",
    description: "Fast and free. Great for most tasks.",
    contextWindow: 1048576,
    inputPrice: 0,
    outputPrice: 0,
  },
  {
    id: "gemini-2.5-flash-preview-image-generation",
    name: "Nano Banana (Image Generation)",
    provider: "google",
    description: "Gemini native image generation. Cinematic quality images from text prompts.",
    contextWindow: 32768,
    inputPrice: 0,
    outputPrice: 0,
  },
  {
    id: "veo-3.0-generate-preview",
    name: "Veo 3 (Video Generation)",
    provider: "google",
    description: "AI video generation. Creates 5-8 second cinematic video clips from text prompts.",
    contextWindow: 0,
    inputPrice: 0,
    outputPrice: 0,
  },
];

export function getModelById(modelId: string): LLMModel | undefined {
  return AVAILABLE_MODELS.find(m => m.id === modelId);
}

/**
 * Attempt lightweight repairs on malformed JSON from LLM output.
 * Handles the most common LLM mistakes:
 * - Trailing commas before } or ]
 * - Control characters (literal newlines/tabs) inside string values
 */
function repairJSON(text: string): string {
  // 1. Replace control characters inside string values.
  //    Walk the string tracking whether we're inside a JSON string literal.
  let result = "";
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const prev = i > 0 ? text[i - 1] : "";

    if (ch === '"' && prev !== "\\") {
      inString = !inString;
      result += ch;
    } else if (inString) {
      if (ch === "\n") result += "\\n";
      else if (ch === "\r") result += "\\r";
      else if (ch === "\t") result += "\\t";
      else result += ch;
    } else {
      result += ch;
    }
  }

  // 2. Remove trailing commas before closing brackets/braces
  result = result.replace(/,\s*([\]}])/g, "$1");

  return result;
}

function cleanLLMResponse(text: string): string {
  // Strip markdown code fences
  let cleaned = text.replace(/```(?:json|[\w]*)?\n?/gi, "").trim();

  // Try extracting JSON object {...}
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidate = cleaned.substring(firstBrace, lastBrace + 1);
    // Try raw first
    try {
      JSON.parse(candidate);
      return candidate;
    } catch {
      // Try after repair
      const repaired = repairJSON(candidate);
      try {
        JSON.parse(repaired);
        return repaired;
      } catch {}
    }
  }

  // Try extracting JSON array [...]
  const firstBracket = cleaned.indexOf("[");
  const lastBracket = cleaned.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    const candidate = cleaned.substring(firstBracket, lastBracket + 1);
    try {
      JSON.parse(candidate);
      return candidate;
    } catch {
      const repaired = repairJSON(candidate);
      try {
        JSON.parse(repaired);
        return repaired;
      } catch {}
    }
  }

  return cleaned;
}

export async function chat(request: ChatRequest): Promise<ChatResponse> {
  const client = getClient();

  const response = await client.chat.completions.create({
    model: request.model,
    messages: request.messages,
    temperature: request.temperature ?? 0.7,
    max_tokens: request.maxTokens ?? 8192,
    ...(request.responseFormat === "json_object" && {
      response_format: { type: "json_object" as const },
    }),
  });

  const raw = response.choices[0]?.message?.content || "";
  const content = cleanLLMResponse(raw);

  return {
    content,
    model: response.model,
    usage: response.usage ? {
      promptTokens: response.usage.prompt_tokens,
      completionTokens: response.usage.completion_tokens,
      totalTokens: response.usage.total_tokens,
    } : undefined,
  };
}

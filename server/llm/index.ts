/**
 * LLM Service - Gemini via OpenAI-compatible endpoint
 *
 * Uses GEMINI_API_KEY with Google's OpenAI-compatible API.
 * Model: gemini-2.5-flash (free tier)
 */

import OpenAI from "openai";
import { cleanLLMResponse as libCleanLLM } from "bilko-flow";

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
  provider: "google" | "replicate";
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
    id: "gemini-2.5-flash-image",
    name: "Nano Banana (Image Generation)",
    provider: "google",
    description: "Gemini native image generation. Cinematic quality images from text prompts.",
    contextWindow: 32768,
    inputPrice: 0,
    outputPrice: 0,
  },
  {
    id: "veo-3.1-generate-preview",
    name: "Veo 3.1 (Video Generation)",
    provider: "google",
    description: "AI video generation. Creates 5-8 second cinematic video clips from text prompts.",
    contextWindow: 0,
    inputPrice: 0,
    outputPrice: 0,
  },
  {
    id: "wavespeedai/wan-2.1-t2v-480p",
    name: "Wan 2.1 (Video Generation — Replicate)",
    provider: "replicate",
    description: "Open-source AI video generation via Replicate. Fast 480p clips from text prompts (~39s for 5s).",
    contextWindow: 0,
    inputPrice: 0,
    outputPrice: 0,
  },
];

export function getModelById(modelId: string): LLMModel | undefined {
  return AVAILABLE_MODELS.find(m => m.id === modelId);
}

/**
 * Default model for each capability — the SINGLE source of truth.
 *
 * When Google retires a model, update it HERE and everything else follows.
 * bilko-flow workflow definitions should NOT hardcode model IDs —
 * they omit the model field and the handler/service layer uses these defaults.
 */
export const MODEL_DEFAULTS = {
  text: "gemini-2.5-flash",
  image: "gemini-2.5-flash-image",
  video: "veo-3.1-generate-preview",
} as const;

/**
 * Clean an LLM response string using bilko-flow's cleanLLMResponse.
 *
 * The library's cleanLLMResponse returns parsed JSON (unknown), but the
 * server contract returns a string (so the client can JSON.parse it).
 * This wrapper bridges the two: library parses + repairs, we stringify
 * back for the wire. Falls back to trimmed text for non-JSON responses.
 */
function cleanLLMResponse(text: string): string {
  try {
    const parsed = libCleanLLM(text);
    return typeof parsed === "string" ? parsed : JSON.stringify(parsed);
  } catch {
    // Non-JSON responses (plain text) — return trimmed original
    return text.trim();
  }
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

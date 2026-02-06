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
];

export function getModelById(modelId: string): LLMModel | undefined {
  return AVAILABLE_MODELS.find(m => m.id === modelId);
}

function stripCodeFences(text: string): string {
  return text.replace(/```(?:json|[\w]*)?\s*/gi, "").trim();
}

export async function chat(request: ChatRequest): Promise<ChatResponse> {
  const client = getClient();

  const response = await client.chat.completions.create({
    model: request.model,
    messages: request.messages,
    temperature: request.temperature ?? 0.7,
    max_tokens: request.maxTokens ?? 8192,
  });

  const raw = response.choices[0]?.message?.content || "";
  const content = stripCodeFences(raw);

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

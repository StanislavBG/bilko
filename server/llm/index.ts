/**
 * LLM Service - Unified interface for multiple LLM providers
 *
 * Uses Replit's AI Integrations which provides:
 * - AI_INTEGRATIONS_OPENAI_API_KEY: the API key
 * - AI_INTEGRATIONS_OPENAI_BASE_URL: the base URL endpoint
 *
 * Currently supported:
 * - OpenAI: gpt-4o-mini (fast, affordable, 128K context)
 */

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface LLMModel {
  id: string;
  name: string;
  provider: "openai" | "google" | "anthropic";
  description: string;
  contextWindow: number;
  inputPrice: number;  // per 1M tokens
  outputPrice: number; // per 1M tokens
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

// Available models with explicit specifications
export const AVAILABLE_MODELS: LLMModel[] = [
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    description: "Fast and affordable. Great for most tasks.",
    contextWindow: 128000,
    inputPrice: 0.15,   // $0.15 per 1M input tokens
    outputPrice: 0.60,  // $0.60 per 1M output tokens
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    description: "Most capable. Better for complex reasoning.",
    contextWindow: 128000,
    inputPrice: 2.50,   // $2.50 per 1M input tokens
    outputPrice: 10.00, // $10.00 per 1M output tokens
  },
];

export function getModelById(modelId: string): LLMModel | undefined {
  return AVAILABLE_MODELS.find(m => m.id === modelId);
}

export async function chat(request: ChatRequest): Promise<ChatResponse> {
  const model = getModelById(request.model);
  if (!model) {
    throw new Error(`Unknown model: ${request.model}`);
  }

  switch (model.provider) {
    case "openai":
      return chatOpenAI(request);
    default:
      throw new Error(`Provider not implemented: ${model.provider}`);
  }
}

async function chatOpenAI(request: ChatRequest): Promise<ChatResponse> {
  if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    throw new Error("AI_INTEGRATIONS_OPENAI_API_KEY is not configured. Add the AI Integrations integration in Replit.");
  }

  const response = await openai.chat.completions.create({
    model: request.model,
    messages: request.messages,
    temperature: request.temperature ?? 0.7,
    max_tokens: request.maxTokens ?? 2048,
  });

  const content = response.choices[0]?.message?.content || "";

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

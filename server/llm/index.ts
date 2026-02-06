/**
 * LLM Service - Unified interface for multiple LLM providers
 *
 * Environment variables:
 * - AI_INTEGRATIONS_OPENAI_API_KEY: API key for OpenAI-compatible endpoint
 * - AI_INTEGRATIONS_OPENAI_BASE_URL: Base URL (defaults to https://api.openai.com)
 *
 * Currently supported:
 * - OpenAI: gpt-4o-mini (fast, affordable, 128K context)
 */

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
      return chatOpenAI(request, model);
    default:
      throw new Error(`Provider not implemented: ${model.provider}`);
  }
}

async function chatOpenAI(request: ChatRequest, model: LLMModel): Promise<ChatResponse> {
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  const baseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "https://api.openai.com";

  if (!apiKey) {
    throw new Error("AI_INTEGRATIONS_OPENAI_API_KEY is not configured");
  }

  const url = `${baseUrl}/v1/chat/completions`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: request.model,
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 2048,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  return {
    content: data.choices[0]?.message?.content || "",
    model: data.model,
    usage: data.usage ? {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
    } : undefined,
  };
}

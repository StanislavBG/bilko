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
    id: "gemini-2.5-flash-image",
    name: "Nano Banana (Image Generation)",
    provider: "google",
    description: "Gemini native image generation. Cinematic quality images from text prompts.",
    contextWindow: 32768,
    inputPrice: 0,
    outputPrice: 0,
  },
  {
    id: "veo-3.0-generate-001",
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
 * Repair common LLM JSON mistakes.
 * Ported from bilko-flow v1 (src/llm/index.ts).
 *
 * Fixes:
 * 1. Trailing commas before } or ]
 * 2. Unescaped control characters (newlines, tabs, etc.) inside string values
 */
function repairJSON(text: string): string {
  // Fix 1: Remove trailing commas before closing brackets
  let result = text.replace(/,\s*([}\]])/g, "$1");

  // Fix 2: Escape unescaped control characters inside JSON string values
  result = escapeControlCharsInStrings(result);

  return result;
}

/**
 * Walk through JSON text and escape control characters found inside string values.
 * Properly tracks escape sequences so \\" doesn't fool the string boundary detection.
 * Ported from bilko-flow v1 (src/llm/index.ts).
 */
function escapeControlCharsInStrings(json: string): string {
  const chars: string[] = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < json.length; i++) {
    const ch = json[i];

    if (escaped) {
      chars.push(ch);
      escaped = false;
      continue;
    }

    if (ch === "\\" && inString) {
      chars.push(ch);
      escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      chars.push(ch);
      continue;
    }

    if (inString) {
      const code = ch.charCodeAt(0);
      if (code < 0x20) {
        switch (ch) {
          case "\n": chars.push("\\n"); break;
          case "\r": chars.push("\\r"); break;
          case "\t": chars.push("\\t"); break;
          case "\b": chars.push("\\b"); break;
          case "\f": chars.push("\\f"); break;
          default:
            chars.push("\\u" + code.toString(16).padStart(4, "0"));
            break;
        }
        continue;
      }
    }

    chars.push(ch);
  }

  return chars.join("");
}

/**
 * Extract the outermost JSON object or array from a string.
 * Uses bracket-depth counting with string-awareness so braces inside
 * string values don't confuse the extraction.
 * Ported from bilko-flow v1 (src/llm/index.ts).
 */
function extractOutermostJSON(text: string): string | null {
  const objIdx = text.indexOf("{");
  const arrIdx = text.indexOf("[");

  const candidates: Array<[string, string]> = [];
  if (objIdx !== -1 && arrIdx !== -1) {
    if (arrIdx < objIdx) {
      candidates.push(["[", "]"], ["{", "}"]);
    } else {
      candidates.push(["{", "}"], ["[", "]"]);
    }
  } else if (objIdx !== -1) {
    candidates.push(["{", "}"]);
  } else if (arrIdx !== -1) {
    candidates.push(["[", "]"]);
  }

  for (const [open, close] of candidates) {
    const startIdx = text.indexOf(open);
    if (startIdx === -1) continue;

    let depth = 0;
    let inStr = false;
    let esc = false;

    for (let i = startIdx; i < text.length; i++) {
      const ch = text[i];

      if (esc) { esc = false; continue; }
      if (ch === "\\" && inStr) { esc = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }

      if (!inStr) {
        if (ch === open) depth++;
        else if (ch === close) {
          depth--;
          if (depth === 0) {
            return text.slice(startIdx, i + 1);
          }
        }
      }
    }
  }

  return null;
}

function cleanLLMResponse(text: string): string {
  let cleaned = text.trim();

  // Strip markdown code fences
  const fenceMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  // Try direct parse first (fastest path)
  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch {
    // Continue to extraction
  }

  // Extract outermost JSON using bracket-depth counting
  const jsonStr = extractOutermostJSON(cleaned);
  if (!jsonStr) return cleaned;

  // Try parsing extracted JSON directly
  try {
    JSON.parse(jsonStr);
    return jsonStr;
  } catch {
    // Continue to repair
  }

  // Apply repair and retry
  const repaired = repairJSON(jsonStr);
  try {
    JSON.parse(repaired);
    return repaired;
  } catch {}

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

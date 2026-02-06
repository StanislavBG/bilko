/**
 * PromptPlayground - Interactive LLM chat component
 *
 * A reusable component for running prompts against various LLM models.
 * Used in Academy quests, model comparisons, and other AI exercises.
 */

import { useState, useEffect } from "react";
import {
  Send,
  Loader2,
  Copy,
  Check,
  ChevronDown,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface LLMModel {
  id: string;
  name: string;
  provider: string;
  description: string;
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface PromptPlaygroundProps {
  /** Initial prompt to display in the textarea */
  initialPrompt?: string;
  /** System prompt for context (hidden from user) */
  systemPrompt?: string;
  /** Title shown above the component */
  title?: string;
  /** Description/instructions */
  description?: string;
  /** Default model to select */
  defaultModel?: string;
  /** Show model selector dropdown */
  showModelSelector?: boolean;
  /** Placeholder text for the input */
  placeholder?: string;
  /** Callback when response is received */
  onResponse?: (response: string, model: string) => void;
}

export function PromptPlayground({
  initialPrompt = "",
  systemPrompt,
  title = "Prompt Playground",
  description,
  defaultModel = "gemini-2.5-flash",
  showModelSelector = true,
  placeholder = "Enter your prompt here...",
  onResponse,
}: PromptPlaygroundProps) {
  const [models, setModels] = useState<LLMModel[]>([]);
  const [selectedModel, setSelectedModel] = useState(defaultModel);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);

  // Fetch available models on mount
  useEffect(() => {
    fetch("/api/llm/models")
      .then((res) => res.json())
      .then((data) => {
        if (data.models) {
          setModels(data.models);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch models:", err);
        // Fallback models if API fails
        setModels([
          {
            id: "gemini-2.5-flash",
            name: "Gemini 2.5 Flash",
            provider: "google",
            description: "Fast and free",
          },
        ]);
      });
  }, []);

  const handleSubmit = async () => {
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setResponse(null);

    const messages: ChatMessage[] = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    try {
      const res = await fetch("/api/llm/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModel,
          messages,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to get response");
      }

      setResponse(data.content);
      onResponse?.(data.content, data.model);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!response) return;
    await navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const currentModel = models.find((m) => m.id === selectedModel);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          {showModelSelector && models.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border border-border bg-background hover:bg-muted transition-colors"
              >
                <span className="font-medium">{currentModel?.name || selectedModel}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
              {modelDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-64 rounded-md border border-border bg-popover shadow-lg z-50">
                  {models.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => {
                        setSelectedModel(model.id);
                        setModelDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left hover:bg-muted transition-colors first:rounded-t-md last:rounded-b-md ${
                        model.id === selectedModel ? "bg-muted" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{model.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {model.provider}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {model.description}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Prompt Input */}
        <div className="space-y-2">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={4}
            className="resize-none"
            disabled={isLoading}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {navigator.platform.includes("Mac") ? "⌘" : "Ctrl"} + Enter to
              submit
            </span>
            <Button
              onClick={handleSubmit}
              disabled={!prompt.trim() || isLoading}
              size="sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Thinking...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive border border-destructive/20">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Response Display */}
        {response && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Response</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-7 px-2"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1 text-green-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <div className="p-4 rounded-md bg-muted/50 border border-border/50">
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                {response}
              </div>
            </div>
            {currentModel && (
              <p className="text-xs text-muted-foreground text-right">
                Generated by {currentModel.name}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PromptPlayground;

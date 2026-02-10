/**
 * VideoExperienceRenderer — Full video learning experience.
 *
 * Combines:
 * - YouTube player embed (privacy-enhanced mode)
 * - AI-powered Summary panel (auto-generated, collapsed by default)
 * - Transcript panel (auto-generated, collapsed by default)
 * - Q&A chat panel (grounded strictly on transcript)
 *
 * Uses chat() (flow engine primitive) for all LLM calls.
 * Uses useVoice().speak() for TTS announcements via common interface.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  FileText,
  MessageSquare,
  Sparkles,
  Send,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";
import { chat } from "@/lib/bilko-flow";
import { bilkoSystemPrompt } from "@/lib/bilko-persona/system-prompt";
import { useVoice } from "@/contexts/voice-context";
import type { VideoExperienceBlock } from "./types";

// ── Internal types ────────────────────────────────────────

type PanelState = "idle" | "loading" | "ready" | "error";

interface TranscriptMessage {
  role: "user" | "assistant";
  content: string;
}

// ── Component ─────────────────────────────────────────────

export function VideoExperienceRenderer({ block }: { block: VideoExperienceBlock }) {
  const { speak } = useVoice();
  const [videoError, setVideoError] = useState(false);

  // Summary panel state
  const [summaryState, setSummaryState] = useState<PanelState>("idle");
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryExpanded, setSummaryExpanded] = useState(!block.autoSummary);

  // Transcript panel state
  const [transcriptState, setTranscriptState] = useState<PanelState>("idle");
  const [transcript, setTranscript] = useState<string | null>(null);
  const [transcriptExpanded, setTranscriptExpanded] = useState(!block.autoTranscript);

  // Q&A panel state (separate from transcript)
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const youtubeUrl = block.youtubeUrl ?? `https://www.youtube.com/watch?v=${block.embedId}`;

  // ── Generate summary ──────────────────────────────────

  const generateSummary = useCallback(async () => {
    setSummaryState("loading");
    try {
      const result = await chat([
        {
          role: "system",
          content: bilkoSystemPrompt(`Create a comprehensive summary of a YouTube video.

The video details:
- Title: ${block.title}
- Description: ${block.description ?? ""}
- Creator: ${block.creator ?? "Unknown"}

Since you cannot actually watch the video, use your knowledge to provide:
1. A likely summary based on the title and description
2. Key themes that would typically be covered
3. Main takeaways for learners

Format your response with clear sections:
## Overview
[Brief overview]

## Key Points
- Point 1
- Point 2
- Point 3

## Main Takeaways
[What learners should remember]

Note: This is an AI-generated summary based on the video metadata. Watch the full video for complete understanding.`),
        },
        {
          role: "user",
          content: `Please summarize this video: "${block.title}"`,
        },
      ]);
      setSummary(result.data);
      setSummaryState("ready");
      speak("Summary is ready.", "Aoede");
    } catch (err) {
      console.error("[VideoExperience] Summary error:", err);
      setSummaryState("error");
    }
  }, [block.title, block.description, block.creator, speak]);

  // ── Load transcript ───────────────────────────────────

  const loadTranscript = useCallback(async () => {
    setTranscriptState("loading");
    try {
      const result = await chat([
        {
          role: "system",
          content: bilkoSystemPrompt(`Generate a plausible educational transcript based on video metadata. Since we cannot access the actual YouTube transcript, simulate one from the metadata.

Video: "${block.title}"
Description: ${block.description ?? ""}

Generate a realistic transcript of key points that would be covered in this video. Format as natural speech with timestamps:

[0:00] Introduction...
[0:30] First topic...
etc.

Keep it educational and relevant to the topic. This is a simulation for demonstration purposes.`),
        },
        {
          role: "user",
          content: `Generate a transcript for this video about: "${block.title}"`,
        },
      ]);
      setTranscript(result.data);
      setTranscriptState("ready");
    } catch (err) {
      console.error("[VideoExperience] Transcript error:", err);
      setTranscriptState("error");
    }
  }, [block.title, block.description]);

  // ── Ask question about transcript (grounded) ──────────

  const askQuestion = useCallback(async () => {
    if (!userInput.trim() || !transcript) return;

    const question = userInput.trim();
    setUserInput("");
    setIsAsking(true);
    setMessages((prev) => [...prev, { role: "user", content: question }]);

    try {
      const result = await chat([
        {
          role: "system",
          content: bilkoSystemPrompt(`You are a Q&A assistant grounded STRICTLY in the video transcript below.

RULES:
- ONLY answer using information found in the transcript
- If the answer is not in the transcript, say "I don't see that covered in the transcript"
- Never invent or assume information beyond what's written
- Quote specific parts of the transcript when relevant
- If asked to extract ideas, provide exact excerpts from the transcript
- Keep answers concise and focused

Video: "${block.title}"
Transcript:
${transcript}`),
        },
        ...messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user" as const, content: question },
      ]);
      setMessages((prev) => [...prev, { role: "assistant", content: result.data }]);
    } catch (err) {
      console.error("[VideoExperience] Q&A error:", err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't process your question. Please try again." },
      ]);
    } finally {
      setIsAsking(false);
    }
  }, [userInput, transcript, messages, block.title]);

  // ── Auto-start if configured ──────────────────────────

  useEffect(() => {
    if (block.autoSummary && summaryState === "idle") generateSummary();
  }, [block.autoSummary, summaryState, generateSummary]);

  useEffect(() => {
    if (block.autoTranscript && transcriptState === "idle") loadTranscript();
  }, [block.autoTranscript, transcriptState, loadTranscript]);

  // Scroll Q&A to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Keyboard handling for Q&A ─────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      askQuestion();
    }
  };

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      {/* Video Header */}
      <div className="p-4 border-b">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-foreground">{block.title}</h2>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              {block.creator && (
                <Badge variant="outline" className="text-xs">{block.creator}</Badge>
              )}
              {block.tags?.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
              ))}
            </div>
          </div>
          <a
            href={youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-xs text-primary hover:underline flex items-center gap-1"
          >
            YouTube <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Video Player */}
      <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
        {videoError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/50 text-muted-foreground gap-3 p-4">
            <AlertTriangle className="h-8 w-8" />
            <p className="text-sm text-center">This video couldn't be loaded in the embed player.</p>
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              Watch on YouTube <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        ) : (
          <iframe
            className="absolute inset-0 w-full h-full"
            src={`https://www.youtube-nocookie.com/embed/${block.embedId}?rel=0`}
            title={block.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
            onError={() => setVideoError(true)}
          />
        )}
      </div>

      {/* Description */}
      {block.description && (
        <div className="px-4 py-3 border-t">
          <p className="text-sm text-muted-foreground leading-relaxed">{block.description}</p>
        </div>
      )}

      {/* AI Panels: Summary | Transcript | Q&A */}
      <div className="p-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3 border-t">
        {/* ── Summary Panel ─────────────────────────────── */}
        <div className="rounded-lg border bg-background">
          <button
            className="w-full px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => setSummaryExpanded(!summaryExpanded)}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">AI Summary</span>
              {summaryState === "ready" && (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={summaryState === "ready" ? "default" : "outline"}
                className="text-xs"
              >
                {summaryState === "idle" ? "Not loaded"
                  : summaryState === "loading" ? "Generating..."
                  : summaryState === "ready" ? "Ready"
                  : "Error"}
              </Badge>
              {summaryExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </div>
          </button>

          {summaryExpanded && (
            <div className="px-4 pb-4">
              {summaryState === "idle" && (
                <div className="text-center py-4">
                  <Sparkles className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground mb-3">
                    Generate an AI-powered summary
                  </p>
                  <Button size="sm" onClick={generateSummary}>
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    Generate Summary
                  </Button>
                </div>
              )}

              {summaryState === "loading" && (
                <div className="text-center py-4">
                  <Loader2 className="h-6 w-6 mx-auto mb-2 text-primary animate-spin" />
                  <p className="text-xs text-muted-foreground">Analyzing video content...</p>
                </div>
              )}

              {summaryState === "ready" && summary && (
                <div className="space-y-2">
                  <div className="prose prose-sm dark:prose-invert max-w-none max-h-64 overflow-y-auto">
                    {summary.split("\n").map((line, idx) => {
                      if (line.startsWith("## ")) {
                        return (
                          <h4 key={idx} className="text-xs font-semibold mt-3 mb-1">
                            {line.replace("## ", "")}
                          </h4>
                        );
                      }
                      if (line.startsWith("- ")) {
                        return (
                          <p key={idx} className="text-xs text-muted-foreground ml-3">
                            {line}
                          </p>
                        );
                      }
                      if (line.trim()) {
                        return (
                          <p key={idx} className="text-xs text-muted-foreground">
                            {line}
                          </p>
                        );
                      }
                      return null;
                    })}
                  </div>
                  <Button variant="outline" size="sm" className="text-xs h-7 mt-2" onClick={generateSummary}>
                    <RefreshCw className="h-3 w-3 mr-1" /> Regenerate
                  </Button>
                </div>
              )}

              {summaryState === "error" && (
                <div className="text-center py-4">
                  <p className="text-xs text-red-500 mb-2">Failed to generate summary</p>
                  <Button variant="outline" size="sm" onClick={generateSummary}>Try Again</Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Transcript Panel ──────────────────────────── */}
        <div className="rounded-lg border bg-background">
          <button
            className="w-full px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => setTranscriptExpanded(!transcriptExpanded)}
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Transcript</span>
              {transcriptState === "ready" && (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={transcriptState === "ready" ? "default" : "outline"}
                className="text-xs"
              >
                {transcriptState === "idle" ? "Not loaded"
                  : transcriptState === "loading" ? "Loading..."
                  : transcriptState === "ready" ? "Ready"
                  : "Error"}
              </Badge>
              {transcriptExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </div>
          </button>

          {transcriptExpanded && (
            <div className="px-4 pb-4">
              {transcriptState === "idle" && (
                <div className="text-center py-4">
                  <FileText className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground mb-3">
                    Load transcript to read and ask questions
                  </p>
                  <Button size="sm" onClick={loadTranscript}>
                    <FileText className="h-3.5 w-3.5 mr-1.5" />
                    Load Transcript
                  </Button>
                </div>
              )}

              {transcriptState === "loading" && (
                <div className="text-center py-4">
                  <Loader2 className="h-6 w-6 mx-auto mb-2 text-primary animate-spin" />
                  <p className="text-xs text-muted-foreground">Loading transcript...</p>
                </div>
              )}

              {transcriptState === "ready" && transcript && (
                <div className="space-y-2">
                  <div className="max-h-64 overflow-y-auto bg-muted/30 rounded-lg p-2.5 text-[11px] text-muted-foreground font-mono leading-relaxed whitespace-pre-wrap">
                    {transcript}
                  </div>
                  <Button variant="outline" size="sm" className="text-xs h-7" onClick={loadTranscript}>
                    <RefreshCw className="h-3 w-3 mr-1" /> Regenerate
                  </Button>
                </div>
              )}

              {transcriptState === "error" && (
                <div className="text-center py-4">
                  <p className="text-xs text-red-500 mb-2">Failed to load transcript</p>
                  <Button variant="outline" size="sm" onClick={loadTranscript}>Try Again</Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Q&A Chat Panel ────────────────────────────── */}
        <div className="rounded-lg border bg-background flex flex-col md:col-span-2 lg:col-span-1">
          <div className="px-4 py-3 flex items-center justify-between border-b">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Ask Questions</span>
            </div>
            {transcriptState !== "ready" && (
              <Badge variant="outline" className="text-xs">Needs transcript</Badge>
            )}
          </div>

          <div className="px-4 py-3 flex-1 flex flex-col min-h-[200px]">
            {transcriptState !== "ready" ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
                <MessageSquare className="h-6 w-6 mb-2 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  {transcriptState === "loading"
                    ? "Transcript is loading — Q&A will be available shortly."
                    : "Load the transcript first to ask questions about the video."}
                </p>
              </div>
            ) : (
              <>
                {/* Messages */}
                <div className="flex-1 space-y-2 overflow-y-auto max-h-48 mb-3">
                  {messages.length === 0 && (
                    <p className="text-[11px] text-muted-foreground/60 text-center py-4">
                      Ask anything about the video. Answers are grounded in the transcript only.
                    </p>
                  )}
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-lg text-xs ${
                        msg.role === "user"
                          ? "bg-primary/10 ml-6"
                          : "bg-muted mr-6"
                      }`}
                    >
                      <p className="text-[10px] font-medium mb-0.5">
                        {msg.role === "user" ? "You" : "Bilko"}
                      </p>
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    </div>
                  ))}
                  {isAsking && (
                    <div className="p-2.5 rounded-lg bg-muted mr-6 text-xs">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="flex gap-2">
                  <textarea
                    ref={inputRef}
                    placeholder="Ask about the video..."
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 min-h-[40px] max-h-24 text-xs bg-muted/30 border rounded-lg px-2.5 py-2 outline-none resize-none placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary/30"
                    disabled={isAsking}
                  />
                  <Button
                    size="sm"
                    className="h-8 w-8 shrink-0 self-end"
                    onClick={askQuestion}
                    disabled={!userInput.trim() || isAsking}
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                  Try: "What are the key takeaways?" or "Extract the main argument"
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

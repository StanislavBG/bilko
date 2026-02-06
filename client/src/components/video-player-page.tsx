/**
 * Video Player Page - Agentic video learning experience
 *
 * Features:
 * - Embedded YouTube player
 * - AI-powered Summary panel (agentic)
 * - Transcript Q&A panel (agentic)
 */

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  FileText,
  MessageSquare,
  Sparkles,
  Send,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { Video } from "@/data/academy-videos";

interface VideoPlayerPageProps {
  video: Video;
}

type AgentState = "idle" | "loading" | "ready" | "error";

interface TranscriptMessage {
  role: "user" | "assistant";
  content: string;
}

export function VideoPlayerPage({ video }: VideoPlayerPageProps) {
  // Summary panel state
  const [summaryState, setSummaryState] = useState<AgentState>("idle");
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryExpanded, setSummaryExpanded] = useState(true);

  // Transcript panel state
  const [transcriptState, setTranscriptState] = useState<AgentState>("idle");
  const [transcript, setTranscript] = useState<string | null>(null);
  const [transcriptExpanded, setTranscriptExpanded] = useState(true);
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isAsking, setIsAsking] = useState(false);

  // Generate summary using AI
  const generateSummary = useCallback(async () => {
    setSummaryState("loading");

    try {
      const response = await fetch("/api/llm/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `You are an educational content summarizer. Create a comprehensive summary of a YouTube video.

The video details:
- Title: ${video.title}
- Description: ${video.description}
- YouTube ID: ${video.youtubeId}

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

Note: This is an AI-generated summary based on the video metadata. Watch the full video for complete understanding.`,
            },
            {
              role: "user",
              content: `Please summarize this video: "${video.title}"`,
            },
          ],
          model: "gemini-2.5-flash",
        }),
      });

      if (!response.ok) throw new Error("Failed to generate summary");

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      setSummary(content);
      setSummaryState("ready");
    } catch (err) {
      console.error("Summary error:", err);
      setSummaryState("error");
    }
  }, [video]);

  // Load transcript (simulated - in production would fetch from YouTube API)
  const loadTranscript = useCallback(async () => {
    setTranscriptState("loading");

    try {
      const response = await fetch("/api/llm/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `You are simulating a video transcript loader. Since we cannot access the actual YouTube transcript, generate a plausible educational transcript based on the video metadata.

Video: "${video.title}"
Description: ${video.description}

Generate a realistic transcript of key points that would be covered in this video. Format as natural speech with timestamps:

[0:00] Introduction...
[0:30] First topic...
etc.

Keep it educational and relevant to the topic. This is a simulation for demonstration purposes.`,
            },
            {
              role: "user",
              content: `Generate a transcript for this video about: "${video.title}"`,
            },
          ],
          model: "gemini-2.5-flash",
        }),
      });

      if (!response.ok) throw new Error("Failed to load transcript");

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      setTranscript(content);
      setTranscriptState("ready");
    } catch (err) {
      console.error("Transcript error:", err);
      setTranscriptState("error");
    }
  }, [video]);

  // Ask a question about the transcript
  const askQuestion = useCallback(async () => {
    if (!userInput.trim() || !transcript) return;

    const question = userInput.trim();
    setUserInput("");
    setIsAsking(true);

    // Add user message
    setMessages((prev) => [...prev, { role: "user", content: question }]);

    try {
      const response = await fetch("/api/llm/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `You are an AI assistant helping users understand a video transcript.

Video: "${video.title}"
Transcript:
${transcript}

Answer questions based on the transcript content. If the user asks to "extract" specific ideas, provide focused excerpts from the transcript. Be helpful and educational.`,
            },
            ...messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            {
              role: "user",
              content: question,
            },
          ],
          model: "gemini-2.5-flash",
        }),
      });

      if (!response.ok) throw new Error("Failed to get answer");

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";

      setMessages((prev) => [...prev, { role: "assistant", content }]);
    } catch (err) {
      console.error("Q&A error:", err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't process your question. Please try again." },
      ]);
    } finally {
      setIsAsking(false);
    }
  }, [userInput, transcript, messages, video.title]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      askQuestion();
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-background">
      {/* Video Header */}
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold mb-1">{video.title}</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline">{video.creator}</Badge>
          {video.tags?.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          <a
            href={video.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline flex items-center gap-1 ml-auto"
          >
            Open on YouTube <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Video Player */}
      <div className="p-4">
        <div className="aspect-video bg-black rounded-lg overflow-hidden max-w-4xl mx-auto">
          <iframe
            src={`https://www.youtube.com/embed/${video.youtubeId}`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
      </div>

      {/* Agentic Panels */}
      <div className="p-4 grid gap-4 lg:grid-cols-2">
        {/* Summary Panel */}
        <Card>
          <CardHeader
            className="cursor-pointer"
            onClick={() => setSummaryExpanded(!summaryExpanded)}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Summary
                {summaryState === "ready" && (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge
                  variant={summaryState === "ready" ? "default" : "outline"}
                  className="text-xs"
                >
                  {summaryState === "idle"
                    ? "Not loaded"
                    : summaryState === "loading"
                    ? "Generating..."
                    : summaryState === "ready"
                    ? "Ready"
                    : "Error"}
                </Badge>
                {summaryExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </div>
          </CardHeader>

          {summaryExpanded && (
            <CardContent>
              {summaryState === "idle" && (
                <div className="text-center py-6">
                  <Sparkles className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Generate an AI-powered summary of this video
                  </p>
                  <Button onClick={generateSummary}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Summary
                  </Button>
                </div>
              )}

              {summaryState === "loading" && (
                <div className="text-center py-6">
                  <Loader2 className="h-8 w-8 mx-auto mb-3 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">
                    Analyzing video content...
                  </p>
                </div>
              )}

              {summaryState === "ready" && summary && (
                <div className="space-y-3">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {summary.split("\n").map((line, idx) => {
                      if (line.startsWith("## ")) {
                        return (
                          <h3 key={idx} className="text-sm font-semibold mt-4 mb-2">
                            {line.replace("## ", "")}
                          </h3>
                        );
                      }
                      if (line.startsWith("- ")) {
                        return (
                          <p key={idx} className="text-sm text-muted-foreground ml-4">
                            {line}
                          </p>
                        );
                      }
                      if (line.trim()) {
                        return (
                          <p key={idx} className="text-sm text-muted-foreground">
                            {line}
                          </p>
                        );
                      }
                      return null;
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateSummary}
                    className="mt-4"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Regenerate
                  </Button>
                </div>
              )}

              {summaryState === "error" && (
                <div className="text-center py-6">
                  <p className="text-sm text-red-500 mb-4">
                    Failed to generate summary
                  </p>
                  <Button variant="outline" onClick={generateSummary}>
                    Try Again
                  </Button>
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Transcript Q&A Panel */}
        <Card>
          <CardHeader
            className="cursor-pointer"
            onClick={() => setTranscriptExpanded(!transcriptExpanded)}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Transcript Q&A
                {transcriptState === "ready" && (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge
                  variant={transcriptState === "ready" ? "default" : "outline"}
                  className="text-xs"
                >
                  {transcriptState === "idle"
                    ? "Not loaded"
                    : transcriptState === "loading"
                    ? "Loading..."
                    : transcriptState === "ready"
                    ? "Ready"
                    : "Error"}
                </Badge>
                {transcriptExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </div>
          </CardHeader>

          {transcriptExpanded && (
            <CardContent>
              {transcriptState === "idle" && (
                <div className="text-center py-6">
                  <FileText className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Load the transcript to ask questions about the video
                  </p>
                  <Button onClick={loadTranscript}>
                    <FileText className="h-4 w-4 mr-2" />
                    Load Transcript
                  </Button>
                </div>
              )}

              {transcriptState === "loading" && (
                <div className="text-center py-6">
                  <Loader2 className="h-8 w-8 mx-auto mb-3 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">
                    Loading transcript...
                  </p>
                </div>
              )}

              {transcriptState === "ready" && transcript && (
                <div className="space-y-4">
                  {/* Transcript preview */}
                  <div className="max-h-32 overflow-y-auto bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground font-mono">
                    {transcript.slice(0, 500)}...
                  </div>

                  {/* Messages */}
                  {messages.length > 0 && (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {messages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg text-sm ${
                            msg.role === "user"
                              ? "bg-primary/10 ml-8"
                              : "bg-muted mr-8"
                          }`}
                        >
                          <p className="text-xs font-medium mb-1">
                            {msg.role === "user" ? "You" : "AI"}
                          </p>
                          <p className="text-muted-foreground whitespace-pre-wrap">
                            {msg.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Input */}
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Ask about the video or extract specific ideas..."
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="min-h-[60px] text-sm"
                      disabled={isAsking}
                    />
                    <Button
                      onClick={askQuestion}
                      disabled={!userInput.trim() || isAsking}
                      className="shrink-0"
                    >
                      {isAsking ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Try: "Extract the main argument" or "What are the key takeaways?"
                  </p>
                </div>
              )}

              {transcriptState === "error" && (
                <div className="text-center py-6">
                  <p className="text-sm text-red-500 mb-4">
                    Failed to load transcript
                  </p>
                  <Button variant="outline" onClick={loadTranscript}>
                    Try Again
                  </Button>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}

/**
 * Video Discovery Flow - Agentic workflow for finding AI learning videos
 *
 * Auto-starts immediately when rendered.
 * Node 1: Research 10 trending AI topics from the last 6 months
 * Node 2: Find a high-quality YouTube video for the selected topic
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Play,
  CheckCircle2,
  Circle,
  Sparkles,
  Youtube,
  ExternalLink,
  Brain,
  TrendingUp,
  ListChecks,
  Tv,
} from "lucide-react";

// Workflow states
type FlowState =
  | "researching-topics"
  | "select-topic"
  | "searching-video"
  | "ready"
  | "error";

// Topic from Node 1
interface AITopic {
  rank: number;
  title: string;
  description: string;
  beginnerQuestion: string;
}

// Video result from Node 2
interface VideoResult {
  title: string;
  creator: string;
  description: string;
  url: string;
  embedId: string;
  whyRecommended: string;
}

// Workflow step for progress display
interface WorkflowStep {
  id: string;
  name: string;
  status: "pending" | "active" | "complete" | "error";
  detail?: string;
}

// Rotating status messages for the research phase
const RESEARCH_STATUS_MESSAGES = [
  "Scanning AI news from the last 6 months...",
  "Analyzing trending topics across research papers...",
  "Identifying beginner-friendly breakthroughs...",
  "Ranking topics by relevance and accessibility...",
  "Preparing your personalized topic list...",
];

// Rotating status messages for the video search phase
const VIDEO_SEARCH_MESSAGES = [
  "Searching top AI education channels...",
  "Evaluating video quality and production value...",
  "Checking for beginner-friendly explanations...",
  "Finding the best match for your topic...",
];

export function VideoDiscoveryFlow() {
  const [flowState, setFlowState] = useState<FlowState>("researching-topics");
  const [topics, setTopics] = useState<AITopic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<AITopic | null>(null);
  const [video, setVideo] = useState<VideoResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState(RESEARCH_STATUS_MESSAGES[0]);
  const hasStarted = useRef(false);
  const [steps, setSteps] = useState<WorkflowStep[]>([
    { id: "research", name: "Researching AI Trends", status: "active", detail: "Our AI agent is scanning the latest developments..." },
    { id: "select", name: "Topic Selection", status: "pending" },
    { id: "video", name: "Finding Best Video", status: "pending" },
    { id: "ready", name: "Video Ready", status: "pending" },
  ]);

  const updateStep = (
    stepId: string,
    status: WorkflowStep["status"],
    detail?: string
  ) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, status, detail } : s))
    );
  };

  // Rotate status messages during loading phases
  useEffect(() => {
    if (flowState !== "researching-topics" && flowState !== "searching-video") return;

    const messages = flowState === "researching-topics" ? RESEARCH_STATUS_MESSAGES : VIDEO_SEARCH_MESSAGES;
    let index = 0;

    const interval = setInterval(() => {
      index = (index + 1) % messages.length;
      setStatusMessage(messages[index]);
    }, 3000);

    return () => clearInterval(interval);
  }, [flowState]);

  // Node 1: Research trending AI topics
  const researchTopics = useCallback(async () => {
    setFlowState("researching-topics");
    setError(null);
    setStatusMessage(RESEARCH_STATUS_MESSAGES[0]);
    updateStep("research", "active", "Our AI agent is scanning the latest developments...");

    try {
      const response = await fetch("/api/llm/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `You are an AI education expert. Generate exactly 10 trending AI topics from the last 6 months that would be interesting for beginners.

Return ONLY valid JSON in this exact format, no other text:
{
  "topics": [
    {
      "rank": 1,
      "title": "Topic Title",
      "description": "Brief 1-sentence description",
      "beginnerQuestion": "An interesting question a beginner might ask about this topic"
    }
  ]
}

Focus on:
- Recent developments (late 2025 - early 2026)
- Practical applications
- Topics that have beginner-friendly explanations available
- Mix of technical and non-technical topics`,
            },
            {
              role: "user",
              content:
                "What are the 10 most interesting AI topics trending in the last 6 months that a beginner should learn about?",
            },
          ],
          model: "gemini-2.5-flash-preview-05-20",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to research topics");
      }

      const data = await response.json();
      const content = data.content || "";

      // Parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Invalid response format");
      }

      const parsed = JSON.parse(jsonMatch[0]);
      setTopics(parsed.topics);

      updateStep("research", "complete", `Found ${parsed.topics.length} trending topics`);
      updateStep("select", "active", "Pick a topic that interests you");
      setFlowState("select-topic");
    } catch (err) {
      console.error("Topic research error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to research topics. Please try again."
      );
      updateStep("research", "error", "Something went wrong");
      setFlowState("error");
    }
  }, []);

  // Auto-start research immediately on mount
  useEffect(() => {
    if (!hasStarted.current) {
      hasStarted.current = true;
      researchTopics();
    }
  }, [researchTopics]);

  // Node 2: Find YouTube video for topic
  const findVideo = useCallback(async (topic: AITopic) => {
    setSelectedTopic(topic);
    setFlowState("searching-video");
    setStatusMessage(VIDEO_SEARCH_MESSAGES[0]);
    updateStep("select", "complete", topic.title);
    updateStep("video", "active", "Searching for the best video...");

    try {
      const response = await fetch("/api/llm/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `You are a YouTube video researcher specializing in AI education content.

Your task: Find the BEST YouTube video for a beginner learning about "${topic.title}".

Criteria for selection:
- From a well-respected creator (channels like 3Blue1Brown, Fireship, Two Minute Papers, Andrej Karpathy, etc.)
- Beginner-friendly explanation
- High production quality
- Recent (prefer videos from 2024-2026)
- Positive reception

Return ONLY valid JSON in this exact format:
{
  "video": {
    "title": "Exact video title",
    "creator": "Channel name",
    "description": "What the video covers",
    "url": "https://www.youtube.com/watch?v=VIDEO_ID",
    "embedId": "VIDEO_ID",
    "whyRecommended": "Why this video is perfect for beginners"
  }
}

IMPORTANT: Use real YouTube videos that you know exist. Focus on educational channels known for quality AI content.`,
            },
            {
              role: "user",
              content: `Find the best YouTube video for a beginner to learn about: "${topic.title}"

Context: ${topic.description}
The learner is wondering: "${topic.beginnerQuestion}"`,
            },
          ],
          model: "gemini-2.5-flash-preview-05-20",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to find video");
      }

      const data = await response.json();
      const content = data.content || "";

      // Parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Invalid response format");
      }

      const parsed = JSON.parse(jsonMatch[0]);
      setVideo(parsed.video);

      updateStep("video", "complete", `Found: ${parsed.video.creator}`);
      updateStep("ready", "complete", "Ready to watch!");
      setFlowState("ready");
    } catch (err) {
      console.error("Video search error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to find a video. Please try again."
      );
      updateStep("video", "error", "Something went wrong");
      setFlowState("error");
    }
  }, []);

  const reset = () => {
    hasStarted.current = false;
    setTopics([]);
    setSelectedTopic(null);
    setVideo(null);
    setError(null);
    setSteps([
      { id: "research", name: "Researching AI Trends", status: "active", detail: "Our AI agent is scanning the latest developments..." },
      { id: "select", name: "Topic Selection", status: "pending" },
      { id: "video", name: "Finding Best Video", status: "pending" },
      { id: "ready", name: "Video Ready", status: "pending" },
    ]);
    // Re-trigger on next tick so the ref resets
    setTimeout(() => {
      hasStarted.current = true;
      researchTopics();
    }, 0);
  };

  return (
    <div className="space-y-6">
      {/* Workflow Progress */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Video Discovery
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Our AI agent is finding the perfect video for you — sit back and let it work.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center gap-3">
                {step.status === "pending" && (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
                {step.status === "active" && (
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                )}
                {step.status === "complete" && (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                )}
                {step.status === "error" && (
                  <Circle className="h-5 w-5 text-red-500" />
                )}
                <div className="flex-1">
                  <p
                    className={`text-sm font-medium ${
                      step.status === "pending"
                        ? "text-muted-foreground"
                        : step.status === "error"
                        ? "text-red-500"
                        : ""
                    }`}
                  >
                    {step.name}
                  </p>
                  {step.detail && (
                    <p className="text-xs text-muted-foreground">{step.detail}</p>
                  )}
                </div>
                <Badge
                  variant={
                    step.status === "complete"
                      ? "default"
                      : step.status === "active"
                      ? "secondary"
                      : "outline"
                  }
                  className="text-xs"
                >
                  {index + 1}/4
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Researching Topics State */}
      {flowState === "researching-topics" && (
        <Card className="border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Brain className="h-6 w-6 text-primary animate-pulse" />
              </div>
              <div className="flex-1 space-y-3">
                <h3 className="text-lg font-semibold">
                  AI Agent Working...
                </h3>
                <p className="text-muted-foreground text-sm">
                  {statusMessage}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3" />
                  <span>Analyzing trends from the past 6 months to find what matters most for beginners</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                  <div className="bg-primary h-full rounded-full animate-pulse" style={{ width: "60%" }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Select Topic State */}
      {flowState === "select-topic" && topics.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="shrink-0 w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <ListChecks className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                Pick a topic that interests you
              </h3>
              <p className="text-sm text-muted-foreground">
                Our AI found {topics.length} trending topics. Tap one to find the best video.
              </p>
            </div>
          </div>
          <div className="grid gap-3">
            {topics.map((topic) => (
              <Card
                key={topic.rank}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => findVideo(topic)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="shrink-0">
                      #{topic.rank}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium">{topic.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {topic.description}
                      </p>
                      <p className="text-sm text-primary mt-2 italic">
                        "{topic.beginnerQuestion}"
                      </p>
                    </div>
                    <Play className="h-5 w-5 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Searching Video State */}
      {flowState === "searching-video" && selectedTopic && (
        <Card className="border-red-500/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <Tv className="h-6 w-6 text-red-500 animate-pulse" />
              </div>
              <div className="flex-1 space-y-3">
                <h3 className="text-lg font-semibold">Finding the Perfect Video</h3>
                <p className="text-sm text-muted-foreground">
                  Topic: <span className="font-medium text-foreground">{selectedTopic.title}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {statusMessage}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Youtube className="h-3 w-3 text-red-500" />
                  <span>Looking through channels like 3Blue1Brown, Fireship, Two Minute Papers...</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                  <div className="bg-red-500 h-full rounded-full animate-pulse" style={{ width: "50%" }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Video Ready State */}
      {flowState === "ready" && video && selectedTopic && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Youtube className="h-5 w-5 text-red-500" />
                <CardTitle className="text-lg">{video.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Video Embed */}
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <iframe
                  src={`https://www.youtube.com/embed/${video.embedId}?autoplay=1`}
                  title={video.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>

              {/* Video Info */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <Badge>{video.creator}</Badge>
                  <a
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    Open on YouTube <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <p className="text-sm text-muted-foreground">
                  {video.description}
                </p>
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-sm">
                    <span className="font-medium">Why this video: </span>
                    {video.whyRecommended}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={reset}>
              Find Another Video
            </Button>
          </div>
        </div>
      )}

      {/* Error State */}
      {flowState === "error" && (
        <Card className="border-red-200">
          <CardContent className="pt-6 text-center">
            <p className="text-red-500 mb-2 font-medium">Something went wrong</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={reset} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

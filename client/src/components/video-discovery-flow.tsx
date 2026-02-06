/**
 * Video Discovery Flow - Agentic workflow for finding AI learning videos
 *
 * Auto-starts immediately when rendered.
 * Step 1: Research 5 trending AI topics
 * Step 2: Show topics horizontally + fire parallel video searches in background
 * Step 3: User picks a topic, 3 pre-fetched videos ready to choose from
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
  Tv,
  ThumbsUp,
  MessageSquare,
  Eye,
} from "lucide-react";

type FlowState =
  | "researching-topics"
  | "select-topic"
  | "ready"
  | "error";

interface AITopic {
  rank: number;
  title: string;
  description: string;
  beginnerQuestion: string;
}

interface VideoResult {
  title: string;
  creator: string;
  description: string;
  url: string;
  embedId: string;
  whyRecommended: string;
  views: string;
  likes: string;
  comments: string;
}

interface WorkflowStep {
  id: string;
  name: string;
  status: "pending" | "active" | "complete" | "error";
  detail?: string;
}

const RESEARCH_STATUS_MESSAGES = [
  "Scanning AI news from the last 6 months...",
  "Analyzing trending topics across research papers...",
  "Identifying beginner-friendly breakthroughs...",
  "Ranking topics by relevance and accessibility...",
  "Preparing your personalized topic list...",
];

export function VideoDiscoveryFlow() {
  const [flowState, setFlowState] = useState<FlowState>("researching-topics");
  const [topics, setTopics] = useState<AITopic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<AITopic | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState(RESEARCH_STATUS_MESSAGES[0]);
  const hasStarted = useRef(false);
  const videoCache = useRef<Record<string, VideoResult[]>>({});
  const videoCacheStatus = useRef<Record<string, "loading" | "done" | "error">>({});
  const [, forceUpdate] = useState(0);

  const [steps, setSteps] = useState<WorkflowStep[]>([
    { id: "research", name: "Researching AI Trends", status: "active", detail: "Our AI agent is scanning the latest developments..." },
    { id: "select", name: "Pick a Topic", status: "pending" },
    { id: "ready", name: "Choose Your Video", status: "pending" },
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

  useEffect(() => {
    if (flowState !== "researching-topics") return;
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % RESEARCH_STATUS_MESSAGES.length;
      setStatusMessage(RESEARCH_STATUS_MESSAGES[index]);
    }, 3000);
    return () => clearInterval(interval);
  }, [flowState]);

  const searchVideosForTopic = useCallback(async (topic: AITopic) => {
    const key = topic.title;
    if (videoCacheStatus.current[key]) return;
    videoCacheStatus.current[key] = "loading";
    forceUpdate((n) => n + 1);

    try {
      const response = await fetch("/api/llm/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `You are a YouTube video researcher. Find 3 real YouTube videos about "${topic.title}" for beginners.

Return ONLY valid JSON. Example:
{"videos":[{"title":"Video Title","creator":"Channel","description":"Short desc","url":"https://www.youtube.com/watch?v=ID","embedId":"ID","whyRecommended":"Why good for beginners","views":"1.2M","likes":"45K","comments":"2.3K"}]}

Rules:
- Use REAL YouTube videos from known AI education channels (3Blue1Brown, Fireship, Two Minute Papers, Andrej Karpathy, Computerphile, Yannic Kilcher, etc.)
- Rank by engagement: views > likes > comments
- Keep description under 15 words
- Keep whyRecommended under 15 words
- Return exactly 3 videos, ordered best first
- No markdown, ONLY the JSON object`,
            },
            {
              role: "user",
              content: `Find 3 best YouTube videos for a beginner about: "${topic.title}" - ${topic.description}`,
            },
          ],
          model: "gemini-2.5-flash",
        }),
      });

      if (!response.ok) throw new Error("Failed to find videos");

      const data = await response.json();
      const parsed = JSON.parse(data.content || "{}");
      videoCache.current[key] = parsed.videos || [];
      videoCacheStatus.current[key] = "done";
    } catch {
      videoCacheStatus.current[key] = "error";
      videoCache.current[key] = [];
    }
    forceUpdate((n) => n + 1);
  }, []);

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
              content: `You are an AI education expert. Generate exactly 5 trending AI topics that would be interesting for beginners.

Return ONLY valid JSON. Keep descriptions VERY short (max 10 words each). Example:
{"topics":[{"rank":1,"title":"AI Agents","description":"AI that acts on your behalf","beginnerQuestion":"How do AI agents work?"}]}

Rules: title max 5 words, description max 10 words, beginnerQuestion max 12 words. No markdown, no explanation, ONLY the JSON object.`,
            },
            {
              role: "user",
              content:
                "What are the 5 most interesting AI topics trending in the last 6 months that a beginner should learn about?",
            },
          ],
          model: "gemini-2.5-flash",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to research topics");
      }

      const data = await response.json();
      const content = data.content || "";
      const parsed = JSON.parse(content);
      const fetchedTopics = parsed.topics.slice(0, 5) as AITopic[];
      setTopics(fetchedTopics);

      updateStep("research", "complete", `Found ${fetchedTopics.length} trending topics`);
      updateStep("select", "active", "Pick a topic — videos are loading in the background");
      setFlowState("select-topic");

      fetchedTopics.forEach((t) => searchVideosForTopic(t));
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
  }, [searchVideosForTopic]);

  useEffect(() => {
    if (!hasStarted.current) {
      hasStarted.current = true;
      researchTopics();
    }
  }, [researchTopics]);

  const pendingInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pendingInterval.current) clearInterval(pendingInterval.current);
    };
  }, []);

  const handleTopicSelect = (topic: AITopic) => {
    if (pendingInterval.current) {
      clearInterval(pendingInterval.current);
      pendingInterval.current = null;
    }
    setSelectedTopic(topic);
    const cached = videoCache.current[topic.title];
    if (cached && cached.length > 0) {
      updateStep("select", "complete", topic.title);
      updateStep("ready", "complete", `${cached.length} videos found`);
      setFlowState("ready");
    } else if (videoCacheStatus.current[topic.title] === "loading") {
      updateStep("select", "complete", topic.title);
      updateStep("ready", "active", "Still searching for videos...");
      pendingInterval.current = setInterval(() => {
        const status = videoCacheStatus.current[topic.title];
        if (status === "done") {
          if (pendingInterval.current) clearInterval(pendingInterval.current);
          pendingInterval.current = null;
          const videos = videoCache.current[topic.title] || [];
          updateStep("ready", "complete", `${videos.length} videos found`);
          setFlowState("ready");
        } else if (status === "error") {
          if (pendingInterval.current) clearInterval(pendingInterval.current);
          pendingInterval.current = null;
          setError("Failed to find videos for this topic. Try another one.");
          updateStep("ready", "error", "Something went wrong");
          setFlowState("error");
        }
      }, 500);
    } else {
      setError("Failed to find videos for this topic. Try another one.");
      updateStep("ready", "error", "Something went wrong");
      setFlowState("error");
    }
  };

  const reset = () => {
    if (pendingInterval.current) {
      clearInterval(pendingInterval.current);
      pendingInterval.current = null;
    }
    hasStarted.current = false;
    setTopics([]);
    setSelectedTopic(null);
    setSelectedVideo(null);
    setError(null);
    videoCache.current = {};
    videoCacheStatus.current = {};
    setSteps([
      { id: "research", name: "Researching AI Trends", status: "active", detail: "Our AI agent is scanning the latest developments..." },
      { id: "select", name: "Pick a Topic", status: "pending" },
      { id: "ready", name: "Choose Your Video", status: "pending" },
    ]);
    setTimeout(() => {
      hasStarted.current = true;
      researchTopics();
    }, 0);
  };

  const videosForSelected = selectedTopic ? (videoCache.current[selectedTopic.title] || []) : [];

  return (
    <div className="space-y-6">
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
                    data-testid={`text-step-${step.id}`}
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
                  {index + 1}/3
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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

      {flowState === "select-topic" && topics.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="shrink-0 w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold" data-testid="text-topic-heading">
                Pick a topic that interests you
              </h3>
              <p className="text-sm text-muted-foreground">
                Videos are being pre-loaded in the background for each topic.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {topics.map((topic) => {
              const cacheStatus = videoCacheStatus.current[topic.title];
              return (
                <Card
                  key={topic.rank}
                  data-testid={`card-topic-${topic.rank}`}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => handleTopicSelect(topic)}
                >
                  <CardContent className="p-4 flex flex-col gap-2 h-full">
                    <div className="flex items-center justify-between gap-1">
                      <Badge variant="outline" className="text-xs shrink-0">#{topic.rank}</Badge>
                      {cacheStatus === "loading" && (
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                      )}
                      {cacheStatus === "done" && (
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                      )}
                    </div>
                    <h4 className="font-medium text-sm leading-tight">{topic.title}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {topic.description}
                    </p>
                    <div className="mt-auto pt-2">
                      <Play className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {flowState === "ready" && selectedTopic && videosForSelected.length > 0 && !selectedVideo && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="shrink-0 w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
              <Tv className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold" data-testid="text-video-pick-heading">
                {selectedTopic.title} — Pick a video
              </h3>
              <p className="text-sm text-muted-foreground">
                {videosForSelected.length} videos ranked by engagement. Pick one to watch.
              </p>
            </div>
          </div>
          <div className="grid gap-3">
            {videosForSelected.map((video, idx) => (
              <Card
                key={idx}
                data-testid={`card-video-${idx}`}
                className="cursor-pointer hover:border-red-500 transition-colors"
                onClick={() => setSelectedVideo(video)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                      <Play className="h-5 w-5 text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm">{video.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{video.creator}</p>
                      <p className="text-xs text-muted-foreground mt-1">{video.whyRecommended}</p>
                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        {video.views && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Eye className="h-3 w-3" /> {video.views}
                          </span>
                        )}
                        {video.likes && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <ThumbsUp className="h-3 w-3" /> {video.likes}
                          </span>
                        )}
                        {video.comments && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MessageSquare className="h-3 w-3" /> {video.comments}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant={idx === 0 ? "default" : "outline"} className="shrink-0 text-xs">
                      {idx === 0 ? "Top Pick" : `#${idx + 1}`}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedTopic(null);
                updateStep("select", "active", "Pick a topic — videos are loaded");
                updateStep("ready", "pending");
                setFlowState("select-topic");
              }}
              data-testid="button-back-topics"
            >
              Back to Topics
            </Button>
          </div>
        </div>
      )}

      {flowState === "ready" && selectedVideo && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Youtube className="h-5 w-5 text-red-500" />
                <CardTitle className="text-lg">{selectedVideo.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <iframe
                  src={`https://www.youtube.com/embed/${selectedVideo.embedId}?autoplay=1`}
                  title={selectedVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                  data-testid="iframe-video"
                />
              </div>
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge>{selectedVideo.creator}</Badge>
                  <a
                    href={selectedVideo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                    data-testid="link-youtube"
                  >
                    Open on YouTube <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedVideo.description}
                </p>
                <div className="flex items-center gap-4 flex-wrap">
                  {selectedVideo.views && (
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Eye className="h-4 w-4" /> {selectedVideo.views} views
                    </span>
                  )}
                  {selectedVideo.likes && (
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <ThumbsUp className="h-4 w-4" /> {selectedVideo.likes} likes
                    </span>
                  )}
                  {selectedVideo.comments && (
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MessageSquare className="h-4 w-4" /> {selectedVideo.comments} comments
                    </span>
                  )}
                </div>
                <div className="bg-muted p-3 rounded-md">
                  <p className="text-sm">
                    <span className="font-medium">Why this video: </span>
                    {selectedVideo.whyRecommended}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center gap-3 flex-wrap">
            <Button
              variant="outline"
              onClick={() => setSelectedVideo(null)}
              data-testid="button-pick-another-video"
            >
              Pick Another Video
            </Button>
            <Button variant="outline" onClick={reset} data-testid="button-start-over">
              Start Over
            </Button>
          </div>
        </div>
      )}

      {flowState === "error" && (
        <Card className="border-red-200">
          <CardContent className="pt-6 text-center">
            <p className="text-red-500 mb-2 font-medium" data-testid="text-error-title">Something went wrong</p>
            <p className="text-sm text-muted-foreground mb-4" data-testid="text-error-message">{error}</p>
            <Button onClick={reset} variant="outline" data-testid="button-try-again">
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Video Discovery Flow - Agentic workflow for finding AI learning videos
 *
 * UI Design Principles:
 *   - Thin StepTracker bar at top (3 lines: steps, activity, last result)
 *   - Only ONE active step visible at a time — content fills the space
 *   - User input steps are highlighted clearly
 *   - Final step uses the platform's default VideoRenderer
 *
 * Auto-starts immediately when rendered.
 * Step 1: Research 5 trending AI topics       (LLM → chatJSON)
 * Step 2: Pre-fetch videos for each topic     (LLM → chatJSON, parallel)
 * Step 3: Validate videos via oEmbed          (API → validateVideos)
 * Step 4: User picks a topic                  (user-input)
 * Step 5: User picks a video                  (user-input)
 * Step 6: Play the video                      (display)
 *
 * Uses flow-engine abstractions:
 * - chatJSON<T>()        for all LLM calls
 * - validateVideos()     for YouTube validation
 * - useFlowExecution()   for execution tracing
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StepTracker, type TrackerStep } from "@/components/ui/step-tracker";
import {
  Loader2,
  Play,
  CheckCircle2,
  Brain,
  TrendingUp,
  ThumbsUp,
  MessageSquare,
  Eye,
  RotateCcw,
  ArrowLeft,
} from "lucide-react";
import {
  chatJSON,
  jsonPrompt,
  validateVideos,
  useFlowExecution,
} from "@/lib/flow-engine";
import type { VideoCandidate } from "@/lib/flow-engine";
import { bilkoSystemPrompt } from "@/lib/bilko-persona/system-prompt";
import { useFlowRegistration } from "@/contexts/flow-bus-context";
import { useScreenOptions, type ScreenOption } from "@/contexts/conversation-design-context";
import { useVoice } from "@/contexts/voice-context";
import { VideoRenderer } from "@/components/content-blocks";

// ── Types ────────────────────────────────────────────────────────────

type FlowState =
  | "researching-topics"
  | "select-topic"
  | "select-video"
  | "watching"
  | "error";

interface AITopic {
  rank: number;
  title: string;
  description: string;
  beginnerQuestion: string;
}

interface TopicsResponse {
  topics: AITopic[];
}

interface VideosResponse {
  videos: VideoCandidate[];
}

// ── Prompts (single source of truth — matches registry) ──────────────

const TOPIC_SYSTEM_PROMPT = bilkoSystemPrompt(`Generate exactly 5 trending AI topics that would be interesting for beginners.

Return ONLY valid JSON. Keep descriptions VERY short (max 10 words each). Example:
{"topics":[{"rank":1,"title":"AI Agents","description":"AI that acts on your behalf","beginnerQuestion":"How do AI agents work?"}]}

Rules: title max 5 words, description max 10 words, beginnerQuestion max 12 words. No markdown, no explanation, ONLY the JSON object.`);

const TOPIC_USER_MESSAGE =
  "What are the 5 most interesting AI topics trending in the last 6 months that a beginner should learn about?";

function videoSystemPrompt(topicTitle: string): string {
  return bilkoSystemPrompt(`Find 3 real YouTube videos about "${topicTitle}" for beginners.

Return ONLY valid JSON. Example:
{"videos":[{"title":"Video Title","creator":"Channel","description":"Short desc","url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ","embedId":"dQw4w9WgXcQ","whyRecommended":"Why good for beginners","views":"1.2M","likes":"45K","comments":"2.3K"}]}

CRITICAL RULES:
- You MUST use REAL YouTube video IDs that you are confident actually exist. Do NOT invent or guess video IDs.
- The embedId MUST be the exact 11-character YouTube video ID from the URL (e.g. "dQw4w9WgXcQ" from youtube.com/watch?v=dQw4w9WgXcQ).
- Only recommend videos you have high confidence are real and published by these channels: 3Blue1Brown, Fireship, Two Minute Papers, Andrej Karpathy, Computerphile, Yannic Kilcher, Lex Fridman, StatQuest, Sentdex, etc.
- Prefer well-known, highly-viewed videos over obscure ones — popular videos are more likely to still be available.
- If you are not confident a video ID is real, do NOT include it. It is better to return fewer videos than to hallucinate IDs.
- Rank by engagement: views > likes > comments
- Keep description under 15 words
- Keep whyRecommended under 15 words
- Return up to 3 videos, ordered best first
- No markdown, ONLY the JSON object`);
}

function videoUserMessage(topic: AITopic): string {
  return `Find 3 best YouTube videos for a beginner about: "${topic.title}" - ${topic.description}`;
}

// ── Status messages ──────────────────────────────────────────────────

const RESEARCH_STATUS_MESSAGES = [
  "Scanning AI news from the last 6 months...",
  "Analyzing trending topics across research papers...",
  "Identifying beginner-friendly breakthroughs...",
  "Ranking topics by relevance and accessibility...",
  "Preparing your personalized topic list...",
];

// ── Component ────────────────────────────────────────────────────────

export function VideoDiscoveryFlow() {
  const [flowState, setFlowState] = useState<FlowState>("researching-topics");
  const [topics, setTopics] = useState<AITopic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<AITopic | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoCandidate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState(RESEARCH_STATUS_MESSAGES[0]);
  const [lastResult, setLastResult] = useState<string | undefined>(undefined);
  const hasStarted = useRef(false);
  const videoCache = useRef<Record<string, VideoCandidate[]>>({});
  const videoCacheStatus = useRef<Record<string, "loading" | "done" | "error">>({});
  const [, forceUpdate] = useState(0);

  // Flow execution tracker — bridges to Flow Explorer inspector
  const { trackStep, resolveUserInput } = useFlowExecution("video-discovery");
  const { setStatus: setBusStatus, send: busSend } = useFlowRegistration("video-discovery", "Video Discovery");
  const { speak } = useVoice();

  // ── StepTracker state (derived from flowState) ─────────────────────

  const trackerSteps = useMemo<TrackerStep[]>(() => {
    const stateToSteps: Record<FlowState, TrackerStep[]> = {
      "researching-topics": [
        { id: "research", label: "Research", status: "active" },
        { id: "topic", label: "Topic", status: "pending" },
        { id: "video", label: "Video", status: "pending" },
        { id: "watch", label: "Watch", status: "pending" },
      ],
      "select-topic": [
        { id: "research", label: "Research", status: "complete" },
        { id: "topic", label: "Topic", status: "active" },
        { id: "video", label: "Video", status: "pending" },
        { id: "watch", label: "Watch", status: "pending" },
      ],
      "select-video": [
        { id: "research", label: "Research", status: "complete" },
        { id: "topic", label: "Topic", status: "complete" },
        { id: "video", label: "Video", status: "active" },
        { id: "watch", label: "Watch", status: "pending" },
      ],
      "watching": [
        { id: "research", label: "Research", status: "complete" },
        { id: "topic", label: "Topic", status: "complete" },
        { id: "video", label: "Video", status: "complete" },
        { id: "watch", label: "Watch", status: "active" },
      ],
      "error": [
        { id: "research", label: "Research", status: "error" },
        { id: "topic", label: "Topic", status: "pending" },
        { id: "video", label: "Video", status: "pending" },
        { id: "watch", label: "Watch", status: "pending" },
      ],
    };
    return stateToSteps[flowState];
  }, [flowState]);

  const trackerActivity = useMemo<string | undefined>(() => {
    switch (flowState) {
      case "researching-topics":
        return statusMessage;
      case "select-topic":
        return "Pick a topic that interests you";
      case "select-video":
        return `Pick a video about ${selectedTopic?.title ?? "your topic"}`;
      case "watching":
        return selectedVideo?.title;
      case "error":
        return error ?? "Something went wrong";
      default:
        return undefined;
    }
  }, [flowState, statusMessage, selectedTopic, selectedVideo, error]);

  // Sync flowState changes to the flow bus
  useEffect(() => {
    const statusMap: Record<FlowState, "running" | "complete" | "error"> = {
      "researching-topics": "running",
      "select-topic": "running",
      "select-video": "running",
      "watching": "complete",
      "error": "error",
    };
    setBusStatus(statusMap[flowState], flowState);
  }, [flowState, setBusStatus]);

  // Rotate status messages during research
  useEffect(() => {
    if (flowState !== "researching-topics") return;
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % RESEARCH_STATUS_MESSAGES.length;
      setStatusMessage(RESEARCH_STATUS_MESSAGES[index]);
    }, 3000);
    return () => clearInterval(interval);
  }, [flowState]);

  // ── Step: Search videos for a single topic (parallel) ──────────────

  const searchVideosForTopic = useCallback(async (topic: AITopic) => {
    const key = topic.title;
    if (videoCacheStatus.current[key]) return;
    videoCacheStatus.current[key] = "loading";
    forceUpdate((n) => n + 1);

    try {
      const { data: videoData } = await chatJSON<VideosResponse>(
        jsonPrompt(videoSystemPrompt(topic.title), videoUserMessage(topic)),
      );

      const candidates = videoData.videos ?? [];
      const validated = await validateVideos(candidates);

      videoCache.current[key] = validated;
      videoCacheStatus.current[key] = "done";
    } catch {
      videoCacheStatus.current[key] = "error";
      videoCache.current[key] = [];
    }
    forceUpdate((n) => n + 1);
  }, []);

  // ── Step: Research topics ──────────────────────────────────────────

  const researchTopics = useCallback(async () => {
    setFlowState("researching-topics");
    setError(null);
    setLastResult(undefined);
    setStatusMessage(RESEARCH_STATUS_MESSAGES[0]);

    try {
      const { data: result } = await trackStep(
        "research-topics",
        { prompt: TOPIC_SYSTEM_PROMPT, userMessage: TOPIC_USER_MESSAGE },
        () => chatJSON<TopicsResponse>(
          jsonPrompt(TOPIC_SYSTEM_PROMPT, TOPIC_USER_MESSAGE),
        ),
      );

      const fetchedTopics = result.data.topics.slice(0, 5);
      setTopics(fetchedTopics);
      setLastResult(`Found ${fetchedTopics.length} trending topics`);
      setFlowState("select-topic");

      speak(`Found ${fetchedTopics.length} trending topics. Pick one that interests you.`);

      // Fire parallel video searches for all topics
      fetchedTopics.forEach((t) => searchVideosForTopic(t));
    } catch (err) {
      console.error("Topic research error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to research topics. Please try again."
      );
      setFlowState("error");
      speak("Something went wrong. Let me try again.");
    }
  }, [searchVideosForTopic, trackStep, speak]);

  // Auto-start on mount
  useEffect(() => {
    if (!hasStarted.current) {
      hasStarted.current = true;
      researchTopics();
    }
  }, [researchTopics]);

  // ── Step: User picks topic ─────────────────────────────────────────

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
    resolveUserInput("select-topic", { selectedTopic: topic });

    const cached = videoCache.current[topic.title];
    const cacheStatus = videoCacheStatus.current[topic.title];

    if (cached && cached.length > 0) {
      setLastResult(`Topic: ${topic.title}`);
      setFlowState("select-video");
    } else if (cacheStatus === "loading") {
      // Show a temporary loading state, then transition
      setLastResult(`Topic: ${topic.title} — loading videos...`);
      pendingInterval.current = setInterval(() => {
        const status = videoCacheStatus.current[topic.title];
        if (status === "done") {
          if (pendingInterval.current) clearInterval(pendingInterval.current);
          pendingInterval.current = null;
          const videos = videoCache.current[topic.title] || [];
          if (videos.length > 0) {
            setLastResult(`Topic: ${topic.title}`);
            setFlowState("select-video");
          } else {
            setSelectedTopic(null);
            setLastResult("No videos found — pick another topic");
            setFlowState("select-topic");
          }
        } else if (status === "error") {
          if (pendingInterval.current) clearInterval(pendingInterval.current);
          pendingInterval.current = null;
          setSelectedTopic(null);
          setLastResult("Couldn't load videos — try another topic");
          setFlowState("select-topic");
        }
      }, 500);
    } else if (cacheStatus === "done" && (!cached || cached.length === 0)) {
      setSelectedTopic(null);
      setLastResult("No videos found — pick another topic");
      setFlowState("select-topic");
    } else {
      // Retry the video search
      setLastResult(`Topic: ${topic.title} — retrying video search...`);
      videoCacheStatus.current[topic.title] = undefined as any;
      searchVideosForTopic(topic);
      pendingInterval.current = setInterval(() => {
        const status = videoCacheStatus.current[topic.title];
        if (status === "done") {
          if (pendingInterval.current) clearInterval(pendingInterval.current);
          pendingInterval.current = null;
          const videos = videoCache.current[topic.title] || [];
          if (videos.length > 0) {
            setLastResult(`Topic: ${topic.title}`);
            setFlowState("select-video");
          } else {
            setSelectedTopic(null);
            setLastResult("No videos found — pick another topic");
            setFlowState("select-topic");
          }
        } else if (status === "error") {
          if (pendingInterval.current) clearInterval(pendingInterval.current);
          pendingInterval.current = null;
          setSelectedTopic(null);
          setLastResult("Couldn't load videos — try another topic");
          setFlowState("select-topic");
        }
      }, 500);
    }
  };

  // ── Step: User picks video ─────────────────────────────────────────

  const handleVideoSelect = (video: VideoCandidate) => {
    setSelectedVideo(video);
    resolveUserInput("select-video", { selectedVideo: video });
    busSend("main", "summary", {
      summary: `Discovered "${video.title}" by ${video.creator} on the topic of ${selectedTopic?.title ?? "AI"}.`,
    });
    setLastResult(`${selectedTopic?.title} → ${video.title}`);
    setFlowState("watching");
    speak(`Loading ${video.title} by ${video.creator}.`);
  };

  // ── Reset ──────────────────────────────────────────────────────────

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
    setLastResult(undefined);
    videoCache.current = {};
    videoCacheStatus.current = {};
    setTimeout(() => {
      hasStarted.current = true;
      researchTopics();
    }, 0);
  };

  const videosForSelected = selectedTopic ? (videoCache.current[selectedTopic.title] || []) : [];

  // ── Register screen options for voice matching ─────────────────────

  const screenOptions = useMemo<ScreenOption[]>(() => {
    if (flowState === "select-topic" && topics.length > 0) {
      return topics.map((topic) => ({
        id: `topic-${topic.rank}`,
        label: topic.title,
        keywords: [topic.description],
        action: () => handleTopicSelect(topic),
      }));
    }

    if (flowState === "select-video" && selectedTopic && videosForSelected.length > 0) {
      return videosForSelected.map((video) => ({
        id: `video-${video.embedId}`,
        label: video.title,
        keywords: [video.creator],
        action: () => handleVideoSelect(video),
      }));
    }

    return [];
  }, [flowState, topics, selectedTopic, videosForSelected, busSend, resolveUserInput]);

  useScreenOptions(screenOptions);

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Thin StepTracker bar — always visible */}
      <StepTracker
        steps={trackerSteps}
        activity={trackerActivity}
        lastResult={lastResult}
      />

      {/* ── STEP 1: Researching ──────────────────────────────────── */}
      {flowState === "researching-topics" && (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Brain className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <h2 className="text-xl font-semibold text-center mb-2">
            Discovering AI Topics
          </h2>
          <p className="text-muted-foreground text-center max-w-md mb-6">
            {statusMessage}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
            <TrendingUp className="h-3 w-3" />
            <span>Analyzing trends from the past 6 months</span>
          </div>
          <div className="w-48 bg-muted rounded-full h-1.5 overflow-hidden">
            <div className="bg-primary h-full rounded-full animate-pulse" style={{ width: "60%" }} />
          </div>
        </div>
      )}

      {/* ── STEP 2: Select Topic ─────────────────────────────────── */}
      {flowState === "select-topic" && topics.length > 0 && (
        <div className="space-y-4">
          {/* Clear input prompt */}
          <div className="text-center py-2">
            <h2 className="text-xl font-semibold" data-testid="text-topic-heading">
              What interests you?
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Tap a topic to explore videos
            </p>
          </div>

          {/* Topic cards — fill available space */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {topics.map((topic) => {
              const cacheStatus = videoCacheStatus.current[topic.title];
              return (
                <button
                  key={topic.rank}
                  data-testid={`card-topic-${topic.rank}`}
                  className="group relative rounded-xl border border-border bg-card p-5 text-left transition-all hover:border-primary hover:shadow-md hover:shadow-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  onClick={() => handleTopicSelect(topic)}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <Badge variant="outline" className="text-xs shrink-0">#{topic.rank}</Badge>
                    {cacheStatus === "loading" && (
                      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    )}
                    {cacheStatus === "done" && (
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    )}
                  </div>
                  <h3 className="font-semibold text-base mb-1 group-hover:text-primary transition-colors">
                    {topic.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {topic.description}
                  </p>
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground/60 group-hover:text-primary/60 transition-colors">
                    <Play className="h-3.5 w-3.5" />
                    <span>Explore videos</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── STEP 3: Select Video ─────────────────────────────────── */}
      {flowState === "select-video" && selectedTopic && videosForSelected.length > 0 && (
        <div className="space-y-4">
          {/* Clear input prompt with topic context */}
          <div className="text-center py-2">
            <h2 className="text-xl font-semibold" data-testid="text-video-pick-heading">
              Pick a video
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {videosForSelected.length} videos about <span className="font-medium text-foreground">{selectedTopic.title}</span>, ranked by engagement
            </p>
          </div>

          {/* Video cards — fill available space */}
          <div className="grid gap-3">
            {videosForSelected.map((video, idx) => (
              <button
                key={idx}
                data-testid={`card-video-${idx}`}
                className="group relative rounded-xl border border-border bg-card p-5 text-left transition-all hover:border-primary hover:shadow-md hover:shadow-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                onClick={() => handleVideoSelect(video)}
              >
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                    <Play className="h-6 w-6 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
                        {video.title}
                      </h3>
                      <Badge variant={idx === 0 ? "default" : "outline"} className="shrink-0 text-xs">
                        {idx === 0 ? "Top Pick" : `#${idx + 1}`}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{video.creator}</p>
                    <p className="text-sm text-muted-foreground mt-2">{video.whyRecommended}</p>
                    <div className="flex items-center gap-4 mt-3 flex-wrap">
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
                </div>
              </button>
            ))}
          </div>

          {/* Back action */}
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedTopic(null);
                setLastResult("Found " + topics.length + " trending topics");
                setFlowState("select-topic");
              }}
              data-testid="button-back-topics"
              className="text-muted-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              Back to Topics
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Watching — platform default VideoRenderer ────── */}
      {flowState === "watching" && selectedVideo && (
        <div className="space-y-4">
          <VideoRenderer block={{
            id: `discovered-${selectedVideo.embedId}`,
            type: "video",
            embedId: selectedVideo.embedId,
            title: selectedVideo.title,
            creator: selectedVideo.creator,
            description: selectedVideo.description,
            recommendation: selectedVideo.whyRecommended,
          }} />

          <div className="flex justify-center gap-3 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedVideo(null);
                setLastResult(`Topic: ${selectedTopic?.title}`);
                setFlowState("select-video");
              }}
              data-testid="button-pick-another-video"
              className="text-muted-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              Pick Another Video
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={reset}
              data-testid="button-start-over"
              className="text-muted-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Start Over
            </Button>
          </div>
        </div>
      )}

      {/* ── Error state ──────────────────────────────────────────── */}
      {flowState === "error" && (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <p className="text-red-500 mb-2 font-medium" data-testid="text-error-title">Something went wrong</p>
          <p className="text-sm text-muted-foreground mb-4 text-center max-w-md" data-testid="text-error-message">{error}</p>
          <Button onClick={reset} variant="outline" size="sm" data-testid="button-try-again">
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}

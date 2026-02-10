/**
 * Video Discovery Flow - In-platform workflow for finding learning videos
 *
 * Chat ownership: This flow owns the chat (claimed by landing.tsx on handoff).
 * It pushes its own agent messages to the chat directly via useFlowChat().
 * The FlowBus is used only for metadata (activity logging).
 *
 * UI Design Principles:
 *   - Thin StepTracker bar at top (3 lines: steps, activity, last result)
 *   - Only ONE active step visible at a time — content fills the space
 *   - User input steps are highlighted clearly
 *   - Final step uses the platform's default VideoRenderer
 *
 * Auto-starts immediately when rendered.
 * Step 1: Generate ~10 topic suggestions            (LLM → chatJSON)
 * Step 2: User picks a topic or types custom         (user-input)
 * Step 3: Generate ~5 question suggestions           (LLM → chatJSON)
 * Step 4: User picks a question or types custom      (user-input)
 * Step 5: Generate search terms → YouTube API search (LLM + API)
 * Step 6: User picks a video                         (user-input)
 * Step 7: Play the video                             (display)
 *
 * Uses flow-engine abstractions:
 * - chatJSON<T>()        for all LLM calls
 * - searchYouTube()      for YouTube Data API search
 * - useFlowExecution()   for execution tracing
 * - useFlowChat()        for pushing messages to the chat
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StepTracker, type TrackerStep } from "@/components/ui/step-tracker";
import {
  Play,
  Brain,
  Search,
  HelpCircle,
  Eye,
  ThumbsUp,
  MessageSquare,
  RotateCcw,
  ArrowLeft,
  Pencil,
} from "lucide-react";
import {
  chatJSON,
  jsonPrompt,
  searchYouTube,
  useFlowExecution,
  useFlowDefinition,
  useFlowChat,
} from "@/lib/bilko-flow";
import type { VideoCandidate } from "@/lib/bilko-flow";
import { bilkoSystemPrompt } from "@/lib/bilko-persona/system-prompt";
import { useFlowRegistration } from "@/contexts/flow-bus-context";
import { useScreenOptions, type ScreenOption } from "@/contexts/conversation-design-context";
import { VideoRenderer } from "@/components/content-blocks";
import { getFlowAgent } from "@/lib/bilko-persona/flow-agents";

// ── Owner ID — must match what landing.tsx uses for claimChat ──
const OWNER_ID = "video-discovery";

// ── Types ────────────────────────────────────────────────────────────

type FlowState =
  | "generating-topics"
  | "select-topic"
  | "generating-questions"
  | "select-question"
  | "searching-videos"
  | "select-video"
  | "watching"
  | "error";

interface TopicSuggestion {
  title: string;
  description: string;
}

interface TopicsResponse {
  topics: TopicSuggestion[];
}

interface QuestionSuggestion {
  question: string;
}

interface QuestionsResponse {
  questions: QuestionSuggestion[];
}

interface SearchTermsResponse {
  searchTerms: string[];
}

// ── Prompts ──────────────────────────────────────────────────────────

const TOPICS_SYSTEM_PROMPT = bilkoSystemPrompt(`Generate exactly 10 interesting learning topics that someone curious would want to explore via YouTube videos.

Cover a wide range — technology, science, history, psychology, business, health, creative skills, etc. Think "interesting things people search for to learn about."

Return ONLY valid JSON. Example:
{"topics":[{"title":"How Batteries Work","description":"The chemistry behind energy storage"}]}

Rules: title max 6 words, description max 12 words. No markdown, ONLY the JSON object.`);

const TOPICS_USER_MESSAGE =
  "What are 10 interesting topics someone curious would enjoy learning about right now?";

function questionsSystemPrompt(topic: string): string {
  return bilkoSystemPrompt(`The user wants to learn about "${topic}". Generate exactly 5 questions they might want answered — ranging from beginner-friendly to thought-provoking.

Return ONLY valid JSON. Example:
{"questions":[{"question":"How does X actually work?"}]}

Rules: each question max 15 words. No markdown, ONLY the JSON object.`);
}

function questionsUserMessage(topic: string): string {
  return `What are 5 interesting questions someone new to "${topic}" would want answered?`;
}

function searchTermsSystemPrompt(topic: string, question: string): string {
  return bilkoSystemPrompt(`Generate 3-4 YouTube search queries to find the best videos about "${topic}" that answer: "${question}"

The search terms should be specific enough to surface high-quality educational content. Include a mix of:
- A direct search for the question
- A broader topic search
- A "explained" or "for beginners" variant

Return ONLY valid JSON. Example:
{"searchTerms":["how neural networks learn explained","neural network backpropagation beginner tutorial","machine learning fundamentals"]}

Rules: each search term max 8 words. Return 3-4 terms. No markdown, ONLY the JSON object.`);
}

function searchTermsUserMessage(topic: string, question: string): string {
  return `Generate YouTube search queries for topic "${topic}", question: "${question}"`;
}

// ── Status messages ──────────────────────────────────────────────────

const TOPIC_STATUS_MESSAGES = [
  "Finding interesting topics to explore...",
  "Curating a diverse mix of subjects...",
  "Picking topics that spark curiosity...",
];

const QUESTION_STATUS_MESSAGES = [
  "Crafting questions you might want answered...",
  "Thinking about what beginners want to know...",
];

const SEARCH_STATUS_MESSAGES = [
  "Generating YouTube search terms...",
  "Searching YouTube for real videos...",
  "Finding the best matches...",
];

// ── Component ────────────────────────────────────────────────────────

export function VideoDiscoveryFlow({ onComplete }: { onComplete?: (summary?: string) => void }) {
  const [flowState, setFlowState] = useState<FlowState>("generating-topics");
  const [topics, setTopics] = useState<TopicSuggestion[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [questions, setQuestions] = useState<QuestionSuggestion[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<string>("");
  const [videos, setVideos] = useState<VideoCandidate[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoCandidate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState(TOPIC_STATUS_MESSAGES[0]);
  const [lastResult, setLastResult] = useState<string | undefined>(undefined);
  const [customInput, setCustomInput] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const hasStarted = useRef(false);

  const { trackStep, resolveUserInput } = useFlowExecution("video-discovery");
  const { definition: flowDef } = useFlowDefinition("video-discovery");
  const { setStatus: setBusStatus, send: busSend } = useFlowRegistration("video-discovery", "Video Discovery");
  const { pushMessage } = useFlowChat();

  // Get our agent identity for chat messages
  const agent = getFlowAgent("video");

  // ── Push agent message to chat ──────────────────────────
  const pushAgentMessage = useCallback((text: string) => {
    pushMessage(OWNER_ID, {
      speaker: "agent",
      text,
      agentName: agent?.chatName ?? "YoutubeExpert",
      agentDisplayName: agent?.name ?? "YouTube Librarian",
      agentAccent: agent?.accentColor ?? "text-red-500",
    });
  }, [pushMessage, agent]);

  // ── Push greeting on mount ─────────────────────────────
  const didGreet = useRef(false);
  useEffect(() => {
    if (didGreet.current) return;
    didGreet.current = true;
    // Push the agent's greeting to the chat (we own it now)
    if (agent) {
      pushAgentMessage(agent.greeting);
    }
  }, [agent, pushAgentMessage]);

  // ── StepTracker state ──────────────────────────────────────────────

  const trackerSteps = useMemo<TrackerStep[]>(() => {
    const stateToSteps: Record<FlowState, TrackerStep[]> = {
      "generating-topics": [
        { id: "topic", label: "Topic", status: "active" },
        { id: "question", label: "Question", status: "pending" },
        { id: "search", label: "Search", status: "pending" },
        { id: "watch", label: "Watch", status: "pending" },
      ],
      "select-topic": [
        { id: "topic", label: "Topic", status: "active" },
        { id: "question", label: "Question", status: "pending" },
        { id: "search", label: "Search", status: "pending" },
        { id: "watch", label: "Watch", status: "pending" },
      ],
      "generating-questions": [
        { id: "topic", label: "Topic", status: "complete" },
        { id: "question", label: "Question", status: "active" },
        { id: "search", label: "Search", status: "pending" },
        { id: "watch", label: "Watch", status: "pending" },
      ],
      "select-question": [
        { id: "topic", label: "Topic", status: "complete" },
        { id: "question", label: "Question", status: "active" },
        { id: "search", label: "Search", status: "pending" },
        { id: "watch", label: "Watch", status: "pending" },
      ],
      "searching-videos": [
        { id: "topic", label: "Topic", status: "complete" },
        { id: "question", label: "Question", status: "complete" },
        { id: "search", label: "Search", status: "active" },
        { id: "watch", label: "Watch", status: "pending" },
      ],
      "select-video": [
        { id: "topic", label: "Topic", status: "complete" },
        { id: "question", label: "Question", status: "complete" },
        { id: "search", label: "Search", status: "complete" },
        { id: "watch", label: "Watch", status: "pending" },
      ],
      "watching": [
        { id: "topic", label: "Topic", status: "complete" },
        { id: "question", label: "Question", status: "complete" },
        { id: "search", label: "Search", status: "complete" },
        { id: "watch", label: "Watch", status: "active" },
      ],
      "error": [
        { id: "topic", label: "Topic", status: "error" },
        { id: "question", label: "Question", status: "pending" },
        { id: "search", label: "Search", status: "pending" },
        { id: "watch", label: "Watch", status: "pending" },
      ],
    };
    return stateToSteps[flowState];
  }, [flowState]);

  const trackerActivity = useMemo<string | undefined>(() => {
    switch (flowState) {
      case "generating-topics":
        return statusMessage;
      case "select-topic":
        return "Pick a topic or type your own";
      case "generating-questions":
        return statusMessage;
      case "select-question":
        return "What would you like to learn?";
      case "searching-videos":
        return statusMessage;
      case "select-video":
        return `Pick a video about ${selectedTopic}`;
      case "watching":
        return selectedVideo?.title;
      case "error":
        return error ?? "Something went wrong";
      default:
        return undefined;
    }
  }, [flowState, statusMessage, selectedTopic, selectedVideo, error]);

  // Sync flowState to flow bus
  useEffect(() => {
    const statusMap: Record<FlowState, "running" | "complete" | "error"> = {
      "generating-topics": "running",
      "select-topic": "running",
      "generating-questions": "running",
      "select-question": "running",
      "searching-videos": "running",
      "select-video": "running",
      "watching": "complete",
      "error": "error",
    };
    setBusStatus(statusMap[flowState], flowState);
  }, [flowState, setBusStatus]);

  // Rotate status messages during loading states
  useEffect(() => {
    let messages: string[];
    if (flowState === "generating-topics") messages = TOPIC_STATUS_MESSAGES;
    else if (flowState === "generating-questions") messages = QUESTION_STATUS_MESSAGES;
    else if (flowState === "searching-videos") messages = SEARCH_STATUS_MESSAGES;
    else return;

    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % messages.length;
      setStatusMessage(messages[index]);
    }, 3000);
    return () => clearInterval(interval);
  }, [flowState]);

  // ── Step 1: Generate topics ────────────────────────────────────────

  const generateTopics = useCallback(async () => {
    setFlowState("generating-topics");
    setError(null);
    setLastResult(undefined);
    setStatusMessage(TOPIC_STATUS_MESSAGES[0]);

    try {
      const { data: result } = await trackStep(
        "generate-topics",
        { prompt: TOPICS_SYSTEM_PROMPT, userMessage: TOPICS_USER_MESSAGE },
        () => chatJSON<TopicsResponse>(
          jsonPrompt(TOPICS_SYSTEM_PROMPT, TOPICS_USER_MESSAGE),
        ),
      );

      const fetched = result.data.topics.slice(0, 10);
      setTopics(fetched);
      setLastResult(`Found ${fetched.length} topics to explore`);
      setFlowState("select-topic");

      // Push status to chat
      const statusText = `I found ${fetched.length} topics. Pick one that interests you, or type your own.`;
      pushAgentMessage(statusText);
    } catch (err) {
      console.error("Topic generation error:", err);
      setError(err instanceof Error ? err.message : "Failed to generate topics.");
      setFlowState("error");
    }
  }, [trackStep, pushAgentMessage]);

  // Auto-start on mount
  useEffect(() => {
    if (!hasStarted.current) {
      hasStarted.current = true;
      generateTopics();
    }
  }, [generateTopics]);

  // ── Step 2: Handle topic selection ─────────────────────────────────

  const handleTopicSelect = useCallback((topic: string) => {
    setSelectedTopic(topic);
    setShowCustomInput(false);
    setCustomInput("");
    resolveUserInput("select-topic", { selectedTopic: topic });
    generateQuestionsForTopic(topic);
  }, [resolveUserInput]);

  const handleCustomTopicSubmit = useCallback(() => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    handleTopicSelect(trimmed);
  }, [customInput, handleTopicSelect]);

  // ── Step 3: Generate questions ─────────────────────────────────────

  const generateQuestionsForTopic = useCallback(async (topic: string) => {
    setFlowState("generating-questions");
    setStatusMessage(QUESTION_STATUS_MESSAGES[0]);

    try {
      const { data: result } = await trackStep(
        "generate-questions",
        { topic },
        () => chatJSON<QuestionsResponse>(
          jsonPrompt(questionsSystemPrompt(topic), questionsUserMessage(topic)),
        ),
      );

      const fetched = result.data.questions.slice(0, 5);
      setQuestions(fetched);
      setLastResult(`Topic: ${topic}`);
      setFlowState("select-question");

      // Push status to chat
      const statusText = "If you had one question to be answered, what would it be?";
      pushAgentMessage(statusText);
    } catch (err) {
      console.error("Question generation error:", err);
      setError(err instanceof Error ? err.message : "Failed to generate questions.");
      setFlowState("error");
    }
  }, [trackStep, pushAgentMessage]);

  // ── Step 4: Handle question selection ──────────────────────────────

  const handleQuestionSelect = useCallback((question: string) => {
    setSelectedQuestion(question);
    setShowCustomInput(false);
    setCustomInput("");
    resolveUserInput("select-question", { selectedQuestion: question });
    searchVideosForTopicAndQuestion(selectedTopic, question);
  }, [resolveUserInput, selectedTopic]);

  const handleCustomQuestionSubmit = useCallback(() => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    handleQuestionSelect(trimmed);
  }, [customInput, handleQuestionSelect]);

  // ── Step 5: Generate search terms → YouTube API search ─────────────

  const searchVideosForTopicAndQuestion = useCallback(async (topic: string, question: string) => {
    setFlowState("searching-videos");
    setStatusMessage(SEARCH_STATUS_MESSAGES[0]);

    try {
      // Generate search terms via LLM
      const { data: termsResult } = await trackStep(
        "generate-search-terms",
        { topic, question },
        () => chatJSON<SearchTermsResponse>(
          jsonPrompt(
            searchTermsSystemPrompt(topic, question),
            searchTermsUserMessage(topic, question),
          ),
        ),
      );

      const searchTerms = termsResult.data.searchTerms ?? [];
      if (searchTerms.length === 0) {
        setError("Couldn't generate search terms. Try a different topic or question.");
        setFlowState("error");
        return;
      }

      setStatusMessage("Searching YouTube for real videos...");

      // Search YouTube API with the generated terms
      const { data: foundVideos } = await trackStep(
        "youtube-search",
        { searchTerms },
        async () => {
          const results = await searchYouTube(searchTerms);
          return { data: results, raw: JSON.stringify(results), model: "youtube-api", usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } };
        },
      );

      if (foundVideos.data.length === 0) {
        setError("No videos found on YouTube. Try a different question.");
        setFlowState("error");
        return;
      }

      setVideos(foundVideos.data);
      setLastResult(`Found ${foundVideos.data.length} videos`);
      setFlowState("select-video");

      // Push status to chat
      const statusText = `Found ${foundVideos.data.length} videos. Pick one to watch.`;
      pushAgentMessage(statusText);
    } catch (err) {
      console.error("Video search error:", err);
      setError(err instanceof Error ? err.message : "Failed to search for videos.");
      setFlowState("error");
    }
  }, [trackStep, pushAgentMessage]);

  // ── Step 6: Handle video selection ─────────────────────────────────

  const handleVideoSelect = (video: VideoCandidate) => {
    setSelectedVideo(video);
    resolveUserInput("select-video", { selectedVideo: video });

    // Push summary to chat directly (we own it)
    const summaryText = `Discovered "${video.title}" by ${video.creator} on the topic of ${selectedTopic}.`;
    pushAgentMessage(summaryText);

    // Also send to FlowBus for activity logging
    busSend("main", "summary", { summary: summaryText });

    // Track play-video step (display step — renders the embed)
    trackStep("play-video", { selectedVideo: video }, async () => {
      return { exitSummary: summaryText };
    });

    setLastResult(`${selectedTopic} → ${video.title}`);
    setFlowState("watching");
  };

  // ── Reset ──────────────────────────────────────────────────────────

  const reset = () => {
    hasStarted.current = false;
    didGreet.current = false;
    setTopics([]);
    setSelectedTopic("");
    setQuestions([]);
    setSelectedQuestion("");
    setVideos([]);
    setSelectedVideo(null);
    setError(null);
    setLastResult(undefined);
    setCustomInput("");
    setShowCustomInput(false);
    setTimeout(() => {
      hasStarted.current = true;
      didGreet.current = true;
      generateTopics();
    }, 0);
  };

  // ── Register screen options for voice matching ─────────────────────

  const screenOptions = useMemo<ScreenOption[]>(() => {
    if (flowState === "select-topic" && topics.length > 0) {
      return topics.map((topic, idx) => ({
        id: `topic-${idx}`,
        label: topic.title,
        keywords: [topic.description],
        action: () => handleTopicSelect(topic.title),
      }));
    }

    if (flowState === "select-question" && questions.length > 0) {
      return questions.map((q, idx) => ({
        id: `question-${idx}`,
        label: q.question,
        keywords: [],
        action: () => handleQuestionSelect(q.question),
      }));
    }

    if (flowState === "select-video" && videos.length > 0) {
      return videos.map((video) => ({
        id: `video-${video.embedId}`,
        label: video.title,
        keywords: [video.creator],
        action: () => handleVideoSelect(video),
      }));
    }

    return [];
  }, [flowState, topics, questions, videos, handleTopicSelect, handleQuestionSelect]);

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

      {/* ── LOADING: Generating topics ─────────────────────────── */}
      {flowState === "generating-topics" && (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Brain className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <h2 className="text-xl font-semibold text-center mb-2">
            Finding Topics to Explore
          </h2>
          <p className="text-muted-foreground text-center max-w-md mb-6">
            {statusMessage}
          </p>
          <div className="w-48 bg-muted rounded-full h-1.5 overflow-hidden">
            <div className="bg-primary h-full rounded-full animate-pulse" style={{ width: "60%" }} />
          </div>
        </div>
      )}

      {/* ── STEP 1: Select Topic ───────────────────────────────── */}
      {flowState === "select-topic" && topics.length > 0 && (
        <div className="space-y-4">
          <div className="text-center py-2">
            <h2 className="text-xl font-semibold" data-testid="text-topic-heading">
              What do you want to learn about?
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Pick a topic or type your own
            </p>
          </div>

          {/* Topic grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {topics.map((topic, idx) => (
              <button
                key={idx}
                data-testid={`card-topic-${idx}`}
                className="group relative rounded-xl border border-border bg-card p-5 text-left transition-all hover:border-primary hover:shadow-md hover:shadow-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                onClick={() => handleTopicSelect(topic.title)}
              >
                <h3 className="font-semibold text-base mb-1 group-hover:text-primary transition-colors">
                  {topic.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {topic.description}
                </p>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground/60 group-hover:text-primary/60 transition-colors">
                  <Play className="h-3.5 w-3.5" />
                  <span>Explore</span>
                </div>
              </button>
            ))}
          </div>

          {/* Custom input toggle + field */}
          {!showCustomInput ? (
            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCustomInput(true)}
                data-testid="button-custom-topic"
                className="text-muted-foreground"
              >
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Type your own topic
              </Button>
            </div>
          ) : (
            <div className="flex gap-2 max-w-md mx-auto">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCustomTopicSubmit()}
                placeholder="e.g. How black holes work..."
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                data-testid="input-custom-topic"
                autoFocus
              />
              <Button
                size="sm"
                onClick={handleCustomTopicSubmit}
                disabled={!customInput.trim()}
                data-testid="button-submit-custom-topic"
              >
                Go
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── LOADING: Generating questions ──────────────────────── */}
      {flowState === "generating-questions" && (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <HelpCircle className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <h2 className="text-xl font-semibold text-center mb-2">
            {selectedTopic}
          </h2>
          <p className="text-muted-foreground text-center max-w-md mb-6">
            {statusMessage}
          </p>
          <div className="w-48 bg-muted rounded-full h-1.5 overflow-hidden">
            <div className="bg-primary h-full rounded-full animate-pulse" style={{ width: "60%" }} />
          </div>
        </div>
      )}

      {/* ── STEP 2: Select Question ────────────────────────────── */}
      {flowState === "select-question" && questions.length > 0 && (
        <div className="space-y-4">
          <div className="text-center py-2">
            <h2 className="text-xl font-semibold" data-testid="text-question-heading">
              If you had one question to be answered — what would it be?
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              About <span className="font-medium text-foreground">{selectedTopic}</span>
            </p>
          </div>

          {/* Question cards */}
          <div className="grid gap-3 max-w-xl mx-auto">
            {questions.map((q, idx) => (
              <button
                key={idx}
                data-testid={`card-question-${idx}`}
                className="group rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary hover:shadow-md hover:shadow-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                onClick={() => handleQuestionSelect(q.question)}
              >
                <div className="flex items-center gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <HelpCircle className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-sm font-medium group-hover:text-primary transition-colors">
                    {q.question}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Custom input toggle + field */}
          {!showCustomInput ? (
            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCustomInput(true)}
                data-testid="button-custom-question"
                className="text-muted-foreground"
              >
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Type your own question
              </Button>
            </div>
          ) : (
            <div className="flex gap-2 max-w-md mx-auto">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCustomQuestionSubmit()}
                placeholder="e.g. Why does time slow down near black holes?"
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                data-testid="input-custom-question"
                autoFocus
              />
              <Button
                size="sm"
                onClick={handleCustomQuestionSubmit}
                disabled={!customInput.trim()}
                data-testid="button-submit-custom-question"
              >
                Go
              </Button>
            </div>
          )}

          {/* Back action */}
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedTopic("");
                setQuestions([]);
                setShowCustomInput(false);
                setCustomInput("");
                setLastResult(`Found ${topics.length} topics to explore`);
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

      {/* ── LOADING: Searching YouTube ─────────────────────────── */}
      {flowState === "searching-videos" && (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
            <Search className="h-8 w-8 text-red-500 animate-pulse" />
          </div>
          <h2 className="text-xl font-semibold text-center mb-2">
            Searching YouTube
          </h2>
          <p className="text-muted-foreground text-center max-w-md mb-4">
            {statusMessage}
          </p>
          <div className="text-xs text-muted-foreground/60 text-center space-y-1">
            <p className="font-medium">{selectedTopic}</p>
            <p>{selectedQuestion}</p>
          </div>
          <div className="w-48 bg-muted rounded-full h-1.5 overflow-hidden mt-4">
            <div className="bg-red-500 h-full rounded-full animate-pulse" style={{ width: "70%" }} />
          </div>
        </div>
      )}

      {/* ── STEP 3: Select Video ───────────────────────────────── */}
      {flowState === "select-video" && videos.length > 0 && (
        <div className="space-y-4">
          <div className="text-center py-2">
            <h2 className="text-xl font-semibold" data-testid="text-video-pick-heading">
              Pick a video
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {videos.length} videos about <span className="font-medium text-foreground">{selectedTopic}</span>, sorted by popularity
            </p>
          </div>

          {/* Video cards */}
          <div className="grid gap-3">
            {videos.map((video, idx) => (
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
                    <p className="text-sm text-muted-foreground mt-2">{video.description}</p>
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
                setVideos([]);
                setSelectedQuestion("");
                setShowCustomInput(false);
                setCustomInput("");
                setLastResult(`Topic: ${selectedTopic}`);
                setFlowState("select-question");
              }}
              data-testid="button-back-questions"
              className="text-muted-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              Back to Questions
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Watching — platform default VideoRenderer ──── */}
      {flowState === "watching" && selectedVideo && (
        <div className="space-y-4">
          <VideoRenderer block={{
            id: `discovered-${selectedVideo.embedId}`,
            type: "video",
            embedId: selectedVideo.embedId,
            title: selectedVideo.title,
            creator: selectedVideo.creator,
            description: selectedVideo.description,
            recommendation: `${selectedTopic} — ${selectedQuestion}`,
          }} />

          <div className="flex justify-center gap-3 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedVideo(null);
                setLastResult(`${selectedTopic} → ${selectedQuestion}`);
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
            {onComplete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onComplete(`Watched "${selectedVideo.title}" by ${selectedVideo.creator} about ${selectedTopic}.`)}
                data-testid="button-done"
              >
                Done
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── Error state ────────────────────────────────────────── */}
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

import { useState, useEffect, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import {
  Target,
  Zap,
  ChevronLeft,
  BookOpen,
  CheckCircle2,
  Layers,
  ExternalLink,
  GraduationCap,
  Rocket,
  Brain,
  TrendingUp,
  ChevronRight,
  ChevronUp,
  Sparkles,
  Book,
  Search,
  MessageSquare,
  Pencil,
  Database,
  Wrench,
  Building,
  Shield,
  Workflow,
  Lightbulb,
  Hammer,
  HelpCircle,
  Gamepad2,
  Trophy,
  ListChecks,
  Play,
  Video as VideoIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  academyTracks,
  getLevelById,
  getTrackById,
  getTrackForLevel,
  type AcademyLevel,
  type SubTopic,
  type Track,
  type QuestType,
} from "@/data/academy-levels";
import {
  dictionaryCategories,
  searchTerms,
  getCategoryById,
  getTermById,
  type DictionaryCategory,
  type DictionaryTerm,
} from "@/data/academy-dictionary";
import {
  videoCategories,
  getCategoryById as getVideoCategoryById,
  getVideoById,
  getCategoryForVideo,
  type VideoCategory,
  type Video,
} from "@/data/academy-videos";
import { useNavigation } from "@/contexts/navigation-context";
import { PromptPlayground } from "@/components/prompt-playground";
import { VideoExperienceRenderer } from "@/components/content-blocks";
import { NavPanel, type NavPanelItem } from "@/components/nav";

// Icon mapping for dictionary categories
const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Brain,
  MessageSquare,
  Pencil,
  Database,
  Wrench,
  Building,
  Sparkles,
  Shield,
  Workflow,
};

type AcademySection = "levels" | "dictionary" | "video";

// Icon mapping for video categories
const videoCategoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Brain,
  Video: VideoIcon,
  Sparkles,
  Play,
};

// ── NavPanel item data ──────────────────────────────────

const l2Items: NavPanelItem[] = [
  { id: "levels", label: "Levels", description: "Progression & Quests", icon: Target },
  { id: "dictionary", label: "Dictionary", description: "AI Terminology", icon: Book },
  { id: "video", label: "Video", description: "Curated Content", icon: VideoIcon },
];

const trackItems: NavPanelItem[] = academyTracks.map((track) => {
  const color = track.difficulty === "beginner" ? "text-emerald-500"
    : track.difficulty === "intermediate" ? "text-blue-500"
    : "text-purple-500";
  const activeBg = track.difficulty === "beginner" ? "bg-emerald-500/20"
    : track.difficulty === "intermediate" ? "bg-blue-500/20"
    : "bg-purple-500/20";
  const hoverBg = track.difficulty === "beginner" ? "hover:bg-emerald-500/10"
    : track.difficulty === "intermediate" ? "hover:bg-blue-500/10"
    : "hover:bg-purple-500/10";
  return {
    id: track.id,
    label: track.name.split(" ")[0],
    description: track.tagline,
    shortLabel: track.name[0],
    color,
    activeBg,
    hoverBg,
  };
});

// ============================================
// ============================================
// LEVELS SECTION COMPONENTS
// ============================================

function SubTopicNav({
  subTopics,
  selectedSubTopicId,
  onSelectSubTopic,
}: {
  subTopics: SubTopic[];
  selectedSubTopicId: string | null;
  onSelectSubTopic: (id: string | null) => void;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      <Button
        variant={selectedSubTopicId === null ? "secondary" : "outline"}
        size="sm"
        onClick={() => onSelectSubTopic(null)}
      >
        Overview
      </Button>
      {subTopics.map((st) => (
        <Button
          key={st.id}
          variant={selectedSubTopicId === st.id ? "secondary" : "outline"}
          size="sm"
          onClick={() => onSelectSubTopic(st.id)}
        >
          {st.title}
        </Button>
      ))}
    </div>
  );
}

function SubTopicDetail({ subTopic }: { subTopic: SubTopic }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">{subTopic.title}</CardTitle>
          </div>
          <CardDescription>{subTopic.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Key Techniques</h4>
            <ul className="space-y-2">
              {subTopic.keyTechniques.map((technique, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">{technique}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-2">Platforms</h4>
            <div className="flex gap-2 flex-wrap">
              {subTopic.platforms.map((platform) => (
                <Badge key={platform} variant="secondary">
                  {platform}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LevelsOverview({
  onSelectTrack,
}: {
  onSelectTrack: (trackId: string) => void;
}) {
  const totalLevels = academyTracks.reduce(
    (sum, track) => sum + track.levels.length,
    0
  );
  const totalQuests = academyTracks.reduce(
    (sum, track) =>
      sum + track.levels.reduce((s, l) => s + l.quests.length, 0),
    0
  );

  const journeyIcons = {
    seedling: Rocket,
    zap: Zap,
    sparkles: Sparkles,
  };

  const trackColors = {
    beginner: {
      border: "border-emerald-500/30",
      bg: "bg-emerald-500/5",
      text: "text-emerald-500",
      hover: "hover:border-emerald-500/50",
    },
    intermediate: {
      border: "border-blue-500/30",
      bg: "bg-blue-500/5",
      text: "text-blue-500",
      hover: "hover:border-blue-500/50",
    },
    advanced: {
      border: "border-purple-500/30",
      bg: "bg-purple-500/5",
      text: "text-purple-500",
      hover: "hover:border-purple-500/50",
    },
  };

  return (
    <div className="flex-1 overflow-auto bg-background">
      {/* Hero Header */}
      <div className="p-6 border-b bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <div className="flex items-start gap-4 mb-4">
          <div className="p-3 rounded-xl bg-primary/10">
            <Target className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-1">Mental Gym</h1>
            <p className="text-muted-foreground">
              Three paths to AI mastery. Choose your journey based on your experience level.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center p-3 rounded-lg bg-background/50 border">
            <div className="text-2xl font-bold text-primary">{academyTracks.length}</div>
            <div className="text-xs text-muted-foreground">Tracks</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-background/50 border">
            <div className="text-2xl font-bold text-primary">{totalLevels}</div>
            <div className="text-xs text-muted-foreground">Levels</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-background/50 border">
            <div className="text-2xl font-bold text-primary">{totalQuests}</div>
            <div className="text-xs text-muted-foreground">Quests</div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Track Cards */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Choose Your Path
          </h2>
          <div className="grid gap-6">
            {academyTracks.map((track) => {
              const colors = trackColors[track.difficulty];
              return (
                <Card
                  key={track.id}
                  className={`cursor-pointer transition-all ${colors.border} ${colors.bg} ${colors.hover}`}
                  onClick={() => onSelectTrack(track.id)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <Badge
                          variant="outline"
                          className={`${colors.text} border-current mb-2`}
                        >
                          {track.difficulty}
                        </Badge>
                        <CardTitle className="text-xl">{track.name}</CardTitle>
                        <CardDescription className="text-base mt-1">
                          {track.tagline}
                        </CardDescription>
                      </div>
                      <ChevronRight className={`h-6 w-6 ${colors.text}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      {track.description}
                    </p>

                    {/* Journey phases */}
                    <div className="grid gap-3 md:grid-cols-3">
                      {track.journey.map((phase) => {
                        const PhaseIcon = journeyIcons[phase.icon];
                        return (
                          <div
                            key={phase.id}
                            className="p-3 rounded-lg bg-background/50 border"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <PhaseIcon className={`h-4 w-4 ${colors.text}`} />
                              <span className="text-sm font-medium">
                                {phase.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ({phase.levelRange})
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {phase.description}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Stats */}
                    <div className="flex gap-4 mt-4 pt-4 border-t">
                      <div className="text-sm">
                        <span className={`font-bold ${colors.text}`}>
                          {track.levels.length}
                        </span>{" "}
                        <span className="text-muted-foreground">levels</span>
                      </div>
                      <div className="text-sm">
                        <span className={`font-bold ${colors.text}`}>
                          {track.levels.reduce(
                            (sum, l) => sum + l.quests.length,
                            0
                          )}
                        </span>{" "}
                        <span className="text-muted-foreground">quests</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Recommended Start */}
        <section className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-3">
            New to AI? Start with the Recruit track.
          </p>
          <Button onClick={() => onSelectTrack("recruit")}>
            Start as a Recruit
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </section>
      </div>
    </div>
  );
}

function TrackOverview({
  track,
  onSelectLevel,
  onBack,
}: {
  track: Track;
  onSelectLevel: (levelId: string) => void;
  onBack: () => void;
}) {
  const journeyIcons = {
    seedling: Rocket,
    zap: Zap,
    sparkles: Sparkles,
  };

  const colors = {
    beginner: { text: "text-emerald-500", border: "border-emerald-500/30", bg: "bg-emerald-500/5" },
    intermediate: { text: "text-blue-500", border: "border-blue-500/30", bg: "bg-blue-500/5" },
    advanced: { text: "text-purple-500", border: "border-purple-500/30", bg: "bg-purple-500/5" },
  }[track.difficulty];

  return (
    <div className="flex-1 overflow-auto bg-background">
      {/* Header */}
      <div className={`p-6 border-b ${colors.bg}`}>
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-1 mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          All Tracks
        </Button>

        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl ${colors.bg} border ${colors.border}`}>
            <Target className={`h-8 w-8 ${colors.text}`} />
          </div>
          <div>
            <Badge variant="outline" className={`${colors.text} border-current mb-2`}>
              {track.difficulty}
            </Badge>
            <h1 className="text-2xl font-bold">{track.name}</h1>
            <p className="text-muted-foreground">{track.tagline}</p>
          </div>
        </div>

        <p className="mt-4 text-sm text-muted-foreground max-w-2xl">
          {track.description}
        </p>
      </div>

      <div className="p-6 space-y-8">
        {/* Journey */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            The Journey
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {track.journey.map((phase) => {
              const PhaseIcon = journeyIcons[phase.icon];
              return (
                <Card key={phase.id} className={`${colors.border} ${colors.bg}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <PhaseIcon className={`h-4 w-4 ${colors.text}`} />
                      {phase.name} ({phase.levelRange})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      {phase.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Curriculum Table */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Full Curriculum
          </h2>
          <Card>
            <CardContent className="pt-6 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Level</TableHead>
                    <TableHead className="w-[140px]">Rank</TableHead>
                    <TableHead>Core Skill</TableHead>
                    <TableHead className="w-[80px] text-center">
                      Quests
                    </TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {track.levels.map((level) => (
                    <TableRow
                      key={level.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => onSelectLevel(level.id)}
                    >
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {level.levelRange}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{level.rank}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm">
                            {level.coreSkill}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {level.skillSummary}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="text-xs">
                          {level.quests.length}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>

        {/* CTA */}
        <section className="text-center py-4">
          <Button onClick={() => onSelectLevel(track.levels[0]?.id)}>
            Start with {track.levels[0]?.rank}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </section>
      </div>
    </div>
  );
}

function LevelDetailPanel({
  level,
  onBack,
}: {
  level: AcademyLevel;
  onBack?: () => void;
}) {
  const [selectedSubTopicId, setSelectedSubTopicId] = useState<string | null>(
    null
  );
  const [expandedQuestId, setExpandedQuestId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedSubTopicId(null);
    setExpandedQuestId(null);
  }, [level.id]);

  const toggleQuestExpand = (questId: string) => {
    setExpandedQuestId(expandedQuestId === questId ? null : questId);
  };

  const selectedSubTopic = level.subTopics?.find(
    (st) => st.id === selectedSubTopicId
  );

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="p-4 border-b bg-muted/30">
        {onBack && (
          <div className="md:hidden mb-3">
            <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
              <ChevronLeft className="h-4 w-4" />
              Levels
            </Button>
          </div>
        )}
        <div className="flex items-center gap-3 flex-wrap mb-2">
          <Badge variant="outline" className="text-xs">
            Level {level.levelRange}
          </Badge>
          <h2 className="text-lg font-semibold">{level.rank}</h2>
        </div>
        <p className="text-sm text-muted-foreground italic mb-3">
          {level.coreSkill}
        </p>

        {level.subTopics && level.subTopics.length > 0 && (
          <SubTopicNav
            subTopics={level.subTopics}
            selectedSubTopicId={selectedSubTopicId}
            onSelectSubTopic={setSelectedSubTopicId}
          />
        )}
      </div>

      <div className="p-4 space-y-6">
        {selectedSubTopic ? (
          <SubTopicDetail subTopic={selectedSubTopic} />
        ) : (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">The Lesson</CardTitle>
                </div>
                <CardDescription>{level.skillSummary}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {level.lesson.split("\n\n").map((paragraph, idx) => (
                    <p
                      key={idx}
                      className="text-sm text-muted-foreground leading-relaxed mb-3 last:mb-0"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Key Principles</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2">
                  {level.keyPrinciples.map((principle, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                        {idx + 1}
                      </span>
                      <span className="text-muted-foreground">{principle}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            {level.subTopics && level.subTopics.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">Deep Dives</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {level.subTopics.map((st) => (
                      <button
                        key={st.id}
                        onClick={() => setSelectedSubTopicId(st.id)}
                        className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors text-left"
                      >
                        <h4 className="font-medium text-sm mb-1">{st.title}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {st.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Quests</CardTitle>
                  <Badge variant="outline" className="ml-auto">
                    {level.quests.length} total
                  </Badge>
                </div>
                <CardDescription>
                  Complete these challenges to level up
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {level.quests.map((quest) => {
                    const questTypeConfig: Record<QuestType, { icon: React.ElementType; color: string; label: string }> = {
                      prompt: { icon: Lightbulb, color: "text-yellow-500", label: "Prompt Exercise" },
                      build: { icon: Hammer, color: "text-blue-500", label: "Build Challenge" },
                      quiz: { icon: HelpCircle, color: "text-purple-500", label: "Quiz" },
                      game: { icon: Gamepad2, color: "text-green-500", label: "Mini-Game" },
                      capstone: { icon: Trophy, color: "text-amber-500", label: "Capstone" },
                    };
                    const config = questTypeConfig[quest.type];
                    const QuestIcon = config.icon;
                    const isExpanded = expandedQuestId === quest.id;
                    const isInteractive = quest.type === "prompt";

                    return (
                      <div key={quest.id} className="rounded-lg border bg-card overflow-hidden">
                        <div className="p-3">
                          <div className="flex items-start gap-3">
                            <div className={`flex-shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center ${config.color}`}>
                              <QuestIcon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <Badge variant="outline" className={`text-xs ${config.color} border-current`}>
                                  {config.label}
                                </Badge>
                                {isInteractive && (
                                  <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-500 border-green-500/30">
                                    <Play className="h-3 w-3 mr-1" />
                                    Interactive
                                  </Badge>
                                )}
                              </div>
                              <h4 className="font-medium text-sm mb-1">{quest.title}</h4>
                              <p className="text-sm text-muted-foreground">
                                {quest.description}
                              </p>
                              {quest.tasks && quest.tasks.length > 0 && (
                                <div className="mt-2 pl-3 border-l-2 border-muted">
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                                    <ListChecks className="h-3 w-3" />
                                    Tasks
                                  </div>
                                  <ul className="space-y-1">
                                    {quest.tasks.map((task, taskIdx) => (
                                      <li key={taskIdx} className="text-xs text-muted-foreground flex items-start gap-1">
                                        <span className="text-muted-foreground/50">•</span>
                                        {task}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {isInteractive && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="mt-3"
                                  onClick={() => toggleQuestExpand(quest.id)}
                                >
                                  {isExpanded ? (
                                    <>
                                      <ChevronUp className="h-4 w-4 mr-1" />
                                      Hide Playground
                                    </>
                                  ) : (
                                    <>
                                      <Play className="h-4 w-4 mr-1" />
                                      Try it Now
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                        {isExpanded && isInteractive && (
                          <div className="border-t bg-muted/30 p-4">
                            <PromptPlayground
                              title={quest.title}
                              description={quest.description}
                              placeholder="Try the exercise here..."
                              defaultModel="gemini-2.5-flash"
                              showModelSelector={true}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================
// DICTIONARY SECTION COMPONENTS
// ============================================

import { getAllTerms } from "@/data/academy-dictionary";

// ============================================
// VIDEO SECTION COMPONENTS
// ============================================

function VideoOverview({
  onSelectCategory,
}: {
  onSelectCategory: (id: string) => void;
}) {
  const totalVideos = videoCategories.reduce(
    (sum, cat) => sum + cat.videos.length,
    0
  );

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="p-6 border-b bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <div className="flex items-start gap-4 mb-4">
          <div className="p-3 rounded-xl bg-primary/10">
            <VideoIcon className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-1">Video Library</h1>
            <p className="text-muted-foreground">
              Curated video content with AI-powered learning tools
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="text-center p-3 rounded-lg bg-background/50 border">
            <div className="text-2xl font-bold text-primary">
              {videoCategories.length}
            </div>
            <div className="text-xs text-muted-foreground">Categories</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-background/50 border">
            <div className="text-2xl font-bold text-primary">{totalVideos}</div>
            <div className="text-xs text-muted-foreground">Videos</div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <section>
          <h2 className="text-lg font-semibold mb-4">Browse by Category</h2>
          <div className="grid gap-4">
            {videoCategories.map((cat) => {
              const IconComponent = videoCategoryIcons[cat.icon] || VideoIcon;
              return (
                <Card
                  key={cat.id}
                  className="cursor-pointer hover:bg-muted/50 hover:border-primary/50 transition-colors"
                  onClick={() => onSelectCategory(cat.id)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <IconComponent className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{cat.title}</CardTitle>
                          <CardDescription>{cat.description}</CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline">{cat.videos.length} videos</Badge>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function VideoCategoryOverview({
  category,
  onSelectVideo,
  onBack,
}: {
  category: VideoCategory;
  onSelectVideo: (id: string) => void;
  onBack: () => void;
}) {
  const IconComponent = videoCategoryIcons[category.icon] || VideoIcon;

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="p-4 border-b bg-muted/30">
        <div className="md:hidden mb-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
            <ChevronLeft className="h-4 w-4" />
            Video
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <IconComponent className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{category.title}</h2>
            <p className="text-sm text-muted-foreground">
              {category.videos.length} videos
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">About This Category</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {category.description}
            </p>
          </CardContent>
        </Card>

        <section>
          <h3 className="text-lg font-semibold mb-4">Videos</h3>
          <div className="space-y-3">
            {category.videos.map((video) => (
              <Card
                key={video.id}
                className="cursor-pointer hover:bg-muted/50 hover:border-primary/50 transition-colors"
                onClick={() => onSelectVideo(video.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-24 h-16 bg-muted rounded overflow-hidden shrink-0">
                      <img
                        src={`https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium">{video.title}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {video.description}
                      </p>
                      <div className="flex gap-2 mt-2">
                        {video.tags?.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function DictionaryOverview({
  onSelectCategory,
  onSelectTerm,
}: {
  onSelectCategory: (id: string) => void;
  onSelectTerm: (id: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const allTerms = useMemo(() => getAllTerms(), []);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchTerms(searchQuery);
  }, [searchQuery]);

  // Group terms by first letter for A-Z index
  const termsByLetter = useMemo(() => {
    const grouped: Record<string, DictionaryTerm[]> = {};
    allTerms.forEach((term) => {
      const letter = term.term.charAt(0).toUpperCase();
      if (!grouped[letter]) grouped[letter] = [];
      grouped[letter].push(term);
    });
    // Sort terms within each letter
    Object.keys(grouped).forEach((letter) => {
      grouped[letter].sort((a, b) => a.term.localeCompare(b.term));
    });
    return grouped;
  }, [allTerms]);

  const sortedLetters = Object.keys(termsByLetter).sort();

  const totalTerms = allTerms.length;

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="p-6 border-b bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <div className="flex items-start gap-4 mb-4">
          <div className="p-3 rounded-xl bg-primary/10">
            <Book className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-1">AI Dictionary</h1>
            <p className="text-muted-foreground">
              Comprehensive glossary of AI terminology, models, and concepts
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search terms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="text-center p-3 rounded-lg bg-background/50 border">
            <div className="text-2xl font-bold text-primary">
              {dictionaryCategories.length}
            </div>
            <div className="text-xs text-muted-foreground">Categories</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-background/50 border">
            <div className="text-2xl font-bold text-primary">{totalTerms}</div>
            <div className="text-xs text-muted-foreground">Terms</div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Search Results */}
        {searchQuery.trim() ? (
          <section>
            <h2 className="text-lg font-semibold mb-4">
              Search Results ({searchResults.length})
            </h2>
            {searchResults.length > 0 ? (
              <div className="space-y-2">
                {searchResults.map((term) => (
                  <Card
                    key={term.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => onSelectTerm(term.id)}
                  >
                    <CardHeader className="py-3">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{term.term}</CardTitle>
                        {term.abbreviation && (
                          <Badge variant="outline" className="text-xs">
                            {term.abbreviation}
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-sm">
                        {term.definition}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                No terms found matching "{searchQuery}"
              </p>
            )}
          </section>
        ) : (
          <>
            {/* A-Z Letter Navigation */}
            <section>
              <div className="flex flex-wrap gap-1 mb-4">
                {sortedLetters.map((letter) => (
                  <a
                    key={letter}
                    href={`#letter-${letter}`}
                    className="w-8 h-8 flex items-center justify-center rounded bg-muted hover:bg-primary hover:text-primary-foreground transition-colors text-sm font-medium"
                  >
                    {letter}
                  </a>
                ))}
              </div>
            </section>

            {/* Browse by Category */}
            <section>
              <h2 className="text-lg font-semibold mb-4">Browse by Category</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {dictionaryCategories.map((cat) => {
                  const IconComponent = categoryIcons[cat.icon] || Brain;
                  return (
                    <button
                      key={cat.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 hover:border-primary/50 transition-colors text-left"
                      onClick={() => onSelectCategory(cat.id)}
                    >
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                        <IconComponent className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-sm">{cat.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {cat.terms.length} terms
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* All Terms A-Z */}
            <section>
              <h2 className="text-lg font-semibold mb-4">All Terms A-Z</h2>
              <div className="space-y-6">
                {sortedLetters.map((letter) => (
                  <div key={letter} id={`letter-${letter}`}>
                    <h3 className="text-xl font-bold text-primary mb-3 sticky top-0 bg-background py-1">
                      {letter}
                    </h3>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {termsByLetter[letter].map((term) => (
                        <button
                          key={term.id}
                          className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left group"
                          onClick={() => onSelectTerm(term.id)}
                        >
                          <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0 group-hover:text-primary" />
                          <div className="min-w-0">
                            <div className="font-medium text-sm group-hover:text-primary">
                              {term.term}
                              {term.abbreviation && (
                                <span className="text-muted-foreground font-normal ml-1">
                                  ({term.abbreviation})
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {term.definition}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function DictionaryCategoryOverview({
  category,
  onSelectTerm,
  onBack,
}: {
  category: DictionaryCategory;
  onSelectTerm: (id: string) => void;
  onBack?: () => void;
}) {
  const IconComponent = categoryIcons[category.icon] || Brain;

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="p-4 border-b bg-muted/30">
        {onBack && (
          <div className="md:hidden mb-3">
            <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
              <ChevronLeft className="h-4 w-4" />
              Dictionary
            </Button>
          </div>
        )}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <IconComponent className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{category.title}</h2>
            <p className="text-sm text-muted-foreground">
              {category.terms.length} terms
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Category Description */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">About This Category</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {category.description}
            </p>
          </CardContent>
        </Card>

        {/* Terms in this category */}
        <section>
          <h3 className="text-lg font-semibold mb-4">Terms in {category.title}</h3>
          <div className="space-y-3">
            {category.terms.map((term) => (
              <Card
                key={term.id}
                className="cursor-pointer hover:bg-muted/50 hover:border-primary/50 transition-colors"
                onClick={() => onSelectTerm(term.id)}
              >
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{term.term}</CardTitle>
                      {term.abbreviation && (
                        <Badge variant="outline" className="text-xs">
                          {term.abbreviation}
                        </Badge>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <CardDescription>{term.definition}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function DictionaryTermView({
  term,
  category,
  onSelectRelatedTerm,
  onBack,
}: {
  term: DictionaryTerm;
  category?: DictionaryCategory;
  onSelectRelatedTerm?: (termName: string) => void;
  onBack: () => void;
}) {
  const CategoryIcon = category ? categoryIcons[category.icon] || Brain : Brain;

  return (
    <div className="flex-1 overflow-auto bg-background">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <div className="md:hidden mb-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        <div className="flex items-start gap-4">
          {category && (
            <div className="p-3 rounded-xl bg-primary/10 shrink-0">
              <CategoryIcon className="h-6 w-6 text-primary" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <h1 className="text-2xl font-bold">{term.term}</h1>
              {term.abbreviation && (
                <Badge variant="outline" className="text-sm">
                  {term.abbreviation}
                </Badge>
              )}
            </div>
            {category && (
              <Badge variant="secondary" className="text-xs mb-2">
                {category.title}
              </Badge>
            )}
            <p className="text-muted-foreground">{term.definition}</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Full Explanation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Deep Dive
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {term.explanation}
            </p>
          </CardContent>
        </Card>

        {/* Examples */}
        {term.examples && term.examples.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                Examples
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {term.examples.map((example, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-3 text-sm p-2 rounded-lg bg-muted/30"
                  >
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                      {idx + 1}
                    </span>
                    <span className="text-muted-foreground">{example}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Related Terms */}
        {term.relatedTerms && term.relatedTerms.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ChevronRight className="h-5 w-5 text-primary" />
                Related Terms
              </CardTitle>
              <CardDescription>
                Explore connected concepts to deepen your understanding
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {term.relatedTerms.map((related) => (
                  <Badge
                    key={related}
                    variant="secondary"
                    className={`${
                      onSelectRelatedTerm
                        ? "cursor-pointer hover:bg-primary hover:text-primary-foreground"
                        : ""
                    }`}
                    onClick={() => onSelectRelatedTerm?.(related)}
                  >
                    {related}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ============================================
// MAIN ACADEMY COMPONENT
// ============================================

export default function Academy() {
  const [location] = useLocation();
  const [, params] = useRoute("/academy/:levelId");

  // Use unified navigation framework for collapse management
  const nav = useNavigation();
  const isL2Collapsed = nav.isCollapsed(2);
  const isL3Collapsed = nav.isCollapsed(3);
  const isL4Collapsed = nav.isCollapsed(4);

  // State - app-specific selections
  const [activeSection, setActiveSection] = useState<AcademySection>("levels");

  // Track state (for Levels section) - maps to L3
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);

  // Levels state - maps to L4
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(
    params?.levelId || null
  );

  // Dictionary state - category is L3, term is L4
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);

  // Video state - category is L3, video is L4
  const [selectedVideoCategoryId, setSelectedVideoCategoryId] = useState<string | null>(null);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

  // URL sync
  useEffect(() => {
    if (location.startsWith("/academy/recruit-level-") || location.startsWith("/academy/specialist-level-") || location.startsWith("/academy/architect-level-")) {
      const levelId = location.replace("/academy/", "");
      setSelectedLevelId(levelId);
      // Auto-select the track based on level
      const track = getTrackForLevel(levelId);
      if (track) setSelectedTrackId(track.id);
      setActiveSection("levels");
      // Apply L4 collapse rules (expands L3, collapses L1+L2)
      nav.selectAtLevel(4, levelId);
    } else if (location === "/academy") {
      setSelectedLevelId(null);
    }
  }, [location, nav]);

  const selectedTrack = selectedTrackId ? getTrackById(selectedTrackId) : null;
  const selectedLevel = selectedLevelId ? getLevelById(selectedLevelId) : null;
  const selectedCategory = selectedCategoryId
    ? getCategoryById(selectedCategoryId)
    : null;
  const selectedTerm = selectedTermId ? getTermById(selectedTermId) : null;

  // Video derived state
  const selectedVideoCategory = selectedVideoCategoryId
    ? getVideoCategoryById(selectedVideoCategoryId)
    : null;
  const selectedVideo = selectedVideoId ? getVideoById(selectedVideoId) : null;

  // Find the category that contains the selected term
  const termCategory = useMemo(() => {
    if (!selectedTermId) return null;
    return dictionaryCategories.find((cat) =>
      cat.terms.some((t) => t.id === selectedTermId)
    );
  }, [selectedTermId]);

  const handleSelectTrack = (trackId: string) => {
    setSelectedTrackId(trackId);
    setSelectedLevelId(null);
    // Apply L3 selection collapse rules (expands L2, collapses L1)
    nav.selectAtLevel(3, trackId);
  };

  const handleBackToTracks = () => {
    setSelectedTrackId(null);
    setSelectedLevelId(null);
    // Go back from L3 - restores L1 and L2
    nav.goBack(3);
  };

  const handleSelectLevel = (levelId: string | null) => {
    setSelectedLevelId(levelId);
    if (levelId) {
      // Auto-select the track when selecting a level
      const track = getTrackForLevel(levelId);
      if (track && !selectedTrackId) {
        setSelectedTrackId(track.id);
      }
      // Apply L4 selection collapse rules (expands L3, collapses L1+L2)
      nav.selectAtLevel(4, levelId);
      window.history.pushState({}, "", `/${levelId}`);
    } else {
      // Going back from L4
      nav.goBack(4);
      window.history.pushState({}, "", "/");
    }
  };

  const handleSectionChange = (section: AcademySection) => {
    setActiveSection(section);
    setSelectedTrackId(null);
    setSelectedLevelId(null);
    setSelectedCategoryId(null);
    setSelectedTermId(null);
    setSelectedVideoCategoryId(null);
    setSelectedVideoId(null);
    // Reset all navigation states when switching sections
    nav.resetAll();
    window.history.pushState({}, "", "/");
  };

  // Video handlers
  const handleSelectVideoCategory = (categoryId: string) => {
    setSelectedVideoCategoryId(categoryId);
    setSelectedVideoId(null);
    nav.selectAtLevel(3, categoryId);
  };

  const handleSelectVideo = (videoId: string) => {
    setSelectedVideoId(videoId);
    // Auto-select the category if not already selected
    if (!selectedVideoCategoryId) {
      const cat = getCategoryForVideo(videoId);
      if (cat) setSelectedVideoCategoryId(cat.id);
    }
    nav.selectAtLevel(4, videoId);
  };

  const handleBackFromVideo = () => {
    setSelectedVideoId(null);
    nav.goBack(4);
  };

  const handleBackFromVideoCategory = () => {
    setSelectedVideoCategoryId(null);
    setSelectedVideoId(null);
    nav.goBack(3);
  };

  const handleSelectCategory = (categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
    setSelectedTermId(null);
    // Apply L3 selection collapse rules (expands L2, collapses L1)
    nav.selectAtLevel(3, categoryId);
  };

  const handleSelectTerm = (termId: string | null) => {
    setSelectedTermId(termId);
    // Auto-select the category if not already selected
    if (termId && !selectedCategoryId) {
      const cat = dictionaryCategories.find((c) =>
        c.terms.some((t) => t.id === termId)
      );
      if (cat) setSelectedCategoryId(cat.id);
    }
    // Apply L4 selection collapse rules (expands L3, collapses L1+L2)
    if (termId) {
      nav.selectAtLevel(4, termId);
    }
  };

  const handleSelectRelatedTerm = (termName: string) => {
    // Find term by name
    const allTerms = getAllTerms();
    const foundTerm = allTerms.find(
      (t) =>
        t.term.toLowerCase() === termName.toLowerCase() ||
        t.abbreviation?.toLowerCase() === termName.toLowerCase()
    );
    if (foundTerm) {
      handleSelectTerm(foundTerm.id);
    }
  };

  const handleBackFromTerm = () => {
    setSelectedTermId(null);
    // Go back from L4 - restores L2 and L3
    nav.goBack(4);
  };

  const handleBackFromCategory = () => {
    setSelectedCategoryId(null);
    setSelectedTermId(null);
    // Go back from L3 - restores L1 and L2
    nav.goBack(3);
  };

  // Mobile back handlers
  const handleLevelBack = () => {
    setSelectedLevelId(null);
    // Go back from L4 - restores L2 and L3
    nav.goBack(4);
    window.history.pushState({}, "", "/");
  };

  return (
    <>
      {/* L2 Navigation — Section Switcher */}
      <NavPanel
        header="Academy"
        items={l2Items}
        selectedId={activeSection}
        onSelect={(id) => handleSectionChange(id as AcademySection)}
        isCollapsed={isL2Collapsed}
        onToggleCollapse={() => nav.toggleCollapse(2)}
        expandedWidth="min-w-[10rem] max-w-[12rem]"
        collapsedWidth="min-w-12 max-w-12"
        bg="bg-muted/20"
        testId="academy-l2-nav"
      />

      {/* L3 Navigation - Tracks */}
      {activeSection === "levels" && (
        <NavPanel
          header="Tracks"
          items={trackItems}
          selectedId={selectedTrackId}
          onSelect={handleSelectTrack}
          isCollapsed={isL3Collapsed}
          onToggleCollapse={() => nav.toggleCollapse(3)}
        />
      )}

      {/* L4 Navigation - Levels within track */}
      {activeSection === "levels" && selectedTrack && (
        <NavPanel
          header="Levels"
          items={selectedTrack.levels.map((level) => ({
            id: level.id,
            label: level.rank,
            shortLabel: String(level.order),
            description: `Lvl ${level.levelRange}`,
          }))}
          selectedId={selectedLevelId}
          onSelect={handleSelectLevel}
          isCollapsed={isL4Collapsed}
          onToggleCollapse={() => nav.toggleCollapse(4)}
        />
      )}

      {/* L3 Navigation - Dictionary Categories */}
      {activeSection === "dictionary" && (
        <NavPanel
          header="Categories"
          items={dictionaryCategories.map((cat) => ({
            id: cat.id,
            label: cat.title,
            icon: categoryIcons[cat.icon] || Brain,
          }))}
          selectedId={selectedCategoryId}
          onSelect={handleSelectCategory}
          isCollapsed={isL3Collapsed}
          onToggleCollapse={() => nav.toggleCollapse(3)}
        />
      )}

      {/* L4 Navigation - Dictionary Terms */}
      {activeSection === "dictionary" && selectedCategory && (
        <NavPanel
          header="Terms"
          items={selectedCategory.terms.map((term) => ({
            id: term.id,
            label: term.abbreviation || term.term,
            shortLabel: term.abbreviation || term.term.charAt(0),
          }))}
          selectedId={selectedTermId}
          onSelect={handleSelectTerm}
          isCollapsed={isL4Collapsed}
          onToggleCollapse={() => nav.toggleCollapse(4)}
          expandedWidth="min-w-[8rem] max-w-[9rem]"
          collapsedWidth="min-w-8 max-w-8"
          bg="bg-muted/5"
        />
      )}

      {/* L3 Navigation - Video Categories */}
      {activeSection === "video" && (
        <NavPanel
          header="Categories"
          items={videoCategories.map((cat) => ({
            id: cat.id,
            label: cat.title,
            icon: videoCategoryIcons[cat.icon] || VideoIcon,
          }))}
          selectedId={selectedVideoCategoryId}
          onSelect={handleSelectVideoCategory}
          isCollapsed={isL3Collapsed}
          onToggleCollapse={() => nav.toggleCollapse(3)}
        />
      )}

      {/* L4 Navigation - Videos */}
      {activeSection === "video" && selectedVideoCategory && (
        <NavPanel
          header="Videos"
          items={selectedVideoCategory.videos.map((video, idx) => ({
            id: video.id,
            label: video.title,
            shortLabel: String(idx + 1),
          }))}
          selectedId={selectedVideoId}
          onSelect={handleSelectVideo}
          isCollapsed={isL4Collapsed}
          onToggleCollapse={() => nav.toggleCollapse(4)}
          expandedWidth="min-w-[8rem] max-w-[9rem]"
          collapsedWidth="min-w-8 max-w-8"
          bg="bg-muted/5"
        />
      )}

      {/* Main Content */}
      {activeSection === "levels" && (
        <>
          {selectedLevel ? (
            <LevelDetailPanel level={selectedLevel} onBack={handleLevelBack} />
          ) : selectedTrack ? (
            <TrackOverview
              track={selectedTrack}
              onSelectLevel={handleSelectLevel}
              onBack={handleBackToTracks}
            />
          ) : (
            <LevelsOverview onSelectTrack={handleSelectTrack} />
          )}
        </>
      )}

      {activeSection === "dictionary" && (
        <>
          {selectedTerm ? (
            <DictionaryTermView
              term={selectedTerm}
              category={termCategory || undefined}
              onSelectRelatedTerm={handleSelectRelatedTerm}
              onBack={handleBackFromTerm}
            />
          ) : selectedCategory ? (
            <DictionaryCategoryOverview
              category={selectedCategory}
              onSelectTerm={handleSelectTerm}
              onBack={handleBackFromCategory}
            />
          ) : (
            <DictionaryOverview
              onSelectCategory={handleSelectCategory}
              onSelectTerm={handleSelectTerm}
            />
          )}
        </>
      )}

      {activeSection === "video" && (
        <>
          {selectedVideo ? (
            <VideoExperienceRenderer block={{
              id: selectedVideo.id,
              type: "video-experience",
              embedId: selectedVideo.youtubeId,
              title: selectedVideo.title,
              description: selectedVideo.description,
              creator: selectedVideo.creator,
              tags: selectedVideo.tags,
              youtubeUrl: selectedVideo.youtubeUrl,
            }} />
          ) : selectedVideoCategory ? (
            <VideoCategoryOverview
              category={selectedVideoCategory}
              onSelectVideo={handleSelectVideo}
              onBack={handleBackFromVideoCategory}
            />
          ) : (
            <VideoOverview onSelectCategory={handleSelectVideoCategory} />
          )}
        </>
      )}
    </>
  );
}

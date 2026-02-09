import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Target,
  Zap,
  ChevronLeft,
  BookOpen,
  CheckCircle2,
  Layers,
  GraduationCap,
  Rocket,
  TrendingUp,
  ChevronRight,
  ChevronUp,
  Sparkles,
  Lightbulb,
  Hammer,
  HelpCircle,
  Gamepad2,
  Trophy,
  ListChecks,
  Play,
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
import { useNavigation } from "@/contexts/navigation-context";
import { PromptPlayground } from "@/components/prompt-playground";
import { NavPanel, type NavPanelItem } from "@/components/nav";

// ── NavPanel item data ──────────────────────────────────

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

// ── Presentation components ─────────────────────────────

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
  const totalLevels = academyTracks.reduce((sum, track) => sum + track.levels.length, 0);
  const totalQuests = academyTracks.reduce(
    (sum, track) => sum + track.levels.reduce((s, l) => s + l.quests.length, 0),
    0
  );

  const journeyIcons = { seedling: Rocket, zap: Zap, sparkles: Sparkles };
  const trackColors = {
    beginner: { border: "border-emerald-500/30", bg: "bg-emerald-500/5", text: "text-emerald-500", hover: "hover:border-emerald-500/50" },
    intermediate: { border: "border-blue-500/30", bg: "bg-blue-500/5", text: "text-blue-500", hover: "hover:border-blue-500/50" },
    advanced: { border: "border-purple-500/30", bg: "bg-purple-500/5", text: "text-purple-500", hover: "hover:border-purple-500/50" },
  };

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="p-6 border-b bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <div className="flex items-start gap-4 mb-4">
          <div className="p-3 rounded-xl bg-primary/10">
            <Target className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-1">AI School</h1>
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
                        <Badge variant="outline" className={`${colors.text} border-current mb-2`}>
                          {track.difficulty}
                        </Badge>
                        <CardTitle className="text-xl">{track.name}</CardTitle>
                        <CardDescription className="text-base mt-1">{track.tagline}</CardDescription>
                      </div>
                      <ChevronRight className={`h-6 w-6 ${colors.text}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">{track.description}</p>
                    <div className="grid gap-3 md:grid-cols-3">
                      {track.journey.map((phase) => {
                        const PhaseIcon = journeyIcons[phase.icon];
                        return (
                          <div key={phase.id} className="p-3 rounded-lg bg-background/50 border">
                            <div className="flex items-center gap-2 mb-1">
                              <PhaseIcon className={`h-4 w-4 ${colors.text}`} />
                              <span className="text-sm font-medium">{phase.name}</span>
                              <span className="text-xs text-muted-foreground">({phase.levelRange})</span>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">{phase.description}</p>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex gap-4 mt-4 pt-4 border-t">
                      <div className="text-sm">
                        <span className={`font-bold ${colors.text}`}>{track.levels.length}</span>{" "}
                        <span className="text-muted-foreground">levels</span>
                      </div>
                      <div className="text-sm">
                        <span className={`font-bold ${colors.text}`}>
                          {track.levels.reduce((sum, l) => sum + l.quests.length, 0)}
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
  const journeyIcons = { seedling: Rocket, zap: Zap, sparkles: Sparkles };
  const colors = {
    beginner: { text: "text-emerald-500", border: "border-emerald-500/30", bg: "bg-emerald-500/5" },
    intermediate: { text: "text-blue-500", border: "border-blue-500/30", bg: "bg-blue-500/5" },
    advanced: { text: "text-purple-500", border: "border-purple-500/30", bg: "bg-purple-500/5" },
  }[track.difficulty];

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className={`p-6 border-b ${colors.bg}`}>
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 mb-4">
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
        <p className="mt-4 text-sm text-muted-foreground max-w-2xl">{track.description}</p>
      </div>

      <div className="p-6 space-y-8">
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
                    <p className="text-xs text-muted-foreground">{phase.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

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
                    <TableHead className="w-[80px] text-center">Quests</TableHead>
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
                        <Badge variant="outline" className="text-xs">{level.levelRange}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{level.rank}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm">{level.coreSkill}</div>
                          <div className="text-xs text-muted-foreground">{level.skillSummary}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="text-xs">{level.quests.length}</Badge>
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
  const [selectedSubTopicId, setSelectedSubTopicId] = useState<string | null>(null);
  const [expandedQuestId, setExpandedQuestId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedSubTopicId(null);
    setExpandedQuestId(null);
  }, [level.id]);

  const toggleQuestExpand = (questId: string) => {
    setExpandedQuestId(expandedQuestId === questId ? null : questId);
  };

  const selectedSubTopic = level.subTopics?.find((st) => st.id === selectedSubTopicId);

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
          <Badge variant="outline" className="text-xs">Level {level.levelRange}</Badge>
          <h2 className="text-lg font-semibold">{level.rank}</h2>
        </div>
        <p className="text-sm text-muted-foreground italic mb-3">{level.coreSkill}</p>
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
                    <p key={idx} className="text-sm text-muted-foreground leading-relaxed mb-3 last:mb-0">
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
                        <p className="text-xs text-muted-foreground line-clamp-2">{st.description}</p>
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
                  <Badge variant="outline" className="ml-auto">{level.quests.length} total</Badge>
                </div>
                <CardDescription>Complete these challenges to level up</CardDescription>
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
                              <p className="text-sm text-muted-foreground">{quest.description}</p>
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
                                <Button variant="outline" size="sm" className="mt-3" onClick={() => toggleQuestExpand(quest.id)}>
                                  {isExpanded ? (
                                    <><ChevronUp className="h-4 w-4 mr-1" />Hide Playground</>
                                  ) : (
                                    <><Play className="h-4 w-4 mr-1" />Try it Now</>
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

// ── Section component: self-contained state + nav + content ──

export function LevelsSection() {
  const [location] = useLocation();
  const nav = useNavigation();
  const isL3Collapsed = nav.isCollapsed(3);
  const isL4Collapsed = nav.isCollapsed(4);

  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);

  // URL sync
  useEffect(() => {
    if (
      location.startsWith("/academy/recruit-level-") ||
      location.startsWith("/academy/specialist-level-") ||
      location.startsWith("/academy/architect-level-")
    ) {
      const levelId = location.replace("/academy/", "");
      setSelectedLevelId(levelId);
      const track = getTrackForLevel(levelId);
      if (track) setSelectedTrackId(track.id);
      nav.selectAtLevel(4, levelId);
    } else if (location === "/academy") {
      setSelectedLevelId(null);
    }
  }, [location, nav]);

  const selectedTrack = selectedTrackId ? getTrackById(selectedTrackId) : null;
  const selectedLevel = selectedLevelId ? getLevelById(selectedLevelId) : null;

  const handleSelectTrack = (trackId: string) => {
    setSelectedTrackId(trackId);
    setSelectedLevelId(null);
    nav.selectAtLevel(3, trackId);
  };

  const handleBackToTracks = () => {
    setSelectedTrackId(null);
    setSelectedLevelId(null);
    nav.goBack(3);
  };

  const handleSelectLevel = (levelId: string | null) => {
    setSelectedLevelId(levelId);
    if (levelId) {
      const track = getTrackForLevel(levelId);
      if (track && !selectedTrackId) setSelectedTrackId(track.id);
      nav.selectAtLevel(4, levelId);
      window.history.pushState({}, "", `/academy/${levelId}`);
    } else {
      nav.goBack(4);
      window.history.pushState({}, "", "/academy");
    }
  };

  const handleLevelBack = () => {
    setSelectedLevelId(null);
    nav.goBack(4);
    window.history.pushState({}, "", "/academy");
  };

  return (
    <>
      <NavPanel
        header="Tracks"
        items={trackItems}
        selectedId={selectedTrackId}
        onSelect={handleSelectTrack}
        isCollapsed={isL3Collapsed}
        onToggleCollapse={() => nav.toggleCollapse(3)}
      />

      {selectedTrack && (
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

      {selectedLevel ? (
        <LevelDetailPanel level={selectedLevel} onBack={handleLevelBack} />
      ) : selectedTrack ? (
        <TrackOverview track={selectedTrack} onSelectLevel={handleSelectLevel} onBack={handleBackToTracks} />
      ) : (
        <LevelsOverview onSelectTrack={handleSelectTrack} />
      )}
    </>
  );
}

import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import {
  Target,
  Zap,
  PanelLeft,
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
  Sparkles,
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  academyLevels,
  getLevelById,
  type AcademyLevel,
  type SubTopic,
} from "@/data/academy-levels";

function LevelNavItem({
  level,
  isSelected,
  onSelect,
  isCollapsed = false,
}: {
  level: AcademyLevel;
  isSelected: boolean;
  onSelect: () => void;
  isCollapsed?: boolean;
}) {
  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            className={`w-full justify-center h-8 ${
              isSelected ? "bg-accent text-accent-foreground" : ""
            }`}
            onClick={onSelect}
            data-testid={`nav-level-${level.id}`}
          >
            <span className="text-sm font-medium">{level.order}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          {level.levelRange}: {level.rank}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Button
      variant="ghost"
      className={`w-full justify-start h-auto py-1.5 px-2 ${
        isSelected ? "bg-accent text-accent-foreground" : ""
      }`}
      onClick={onSelect}
      data-testid={`nav-level-${level.id}`}
    >
      <div className="flex flex-col items-start gap-0.5 w-full">
        <span className="text-xs text-muted-foreground">
          Lvl {level.levelRange}
        </span>
        <span className="text-sm truncate w-full text-left">{level.rank}</span>
      </div>
    </Button>
  );
}

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

function AcademyOverview({
  onSelectLevel,
}: {
  onSelectLevel: (levelId: string) => void;
}) {
  const totalQuests = academyLevels.reduce(
    (sum, level) => sum + level.quests.length,
    0
  );
  const totalSubTopics = academyLevels.reduce(
    (sum, level) => sum + (level.subTopics?.length || 0),
    0
  );

  return (
    <div className="flex-1 overflow-auto bg-background">
      {/* Hero Header */}
      <div className="p-6 border-b bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <div className="flex items-start gap-4 mb-4">
          <div className="p-3 rounded-xl bg-primary/10">
            <GraduationCap className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-1">AI Academy</h1>
            <p className="text-muted-foreground">
              A structured curriculum to transform you from AI-curious to
              AI-autonomous
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center p-3 rounded-lg bg-background/50 border">
            <div className="text-2xl font-bold text-primary">10</div>
            <div className="text-xs text-muted-foreground">Levels</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-background/50 border">
            <div className="text-2xl font-bold text-primary">{totalQuests}</div>
            <div className="text-xs text-muted-foreground">Quests</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-background/50 border">
            <div className="text-2xl font-bold text-primary">
              {totalSubTopics}
            </div>
            <div className="text-xs text-muted-foreground">Deep Dives</div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Philosophy Section */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            The Philosophy
          </h2>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The AI Academy is built on a simple premise:{" "}
                <strong className="text-foreground">
                  AI literacy is the new literacy
                </strong>
                . Just as reading and writing transformed human capability, the
                ability to direct AI systems will define the next generation of
                builders, creators, and entrepreneurs.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                This curriculum is{" "}
                <strong className="text-foreground">progressive</strong>—each
                level builds on the last. You cannot orchestrate multi-agent
                systems (Level 7) without first understanding function calling
                (Level 6). You cannot build autonomous businesses (Level 9)
                without mastering all the layers beneath.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Most importantly, this curriculum is{" "}
                <strong className="text-foreground">practical</strong>. Every
                level has quests—real projects you must ship to prove mastery.
                Theory without execution is entertainment. We're here to build.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Journey Overview */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            The Journey
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-green-500/30 bg-green-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Rocket className="h-4 w-4 text-green-500" />
                  Foundation (0-30)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Learn to speak AI's language. Generate interfaces, automate
                  workflows, and master prompting across text, image, video, and
                  audio. These are your building blocks.
                </p>
              </CardContent>
            </Card>

            <Card className="border-blue-500/30 bg-blue-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-500" />
                  Integration (31-60)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Connect AI to the real world. Extract data from anywhere, give
                  AI long-term memory with RAG, and build intelligent routing
                  systems that direct traffic to specialists.
                </p>
              </CardContent>
            </Card>

            <Card className="border-purple-500/30 bg-purple-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  Mastery (61-100)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Build autonomous systems. Give AI hands with function calling,
                  orchestrate agent teams, develop full applications, and
                  ultimately create self-sustaining business systems.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Full Curriculum Table */}
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
                    <TableHead className="w-[100px] text-center">
                      Deep Dives
                    </TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {academyLevels.map((level) => (
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
                      <TableCell className="font-medium">
                        {level.rank}
                      </TableCell>
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
                      <TableCell className="text-center">
                        {level.subTopics && level.subTopics.length > 0 ? (
                          <Badge variant="secondary" className="text-xs">
                            {level.subTopics.length}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
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

        {/* Detailed Level Descriptions */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Level Breakdown
          </h2>
          <div className="space-y-4">
            {academyLevels.map((level) => (
              <Card
                key={level.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => onSelectLevel(level.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{level.levelRange}</Badge>
                      <CardTitle className="text-base">{level.rank}</CardTitle>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <CardDescription className="font-medium">
                    {level.coreSkill}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {level.skillSummary}
                  </p>

                  {/* Key Principles Preview */}
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">
                      KEY PRINCIPLES
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {level.keyPrinciples.slice(0, 3).map((principle, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="text-xs font-normal"
                        >
                          {principle.length > 40
                            ? principle.substring(0, 40) + "..."
                            : principle}
                        </Badge>
                      ))}
                      {level.keyPrinciples.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{level.keyPrinciples.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Sub-topics if any */}
                  {level.subTopics && level.subTopics.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">
                        DEEP DIVES
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {level.subTopics.map((st) => (
                          <Badge
                            key={st.id}
                            variant="outline"
                            className="text-xs"
                          >
                            {st.title}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quest preview */}
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">
                      SAMPLE QUESTS
                    </h4>
                    <div className="space-y-1">
                      {level.quests.slice(0, 2).map((quest) => (
                        <div
                          key={quest.id}
                          className="flex items-center gap-2 text-xs"
                        >
                          <Target className="h-3 w-3 text-primary" />
                          <span>{quest.title}</span>
                          <Badge variant="secondary" className="text-xs ml-auto">
                            {quest.platform}
                          </Badge>
                        </div>
                      ))}
                      {level.quests.length > 2 && (
                        <div className="text-xs text-muted-foreground pl-5">
                          +{level.quests.length - 2} more quests
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Call to Action */}
        <section className="text-center py-6">
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-6">
              <GraduationCap className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Ready to Begin?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Select Level 0-10 from the sidebar to start your journey as The
                Drifter.
              </p>
              <Button onClick={() => onSelectLevel("level-0")}>
                Start with The Drifter
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
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

  // Reset sub-topic when level changes
  useEffect(() => {
    setSelectedSubTopicId(null);
  }, [level.id]);

  const selectedSubTopic = level.subTopics?.find(
    (st) => st.id === selectedSubTopicId
  );

  return (
    <div
      className="flex-1 overflow-auto bg-background"
      data-testid={`detail-level-${level.id}`}
    >
      {/* Header */}
      <div className="p-4 border-b bg-muted/30">
        {/* Mobile back button */}
        {onBack && (
          <div className="md:hidden mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              data-testid="button-back-to-academy"
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Academy
            </Button>
          </div>
        )}
        <div className="flex items-center gap-3 flex-wrap mb-2">
          <Badge variant="outline" className="text-xs">
            Level {level.levelRange}
          </Badge>
          <h2 className="text-lg font-semibold" data-testid="text-level-rank">
            {level.rank}
          </h2>
        </div>
        <p
          className="text-sm text-muted-foreground italic mb-3"
          data-testid="text-level-skill"
        >
          {level.coreSkill}
        </p>

        {/* L3 Sub-topic navigation */}
        {level.subTopics && level.subTopics.length > 0 && (
          <SubTopicNav
            subTopics={level.subTopics}
            selectedSubTopicId={selectedSubTopicId}
            onSelectSubTopic={setSelectedSubTopicId}
          />
        )}
      </div>

      <div className="p-4 space-y-6">
        {/* Show sub-topic detail if selected */}
        {selectedSubTopic ? (
          <SubTopicDetail subTopic={selectedSubTopic} />
        ) : (
          <>
            {/* Core Skill & Lesson */}
            <Card data-testid="card-level-lesson">
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

            {/* Key Principles */}
            <Card data-testid="card-level-principles">
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

            {/* Sub-topics preview (if any) */}
            {level.subTopics && level.subTopics.length > 0 && (
              <Card data-testid="card-level-subtopics">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">Deep Dives</CardTitle>
                  </div>
                  <CardDescription>
                    Explore specialized techniques within this skill
                  </CardDescription>
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
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {st.platforms.slice(0, 3).map((p) => (
                            <Badge
                              key={p}
                              variant="outline"
                              className="text-xs"
                            >
                              {p}
                            </Badge>
                          ))}
                          {st.platforms.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{st.platforms.length - 3}
                            </Badge>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quests */}
            <Card data-testid="card-level-quests">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Quests</CardTitle>
                </div>
                <CardDescription>
                  Complete these challenges to level up
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {level.quests.map((quest, idx) => (
                    <div
                      key={quest.id}
                      className="p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className="font-medium text-sm">
                              {quest.title}
                            </h4>
                            <Badge variant="secondary" className="text-xs">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              {quest.platform}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {quest.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

export default function Academy() {
  const [location] = useLocation();
  const [, params] = useRoute("/academy/:levelId");
  const urlLevelId = params?.levelId;

  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(
    urlLevelId || null
  );
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);

  // Sync state with URL on browser back/forward navigation
  useEffect(() => {
    const levelIdFromUrl = location.startsWith("/academy/")
      ? location.replace("/academy/", "")
      : null;
    setSelectedLevelId(levelIdFromUrl);
  }, [location]);

  const selectedLevel = selectedLevelId ? getLevelById(selectedLevelId) : null;

  const handleSelectLevel = (levelId: string) => {
    setSelectedLevelId(levelId);
    window.history.pushState({}, "", `/academy/${levelId}`);
  };

  const handleBack = () => {
    setSelectedLevelId(null);
    window.history.pushState({}, "", "/academy");
  };

  return (
    <>
      {/* Desktop: Secondary nav panel */}
      <div
        className={`hidden md:flex shrink-0 border-r bg-muted/20 flex-col transition-all duration-200 ${
          isNavCollapsed
            ? "min-w-12 max-w-12"
            : "min-w-[10rem] max-w-[12rem] flex-1"
        }`}
        data-testid="academy-nav"
      >
        <div className="border-b px-2 h-8 flex items-center shrink-0">
          {isNavCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs font-medium text-muted-foreground block w-full text-center cursor-default">
                  A
                </span>
              </TooltipTrigger>
              <TooltipContent side="right">AI Academy</TooltipContent>
            </Tooltip>
          ) : (
            <span className="text-xs font-medium text-muted-foreground">
              Levels
            </span>
          )}
        </div>
        <div className="flex-1 overflow-auto p-1 space-y-0.5">
          {academyLevels.map((level) => (
            <LevelNavItem
              key={level.id}
              level={level}
              isSelected={selectedLevelId === level.id}
              onSelect={() => handleSelectLevel(level.id)}
              isCollapsed={isNavCollapsed}
            />
          ))}
        </div>
        <div className="border-t h-11 flex items-center justify-center shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsNavCollapsed(!isNavCollapsed)}
                data-testid="button-toggle-nav"
              >
                <PanelLeft
                  className={`h-4 w-4 transition-transform ${
                    isNavCollapsed ? "rotate-180" : ""
                  }`}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {isNavCollapsed ? "Expand" : "Collapse"} nav
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Main Content */}
      {selectedLevel ? (
        <LevelDetailPanel level={selectedLevel} onBack={handleBack} />
      ) : (
        <AcademyOverview onSelectLevel={handleSelectLevel} />
      )}
    </>
  );
}

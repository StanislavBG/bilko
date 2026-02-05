import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import {
  Target,
  Award,
  Zap,
  PanelLeft,
  ChevronLeft,
  BookOpen,
  CheckCircle2,
  Layers,
  ExternalLink,
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
        <div className="flex-1 overflow-auto bg-background">
          <div className="p-4 border-b bg-muted/30">
            <h2
              className="text-lg font-semibold"
              data-testid="text-academy-title"
            >
              AI Academy
            </h2>
            <p className="text-sm text-muted-foreground">
              Master the art of AI automation in 10 progressive levels
            </p>
          </div>

          <div className="p-4">
            {/* Mobile: Show level list as cards */}
            <div className="md:hidden space-y-3">
              {academyLevels.map((level) => (
                <Card
                  key={level.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSelectLevel(level.id)}
                  data-testid={`card-level-${level.id}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="text-xs">
                        Lvl {level.levelRange}
                      </Badge>
                      <CardTitle className="text-base flex-1">
                        {level.rank}
                      </CardTitle>
                    </div>
                    <CardDescription className="text-sm">
                      {level.coreSkill}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {level.skillSummary}
                    </p>
                    <div className="flex gap-1 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {level.quests.length} quests
                      </Badge>
                      {level.subTopics && level.subTopics.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {level.subTopics.length} deep dives
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Desktop: Prompt to select */}
            <div className="hidden md:flex items-center justify-center h-[50vh] text-muted-foreground">
              <div className="text-center">
                <Target className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Select a level to view details</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

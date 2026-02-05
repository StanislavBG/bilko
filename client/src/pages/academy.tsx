import { useState, useEffect, useMemo } from "react";
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
  Book,
  Search,
  MessageSquare,
  Pencil,
  Database,
  Wrench,
  Building,
  Shield,
  Workflow,
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
import {
  dictionaryCategories,
  searchTerms,
  getCategoryById,
  getTermById,
  type DictionaryCategory,
  type DictionaryTerm,
} from "@/data/academy-dictionary";

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

type AcademySection = "levels" | "dictionary";

// ============================================
// L2 NAVIGATION COMPONENT
// ============================================

function L2Navigation({
  activeSection,
  onSectionChange,
  isCollapsed,
  onToggleCollapse,
}: {
  activeSection: AcademySection;
  onSectionChange: (section: AcademySection) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}) {
  return (
    <div
      className={`hidden md:flex shrink-0 border-r bg-muted/20 flex-col transition-all duration-200 ${
        isCollapsed ? "min-w-12 max-w-12" : "min-w-[10rem] max-w-[12rem] flex-1"
      }`}
      data-testid="academy-l2-nav"
    >
      <div className="border-b px-2 h-8 flex items-center shrink-0">
        {isCollapsed ? (
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
            Academy
          </span>
        )}
      </div>
      <div className="flex-1 overflow-auto p-1 space-y-0.5">
        {/* Levels Section */}
        {isCollapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className={`w-full justify-center h-8 ${
                  activeSection === "levels"
                    ? "bg-accent text-accent-foreground"
                    : ""
                }`}
                onClick={() => onSectionChange("levels")}
              >
                <Target className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Levels</TooltipContent>
          </Tooltip>
        ) : (
          <Button
            variant="ghost"
            className={`w-full justify-start h-auto py-2 px-2 ${
              activeSection === "levels"
                ? "bg-accent text-accent-foreground"
                : ""
            }`}
            onClick={() => onSectionChange("levels")}
          >
            <Target className="h-4 w-4 mr-2" />
            <div className="flex flex-col items-start gap-0.5">
              <span className="text-sm">Levels</span>
              <span className="text-xs text-muted-foreground">
                Progression & Quests
              </span>
            </div>
          </Button>
        )}

        {/* Dictionary Section */}
        {isCollapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className={`w-full justify-center h-8 ${
                  activeSection === "dictionary"
                    ? "bg-accent text-accent-foreground"
                    : ""
                }`}
                onClick={() => onSectionChange("dictionary")}
              >
                <Book className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Dictionary</TooltipContent>
          </Tooltip>
        ) : (
          <Button
            variant="ghost"
            className={`w-full justify-start h-auto py-2 px-2 ${
              activeSection === "dictionary"
                ? "bg-accent text-accent-foreground"
                : ""
            }`}
            onClick={() => onSectionChange("dictionary")}
          >
            <Book className="h-4 w-4 mr-2" />
            <div className="flex flex-col items-start gap-0.5">
              <span className="text-sm">Dictionary</span>
              <span className="text-xs text-muted-foreground">
                AI Terminology
              </span>
            </div>
          </Button>
        )}
      </div>
      <div className="border-t h-11 flex items-center justify-center shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onToggleCollapse}
            >
              <PanelLeft
                className={`h-4 w-4 transition-transform ${
                  isCollapsed ? "rotate-180" : ""
                }`}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {isCollapsed ? "Expand" : "Collapse"} nav
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

// ============================================
// LEVELS SECTION COMPONENTS
// ============================================

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

function LevelsL3Nav({
  selectedLevelId,
  onSelectLevel,
  isCollapsed,
  onToggleCollapse,
}: {
  selectedLevelId: string | null;
  onSelectLevel: (id: string | null) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}) {
  return (
    <div
      className={`hidden md:flex shrink-0 border-r bg-muted/10 flex-col transition-all duration-200 ${
        isCollapsed ? "min-w-10 max-w-10" : "min-w-[9rem] max-w-[10rem]"
      }`}
    >
      <div className="border-b px-2 h-8 flex items-center shrink-0">
        {isCollapsed ? (
          <span className="text-xs font-medium text-muted-foreground block w-full text-center">
            L
          </span>
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
            onSelect={() => onSelectLevel(level.id)}
            isCollapsed={isCollapsed}
          />
        ))}
      </div>
      <div className="border-t h-9 flex items-center justify-center shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onToggleCollapse}
            >
              <PanelLeft
                className={`h-3 w-3 transition-transform ${
                  isCollapsed ? "rotate-180" : ""
                }`}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {isCollapsed ? "Expand" : "Collapse"}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
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

function LevelsOverview({
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
            <Target className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-1">Progression Levels</h1>
            <p className="text-muted-foreground">
              Structured guidance with practical quests to prove mastery
            </p>
          </div>
        </div>

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
        {/* Journey Phases */}
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
                  Learn AI's language. Generate interfaces, automate workflows,
                  and master prompting across text, image, video, and audio.
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
                  Connect AI to the real world. Extract data, give AI long-term
                  memory with RAG, and build intelligent routing systems.
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
                  orchestrate agent teams, and create self-sustaining systems.
                </p>
              </CardContent>
            </Card>
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
          <Button onClick={() => onSelectLevel("level-0")}>
            Start with The Drifter
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

  useEffect(() => {
    setSelectedSubTopicId(null);
  }, [level.id]);

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
                </div>
                <CardDescription>
                  Complete these challenges to level up
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {level.quests.map((quest, idx) => (
                    <div key={quest.id} className="p-3 rounded-lg border bg-card">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className="font-medium text-sm">{quest.title}</h4>
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

// ============================================
// DICTIONARY SECTION COMPONENTS
// ============================================

import { getAllTerms } from "@/data/academy-dictionary";

function DictionaryL3Nav({
  selectedCategoryId,
  onSelectCategory,
  isCollapsed,
  onToggleCollapse,
}: {
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}) {
  return (
    <div
      className={`hidden md:flex shrink-0 border-r bg-muted/10 flex-col transition-all duration-200 ${
        isCollapsed ? "min-w-10 max-w-10" : "min-w-[9rem] max-w-[10rem]"
      }`}
    >
      <div className="border-b px-2 h-8 flex items-center shrink-0">
        {isCollapsed ? (
          <span className="text-xs font-medium text-muted-foreground block w-full text-center">
            C
          </span>
        ) : (
          <span className="text-xs font-medium text-muted-foreground">
            Categories
          </span>
        )}
      </div>
      <div className="flex-1 overflow-auto p-1 space-y-0.5">
        {dictionaryCategories.map((cat) => {
          const IconComponent = categoryIcons[cat.icon] || Brain;
          return isCollapsed ? (
            <Tooltip key={cat.id}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className={`w-full justify-center h-8 ${
                    selectedCategoryId === cat.id
                      ? "bg-accent text-accent-foreground"
                      : ""
                  }`}
                  onClick={() => onSelectCategory(cat.id)}
                >
                  <IconComponent className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{cat.title}</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              key={cat.id}
              variant="ghost"
              className={`w-full justify-start h-auto py-1.5 px-2 ${
                selectedCategoryId === cat.id
                  ? "bg-accent text-accent-foreground"
                  : ""
              }`}
              onClick={() => onSelectCategory(cat.id)}
            >
              <IconComponent className="h-4 w-4 mr-2 shrink-0" />
              <span className="text-sm truncate">{cat.title}</span>
            </Button>
          );
        })}
      </div>
      <div className="border-t h-9 flex items-center justify-center shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onToggleCollapse}
            >
              <PanelLeft
                className={`h-3 w-3 transition-transform ${
                  isCollapsed ? "rotate-180" : ""
                }`}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {isCollapsed ? "Expand" : "Collapse"}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

// L4 Navigation - Terms within a category
function DictionaryL4Nav({
  category,
  selectedTermId,
  onSelectTerm,
  isCollapsed,
  onToggleCollapse,
}: {
  category: DictionaryCategory;
  selectedTermId: string | null;
  onSelectTerm: (id: string | null) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}) {
  return (
    <div
      className={`hidden md:flex shrink-0 border-r bg-muted/5 flex-col transition-all duration-200 ${
        isCollapsed ? "min-w-8 max-w-8" : "min-w-[8rem] max-w-[9rem]"
      }`}
    >
      <div className="border-b px-2 h-8 flex items-center shrink-0">
        {isCollapsed ? (
          <span className="text-xs font-medium text-muted-foreground block w-full text-center">
            T
          </span>
        ) : (
          <span className="text-xs font-medium text-muted-foreground truncate">
            Terms
          </span>
        )}
      </div>
      <div className="flex-1 overflow-auto p-1 space-y-0.5">
        {category.terms.map((term) =>
          isCollapsed ? (
            <Tooltip key={term.id}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className={`w-full justify-center h-6 text-xs ${
                    selectedTermId === term.id
                      ? "bg-accent text-accent-foreground"
                      : ""
                  }`}
                  onClick={() => onSelectTerm(term.id)}
                >
                  {term.abbreviation || term.term.charAt(0)}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{term.term}</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              key={term.id}
              variant="ghost"
              className={`w-full justify-start h-auto py-1 px-2 ${
                selectedTermId === term.id
                  ? "bg-accent text-accent-foreground"
                  : ""
              }`}
              onClick={() => onSelectTerm(term.id)}
            >
              <span className="text-xs truncate">
                {term.abbreviation ? `${term.abbreviation}` : term.term}
              </span>
            </Button>
          )
        )}
      </div>
      <div className="border-t h-8 flex items-center justify-center shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onToggleCollapse}
            >
              <PanelLeft
                className={`h-3 w-3 transition-transform ${
                  isCollapsed ? "rotate-180" : ""
                }`}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {isCollapsed ? "Expand" : "Collapse"}
          </TooltipContent>
        </Tooltip>
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
  const [, params] = useRoute("/:levelId");

  // State
  const [activeSection, setActiveSection] = useState<AcademySection>("levels");
  const [isL2Collapsed, setIsL2Collapsed] = useState(false);
  const [isL3Collapsed, setIsL3Collapsed] = useState(false);
  const [isL4Collapsed, setIsL4Collapsed] = useState(false);

  // Levels state
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(
    params?.levelId || null
  );

  // Dictionary state
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);

  // URL sync
  useEffect(() => {
    if (location.startsWith("/level-")) {
      const levelId = location.replace("/", "");
      setSelectedLevelId(levelId);
      setActiveSection("levels");
    } else if (location === "/") {
      setSelectedLevelId(null);
    }
  }, [location]);

  // Auto-collapse L2 when L3 has a selection (level or category selected)
  useEffect(() => {
    const hasL3Selection = selectedLevelId || selectedCategoryId;
    if (hasL3Selection) {
      setIsL2Collapsed(true);
    }
  }, [selectedLevelId, selectedCategoryId]);

  // Auto-collapse L2 and L3 when L4 has a selection (term selected)
  useEffect(() => {
    if (selectedTermId) {
      setIsL2Collapsed(true);
      setIsL3Collapsed(true);
    }
  }, [selectedTermId]);

  const selectedLevel = selectedLevelId ? getLevelById(selectedLevelId) : null;
  const selectedCategory = selectedCategoryId
    ? getCategoryById(selectedCategoryId)
    : null;
  const selectedTerm = selectedTermId ? getTermById(selectedTermId) : null;

  // Find the category that contains the selected term
  const termCategory = useMemo(() => {
    if (!selectedTermId) return null;
    return dictionaryCategories.find((cat) =>
      cat.terms.some((t) => t.id === selectedTermId)
    );
  }, [selectedTermId]);

  const handleSelectLevel = (levelId: string | null) => {
    setSelectedLevelId(levelId);
    if (levelId) {
      window.history.pushState({}, "", `/${levelId}`);
    } else {
      window.history.pushState({}, "", "/");
    }
  };

  const handleSectionChange = (section: AcademySection) => {
    setActiveSection(section);
    setSelectedLevelId(null);
    setSelectedCategoryId(null);
    setSelectedTermId(null);
    // Reset collapsed states when switching sections
    setIsL2Collapsed(false);
    setIsL3Collapsed(false);
    setIsL4Collapsed(false);
    window.history.pushState({}, "", "/");
  };

  const handleSelectCategory = (categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
    setSelectedTermId(null);
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
    // Restore L3 when going back from term view
    setIsL3Collapsed(false);
  };

  const handleBackFromCategory = () => {
    setSelectedCategoryId(null);
    setSelectedTermId(null);
    // Restore L2 when going back to dictionary root
    setIsL2Collapsed(false);
  };

  // Mobile back handlers
  const handleLevelBack = () => {
    setSelectedLevelId(null);
    // Restore L2 when going back to levels root
    setIsL2Collapsed(false);
    window.history.pushState({}, "", "/");
  };

  return (
    <>
      {/* L2 Navigation */}
      <L2Navigation
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        isCollapsed={isL2Collapsed}
        onToggleCollapse={() => setIsL2Collapsed(!isL2Collapsed)}
      />

      {/* L3 Navigation - Levels */}
      {activeSection === "levels" && (
        <LevelsL3Nav
          selectedLevelId={selectedLevelId}
          onSelectLevel={handleSelectLevel}
          isCollapsed={isL3Collapsed}
          onToggleCollapse={() => setIsL3Collapsed(!isL3Collapsed)}
        />
      )}

      {/* L3 Navigation - Dictionary Categories */}
      {activeSection === "dictionary" && (
        <DictionaryL3Nav
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={handleSelectCategory}
          isCollapsed={isL3Collapsed}
          onToggleCollapse={() => setIsL3Collapsed(!isL3Collapsed)}
        />
      )}

      {/* L4 Navigation - Dictionary Terms (when category selected) */}
      {activeSection === "dictionary" && selectedCategory && (
        <DictionaryL4Nav
          category={selectedCategory}
          selectedTermId={selectedTermId}
          onSelectTerm={handleSelectTerm}
          isCollapsed={isL4Collapsed}
          onToggleCollapse={() => setIsL4Collapsed(!isL4Collapsed)}
        />
      )}

      {/* Main Content */}
      {activeSection === "levels" && (
        <>
          {selectedLevel ? (
            <LevelDetailPanel level={selectedLevel} onBack={handleLevelBack} />
          ) : (
            <LevelsOverview onSelectLevel={handleSelectLevel} />
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
    </>
  );
}

import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { Target, Award, Zap, PanelLeft, ChevronLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { academyLevels, getLevelById, type AcademyLevel } from "@/data/academy-levels";

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
        <span className="text-xs text-muted-foreground">Lvl {level.levelRange}</span>
        <span className="text-sm truncate w-full text-left">{level.rank}</span>
      </div>
    </Button>
  );
}

function LevelDetailPanel({
  level,
  onBack,
}: {
  level: AcademyLevel;
  onBack?: () => void;
}) {
  return (
    <div
      className="flex-1 overflow-auto bg-background"
      data-testid={`detail-level-${level.id}`}
    >
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
          <h2
            className="text-lg font-semibold"
            data-testid="text-level-rank"
          >
            {level.rank}
          </h2>
        </div>
        <p
          className="text-sm text-muted-foreground italic"
          data-testid="text-level-skill"
        >
          {level.coreSkill}
        </p>
      </div>

      <div className="p-4 space-y-6">
        <Card data-testid="card-level-skill">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Core Skill</CardTitle>
            </div>
            <CardDescription>{level.coreSkill}</CardDescription>
          </CardHeader>
          <CardContent>
            <p
              className="text-sm text-muted-foreground leading-relaxed"
              data-testid="text-skill-description"
            >
              {level.skillDescription}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-level-quest">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">The Quest</CardTitle>
            </div>
            <CardDescription>Ship to Level Up</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm" data-testid="text-quest-title">
                {level.quest}
              </span>
            </div>
            <p
              className="text-sm text-muted-foreground leading-relaxed"
              data-testid="text-quest-description"
            >
              {level.questDescription}
            </p>
          </CardContent>
        </Card>

        <Card className="border-dashed" data-testid="card-level-content-placeholder">
          <CardContent className="py-8 text-center text-muted-foreground">
            <p className="text-sm">Level content coming soon...</p>
            <p className="text-xs mt-1">
              This level's curriculum is under development
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function Academy() {
  const [location] = useLocation();
  const [, params] = useRoute("/:levelId");
  const urlLevelId = params?.levelId;

  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(
    urlLevelId || null
  );
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);

  // Sync state with URL on browser back/forward navigation
  useEffect(() => {
    // Extract levelId from URL - check if it's a valid level ID
    const pathSegment = location.startsWith("/") ? location.slice(1) : location;
    const levelId = pathSegment && getLevelById(pathSegment) ? pathSegment : null;
    setSelectedLevelId(levelId);
  }, [location]);

  const selectedLevel = selectedLevelId ? getLevelById(selectedLevelId) : null;

  const handleSelectLevel = (levelId: string) => {
    setSelectedLevelId(levelId);
    window.history.pushState({}, "", `/${levelId}`);
  };

  const handleBack = () => {
    setSelectedLevelId(null);
    window.history.pushState({}, "", "/");
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
            <h2 className="text-lg font-semibold" data-testid="text-academy-title">
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

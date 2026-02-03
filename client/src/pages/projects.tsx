import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { ExternalLink, Check, PanelLeft, ChevronLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PageContent } from "@/components/page-content";
import { projects, getProjectById, type Project } from "@/data/projects";

function ProjectNavItem({
  project,
  isSelected,
  onSelect,
  isCollapsed = false
}: {
  project: Project;
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
            data-testid={`nav-project-${project.id}`}
          >
            <span className="text-sm font-medium">{project.title.charAt(0)}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">{project.title}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Button
      variant="ghost"
      className={`w-full justify-start h-8 ${
        isSelected ? "bg-accent text-accent-foreground" : ""
      }`}
      onClick={onSelect}
      data-testid={`nav-project-${project.id}`}
    >
      <span className="text-sm truncate">{project.title}</span>
    </Button>
  );
}

function ProjectDetailPanel({
  project,
  onBack
}: {
  project: Project;
  onBack?: () => void;
}) {
  return (
    <div className="flex-1 overflow-auto bg-background" data-testid={`detail-project-${project.id}`}>
      <div className="p-4 border-b bg-muted/30">
        {/* Mobile back button */}
        {onBack && (
          <div className="md:hidden mb-3">
            <Button variant="ghost" size="sm" onClick={onBack} data-testid="button-back-to-projects" className="gap-1">
              <ChevronLeft className="h-4 w-4" />
              Projects
            </Button>
          </div>
        )}
        <div className="flex items-center gap-3 flex-wrap mb-2">
          <h2 className="text-lg font-semibold" data-testid="text-project-title">
            {project.title}
          </h2>
          <Badge variant="secondary" data-testid="badge-project-category">{project.category}</Badge>
        </div>
        <p className="text-sm text-muted-foreground italic" data-testid="text-project-tagline">
          {project.tagline}
        </p>
      </div>

      <div className="p-4 space-y-6">
        <Card data-testid="card-project-about">
          <CardHeader>
            <CardTitle className="text-base">About</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-project-description">
              {project.description}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-project-features">
          <CardHeader>
            <CardTitle className="text-base">Features</CardTitle>
            <CardDescription>Key capabilities of this application</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {project.features.map((feature, index) => (
                <li key={feature} className="flex items-center gap-2" data-testid={`text-feature-${index}`}>
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card data-testid="card-project-visit">
          <CardContent className="py-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="space-y-1">
                <p className="font-medium text-sm" data-testid="text-visit-label">Visit Application</p>
                <p className="text-xs text-muted-foreground" data-testid="text-project-url">{project.url}</p>
              </div>
              <Button asChild data-testid="button-visit-project">
                <a href={project.url} target="_blank" rel="noopener noreferrer">
                  Open
                  <ExternalLink className="h-4 w-4 ml-2" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function Projects() {
  const [location] = useLocation();
  const [, params] = useRoute("/projects/:projectId");
  const urlProjectId = params?.projectId;

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(urlProjectId || null);
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);

  // Sync state with URL on browser back/forward navigation
  useEffect(() => {
    const projectIdFromUrl = location.startsWith("/projects/")
      ? location.replace("/projects/", "")
      : null;
    setSelectedProjectId(projectIdFromUrl);
  }, [location]);

  const selectedProject = selectedProjectId ? getProjectById(selectedProjectId) : null;

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    // Update URL without full navigation
    window.history.pushState({}, "", `/projects/${projectId}`);
  };

  const handleBack = () => {
    setSelectedProjectId(null);
    window.history.pushState({}, "", "/projects");
  };

  return (
    <>
      {/* Desktop: Secondary nav panel */}
      <div
        className={`hidden md:flex shrink-0 border-r bg-muted/20 flex-col transition-all duration-200 ${
          isNavCollapsed ? "min-w-12 max-w-12" : "min-w-[10rem] max-w-[12rem] flex-1"
        }`}
        data-testid="projects-nav"
      >
        <div className="border-b px-2 h-8 flex items-center shrink-0">
          {isNavCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs font-medium text-muted-foreground block w-full text-center cursor-default">P</span>
              </TooltipTrigger>
              <TooltipContent side="right">Projects</TooltipContent>
            </Tooltip>
          ) : (
            <span className="text-xs font-medium text-muted-foreground">Projects</span>
          )}
        </div>
        <div className="flex-1 overflow-auto p-1 space-y-0.5">
          {projects.map((project) => (
            <ProjectNavItem
              key={project.id}
              project={project}
              isSelected={selectedProjectId === project.id}
              onSelect={() => handleSelectProject(project.id)}
              isCollapsed={isNavCollapsed}
            />
          ))}
        </div>
        <div className="border-t h-11 flex items-center justify-center shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsNavCollapsed(!isNavCollapsed)}
                data-testid="button-toggle-projects-nav"
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {isNavCollapsed ? "Expand" : "Collapse"}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <PageContent>
        {selectedProject ? (
          <ProjectDetailPanel
            project={selectedProject}
            onBack={handleBack}
          />
        ) : (
          <>
            {/* Desktop: prompt to select project from nav */}
            <div className="hidden md:flex flex-1 items-center justify-center text-muted-foreground bg-background">
              <p className="text-sm">Select a project to view details</p>
            </div>
            {/* Mobile: show projects as cards */}
            <div className="md:hidden flex-1 p-4 overflow-auto">
              <h2 className="text-lg font-semibold mb-4" data-testid="text-projects-heading">Projects</h2>
              <p className="text-sm text-muted-foreground mb-4">
                A curated collection of applications built with purpose and care
              </p>
              <div className="space-y-3">
                {projects.map((project) => (
                  <Card
                    key={project.id}
                    className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => handleSelectProject(project.id)}
                    data-testid={`card-project-${project.id}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{project.title}</span>
                      <Badge variant="secondary" className="text-[10px]">{project.category}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground italic mb-2">{project.tagline}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2">{project.description}</div>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}
      </PageContent>
    </>
  );
}

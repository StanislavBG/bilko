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

function StatusBadge({ status }: { status: Project["status"] }) {
  const statusConfig = {
    live: { label: "Live", className: "bg-green-500/10 text-green-600 border-green-500/20" },
    beta: { label: "Beta", className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
    development: { label: "In Development", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" }
  };
  const config = statusConfig[status];
  return (
    <Badge variant="outline" className={config.className} data-testid="badge-project-status">
      {config.label}
    </Badge>
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
      {/* Mobile back button */}
      {onBack && (
        <div className="md:hidden p-2 border-b bg-muted/30">
          <Button variant="ghost" size="sm" onClick={onBack} data-testid="button-back-to-projects" className="gap-1">
            <ChevronLeft className="h-4 w-4" />
            Projects
          </Button>
        </div>
      )}

      {/* Hero Image - Clickable to open app */}
      <a
        href={project.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block relative group"
        data-testid="link-project-hero"
      >
        <div className="aspect-square max-h-[320px] w-full overflow-hidden bg-muted">
          <img
            src={project.imageUrl}
            alt={project.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            data-testid="img-project-hero"
          />
        </div>
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 text-white font-medium">
            <ExternalLink className="h-5 w-5" />
            <span>Open Application</span>
          </div>
        </div>
      </a>

      {/* Header with title, badges */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <h2 className="text-lg font-semibold" data-testid="text-project-title">
            {project.title}
          </h2>
          <StatusBadge status={project.status} />
          <Badge variant="secondary" data-testid="badge-project-category">{project.category}</Badge>
        </div>
        <p className="text-sm text-muted-foreground italic" data-testid="text-project-tagline">
          {project.tagline}
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* About section - simplified */}
        <div data-testid="card-project-about">
          <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-project-description">
            {project.description}
          </p>
        </div>

        {/* Tech Stack - compact inline */}
        {project.techStack && project.techStack.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap" data-testid="section-tech-stack">
            <span className="text-xs font-medium text-muted-foreground">Built with:</span>
            {project.techStack.map((tech) => (
              <Badge key={tech} variant="outline" className="text-xs" data-testid={`badge-tech-${tech}`}>
                {tech}
              </Badge>
            ))}
          </div>
        )}

        {/* Features */}
        <Card data-testid="card-project-features">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Features</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-1.5">
              {project.features.map((feature, index) => (
                <li key={feature} className="flex items-center gap-2" data-testid={`text-feature-${index}`}>
                  <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Quick action button */}
        <Button asChild className="w-full" size="lg" data-testid="button-visit-project">
          <a href={project.url} target="_blank" rel="noopener noreferrer">
            Launch {project.title}
            <ExternalLink className="h-4 w-4 ml-2" />
          </a>
        </Button>
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
            {/* Desktop: project grid gallery */}
            <div className="hidden md:flex flex-1 flex-col bg-background overflow-auto">
              <div className="p-6 border-b bg-muted/30">
                <h2 className="text-lg font-semibold mb-1" data-testid="text-projects-heading-desktop">Projects</h2>
                <p className="text-sm text-muted-foreground">
                  A curated collection of applications built with purpose and care
                </p>
              </div>
              <div className="p-6 grid grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((project) => (
                  <Card
                    key={project.id}
                    className="overflow-hidden cursor-pointer group hover:ring-2 hover:ring-primary/50 transition-all"
                    onClick={() => handleSelectProject(project.id)}
                    data-testid={`card-desktop-project-${project.id}`}
                  >
                    <div className="aspect-square overflow-hidden bg-muted">
                      <img
                        src={project.imageUrl}
                        alt={project.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">{project.title}</span>
                        <StatusBadge status={project.status} />
                      </div>
                      <div className="text-xs text-muted-foreground italic truncate">{project.tagline}</div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
            {/* Mobile: show projects as cards with images */}
            <div className="md:hidden flex-1 p-4 overflow-auto">
              <h2 className="text-lg font-semibold mb-1" data-testid="text-projects-heading">Projects</h2>
              <p className="text-sm text-muted-foreground mb-4">
                A curated collection of applications built with purpose and care
              </p>
              <div className="space-y-4">
                {projects.map((project) => (
                  <Card
                    key={project.id}
                    className="overflow-hidden cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => handleSelectProject(project.id)}
                    data-testid={`card-project-${project.id}`}
                  >
                    {/* Project thumbnail */}
                    <div className="aspect-video overflow-hidden bg-muted">
                      <img
                        src={project.imageUrl}
                        alt={project.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium text-sm">{project.title}</span>
                        <StatusBadge status={project.status} />
                        <Badge variant="secondary" className="text-[10px]">{project.category}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground italic mb-2">{project.tagline}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">{project.description}</div>
                    </div>
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

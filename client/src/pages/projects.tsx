import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Check, ChevronLeft, RefreshCw, Github } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageContent } from "@/components/page-content";
import { NavPanel } from "@/components/nav";
import { ProjectImage } from "@/components/project-image";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { fallbackProjects, getProjectById, type Project } from "@/data/projects";

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

/** Format relative time from ISO date */
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function ProjectDetailPanel({
  project,
  onBack,
  onRefresh,
  isAdmin,
  isRefreshing,
}: {
  project: Project;
  onBack?: () => void;
  onRefresh?: (id: string) => void;
  isAdmin?: boolean;
  isRefreshing?: boolean;
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
        <ProjectImage
          projectUrl={project.url}
          projectTitle={project.title}
          className="aspect-square max-h-[320px] w-full"
        />
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
          {isAdmin && onRefresh && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 ml-auto"
              onClick={() => onRefresh(project.id)}
              disabled={isRefreshing}
              data-testid="button-refresh-project"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground italic" data-testid="text-project-tagline">
          {project.tagline}
        </p>
        {project.pushedAt && (
          <p className="text-xs text-muted-foreground mt-1">
            Updated {timeAgo(project.pushedAt)}
            {project.language && <> &middot; {project.language}</>}
          </p>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* About section */}
        <div data-testid="card-project-about">
          <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-project-description">
            {project.description}
          </p>
        </div>

        {/* Tech Stack */}
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

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button asChild className="flex-1" size="lg" data-testid="button-visit-project">
            <a href={project.url} target="_blank" rel="noopener noreferrer">
              Launch {project.title}
              <ExternalLink className="h-4 w-4 ml-2" />
            </a>
          </Button>
          {project.githubUrl && (
            <Button variant="outline" size="lg" asChild data-testid="button-github-project">
              <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">
                <Github className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Projects() {
  const [location] = useLocation();
  const [, params] = useRoute("/projects/:projectId");
  const urlProjectId = params?.projectId;
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = !!user?.isAdmin;

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(urlProjectId || null);
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);

  // Fetch projects from API, fall back to static data
  const { data: projects = fallbackProjects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects");
      if (!res.ok) return fallbackProjects;
      const data = await res.json();
      return data.projects?.length > 0 ? data.projects : fallbackProjects;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Sync all projects mutation (admin)
  const syncAllMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/projects/sync-github", { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).error || "Sync failed");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Projects synced", description: `${data.count} projects updated from GitHub` });
    },
    onError: (err) => {
      toast({ title: "Sync failed", description: String(err), variant: "destructive" });
    },
  });

  // Sync single project mutation (admin)
  const syncOneMutation = useMutation({
    mutationFn: async (repoName: string) => {
      const res = await fetch(`/api/projects/${repoName}/sync`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).error || "Sync failed");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project refreshed", description: `${data.project.title} updated` });
    },
    onError: (err) => {
      toast({ title: "Refresh failed", description: String(err), variant: "destructive" });
    },
  });

  // Sync state with URL on browser back/forward navigation
  useEffect(() => {
    const projectIdFromUrl = location.startsWith("/projects/")
      ? location.replace("/projects/", "")
      : null;
    setSelectedProjectId(projectIdFromUrl);
  }, [location]);

  const selectedProject = selectedProjectId ? getProjectById(selectedProjectId, projects) : null;

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    window.history.pushState({}, "", `/projects/${projectId}`);
  };

  const handleBack = () => {
    setSelectedProjectId(null);
    window.history.pushState({}, "", "/projects");
  };

  const handleRefreshProject = (projectId: string) => {
    syncOneMutation.mutate(projectId);
  };

  return (
    <>
      <NavPanel
        header="Bilko's Projects"
        items={projects.map((p) => ({
          id: p.id,
          label: p.title,
          shortLabel: p.title.charAt(0),
        }))}
        selectedId={selectedProjectId}
        onSelect={handleSelectProject}
        isCollapsed={isNavCollapsed}
        onToggleCollapse={() => setIsNavCollapsed(!isNavCollapsed)}
        expandedWidth="min-w-[10rem] max-w-[12rem]"
        collapsedWidth="min-w-12 max-w-12"
        bg="bg-muted/20"
        testId="projects-nav"
      />

      <PageContent>
        {selectedProject ? (
          <ProjectDetailPanel
            project={selectedProject}
            onBack={handleBack}
            onRefresh={handleRefreshProject}
            isAdmin={isAdmin}
            isRefreshing={syncOneMutation.isPending}
          />
        ) : (
          <>
            {/* Desktop: project grid gallery */}
            <div className="hidden md:flex flex-1 flex-col bg-background overflow-auto">
              <div className="p-6 border-b bg-muted/30">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-lg font-semibold" data-testid="text-projects-heading-desktop">Bilko's Projects</h2>
                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => syncAllMutation.mutate()}
                      disabled={syncAllMutation.isPending}
                      data-testid="button-sync-all"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${syncAllMutation.isPending ? "animate-spin" : ""}`} />
                      {syncAllMutation.isPending ? "Syncing..." : "Sync GitHub"}
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                  These projects represent stepping stones in a learning journey — each one exploring different aspects of AI, automation, and connected experiences. Sorted by latest activity.
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
                    <ProjectImage
                      projectUrl={project.url}
                      projectTitle={project.title}
                      className="aspect-square"
                    />
                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">{project.title}</span>
                        <StatusBadge status={project.status} />
                      </div>
                      <div className="text-xs text-muted-foreground italic truncate">{project.tagline}</div>
                      {project.pushedAt && (
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {timeAgo(project.pushedAt)}
                          {project.language && <> &middot; {project.language}</>}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
            {/* Mobile: show projects as cards with images */}
            <div className="md:hidden flex-1 p-4 overflow-auto">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-lg font-semibold" data-testid="text-projects-heading">Bilko's Projects</h2>
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs"
                    onClick={() => syncAllMutation.mutate()}
                    disabled={syncAllMutation.isPending}
                  >
                    <RefreshCw className={`h-3 w-3 ${syncAllMutation.isPending ? "animate-spin" : ""}`} />
                    Sync
                  </Button>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                Projects sorted by latest activity, exploring AI, automation, and connected experiences.
              </p>
              <div className="space-y-4">
                {projects.map((project) => (
                  <Card
                    key={project.id}
                    className="overflow-hidden cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => handleSelectProject(project.id)}
                    data-testid={`card-project-${project.id}`}
                  >
                    <ProjectImage
                      projectUrl={project.url}
                      projectTitle={project.title}
                      className="aspect-video"
                    />
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium text-sm">{project.title}</span>
                        <StatusBadge status={project.status} />
                        <Badge variant="secondary" className="text-[10px]">{project.category}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground italic mb-1">{project.tagline}</div>
                      {project.pushedAt && (
                        <div className="text-[10px] text-muted-foreground mb-1">
                          {timeAgo(project.pushedAt)}
                          {project.language && <> &middot; {project.language}</>}
                        </div>
                      )}
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

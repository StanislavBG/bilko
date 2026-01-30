import { useRoute, Link } from "wouter";
import { ExternalLink, ArrowLeft, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getProjectById } from "@/data/projects";

export default function ProjectDetail() {
  const [, params] = useRoute("/projects/:projectId");
  const projectId = params?.projectId;
  const project = projectId ? getProjectById(projectId) : undefined;

  if (!project) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Link href="/projects">
            <Button variant="ghost" size="sm" className="gap-1" data-testid="button-back-to-projects">
              <ArrowLeft className="h-4 w-4" />
              Back to Projects
            </Button>
          </Link>
          <Card data-testid="card-project-not-found">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground" data-testid="text-not-found">Project not found</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link href="/projects">
          <Button variant="ghost" size="sm" className="gap-1" data-testid="button-back-to-projects">
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Button>
        </Link>

        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold tracking-tight" data-testid="text-project-title">
                {project.title}
              </h1>
              <Badge variant="secondary" data-testid="badge-project-category">{project.category}</Badge>
            </div>
            <p className="text-lg text-muted-foreground italic" data-testid="text-project-tagline">
              {project.tagline}
            </p>
          </div>

          <Card data-testid="card-project-main">
            <CardHeader>
              <CardTitle className="text-lg">About</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground leading-relaxed" data-testid="text-project-description">
                {project.description}
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-project-features">
            <CardHeader>
              <CardTitle className="text-lg">Features</CardTitle>
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
                  <p className="font-medium" data-testid="text-visit-label">Visit Application</p>
                  <p className="text-sm text-muted-foreground" data-testid="text-project-url">{project.url}</p>
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
    </div>
  );
}

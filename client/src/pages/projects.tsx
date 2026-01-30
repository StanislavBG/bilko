import { ExternalLink, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { projects } from "@/data/projects";

export default function Projects() {
  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-projects-title">Projects</h1>
          <p className="text-sm text-muted-foreground">
            A curated collection of applications built with purpose and care
          </p>
        </div>

        <div className="grid gap-4">
          {projects.map((project) => (
            <Card key={project.id} data-testid={`card-project-${project.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg" data-testid={`text-project-title-${project.id}`}>
                        {project.title}
                      </CardTitle>
                      <Badge variant="secondary" className="text-[10px]">{project.category}</Badge>
                    </div>
                    <CardDescription className="text-sm italic">
                      {project.tagline}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      data-testid={`button-details-${project.id}`}
                    >
                      <Link href={`/projects/${project.id}`}>
                        Details
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      data-testid={`button-visit-${project.id}`}
                    >
                      <a href={project.url} target="_blank" rel="noopener noreferrer">
                        Visit
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground leading-relaxed" data-testid={`text-project-description-${project.id}`}>
                  {project.description}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {project.features.map((feature) => (
                    <Badge key={feature} variant="outline" className="text-[10px] font-normal">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

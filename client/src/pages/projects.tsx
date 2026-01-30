import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Project {
  id: string;
  title: string;
  tagline: string;
  description: string;
  url: string;
  features: string[];
  category: string;
}

const projects: Project[] = [
  {
    id: "family-frame",
    title: "Family Frame",
    tagline: "The Window Between Homes",
    description: "Transform your smart screen into a dedicated social network for households. Connect with family, share memories through Google Photos integration, and stay in sync across distances with shared calendars and live weather from all family locations.",
    url: "https://family-frame.replit.app/",
    features: ["Google Photos Integration", "Multi-household Sync", "Shared Calendar", "Live Weather"],
    category: "Connected Living"
  },
  {
    id: "provocations",
    title: "Provocations",
    tagline: "A tool that makes you think, not one that thinks for you",
    description: "An AI-powered analysis tool designed to deepen your thinking rather than replace it. Paste meeting transcripts, reports, or notes and receive thoughtful provocations that challenge assumptions and reveal new perspectives.",
    url: "https://provocations.replit.app/",
    features: ["Deep Analysis", "Critical Thinking", "Source Material Processing"],
    category: "AI Thinking Tools"
  }
];

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
                <div className="flex items-start justify-between gap-4">
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

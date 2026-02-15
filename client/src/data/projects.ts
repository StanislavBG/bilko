export interface Project {
  id: string;
  title: string;
  tagline: string;
  description: string;
  url: string;
  githubUrl?: string;
  features: string[];
  category: string;
  status: "live" | "beta" | "development";
  techStack?: string[];
  language?: string | null;
  pushedAt?: string;
  createdAt?: string;
  sizeKb?: number;
}

/** Fallback projects — used if the API has not been synced yet */
export const fallbackProjects: Project[] = [
  {
    id: "provocations",
    title: "Provocations",
    tagline: "Tools for Thought",
    description: "An AI-powered analysis tool designed to deepen your thinking rather than replace it. Paste meeting transcripts, reports, or notes and receive thoughtful provocations that challenge assumptions and reveal new perspectives.",
    url: "https://provocations.replit.app/",
    githubUrl: "https://github.com/StanislavBG/provocations",
    features: ["Deep Analysis", "Critical Thinking", "Source Material Processing"],
    category: "AI Thinking Tools",
    status: "live",
    techStack: ["TypeScript", "React", "Express", "Clerk Auth"]
  },
  {
    id: "family-frame",
    title: "Family Frame",
    tagline: "Smart home device for touch screen with home-to-home features",
    description: "Transform your smart screen into a dedicated social network for households. Connect with family, share memories through Google Photos integration, and stay in sync across distances with shared calendars and live weather from all family locations.",
    url: "https://family-frame.replit.app/",
    githubUrl: "https://github.com/StanislavBG/family-frame",
    features: ["Google Photos Integration", "Multi-household Sync", "Shared Calendar", "Live Weather"],
    category: "Connected Living",
    status: "live",
    techStack: ["TypeScript", "React", "Clerk Auth"]
  }
];

export function getProjectById(id: string, projects: Project[]): Project | undefined {
  return projects.find(p => p.id === id);
}

export interface Project {
  id: string;
  title: string;
  tagline: string;
  description: string;
  url: string;
  features: string[];
  category: string;
  imageUrl: string;
  status: "live" | "beta" | "development";
  techStack?: string[];
}

export const projects: Project[] = [
  {
    id: "family-frame",
    title: "Family Frame",
    tagline: "The Window Between Homes",
    description: "Transform your smart screen into a dedicated social network for households. Connect with family, share memories through Google Photos integration, and stay in sync across distances with shared calendars and live weather from all family locations.",
    url: "https://family-frame.replit.app/",
    features: ["Google Photos Integration", "Multi-household Sync", "Shared Calendar", "Live Weather"],
    category: "Connected Living",
    imageUrl: "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800&h=800&fit=crop&q=80",
    status: "live",
    techStack: ["React", "Google Photos API", "Firebase"]
  },
  {
    id: "provocations",
    title: "Provocations",
    tagline: "A tool that makes you think, not one that thinks for you",
    description: "An AI-powered analysis tool designed to deepen your thinking rather than replace it. Paste meeting transcripts, reports, or notes and receive thoughtful provocations that challenge assumptions and reveal new perspectives.",
    url: "https://provocations.replit.app/",
    features: ["Deep Analysis", "Critical Thinking", "Source Material Processing"],
    category: "AI Thinking Tools",
    imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=800&fit=crop&q=80",
    status: "live",
    techStack: ["React", "Claude AI", "n8n"]
  },
  {
    id: "puck-predict",
    title: "PuckPredict",
    tagline: "AI-Powered Hockey Analytics",
    description: "Advanced hockey prediction and analytics platform leveraging machine learning to deliver accurate game predictions, player performance insights, and betting analysis for hockey enthusiasts and professionals.",
    url: "https://puckpredict.com/",
    features: ["Game Predictions", "Player Analytics", "ML Models", "Betting Insights"],
    category: "Sports Analytics",
    imageUrl: "https://images.unsplash.com/photo-1515703407324-5f753afd8be8?w=800&h=800&fit=crop&q=80",
    status: "live",
    techStack: ["Python", "TensorFlow", "React", "PostgreSQL"]
  }
];

export function getProjectById(id: string): Project | undefined {
  return projects.find(p => p.id === id);
}

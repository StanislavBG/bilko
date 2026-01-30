export interface Project {
  id: string;
  title: string;
  tagline: string;
  description: string;
  url: string;
  features: string[];
  category: string;
}

export const projects: Project[] = [
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
  },
  {
    id: "puck-predict",
    title: "PuckPredict",
    tagline: "AI-Powered Hockey Analytics",
    description: "Advanced hockey prediction and analytics platform leveraging machine learning to deliver accurate game predictions, player performance insights, and betting analysis for hockey enthusiasts and professionals.",
    url: "https://puckpredict.com/",
    features: ["Game Predictions", "Player Analytics", "ML Models", "Betting Insights"],
    category: "Sports Analytics"
  }
];

export function getProjectById(id: string): Project | undefined {
  return projects.find(p => p.id === id);
}

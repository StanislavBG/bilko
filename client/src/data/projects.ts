export interface Project {
  id: string;
  title: string;
  tagline: string;
  description: string;
  url: string;
  features: string[];
  category: string;
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
    status: "live",
    techStack: ["Python", "TensorFlow", "React", "PostgreSQL"]
  },
  {
    id: "timeline-experiences",
    title: "Timeline Experiences",
    tagline: "Interactive Visual Storytelling",
    description: "An interactive timeline platform for visualizing experiences, events, and milestones. Navigate through curated moments with rich media and immersive storytelling.",
    url: "https://timeline-experiences.replit.app/",
    features: ["Interactive Timeline", "Rich Media", "Visual Storytelling", "Event Navigation"],
    category: "Interactive Media",
    status: "live",
    techStack: ["React", "TypeScript"]
  },
  {
    id: "euro-school-tennis",
    title: "Euro School Tennis",
    tagline: "European Tennis Academy Platform",
    description: "A demo platform for a European tennis school featuring program schedules, court bookings, and player development tracking. Designed to streamline academy operations and student engagement.",
    url: "https://euro-school-tennis-demo.replit.app/",
    features: ["Program Schedules", "Court Booking", "Player Development", "Academy Management"],
    category: "Sports & Education",
    status: "beta",
    techStack: ["React", "TypeScript"]
  },
  {
    id: "vibe-index",
    title: "Vibe Index",
    tagline: "Measure the Vibe of Any Project",
    description: "An AI-powered tool that analyzes and scores the overall 'vibe' of projects, codebases, and digital products. Get instant insights into code quality, design coherence, and developer experience.",
    url: "https://vibe-index.replit.app",
    features: ["Project Analysis", "Vibe Scoring", "AI-Powered Insights", "Quality Metrics"],
    category: "Developer Tools",
    status: "live",
    techStack: ["React", "TypeScript", "AI"]
  }
];

export function getProjectById(id: string): Project | undefined {
  return projects.find(p => p.id === id);
}

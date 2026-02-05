export interface AcademyLevel {
  id: string;
  levelRange: string;
  rank: string;
  coreSkill: string;
  skillDescription: string;
  quest: string;
  questDescription: string;
  order: number;
}

export const academyLevels: AcademyLevel[] = [
  {
    id: "level-0",
    levelRange: "0-10",
    rank: "The Drifter",
    coreSkill: "UI Manifestation",
    skillDescription: "Prompting full apps via natural language.",
    quest: "Ship a \"5-Minute SaaS\"",
    questDescription: "Ship a \"5-Minute SaaS\" landing page using Bolt.new or v0.dev. Must include a working waitlist form.",
    order: 0,
  },
  {
    id: "level-1",
    levelRange: "11-20",
    rank: "The Scavenger",
    coreSkill: "Linear Automation",
    skillDescription: "Eliminating manual grunt work via triggers.",
    quest: "Auto-Summarize YouTube to LinkedIn",
    questDescription: "Build an n8n or Make workflow that auto-summarizes YouTube videos and posts them as LinkedIn threads.",
    order: 1,
  },
  {
    id: "level-2",
    levelRange: "21-30",
    rank: "The Prompt Smith",
    coreSkill: "Structured Output",
    skillDescription: "Forcing LLMs to speak in JSON/XML.",
    quest: "Build a \"Data Sanitizer\"",
    questDescription: "Create a \"Data Sanitizer\" that extracts specific pricing data from messy email receipts into an Airtable DB.",
    order: 2,
  },
  {
    id: "level-3",
    levelRange: "31-40",
    rank: "The Harvester",
    coreSkill: "Data Extraction",
    skillDescription: "Scraping the web for personal datasets.",
    quest: "Build a \"Competitor Intelligence Bot\"",
    questDescription: "Use Firecrawl to build a \"Competitor Intelligence Bot\" that Slacks you the moment a rival changes their homepage copy.",
    order: 3,
  },
  {
    id: "level-4",
    levelRange: "41-50",
    rank: "The Archivist",
    coreSkill: "RAG (Retrieval Augmented Generation)",
    skillDescription: "Long-term AI memory.",
    quest: "Build a Technical Manual Chatbot",
    questDescription: "Build a chatbot trained on a 100+ page technical manual using Pinecone. It must cite its sources for every answer.",
    order: 4,
  },
  {
    id: "level-5",
    levelRange: "51-60",
    rank: "The Traffic Cop",
    coreSkill: "Intent Routing",
    skillDescription: "Directing traffic to specialized sub-agents.",
    quest: "Ship an \"Inbox Zero Engine\"",
    questDescription: "Ship an \"Inbox Zero Engine\" that classifies emails into Sales, Support, or Spam and drafts unique replies for each.",
    order: 5,
  },
  {
    id: "level-6",
    levelRange: "61-70",
    rank: "The Tool Master",
    coreSkill: "Function Calling",
    skillDescription: "Giving the AI \"hands\" (APIs & Tools).",
    quest: "Build a \"Calendar Assassin\"",
    questDescription: "Build a \"Calendar Assassin\" agent that can check your availability and book meetings autonomously via the Google Calendar API.",
    order: 6,
  },
  {
    id: "level-7",
    levelRange: "71-80",
    rank: "The Hive Lord",
    coreSkill: "Multi-Agent Orchestration",
    skillDescription: "Manager-Worker hierarchies.",
    quest: "Build a \"Content Factory\"",
    questDescription: "Build a \"Content Factory\" where a Manager Agent directs a Researcher Agent and a Writer Agent to produce a full report.",
    order: 7,
  },
  {
    id: "level-8",
    levelRange: "81-90",
    rank: "The Code Wraith",
    coreSkill: "Full-Stack Vibe Coding",
    skillDescription: "Database-backed app development.",
    quest: "Build a Custom SaaS Platform",
    questDescription: "Build a custom SaaS platform with Cursor and Supabase. Must include user authentication and a paid subscription tier.",
    order: 8,
  },
  {
    id: "level-9",
    levelRange: "91-100",
    rank: "The Sovereign",
    coreSkill: "Autonomous Monetization",
    skillDescription: "Self-correcting money printers.",
    quest: "Launch a \"Headless SaaS\"",
    questDescription: "Launch a \"Headless SaaS\" that finds leads, sends personalized outreach, and processes payments via Stripe with 0 manual input.",
    order: 9,
  },
];

export function getLevelById(id: string): AcademyLevel | undefined {
  return academyLevels.find((level) => level.id === id);
}

export function getLevelByOrder(order: number): AcademyLevel | undefined {
  return academyLevels.find((level) => level.order === order);
}

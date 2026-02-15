/**
 * GitHub project sync service.
 *
 * Fetches public repo metadata + README content from GitHub,
 * builds project summaries, and persists them to a JSON file.
 * Admin-only refresh via POST /api/projects/sync-github.
 */

import fs from "fs";
import path from "path";
import { createLogger } from "../logger";

const log = createLogger("github-sync");

const GITHUB_USER = "StanislavBG";
const CUTOFF_DATE = new Date("2025-06-01T00:00:00Z");
const DATA_FILE = path.resolve(process.cwd(), "server", "data", "projects.json");

/** Repos to skip (test repos, empty, or this project itself) */
const SKIP_REPOS = new Set(["hello-world", "fictional-octo-bassoon"]);

export interface GitHubProject {
  id: string;
  title: string;
  tagline: string;
  description: string;
  url: string;
  githubUrl: string;
  features: string[];
  category: string;
  status: "live" | "beta" | "development";
  techStack: string[];
  language: string | null;
  pushedAt: string;
  createdAt: string;
  sizeKb: number;
}

interface GitHubRepo {
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  pushed_at: string;
  created_at: string;
  size: number;
  default_branch: string;
  private: boolean;
  fork: boolean;
  archived: boolean;
}

/** Fetch all repos pushed since June 2025 */
async function fetchRepos(): Promise<GitHubRepo[]> {
  const url = `https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=pushed&direction=desc`;
  const res = await fetch(url, {
    headers: { Accept: "application/vnd.github.v3+json" },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
  const repos: GitHubRepo[] = await res.json();

  return repos.filter((r) => {
    if (SKIP_REPOS.has(r.name)) return false;
    if (r.fork || r.archived) return false;
    return new Date(r.pushed_at) >= CUTOFF_DATE;
  });
}

/** Fetch raw README.md content for a repo */
async function fetchReadme(
  repo: string,
  branch: string,
): Promise<string | null> {
  const url = `https://raw.githubusercontent.com/${GITHUB_USER}/${repo}/${branch}/README.md`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const text = await res.text();
  return text.slice(0, 3000); // cap at 3k chars
}

/** Fetch package.json to extract name and description */
async function fetchPackageJson(
  repo: string,
  branch: string,
): Promise<{ name?: string; description?: string } | null> {
  const url = `https://raw.githubusercontent.com/${GITHUB_USER}/${repo}/${branch}/package.json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/** Build a human-readable title from repo name */
function repoNameToTitle(name: string): string {
  return name
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Infer category from repo content */
function inferCategory(
  name: string,
  readme: string | null,
  language: string | null,
): string {
  const lower = (readme || "").toLowerCase() + " " + name.toLowerCase();
  if (lower.includes("game") || lower.includes("phaser") || lower.includes("shooter")) return "Games";
  if (lower.includes("workflow") || lower.includes("dsl") || lower.includes("flow")) return "Workflow & Automation";
  if (lower.includes("graph") || lower.includes("explorer") || lower.includes("visualization")) return "Data Visualization";
  if (lower.includes("podcast") || lower.includes("news") || lower.includes("media")) return "Media & Content";
  if (lower.includes("health") || lower.includes("watch")) return "Health & Wellness";
  if (lower.includes("academy") || lower.includes("school") || lower.includes("learn")) return "Education";
  if (lower.includes("neural") || lower.includes("ai") || lower.includes("model")) return "AI & Machine Learning";
  if (lower.includes("family") || lower.includes("home") || lower.includes("device")) return "Connected Living";
  if (lower.includes("agency")) return "AI Agents";
  if (lower.includes("research")) return "Research & Prototyping";
  if (lower.includes("solution") || lower.includes("manager")) return "Enterprise Tools";
  if (language === "Python") return "AI & Machine Learning";
  return "AI Thinking Tools";
}

/** Infer tech stack from package.json deps and language */
function inferTechStack(
  pkg: { name?: string; description?: string; dependencies?: Record<string, string> } | null,
  language: string | null,
  readme: string | null,
): string[] {
  const stack: string[] = [];
  if (language) stack.push(language);

  const deps = (pkg as any)?.dependencies || {};
  const depKeys = Object.keys(deps);

  if (depKeys.some((d) => d.includes("react"))) stack.push("React");
  if (depKeys.some((d) => d.includes("next"))) stack.push("Next.js");
  if (depKeys.some((d) => d.includes("express"))) stack.push("Express");
  if (depKeys.some((d) => d.includes("drizzle"))) stack.push("Drizzle ORM");
  if (depKeys.some((d) => d.includes("clerk"))) stack.push("Clerk Auth");
  if (depKeys.some((d) => d.includes("openai"))) stack.push("OpenAI");
  if (depKeys.some((d) => d.includes("phaser"))) stack.push("Phaser.js");
  if (depKeys.some((d) => d.includes("bilko-flow"))) stack.push("bilko-flow");
  if (depKeys.some((d) => d.includes("tailwind") || d.includes("tailwindcss")))
    stack.push("Tailwind CSS");
  if (depKeys.some((d) => d.includes("radix"))) stack.push("Radix UI");

  const readmeLower = (readme || "").toLowerCase();
  if (readmeLower.includes("flask") || readmeLower.includes("python")) {
    if (!stack.includes("Python")) stack.push("Python");
    if (readmeLower.includes("flask")) stack.push("Flask");
    if (readmeLower.includes("onnx")) stack.push("ONNX Runtime");
  }

  // deduplicate
  return Array.from(new Set(stack));
}

/** Extract tagline from README first paragraph or GitHub description */
function extractTagline(
  readme: string | null,
  ghDescription: string | null,
  repoName: string,
): string {
  if (ghDescription) return ghDescription;

  if (readme) {
    // Skip title line, find first non-empty paragraph
    const lines = readme.split("\n").filter((l) => l.trim());
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("#")) continue;
      if (trimmed.startsWith("```")) break;
      if (trimmed.length > 10 && trimmed.length < 200) {
        return trimmed.replace(/\*\*/g, "").replace(/[`_]/g, "");
      }
    }
  }

  return repoNameToTitle(repoName);
}

/** Extract features from README bullet points */
function extractFeatures(readme: string | null): string[] {
  if (!readme) return [];

  const features: string[] = [];
  const lines = readme.split("\n");
  let inFeatures = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed.toLowerCase().includes("feature") &&
      trimmed.startsWith("#")
    ) {
      inFeatures = true;
      continue;
    }
    if (inFeatures && trimmed.startsWith("#")) break;
    if (
      inFeatures &&
      (trimmed.startsWith("- **") || trimmed.startsWith("* **"))
    ) {
      const match = trimmed.match(/[-*]\s+\*\*([^*]+)\*\*/);
      if (match) {
        features.push(match[1].trim());
        if (features.length >= 6) break;
      }
    }
  }

  // Fallback: any bold items in first 30 lines
  if (features.length === 0) {
    for (const line of lines.slice(0, 30)) {
      const match = line.match(/[-*]\s+\*\*([^*]+)\*\*/);
      if (match) {
        features.push(match[1].trim());
        if (features.length >= 4) break;
      }
    }
  }

  return features;
}

/** Build description from README content */
function buildDescription(
  readme: string | null,
  ghDescription: string | null,
  repoName: string,
  pkg: any,
): string {
  // Try package.json description
  const pkgDesc = pkg?.description;

  if (readme) {
    // Find first meaningful paragraph (not a heading, not a code block)
    const lines = readme.split("\n");
    const paragraphs: string[] = [];
    let current = "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("#") || trimmed.startsWith("```") || trimmed.startsWith("| ")) {
        if (current.length > 40) paragraphs.push(current.trim());
        current = "";
        continue;
      }
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed === "") {
        if (current.length > 40) paragraphs.push(current.trim());
        current = "";
        continue;
      }
      current += " " + trimmed;
    }
    if (current.length > 40) paragraphs.push(current.trim());

    if (paragraphs.length > 0) {
      return paragraphs[0].slice(0, 300);
    }
  }

  if (pkgDesc && pkgDesc.length > 10) return pkgDesc;
  if (ghDescription) return ghDescription;

  return `${repoNameToTitle(repoName)} — a ${repoName.includes("-") ? "multi-module" : "focused"} project exploring software development patterns.`;
}

/** Infer live URL from homepage or replit pattern */
function inferUrl(repo: GitHubRepo): string {
  if (repo.homepage) return repo.homepage;
  // For GitHub Pages repos
  if (repo.name === "Graph-Explorer-One-Day") {
    return `https://stanislavbg.github.io/${repo.name}/`;
  }
  // Replit pattern
  return `https://${repo.name}.replit.app/`;
}

/** Build a single GitHubProject from repo data */
async function buildProject(repo: GitHubRepo): Promise<GitHubProject> {
  const [readme, pkg] = await Promise.all([
    fetchReadme(repo.name, repo.default_branch),
    fetchPackageJson(repo.name, repo.default_branch),
  ]);

  const title = repoNameToTitle(repo.name);
  const tagline = extractTagline(readme, repo.description, repo.name);
  const description = buildDescription(readme, repo.description, repo.name, pkg);
  const features = extractFeatures(readme);
  const category = inferCategory(repo.name, readme, repo.language);
  const techStack = inferTechStack(pkg, repo.language, readme);

  return {
    id: repo.name.toLowerCase(),
    title,
    tagline,
    description,
    url: inferUrl(repo),
    githubUrl: repo.html_url,
    features: features.length > 0 ? features : [category],
    category,
    status: "live" as const,
    techStack,
    language: repo.language,
    pushedAt: repo.pushed_at,
    createdAt: repo.created_at,
    sizeKb: repo.size,
  };
}

/** Sync all repos from GitHub and save to disk */
export async function syncAllProjects(): Promise<GitHubProject[]> {
  log.info("Starting full GitHub sync...");
  const repos = await fetchRepos();
  log.info(`Found ${repos.length} repos pushed since June 2025`);

  const projects = await Promise.all(repos.map(buildProject));

  // Sort by pushedAt descending
  projects.sort(
    (a, b) => new Date(b.pushedAt).getTime() - new Date(a.pushedAt).getTime(),
  );

  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(projects, null, 2));
  log.info(`Saved ${projects.length} projects to ${DATA_FILE}`);

  return projects;
}

/** Sync a single repo by name */
export async function syncSingleProject(
  repoName: string,
): Promise<GitHubProject | null> {
  log.info(`Syncing single project: ${repoName}`);

  const url = `https://api.github.com/repos/${GITHUB_USER}/${repoName}`;
  const res = await fetch(url, {
    headers: { Accept: "application/vnd.github.v3+json" },
  });
  if (!res.ok) {
    log.warn(`Repo not found: ${repoName} (${res.status})`);
    return null;
  }

  const repo: GitHubRepo = await res.json();
  const project = await buildProject(repo);

  // Merge into existing data file
  const existing = loadProjects();
  const idx = existing.findIndex((p) => p.id === project.id);
  if (idx >= 0) {
    existing[idx] = project;
  } else {
    existing.push(project);
  }

  // Re-sort
  existing.sort(
    (a, b) => new Date(b.pushedAt).getTime() - new Date(a.pushedAt).getTime(),
  );

  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(existing, null, 2));
  log.info(`Updated project: ${project.title}`);

  return project;
}

/** Load projects from disk (empty array if file doesn't exist) */
export function loadProjects(): GitHubProject[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    }
  } catch (err) {
    log.warn("Failed to read projects file", { error: String(err) });
  }
  return [];
}

function ensureDataDir() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

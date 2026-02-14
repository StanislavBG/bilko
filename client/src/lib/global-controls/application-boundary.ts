/**
 * Application Boundary — Defines logical application separation.
 *
 * Each entry in the navigation sidebar represents a distinct application.
 * Applications are isolated from each other; the only shared element that
 * crosses application boundaries is the global controls (PIs).
 *
 * This registry is the single source of truth for what constitutes an
 * "application" in the system.
 */

export interface ApplicationDefinition {
  /** Unique application identifier (matches navigation item id) */
  readonly id: string;
  /** Human-readable application name */
  readonly name: string;
  /** Base route path */
  readonly basePath: string;
  /** Whether this application is powered by an agentic workflow */
  readonly agentic: boolean;
  /** Access level required */
  readonly access: "public" | "authenticated" | "admin";
  /** Brief description for tooling */
  readonly description: string;
}

/**
 * Registry of all applications in the system.
 * The order here matches the intended navigation order.
 */
export const applicationRegistry: readonly ApplicationDefinition[] = [
  {
    id: "home",
    name: "Home",
    basePath: "/",
    agentic: true,
    access: "public",
    description: "Landing screen powered by agentic workflow — the main entry point for every visitor.",
  },
  {
    id: "projects",
    name: "Bilko's Projects",
    basePath: "/projects",
    agentic: false,
    access: "public",
    description: "Project listing and details browsing.",
  },
  {
    id: "bilkos-way",
    name: "Bilko's Way",
    basePath: "/bilkos-way",
    agentic: false,
    access: "public",
    description: "Educational content and the website itself.",
  },
  {
    id: "workflows",
    name: "Agentic Workflows",
    basePath: "/workflows",
    agentic: false,
    access: "admin",
    description: "n8n workflow management and execution monitoring.",
  },
  {
    id: "flows",
    name: "Flow Explorer",
    basePath: "/flows",
    agentic: false,
    access: "admin",
    description: "Browse and inspect PER-002 in-platform flows.",
  },
  {
    id: "rules",
    name: "Rules Explorer",
    basePath: "/rules",
    agentic: false,
    access: "admin",
    description: "Admin rule catalog browser and auditor.",
  },
] as const;

/** Look up an application by its ID */
export function getApplicationById(id: string): ApplicationDefinition | undefined {
  return applicationRegistry.find((app) => app.id === id);
}

/** Determine which application a given route belongs to */
export function getApplicationForRoute(path: string): ApplicationDefinition | undefined {
  // Exact match for root
  if (path === "/") return applicationRegistry.find((a) => a.basePath === "/");
  // Longest prefix match for nested routes (e.g. /flows/some-flow → flows app)
  return applicationRegistry
    .filter((a) => a.basePath !== "/" && path.startsWith(a.basePath))
    .sort((a, b) => b.basePath.length - a.basePath.length)[0];
}

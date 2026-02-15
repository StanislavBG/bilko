import type { Express, Request, Response } from "express";
import { createLogger } from "../logger";
import { loadProjects, syncAllProjects, syncSingleProject } from "./github-sync";

const log = createLogger("projects");

interface UnfurlResult {
  url: string;
  ogImage: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  favicon: string | null;
  fetchedAt: string;
}

// Simple in-memory cache (TTL: 1 hour)
const cache = new Map<string, { result: UnfurlResult; expiry: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000;

function extractMeta(html: string, property: string): string | null {
  // Match both property="og:X" and name="og:X" patterns
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

function extractFavicon(html: string, baseUrl: string): string | null {
  // Look for link rel="icon" or rel="shortcut icon"
  const pattern = /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i;
  const altPattern = /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut )?icon["']/i;

  const match = html.match(pattern) || html.match(altPattern);
  if (match?.[1]) {
    const href = match[1];
    if (href.startsWith("http")) return href;
    if (href.startsWith("//")) return `https:${href}`;
    try {
      return new URL(href, baseUrl).href;
    } catch {
      return null;
    }
  }
  // Fallback: try /favicon.ico
  try {
    return new URL("/favicon.ico", baseUrl).href;
  } catch {
    return null;
  }
}

function resolveUrl(url: string, baseUrl: string): string {
  if (url.startsWith("http")) return url;
  if (url.startsWith("//")) return `https:${url}`;
  try {
    return new URL(url, baseUrl).href;
  } catch {
    return url;
  }
}

async function unfurlUrl(url: string): Promise<UnfurlResult> {
  const cached = cache.get(url);
  if (cached && cached.expiry > Date.now()) {
    return cached.result;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BilkoBot/1.0; +https://bilko.replit.app)",
        "Accept": "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();

    const ogImage = extractMeta(html, "og:image");
    const ogTitle = extractMeta(html, "og:title") || extractMeta(html, "title");
    const ogDescription = extractMeta(html, "og:description") || extractMeta(html, "description");
    const favicon = extractFavicon(html, url);

    const result: UnfurlResult = {
      url,
      ogImage: ogImage ? resolveUrl(ogImage, url) : null,
      ogTitle,
      ogDescription,
      favicon,
      fetchedAt: new Date().toISOString(),
    };

    cache.set(url, { result, expiry: Date.now() + CACHE_TTL_MS });
    log.info("Unfurled URL", { url, hasOgImage: !!ogImage, hasTitle: !!ogTitle });

    return result;
  } catch (error: any) {
    log.warn("Failed to unfurl URL", { url, error: error.message });
    return {
      url,
      ogImage: null,
      ogTitle: null,
      ogDescription: null,
      favicon: null,
      fetchedAt: new Date().toISOString(),
    };
  }
}

export function registerProjectRoutes(app: Express): void {
  // Unfurl a URL to extract OG metadata
  app.get("/api/projects/unfurl", async (req, res) => {
    const url = req.query.url as string;
    if (!url) {
      return res.status(400).json({ error: "url query parameter is required" });
    }

    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: "Invalid URL" });
    }

    const result = await unfurlUrl(url);
    res.json(result);
  });

  // Proxy an external image to avoid CORS issues
  app.get("/api/projects/proxy-image", async (req, res) => {
    const url = req.query.url as string;
    if (!url) {
      return res.status(400).json({ error: "url query parameter is required" });
    }

    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: "Invalid URL" });
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; BilkoBot/1.0)",
          "Accept": "image/*",
        },
        redirect: "follow",
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return res.status(502).json({ error: `Upstream returned ${response.status}` });
      }

      const contentType = response.headers.get("content-type") || "image/png";
      const buffer = Buffer.from(await response.arrayBuffer());

      res.set("Content-Type", contentType);
      res.set("Cache-Control", "public, max-age=3600");
      res.send(buffer);
    } catch (error: any) {
      log.warn("Failed to proxy image", { url, error: error.message });
      res.status(502).json({ error: "Failed to fetch image" });
    }
  });

  // Batch unfurl multiple URLs at once (for refreshing all projects)
  app.post("/api/projects/unfurl-batch", async (req, res) => {
    const { urls } = req.body as { urls: string[] };
    if (!urls || !Array.isArray(urls)) {
      return res.status(400).json({ error: "urls array is required in request body" });
    }

    const results = await Promise.all(urls.map(unfurlUrl));
    res.json({ results });
  });

  // Clear the unfurl cache
  app.post("/api/projects/unfurl-cache/clear", (_req, res) => {
    cache.clear();
    log.info("Unfurl cache cleared");
    res.json({ success: true, message: "Cache cleared" });
  });

  // ── GitHub-sourced project data ─────────────────────────────

  // GET /api/projects — return all projects (from disk cache)
  app.get("/api/projects", (_req: Request, res: Response) => {
    const projects = loadProjects();
    res.json({ projects });
  });

  // POST /api/projects/sync-github — sync all repos (admin only)
  app.post("/api/projects/sync-github", async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const adminId = process.env.ADMIN_USER_ID;
    if (user.id !== adminId) {
      return res.status(403).json({ error: "Admin access required" });
    }

    try {
      const projects = await syncAllProjects();
      res.json({ success: true, count: projects.length, projects });
    } catch (error) {
      log.error("GitHub sync failed", { error: String(error) });
      res.status(500).json({
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // POST /api/projects/:repoName/sync — sync a single repo (admin only)
  app.post("/api/projects/:repoName/sync", async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const adminId = process.env.ADMIN_USER_ID;
    if (user.id !== adminId) {
      return res.status(403).json({ error: "Admin access required" });
    }

    try {
      const project = await syncSingleProject(req.params.repoName as string);
      if (!project) {
        return res.status(404).json({ error: "Repository not found" });
      }
      res.json({ success: true, project });
    } catch (error) {
      log.error("Single project sync failed", { error: String(error) });
      res.status(500).json({
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
}

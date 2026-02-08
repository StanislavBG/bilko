/**
 * Web Proxy Routes — Server-side page fetching and structure extraction.
 *
 * Fetches external web pages, extracts meaningful page structure
 * (headings, links, buttons, forms, paragraphs), and returns a
 * structured representation that the LLM can analyze to guide users.
 *
 * Used by the "Work With Me" flow to render wireframes and provide
 * element-level guidance overlays.
 *
 * POST /api/web-proxy/fetch   — Fetch and parse a single URL
 */

import { Router, type Request, type Response } from "express";
// @ts-expect-error — jsdom doesn't ship types; install @types/jsdom if needed
import { JSDOM } from "jsdom";

const router = Router();

// ── Types ──────────────────────────────────────────────────

export interface PageElement {
  /** Stable identifier for the agent to reference */
  id: string;
  /** Semantic type for rendering */
  type:
    | "heading"
    | "paragraph"
    | "link"
    | "button"
    | "form-field"
    | "image"
    | "list"
    | "list-item"
    | "section"
    | "nav-link";
  /** Original HTML tag */
  tag: string;
  /** Visible text content */
  text: string;
  /** Link href (for links/buttons with URLs) */
  href?: string;
  /** Heading level (1-6) */
  level?: number;
  /** Form field type (text, email, select, etc.) */
  fieldType?: string;
  /** Placeholder or label text */
  label?: string;
  /** Image alt text */
  alt?: string;
}

export interface PageStructure {
  /** The URL that was fetched */
  url: string;
  /** Resolved/final URL after redirects */
  finalUrl: string;
  /** Page title */
  title: string;
  /** Meta description */
  description: string;
  /** Extracted page elements in document order */
  elements: PageElement[];
  /** Timestamp of fetch */
  fetchedAt: number;
}

// ── Helpers ────────────────────────────────────────────────

/** Domain allowlist — only fetch pages from these TLDs/patterns */
const BLOCKED_PATTERNS = [
  /localhost/i,
  /127\.0\.0\./,
  /192\.168\./,
  /10\.\d+\./,
  /172\.(1[6-9]|2\d|3[01])\./,
  /\[::1\]/,
];

function isUrlSafe(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
    if (BLOCKED_PATTERNS.some((p) => p.test(parsed.hostname))) return false;
    return true;
  } catch {
    return false;
  }
}

let elementCounter = 0;

function makeId(prefix: string): string {
  return `${prefix}-${++elementCounter}`;
}

function extractText(el: Element): string {
  return (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 200);
}

function extractElements(doc: Document, baseUrl: string): PageElement[] {
  elementCounter = 0;
  const elements: PageElement[] = [];
  const seen = new Set<string>();

  // Walk the main content area — prefer <main>, fall back to <body>
  const root =
    doc.querySelector("main") ||
    doc.querySelector('[role="main"]') ||
    doc.querySelector("article") ||
    doc.body;

  if (!root) return elements;

  // Remove noise: scripts, styles, nav clutter, footers, ads
  const noise = root.querySelectorAll(
    "script, style, noscript, iframe, svg, .ad, .advertisement, [aria-hidden='true']"
  );
  noise.forEach((n) => n.remove());

  const walker = doc.createTreeWalker(root, 1 /* SHOW_ELEMENT */);

  let node: Node | null = walker.currentNode;
  while (node) {
    const el = node as Element;
    const tag = el.tagName?.toLowerCase();

    if (!tag) {
      node = walker.nextNode();
      continue;
    }

    // Headings
    if (/^h[1-6]$/.test(tag)) {
      const text = extractText(el);
      if (text && !seen.has(text)) {
        seen.add(text);
        elements.push({
          id: makeId("h"),
          type: "heading",
          tag,
          text,
          level: parseInt(tag[1]),
        });
      }
    }

    // Links (including nav links)
    if (tag === "a") {
      const text = extractText(el);
      const href = el.getAttribute("href");
      if (text && href && !seen.has(text + href)) {
        seen.add(text + href);
        let resolvedHref = href;
        try {
          resolvedHref = new URL(href, baseUrl).toString();
        } catch {
          // Keep relative
        }
        const isNav =
          el.closest("nav") !== null ||
          el.closest('[role="navigation"]') !== null;
        elements.push({
          id: makeId("a"),
          type: isNav ? "nav-link" : "link",
          tag,
          text,
          href: resolvedHref,
        });
      }
    }

    // Buttons
    if (
      tag === "button" ||
      (tag === "input" &&
        ["submit", "button"].includes(el.getAttribute("type") || ""))
    ) {
      const text =
        extractText(el) ||
        el.getAttribute("value") ||
        el.getAttribute("aria-label") ||
        "Button";
      if (!seen.has("btn:" + text)) {
        seen.add("btn:" + text);
        elements.push({
          id: makeId("btn"),
          type: "button",
          tag,
          text,
          href: el.closest("form")?.getAttribute("action") || undefined,
        });
      }
    }

    // Form fields
    if (
      tag === "input" &&
      !["submit", "button", "hidden"].includes(
        el.getAttribute("type") || "text"
      )
    ) {
      const label =
        el.getAttribute("aria-label") ||
        el.getAttribute("placeholder") ||
        el.getAttribute("name") ||
        "Input";
      elements.push({
        id: makeId("field"),
        type: "form-field",
        tag,
        text: label,
        fieldType: el.getAttribute("type") || "text",
        label,
      });
    }

    if (tag === "select") {
      const label =
        el.getAttribute("aria-label") ||
        el.getAttribute("name") ||
        "Dropdown";
      elements.push({
        id: makeId("field"),
        type: "form-field",
        tag,
        text: label,
        fieldType: "select",
        label,
      });
    }

    if (tag === "textarea") {
      const label =
        el.getAttribute("aria-label") ||
        el.getAttribute("placeholder") ||
        el.getAttribute("name") ||
        "Text area";
      elements.push({
        id: makeId("field"),
        type: "form-field",
        tag,
        text: label,
        fieldType: "textarea",
        label,
      });
    }

    // Paragraphs (skip very short ones)
    if (tag === "p") {
      const text = extractText(el);
      if (text && text.length > 20 && !seen.has(text)) {
        seen.add(text);
        elements.push({
          id: makeId("p"),
          type: "paragraph",
          tag,
          text,
        });
      }
    }

    // List items
    if (tag === "li") {
      const text = extractText(el);
      if (text && text.length > 5 && !seen.has(text)) {
        seen.add(text);
        elements.push({
          id: makeId("li"),
          type: "list-item",
          tag,
          text,
        });
      }
    }

    // Images with alt text
    if (tag === "img") {
      const alt = el.getAttribute("alt");
      if (alt && alt.length > 3) {
        elements.push({
          id: makeId("img"),
          type: "image",
          tag,
          text: alt,
          alt,
        });
      }
    }

    node = walker.nextNode();
  }

  // Cap at 100 elements to keep LLM context manageable
  return elements.slice(0, 100);
}

// ── Routes ─────────────────────────────────────────────────

router.post("/fetch", async (req: Request, res: Response) => {
  try {
    const { url } = req.body as { url?: string };

    if (!url || typeof url !== "string") {
      res.status(400).json({ error: "url is required" });
      return;
    }

    if (!isUrlSafe(url)) {
      res
        .status(400)
        .json({ error: "URL must be a public HTTP/HTTPS address" });
      return;
    }

    // Fetch the page with a reasonable timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; BilkoAssistant/1.0; +https://bilko.ai)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (!response.ok) {
      res.status(502).json({
        error: `Failed to fetch page: ${response.status} ${response.statusText}`,
      });
      return;
    }

    const html = await response.text();
    const finalUrl = response.url;

    // Parse with jsdom
    const dom = new JSDOM(html, { url: finalUrl });
    const doc = dom.window.document;

    const title =
      doc.querySelector("title")?.textContent?.trim() || "Untitled Page";
    const description =
      doc
        .querySelector('meta[name="description"]')
        ?.getAttribute("content")
        ?.trim() || "";

    const elements = extractElements(doc, finalUrl);

    const result: PageStructure = {
      url,
      finalUrl,
      title,
      description,
      elements,
      fetchedAt: Date.now(),
    };

    res.json(result);
  } catch (error) {
    console.error("[web-proxy] Fetch error:", error);
    if (error instanceof Error && error.name === "AbortError") {
      res.status(504).json({ error: "Page took too long to load" });
      return;
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;

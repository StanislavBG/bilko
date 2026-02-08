/**
 * add-project.ts — Workflow script for adding new projects to Bilko's project list.
 *
 * Usage:
 *   npx tsx script/add-project.ts <project-url> [--id=custom-id] [--status=live|beta|development]
 *
 * What it does:
 *   1. Fetches the project URL
 *   2. Extracts OG metadata (title, description, image) and favicon
 *   3. Prints a ready-to-paste project entry for client/src/data/projects.ts
 *   4. Validates the URL is reachable
 *
 * Example:
 *   npx tsx script/add-project.ts https://vibe-index.replit.app --status=live
 *
 * The output is a TypeScript object you can paste into the projects array.
 * Review and adjust the generated entry before committing.
 */

interface UnfurlResult {
  ogImage: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  favicon: string | null;
  themeColor: string | null;
}

function extractMeta(html: string, property: string): string | null {
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

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match?.[1]?.trim() || null;
}

function extractFavicon(html: string, baseUrl: string): string | null {
  const pattern = /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i;
  const altPattern = /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut )?icon["']/i;
  const match = html.match(pattern) || html.match(altPattern);
  if (match?.[1]) {
    const href = match[1];
    if (href.startsWith("http")) return href;
    if (href.startsWith("//")) return `https:${href}`;
    try { return new URL(href, baseUrl).href; } catch { return null; }
  }
  return null;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function inferCategory(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();
  if (text.includes("tennis") || text.includes("sport") || text.includes("hockey")) return "Sports & Education";
  if (text.includes("ai") || text.includes("llm") || text.includes("machine learning")) return "AI Tools";
  if (text.includes("developer") || text.includes("code") || text.includes("vibe")) return "Developer Tools";
  if (text.includes("family") || text.includes("social") || text.includes("connect")) return "Connected Living";
  if (text.includes("timeline") || text.includes("story") || text.includes("media")) return "Interactive Media";
  return "Web Application";
}

function extractFeatures(html: string): string[] {
  // Try to extract feature-like content from lists or headings
  const features: string[] = [];

  // Look for list items that might be features
  const liMatches = html.match(/<li[^>]*>([^<]{5,60})<\/li>/gi);
  if (liMatches) {
    for (const li of liMatches.slice(0, 6)) {
      const text = li.replace(/<[^>]+>/g, "").trim();
      if (text.length > 4 && text.length < 60 && !text.includes("{") && !text.includes("//")) {
        features.push(text);
      }
      if (features.length >= 4) break;
    }
  }

  return features;
}

async function main() {
  const args = process.argv.slice(2);
  const url = args.find((a) => !a.startsWith("--"));
  const idFlag = args.find((a) => a.startsWith("--id="))?.split("=")[1];
  const statusFlag = args.find((a) => a.startsWith("--status="))?.split("=")[1] || "live";

  if (!url) {
    console.error("Usage: npx tsx script/add-project.ts <project-url> [--id=custom-id] [--status=live|beta|development]");
    process.exit(1);
  }

  console.log(`\nScanning ${url}...\n`);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BilkoBot/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`Failed to fetch: HTTP ${response.status}`);
      console.log("\nGenerating template with placeholder values...\n");
    }

    const html = await response.text();

    const ogTitle = extractMeta(html, "og:title") || extractTitle(html) || "Untitled Project";
    const ogDescription = extractMeta(html, "og:description") || extractMeta(html, "description") || "TODO: Add description";
    const ogImage = extractMeta(html, "og:image");
    const favicon = extractFavicon(html, url);
    const themeColor = extractMeta(html, "theme-color");
    const features = extractFeatures(html);

    const id = idFlag || slugify(ogTitle);
    const category = inferCategory(ogTitle, ogDescription);

    console.log("=== Extracted Metadata ===");
    console.log(`  Title:       ${ogTitle}`);
    console.log(`  Description: ${ogDescription}`);
    console.log(`  OG Image:    ${ogImage || "(none)"}`);
    console.log(`  Favicon:     ${favicon || "(none)"}`);
    console.log(`  Theme Color: ${themeColor || "(none)"}`);
    console.log(`  Features:    ${features.length > 0 ? features.join(", ") : "(none detected)"}`);
    console.log();

    const projectEntry = {
      id,
      title: ogTitle,
      tagline: "TODO: Add tagline",
      description: ogDescription,
      url,
      features: features.length > 0 ? features : ["TODO: Add features"],
      category,
      status: statusFlag as "live" | "beta" | "development",
      techStack: ["TODO: Add tech stack"],
    };

    console.log("=== Project Entry (paste into client/src/data/projects.ts) ===\n");
    console.log(`  {`);
    console.log(`    id: "${projectEntry.id}",`);
    console.log(`    title: "${projectEntry.title}",`);
    console.log(`    tagline: "${projectEntry.tagline}",`);
    console.log(`    description: "${projectEntry.description}",`);
    console.log(`    url: "${projectEntry.url}",`);
    console.log(`    features: ${JSON.stringify(projectEntry.features)},`);
    console.log(`    category: "${projectEntry.category}",`);
    console.log(`    status: "${projectEntry.status}",`);
    console.log(`    techStack: ${JSON.stringify(projectEntry.techStack)}`);
    console.log(`  }`);
    console.log();
    console.log("NOTE: The ProjectImage component will automatically fetch the OG image");
    console.log("from the project URL at runtime — no static imageUrl needed.");
    console.log();
    console.log("Workflow: Review → paste into projects array → build → done.");

  } catch (error: any) {
    console.error(`Error scanning URL: ${error.message}`);
    console.log("\nGenerating blank template...\n");

    const hostname = new URL(url).hostname.replace(/\.replit\.app$/, "").replace(/\./g, "-");
    const id = idFlag || hostname;

    console.log(`  {`);
    console.log(`    id: "${id}",`);
    console.log(`    title: "TODO: Project Title",`);
    console.log(`    tagline: "TODO: Add tagline",`);
    console.log(`    description: "TODO: Add description",`);
    console.log(`    url: "${url}",`);
    console.log(`    features: ["TODO: Add features"],`);
    console.log(`    category: "Web Application",`);
    console.log(`    status: "live",`);
    console.log(`    techStack: ["TODO: Add tech stack"]`);
    console.log(`  }`);
  }
}

main();

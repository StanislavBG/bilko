/**
 * Rules Validation Script (AGT-002 automated checks)
 *
 * Validates that manifest.json and rule files stay in sync,
 * structural integrity is maintained, and routing covers all rules.
 *
 * Usage:
 *   npm run rules:validate
 *   npx tsx script/validate-rules.ts
 *
 * Exit codes:
 *   0 = all checks pass
 *   1 = critical or warning findings
 */

import fs from "node:fs";
import path from "node:path";

const RULES_DIR = path.resolve(import.meta.dirname, "..", "rules");
const MANIFEST_PATH = path.join(RULES_DIR, "manifest.json");
const PERSONAS_DIR = path.resolve(import.meta.dirname, "..", "personas");

interface Finding {
  severity: "CRITICAL" | "WARNING" | "INFO";
  check: string;
  message: string;
  location?: string;
}

const findings: Finding[] = [];

function addFinding(severity: Finding["severity"], check: string, message: string, location?: string) {
  findings.push({ severity, check, message, location });
}

// ── Load manifest ────────────────────────────────────────────────

let manifest: any;
try {
  const raw = fs.readFileSync(MANIFEST_PATH, "utf-8");
  manifest = JSON.parse(raw);
} catch (e) {
  console.error("CRITICAL: Cannot read or parse rules/manifest.json");
  process.exit(1);
}

const rules: Record<string, any> = manifest.rules ?? {};
const ruleIds = Object.keys(rules);

// ── Discover all .md files in rules/ ─────────────────────────────

// Directories inside rules/ that contain non-rule artifacts (backups, exports, etc.)
const EXCLUDED_DIRS = new Set(["artifacts"]);

function findMdFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      results.push(...findMdFiles(full));
    } else if (entry.name.endsWith(".md")) {
      results.push(path.relative(path.resolve(RULES_DIR, ".."), full));
    }
  }
  return results;
}

const allMdFiles = findMdFiles(RULES_DIR);
const manifestPaths = ruleIds.map((id) => rules[id].path);

// ── CHECK 1: Structural Integrity ───────────────────────────────

console.log("CHECK 1: Structural Integrity");

// 1a: Every manifest rule has a .md file
for (const id of ruleIds) {
  const rulePath = rules[id].path;
  const fullPath = path.resolve(RULES_DIR, "..", rulePath);
  if (!fs.existsSync(fullPath)) {
    addFinding("CRITICAL", "CHECK 1", `Rule ${id} references missing file`, rulePath);
  }
}

// 1b: Every .md file is in manifest (except index.md files which may be in subManifests)
const subManifestPaths = (manifest.subManifests?.entries ?? []).map((e: any) => e.path);
for (const mdFile of allMdFiles) {
  if (!manifestPaths.includes(mdFile) && !subManifestPaths.includes(mdFile)) {
    addFinding("WARNING", "CHECK 1", `File not registered in manifest`, mdFile);
  }
}

// 1c: Dependencies reference valid IDs
for (const id of ruleIds) {
  for (const dep of rules[id].dependencies ?? []) {
    if (!rules[dep]) {
      addFinding("CRITICAL", "CHECK 1", `Rule ${id} depends on unknown rule ${dep}`);
    }
  }
}

// 1d: Cross-references reference valid IDs (allow PER-* references)
for (const id of ruleIds) {
  for (const ref of rules[id].crossReferences ?? []) {
    if (!rules[ref] && !ref.startsWith("PER-")) {
      addFinding("WARNING", "CHECK 1", `Rule ${id} cross-references unknown rule ${ref}`);
    }
  }
}

// 1e: Every rule has at least one trigger
for (const id of ruleIds) {
  const triggers = rules[id].triggers ?? [];
  if (triggers.length === 0) {
    addFinding("WARNING", "CHECK 1", `Rule ${id} has no triggers (unreachable by routing)`);
  }
}

// 1f: Version follows semver pattern
const semverRe = /^\d+\.\d+\.\d+$/;
for (const id of ruleIds) {
  const version = rules[id].version;
  if (!semverRe.test(version)) {
    addFinding("WARNING", "CHECK 1", `Rule ${id} has invalid version: ${version}`);
  }
}

// 1g: Required fields present
for (const id of ruleIds) {
  const rule = rules[id];
  for (const field of ["id", "title", "path", "partition", "priority", "version"]) {
    if (!rule[field]) {
      addFinding("CRITICAL", "CHECK 1", `Rule ${id} missing required field: ${field}`);
    }
  }
}

const check1Findings = findings.filter((f) => f.check === "CHECK 1");
console.log(`  ${check1Findings.length === 0 ? "PASS" : `${check1Findings.length} finding(s)`}`);

// ── CHECK 2: Routing Coverage ────────────────────────────────────

console.log("CHECK 2: Routing Coverage");

const routing = manifest.routing;
if (!routing) {
  addFinding("WARNING", "CHECK 2", "No routing section in manifest");
} else {
  // 2a: alwaysInclude rules exist
  for (const id of routing.alwaysInclude ?? []) {
    if (!rules[id]) {
      addFinding("CRITICAL", "CHECK 2", `alwaysInclude references unknown rule: ${id}`);
    }
  }

  // 2b: Check that every rule is reachable (via triggers matched by at least one redFlag pattern)
  const alwaysIncluded = new Set(routing.alwaysInclude ?? []);
  const patterns = (routing.redFlags ?? []).map((rf: any) => new RegExp(rf.pattern, "i"));

  for (const id of ruleIds) {
    if (alwaysIncluded.has(id)) continue;
    const triggers = rules[id].triggers ?? [];
    const matchesAny = triggers.some((trigger: string) =>
      patterns.some((p: RegExp) => p.test(trigger))
    );
    if (!matchesAny) {
      addFinding("INFO", "CHECK 2", `Rule ${id} triggers don't match any routing redFlag pattern`);
    }
  }
}

const check2Findings = findings.filter((f) => f.check === "CHECK 2");
console.log(`  ${check2Findings.length === 0 ? "PASS" : `${check2Findings.length} finding(s)`}`);

// ── CHECK 3: Dependency Cycles ───────────────────────────────────

console.log("CHECK 3: Dependency Cycles");

function detectCycles(): string[] {
  const cycles: string[] = [];
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(node: string, pathSoFar: string[]) {
    if (inStack.has(node)) {
      const cycleStart = pathSoFar.indexOf(node);
      cycles.push(pathSoFar.slice(cycleStart).concat(node).join(" → "));
      return;
    }
    if (visited.has(node)) return;
    visited.add(node);
    inStack.add(node);
    for (const dep of rules[node]?.dependencies ?? []) {
      if (rules[dep]) {
        dfs(dep, [...pathSoFar, node]);
      }
    }
    inStack.delete(node);
  }

  for (const id of ruleIds) {
    dfs(id, []);
  }
  return cycles;
}

const cycles = detectCycles();
for (const cycle of cycles) {
  addFinding("CRITICAL", "CHECK 3", `Dependency cycle detected: ${cycle}`);
}

const check3Findings = findings.filter((f) => f.check === "CHECK 3");
console.log(`  ${check3Findings.length === 0 ? "PASS" : `${check3Findings.length} finding(s)`}`);

// ── CHECK 4: Rule File Content Validation ────────────────────────

console.log("CHECK 4: Rule File Content Structure");

for (const id of ruleIds) {
  const rulePath = rules[id].path;
  const fullPath = path.resolve(RULES_DIR, "..", rulePath);
  if (!fs.existsSync(fullPath)) continue;

  const content = fs.readFileSync(fullPath, "utf-8");

  // 4a: File should contain its own Rule ID (either "Rule ID: X" or "# X:" heading format)
  const hasExplicitId = content.includes(`Rule ID: ${id}`) || content.includes(`Rule ID:${id}`);
  const hasHeadingId = new RegExp(`^#\\s+${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[:\\s]`, "m").test(content);
  if (!hasExplicitId && !hasHeadingId) {
    addFinding("WARNING", "CHECK 4", `Rule file does not reference its own ID "${id}"`, rulePath);
  }

  // 4b: File should have at least one heading
  if (!content.match(/^#\s+/m)) {
    addFinding("WARNING", "CHECK 4", `Rule file has no top-level heading`, rulePath);
  }

  // 4c: File should have directives or purpose section
  if (!content.match(/##\s+(Directives|Purpose|Contracts|Context)/i)) {
    addFinding("INFO", "CHECK 4", `Rule file has no Directives/Purpose section`, rulePath);
  }
}

const check4Findings = findings.filter((f) => f.check === "CHECK 4");
console.log(`  ${check4Findings.length === 0 ? "PASS" : `${check4Findings.length} finding(s)`}`);

// ── CHECK 5: Sub-Manifest Validation ─────────────────────────────

console.log("CHECK 5: Sub-Manifest Discovery");

const subManifests = manifest.subManifests?.entries ?? [];

// 5a: All sub-manifest paths exist
for (const entry of subManifests) {
  const fullPath = path.resolve(RULES_DIR, "..", entry.path);
  if (!fs.existsSync(fullPath)) {
    addFinding("CRITICAL", "CHECK 5", `Sub-manifest file missing: ${entry.path}`, entry.id);
  }
}

// 5b: All index.md files in rules/ are registered
const indexFiles = allMdFiles.filter((f) => f.endsWith("index.md"));
for (const indexFile of indexFiles) {
  const registered = subManifests.some((e: any) => e.path === indexFile);
  if (!registered) {
    addFinding("WARNING", "CHECK 5", `Index file not in subManifests`, indexFile);
  }
}

// 5c: relatedRules reference valid IDs
for (const entry of subManifests) {
  for (const ruleId of entry.relatedRules ?? []) {
    if (!rules[ruleId]) {
      addFinding("WARNING", "CHECK 5", `Sub-manifest ${entry.id} references unknown rule: ${ruleId}`);
    }
  }
}

const check5Findings = findings.filter((f) => f.check === "CHECK 5");
console.log(`  ${check5Findings.length === 0 ? "PASS" : `${check5Findings.length} finding(s)`}`);

// ── CHECK 6: Partition Integrity ─────────────────────────────────

console.log("CHECK 6: Partition Integrity");

const knownPartitions = new Set(Object.keys(manifest.partitions ?? {}));

for (const id of ruleIds) {
  const partition = rules[id].partition;
  if (!knownPartitions.has(partition)) {
    addFinding("WARNING", "CHECK 6", `Rule ${id} uses unknown partition: ${partition}`);
  }
}

// Check partition directories exist
for (const [name, info] of Object.entries(manifest.partitions ?? {}) as [string, any][]) {
  const dirPath = path.resolve(RULES_DIR, "..", info.path);
  if (!fs.existsSync(dirPath)) {
    addFinding("CRITICAL", "CHECK 6", `Partition directory missing: ${info.path}`, name);
  }
}

const check6Findings = findings.filter((f) => f.check === "CHECK 6");
console.log(`  ${check6Findings.length === 0 ? "PASS" : `${check6Findings.length} finding(s)`}`);

// ── Report ───────────────────────────────────────────────────────

console.log("\n===========================================");
console.log("RULES VALIDATION REPORT");
console.log(`Date: ${new Date().toISOString()}`);
console.log("===========================================\n");

const critical = findings.filter((f) => f.severity === "CRITICAL");
const warnings = findings.filter((f) => f.severity === "WARNING");
const info = findings.filter((f) => f.severity === "INFO");

console.log(`Rules in manifest: ${ruleIds.length}`);
console.log(`Rule files found:  ${allMdFiles.length}`);
console.log(`Partitions:        ${knownPartitions.size}`);
console.log();

if (findings.length === 0) {
  console.log("ALL CHECKS PASSED - Rules system is healthy\n");
} else {
  console.log(`Total findings: ${findings.length}`);
  console.log(`  Critical: ${critical.length}`);
  console.log(`  Warning:  ${warnings.length}`);
  console.log(`  Info:     ${info.length}`);
  console.log();

  if (critical.length > 0) {
    console.log("CRITICAL:");
    for (const f of critical) {
      console.log(`  [${f.check}] ${f.message}${f.location ? ` (${f.location})` : ""}`);
    }
    console.log();
  }

  if (warnings.length > 0) {
    console.log("WARNINGS:");
    for (const f of warnings) {
      console.log(`  [${f.check}] ${f.message}${f.location ? ` (${f.location})` : ""}`);
    }
    console.log();
  }

  if (info.length > 0) {
    console.log("INFO:");
    for (const f of info) {
      console.log(`  [${f.check}] ${f.message}${f.location ? ` (${f.location})` : ""}`);
    }
    console.log();
  }
}

// Exit with error if critical or warning findings
if (critical.length > 0 || warnings.length > 0) {
  console.log("VALIDATION FAILED - Fix critical/warning issues before committing\n");
  process.exit(1);
} else {
  console.log("VALIDATION PASSED\n");
  process.exit(0);
}

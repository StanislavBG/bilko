import { readFile, stat } from "fs/promises";
import { AuditCheck, AuditResult, PatternCheck, FileEvidence, AuditEvidence } from "./types";

const FORBIDDEN_IN_REPLIT_MD = [
  { pattern: /^##\s*Design Principles/im, label: "Design Principles section" },
  { pattern: /^###\s*D\d+:/im, label: "Directive headings (D1:, D2:, etc.)" },
  { pattern: /\*\*DO\*\*:/i, label: "DO/DON'T directive format" },
  { pattern: /\*\*DON'T\*\*:/i, label: "DO/DON'T directive format" },
  { pattern: /^##\s*Red Flags/im, label: "Red Flags section" },
  { pattern: /^##\s*Directives/im, label: "Directives section" },
];

async function getFileEvidence(filePath: string, maxPreviewLines = 20): Promise<FileEvidence> {
  try {
    const fileStats = await stat(filePath);
    const content = await readFile(filePath, "utf-8");
    const lines = content.split("\n");
    const previewLines = lines.slice(0, maxPreviewLines);
    
    return {
      path: filePath,
      exists: true,
      sizeBytes: fileStats.size,
      lineCount: lines.length,
      contentPreview: previewLines.join("\n") + (lines.length > maxPreviewLines ? "\n..." : ""),
    };
  } catch {
    return {
      path: filePath,
      exists: false,
    };
  }
}

function findLineNumber(content: string, pattern: RegExp): number | undefined {
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) {
      return i + 1;
    }
  }
  return undefined;
}

function getMatchedText(content: string, pattern: RegExp): string | undefined {
  const match = content.match(pattern);
  return match ? match[0] : undefined;
}

const replitMdBoundaries: AuditCheck = {
  id: "AUDIT-001",
  name: "replit.md Boundaries",
  description: "Ensures replit.md contains only bootstrap content, no rule spillage",
  severity: "critical",
  run: async (): Promise<AuditResult> => {
    const timestamp = new Date().toISOString();
    const filePath = "replit.md";
    
    try {
      const content = await readFile(filePath, "utf-8");
      const fileEvidence = await getFileEvidence(filePath, 30);
      
      const patternsChecked: PatternCheck[] = FORBIDDEN_IN_REPLIT_MD.map(({ pattern, label }) => {
        const found = pattern.test(content);
        return {
          pattern: pattern.source,
          label,
          found,
          matchedText: found ? getMatchedText(content, pattern) : undefined,
          lineNumber: found ? findLineNumber(content, pattern) : undefined,
        };
      });

      const violations = patternsChecked.filter(p => p.found);
      const passed = violations.length === 0;

      const evidence: AuditEvidence = {
        filesExamined: [fileEvidence],
        patternsChecked,
        summary: passed 
          ? `Scanned ${fileEvidence.lineCount} lines for ${patternsChecked.length} forbidden patterns. No violations found.`
          : `Found ${violations.length} forbidden pattern(s) in replit.md that indicate rule spillage.`,
      };

      return {
        checkId: "AUDIT-001",
        endpoint: "GET /api/audit",
        runTimestamp: timestamp,
        checkName: "replit.md Boundaries",
        checkDescription: "Ensures replit.md contains only bootstrap content, no rule spillage",
        severity: "critical",
        passed,
        message: passed ? "replit.md is clean - bootstrap content only" : "replit.md contains forbidden rule content",
        details: violations.map(v => `Line ${v.lineNumber}: ${v.label} - "${v.matchedText}"`),
        evidence,
      };
    } catch (err) {
      return {
        checkId: "AUDIT-001",
        endpoint: "GET /api/audit",
        runTimestamp: timestamp,
        checkName: "replit.md Boundaries",
        checkDescription: "Ensures replit.md contains only bootstrap content, no rule spillage",
        severity: "critical",
        passed: false,
        message: "Failed to read replit.md",
        details: [(err as Error).message],
        evidence: {
          filesExamined: [{ path: filePath, exists: false }],
          summary: `Could not read ${filePath}: ${(err as Error).message}`,
        },
      };
    }
  },
};

const rulesManifestIntegrity: AuditCheck = {
  id: "AUDIT-002",
  name: "Rules Manifest Integrity",
  description: "Validates rules/manifest.json structure and verifies all rule files exist",
  severity: "critical",
  run: async (): Promise<AuditResult> => {
    const timestamp = new Date().toISOString();
    const manifestPath = "rules/manifest.json";
    const filesExamined: FileEvidence[] = [];
    const validationSteps: { step: string; result: string; passed: boolean }[] = [];

    try {
      const manifestEvidence = await getFileEvidence(manifestPath);
      filesExamined.push(manifestEvidence);

      validationSteps.push({
        step: "Check manifest file exists",
        result: manifestEvidence.exists ? `Found at ${manifestPath} (${manifestEvidence.sizeBytes} bytes)` : "File not found",
        passed: manifestEvidence.exists,
      });

      if (!manifestEvidence.exists) {
        return {
          checkId: "AUDIT-002",
          endpoint: "GET /api/audit",
          runTimestamp: timestamp,
          checkName: "Rules Manifest Integrity",
          checkDescription: "Validates rules/manifest.json structure and verifies all rule files exist",
          severity: "critical",
          passed: false,
          message: "rules/manifest.json not found",
          evidence: { filesExamined, validationSteps, summary: "Manifest file does not exist" },
        };
      }

      const content = await readFile(manifestPath, "utf-8");
      let manifest: any;
      
      try {
        manifest = JSON.parse(content);
        validationSteps.push({
          step: "Parse JSON",
          result: "Valid JSON syntax",
          passed: true,
        });
      } catch (parseErr) {
        validationSteps.push({
          step: "Parse JSON",
          result: `Invalid JSON: ${(parseErr as Error).message}`,
          passed: false,
        });
        return {
          checkId: "AUDIT-002",
          endpoint: "GET /api/audit",
          runTimestamp: timestamp,
          checkName: "Rules Manifest Integrity",
          checkDescription: "Validates rules/manifest.json structure and verifies all rule files exist",
          severity: "critical",
          passed: false,
          message: "rules/manifest.json contains invalid JSON",
          details: [(parseErr as Error).message],
          evidence: { filesExamined, validationSteps, summary: "JSON parse error" },
        };
      }

      const hasRulesObject = manifest.rules && typeof manifest.rules === "object";
      validationSteps.push({
        step: "Check 'rules' object exists",
        result: hasRulesObject ? `Found 'rules' object with ${Object.keys(manifest.rules).length} entries` : "Missing 'rules' object",
        passed: hasRulesObject,
      });

      if (!hasRulesObject) {
        return {
          checkId: "AUDIT-002",
          endpoint: "GET /api/audit",
          runTimestamp: timestamp,
          checkName: "Rules Manifest Integrity",
          checkDescription: "Validates rules/manifest.json structure and verifies all rule files exist",
          severity: "critical",
          passed: false,
          message: "manifest.json missing 'rules' object",
          evidence: { filesExamined, validationSteps, summary: "Missing required 'rules' object" },
        };
      }

      const ruleIds = Object.keys(manifest.rules);
      const missingFiles: string[] = [];
      
      for (const ruleId of ruleIds) {
        const ruleMeta = manifest.rules[ruleId];
        const rulePath = ruleMeta.path;
        const ruleEvidence = await getFileEvidence(rulePath, 5);
        filesExamined.push(ruleEvidence);
        
        if (!ruleEvidence.exists) {
          missingFiles.push(`${ruleId}: ${rulePath}`);
        }
      }

      validationSteps.push({
        step: `Verify ${ruleIds.length} rule files exist`,
        result: missingFiles.length === 0 
          ? `All ${ruleIds.length} rule files found`
          : `Missing ${missingFiles.length} files: ${missingFiles.join(", ")}`,
        passed: missingFiles.length === 0,
      });

      const passed = missingFiles.length === 0;

      return {
        checkId: "AUDIT-002",
        endpoint: "GET /api/audit",
        runTimestamp: timestamp,
        checkName: "Rules Manifest Integrity",
        checkDescription: "Validates rules/manifest.json structure and verifies all rule files exist",
        severity: "critical",
        passed,
        message: passed 
          ? `Rules manifest valid with ${ruleIds.length} rules, all files verified`
          : `${missingFiles.length} rule file(s) missing`,
        details: missingFiles.length > 0 ? missingFiles : undefined,
        evidence: {
          filesExamined,
          validationSteps,
          summary: `Validated manifest structure and checked ${ruleIds.length} rule files. ${passed ? "All files exist." : `${missingFiles.length} missing.`}`,
        },
      };
    } catch (err) {
      return {
        checkId: "AUDIT-002",
        endpoint: "GET /api/audit",
        runTimestamp: timestamp,
        checkName: "Rules Manifest Integrity",
        checkDescription: "Validates rules/manifest.json structure and verifies all rule files exist",
        severity: "critical",
        passed: false,
        message: "Failed to validate rules manifest",
        details: [(err as Error).message],
        evidence: { filesExamined, validationSteps, summary: `Error: ${(err as Error).message}` },
      };
    }
  },
};

const primaryDirectivePresent: AuditCheck = {
  id: "AUDIT-003",
  name: "Primary Directive Reference",
  description: "Ensures replit.md contains pointer to Primary Directive and rules location",
  severity: "critical",
  run: async (): Promise<AuditResult> => {
    const timestamp = new Date().toISOString();
    const filePath = "replit.md";
    const validationSteps: { step: string; result: string; passed: boolean }[] = [];

    try {
      const content = await readFile(filePath, "utf-8");
      const lines = content.split("\n");
      const fileEvidence = await getFileEvidence(filePath, 30);
      
      const relevantLines: { lineNumber: number; content: string }[] = [];
      
      const hasPrimaryDirective = content.includes("Primary Directive");
      let primaryDirectiveLine: number | undefined;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("Primary Directive")) {
          primaryDirectiveLine = i + 1;
          relevantLines.push({ lineNumber: i + 1, content: lines[i] });
        }
      }

      validationSteps.push({
        step: "Check 'Primary Directive' reference",
        result: hasPrimaryDirective 
          ? `Found on line ${primaryDirectiveLine}: "${lines[primaryDirectiveLine! - 1].trim()}"`
          : "Not found in file",
        passed: hasPrimaryDirective,
      });

      const hasRulesLocation = content.includes("/rules/");
      let rulesLocationLine: number | undefined;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("/rules/")) {
          rulesLocationLine = i + 1;
          relevantLines.push({ lineNumber: i + 1, content: lines[i] });
        }
      }

      validationSteps.push({
        step: "Check '/rules/' location pointer",
        result: hasRulesLocation
          ? `Found on line ${rulesLocationLine}: "${lines[rulesLocationLine! - 1].trim()}"`
          : "Not found in file",
        passed: hasRulesLocation,
      });

      fileEvidence.relevantLines = relevantLines;

      const passed = hasPrimaryDirective && hasRulesLocation;

      return {
        checkId: "AUDIT-003",
        endpoint: "GET /api/audit",
        runTimestamp: timestamp,
        checkName: "Primary Directive Reference",
        checkDescription: "Ensures replit.md contains pointer to Primary Directive and rules location",
        severity: "critical",
        passed,
        message: passed 
          ? "Primary Directive and rules location present"
          : `Missing: ${!hasPrimaryDirective ? "Primary Directive reference" : ""}${!hasPrimaryDirective && !hasRulesLocation ? ", " : ""}${!hasRulesLocation ? "/rules/ location pointer" : ""}`,
        evidence: {
          filesExamined: [fileEvidence],
          validationSteps,
          summary: passed
            ? `Found Primary Directive reference (line ${primaryDirectiveLine}) and rules location pointer (line ${rulesLocationLine})`
            : `Bootstrap pointers incomplete. ${!hasPrimaryDirective ? "Missing Primary Directive. " : ""}${!hasRulesLocation ? "Missing /rules/ pointer." : ""}`,
        },
      };
    } catch (err) {
      return {
        checkId: "AUDIT-003",
        endpoint: "GET /api/audit",
        runTimestamp: timestamp,
        checkName: "Primary Directive Reference",
        checkDescription: "Ensures replit.md contains pointer to Primary Directive and rules location",
        severity: "critical",
        passed: false,
        message: "Failed to read replit.md",
        details: [(err as Error).message],
        evidence: {
          filesExamined: [{ path: filePath, exists: false }],
          validationSteps,
          summary: `Could not read ${filePath}: ${(err as Error).message}`,
        },
      };
    }
  },
};

export const auditChecks: AuditCheck[] = [
  replitMdBoundaries,
  rulesManifestIntegrity,
  primaryDirectivePresent,
];

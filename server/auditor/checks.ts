import { readFile } from "fs/promises";
import { AuditCheck, AuditResult } from "./types";

const FORBIDDEN_IN_REPLIT_MD = [
  { pattern: /^##\s*Design Principles/im, label: "Design Principles section" },
  { pattern: /^###\s*D\d+:/im, label: "Directive headings (D1:, D2:, etc.)" },
  { pattern: /\*\*DO\*\*:/i, label: "DO/DON'T directive format" },
  { pattern: /\*\*DON'T\*\*:/i, label: "DO/DON'T directive format" },
  { pattern: /^##\s*Red Flags/im, label: "Red Flags section" },
  { pattern: /^##\s*Directives/im, label: "Directives section" },
];

const replitMdBoundaries: AuditCheck = {
  id: "AUDIT-001",
  name: "replit.md Boundaries",
  description: "Ensures replit.md contains only bootstrap content, no rule spillage",
  severity: "critical",
  run: async (): Promise<AuditResult> => {
    const baseResult = {
      checkId: "AUDIT-001",
      endpoint: "GET /api/audit",
      runTimestamp: new Date().toISOString(),
      checkName: "replit.md Boundaries",
      checkDescription: "Ensures replit.md contains only bootstrap content, no rule spillage",
    };

    try {
      const content = await readFile("replit.md", "utf-8");
      const violations: string[] = [];

      for (const { pattern, label } of FORBIDDEN_IN_REPLIT_MD) {
        if (pattern.test(content)) {
          violations.push(label);
        }
      }

      if (violations.length > 0) {
        return {
          ...baseResult,
          passed: false,
          message: "replit.md contains forbidden rule content",
          details: violations,
        };
      }

      return {
        ...baseResult,
        passed: true,
        message: "replit.md is clean - bootstrap content only",
      };
    } catch (err) {
      return {
        ...baseResult,
        passed: false,
        message: "Failed to read replit.md",
        details: [(err as Error).message],
      };
    }
  },
};

const rulesManifestIntegrity: AuditCheck = {
  id: "AUDIT-002",
  name: "Rules Manifest Exists",
  description: "Ensures rules/manifest.json exists and is valid JSON",
  severity: "critical",
  run: async (): Promise<AuditResult> => {
    const baseResult = {
      checkId: "AUDIT-002",
      endpoint: "GET /api/audit",
      runTimestamp: new Date().toISOString(),
      checkName: "Rules Manifest Integrity",
      checkDescription: "Ensures rules/manifest.json exists and is valid JSON with proper structure",
    };

    try {
      const content = await readFile("rules/manifest.json", "utf-8");
      const manifest = JSON.parse(content);

      if (!manifest.rules || typeof manifest.rules !== "object") {
        return {
          ...baseResult,
          passed: false,
          message: "manifest.json missing 'rules' object",
        };
      }

      const ruleCount = Object.keys(manifest.rules).length;
      return {
        ...baseResult,
        passed: true,
        message: `Rules manifest valid with ${ruleCount} rules`,
      };
    } catch (err) {
      return {
        ...baseResult,
        passed: false,
        message: "Failed to read or parse rules/manifest.json",
        details: [(err as Error).message],
      };
    }
  },
};

const primaryDirectivePresent: AuditCheck = {
  id: "AUDIT-003",
  name: "Primary Directive in replit.md",
  description: "Ensures replit.md points to the Primary Directive",
  severity: "critical",
  run: async (): Promise<AuditResult> => {
    const baseResult = {
      checkId: "AUDIT-003",
      endpoint: "GET /api/audit",
      runTimestamp: new Date().toISOString(),
      checkName: "Primary Directive Reference",
      checkDescription: "Ensures replit.md contains pointer to Primary Directive and rules location",
    };

    try {
      const content = await readFile("replit.md", "utf-8");

      if (!content.includes("Primary Directive")) {
        return {
          ...baseResult,
          passed: false,
          message: "replit.md missing Primary Directive reference",
        };
      }

      if (!content.includes("/rules/")) {
        return {
          ...baseResult,
          passed: false,
          message: "replit.md missing rules location pointer",
        };
      }

      return {
        ...baseResult,
        passed: true,
        message: "Primary Directive and rules location present",
      };
    } catch (err) {
      return {
        ...baseResult,
        passed: false,
        message: "Failed to read replit.md",
        details: [(err as Error).message],
      };
    }
  },
};

export const auditChecks: AuditCheck[] = [
  replitMdBoundaries,
  rulesManifestIntegrity,
  primaryDirectivePresent,
];

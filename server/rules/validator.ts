import { existsSync } from "fs";
import { join } from "path";
import type { ValidationResult, ValidationError, Rule, Partition } from "./types";
import { loadManifest, getAllRules, getRedFlags } from "./manifest";

export function validateRulesIntegrity(): ValidationResult {
  const manifest = loadManifest();
  const allRules = getAllRules();
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const missingFiles: string[] = [];
  const orphanRules: string[] = [];
  
  const rulesByPartition: Record<Partition, number> = {
    shared: 0,
    architecture: 0,
    hub: 0,
    apps: 0,
    data: 0,
    ui: 0,
    integration: 0,
  };

  for (const rule of allRules) {
    rulesByPartition[rule.partition]++;
    
    const filePath = join(process.cwd(), rule.path);
    if (!existsSync(filePath)) {
      missingFiles.push(rule.id);
      errors.push({
        ruleId: rule.id,
        type: "missing_file",
        message: `Rule file not found: ${rule.path}`,
        severity: "error",
      });
    }

    for (const depId of rule.dependencies) {
      if (!manifest.rules[depId]) {
        errors.push({
          ruleId: rule.id,
          type: "missing_dependency",
          message: `Dependency ${depId} not found in manifest`,
          severity: "error",
        });
      }
    }

    for (const refId of rule.crossReferences) {
      if (!manifest.rules[refId]) {
        warnings.push({
          ruleId: rule.id,
          type: "missing_cross_reference",
          message: `Cross-reference ${refId} not found in manifest`,
          severity: "warning",
        });
      }
    }
  }

  const reachableRules = findReachableRules(allRules, manifest.primaryDirective);
  for (const rule of allRules) {
    if (!reachableRules.has(rule.id)) {
      if (rule.triggers.length === 0 || (rule.triggers.length === 1 && rule.triggers[0] === "")) {
        orphanRules.push(rule.id);
        warnings.push({
          ruleId: rule.id,
          type: "orphan_rule",
          message: `Rule has no triggers and is not reachable via dependencies`,
          severity: "warning",
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      totalRules: allRules.length,
      rulesByPartition,
      orphanRules,
      missingFiles,
    },
  };
}

function findReachableRules(allRules: Rule[], primaryDirectiveId: string): Set<string> {
  const reachable = new Set<string>();
  const manifest = loadManifest();
  const redFlags = getRedFlags();
  
  reachable.add(primaryDirectiveId);
  
  for (const id of manifest.routing.alwaysInclude) {
    reachable.add(id);
  }
  
  for (const rule of allRules) {
    if (rule.triggers.includes("*")) {
      reachable.add(rule.id);
    }
  }
  
  for (const rf of redFlags) {
    for (const partition of rf.partitions) {
      for (const rule of allRules) {
        if (rule.partition === partition) {
          reachable.add(rule.id);
        }
      }
    }
  }
  
  let changed = true;
  while (changed) {
    changed = false;
    for (const ruleId of Array.from(reachable)) {
      const rule = manifest.rules[ruleId];
      if (!rule) continue;
      
      for (const depId of rule.dependencies) {
        if (!reachable.has(depId)) {
          reachable.add(depId);
          changed = true;
        }
      }
      
      for (const refId of rule.crossReferences) {
        if (!reachable.has(refId)) {
          reachable.add(refId);
          changed = true;
        }
      }
    }
    
    for (const rule of allRules) {
      if (reachable.has(rule.id)) continue;
      for (const [otherId, otherRule] of Object.entries(manifest.rules)) {
        if (reachable.has(otherId)) {
          if (otherRule.dependencies.includes(rule.id) || otherRule.crossReferences.includes(rule.id)) {
            reachable.add(rule.id);
            changed = true;
            break;
          }
        }
      }
    }
  }
  
  return reachable;
}

export function validateRuleRouting(): { covered: string[]; uncovered: string[]; coverageDetails: Record<string, string[]> } {
  const allRules = getAllRules();
  const redFlags = getRedFlags();
  const manifest = loadManifest();
  const covered: string[] = [];
  const uncovered: string[] = [];
  const coverageDetails: Record<string, string[]> = {};
  
  for (const rule of allRules) {
    const reasons: string[] = [];
    
    if (rule.triggers.includes("*")) {
      reasons.push("wildcard trigger (*)");
    }
    
    if (manifest.routing.alwaysInclude.includes(rule.id)) {
      reasons.push("in alwaysInclude list");
    }
    
    for (const rf of redFlags) {
      if (rf.partitions.includes(rule.partition)) {
        reasons.push(`red flag pattern "${rf.pattern.source}" covers partition "${rule.partition}"`);
        break;
      }
    }
    
    for (const [otherId, otherRule] of Object.entries(manifest.rules)) {
      if (otherRule.dependencies.includes(rule.id)) {
        reasons.push(`dependency of ${otherId}`);
      }
      if (otherRule.crossReferences.includes(rule.id)) {
        reasons.push(`cross-reference from ${otherId}`);
      }
    }
    
    if (reasons.length > 0) {
      covered.push(rule.id);
      coverageDetails[rule.id] = reasons;
    } else {
      uncovered.push(rule.id);
    }
  }
  
  return { covered, uncovered, coverageDetails };
}

export function formatValidationReport(result: ValidationResult): string {
  const lines: string[] = [
    "=== Rules Validation Report ===",
    "",
    `Status: ${result.valid ? "VALID" : "INVALID"}`,
    `Total Rules: ${result.stats.totalRules}`,
    "",
    "Rules by Partition:",
  ];
  
  for (const [partition, count] of Object.entries(result.stats.rulesByPartition)) {
    lines.push(`  ${partition}: ${count}`);
  }
  
  if (result.errors.length > 0) {
    lines.push("", "ERRORS:");
    for (const err of result.errors) {
      lines.push(`  [${err.ruleId}] ${err.message}`);
    }
  }
  
  if (result.warnings.length > 0) {
    lines.push("", "WARNINGS:");
    for (const warn of result.warnings) {
      lines.push(`  [${warn.ruleId}] ${warn.message}`);
    }
  }
  
  if (result.stats.orphanRules.length > 0) {
    lines.push("", "ORPHAN RULES (no routing path):");
    for (const id of result.stats.orphanRules) {
      lines.push(`  ${id}`);
    }
  }
  
  lines.push("", "=== End Report ===");
  return lines.join("\n");
}

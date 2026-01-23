import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type { RulesManifest, Rule, Partition, PartitionConfig } from "./types";

const MANIFEST_PATH = join(process.cwd(), "rules", "manifest.json");

let cachedManifest: RulesManifest | null = null;

export function loadManifest(): RulesManifest {
  if (cachedManifest) {
    return cachedManifest;
  }

  if (!existsSync(MANIFEST_PATH)) {
    throw new Error(`Rules manifest not found at ${MANIFEST_PATH}`);
  }

  const content = readFileSync(MANIFEST_PATH, "utf-8");
  cachedManifest = JSON.parse(content) as RulesManifest;
  return cachedManifest;
}

export function reloadManifest(): RulesManifest {
  cachedManifest = null;
  return loadManifest();
}

export function getRule(ruleId: string): Rule | undefined {
  const manifest = loadManifest();
  return manifest.rules[ruleId];
}

export function getAllRules(): Rule[] {
  const manifest = loadManifest();
  return Object.values(manifest.rules);
}

export function getRulesByPartition(partition: Partition): Rule[] {
  const manifest = loadManifest();
  return Object.values(manifest.rules).filter(r => r.partition === partition);
}

export function getPartitionConfig(partition: Partition): PartitionConfig {
  const manifest = loadManifest();
  return manifest.partitions[partition];
}

export function getPrimaryDirective(): Rule {
  const manifest = loadManifest();
  const directive = manifest.rules[manifest.primaryDirective];
  if (!directive) {
    throw new Error(`Primary directive ${manifest.primaryDirective} not found in manifest`);
  }
  return directive;
}

export function getRuleDependencies(ruleId: string): Rule[] {
  const manifest = loadManifest();
  const rule = manifest.rules[ruleId];
  if (!rule) return [];
  
  return rule.dependencies
    .map(depId => manifest.rules[depId])
    .filter((r): r is Rule => r !== undefined);
}

export function getRuleCrossReferences(ruleId: string): Rule[] {
  const manifest = loadManifest();
  const rule = manifest.rules[ruleId];
  if (!rule) return [];
  
  return rule.crossReferences
    .map(refId => manifest.rules[refId])
    .filter((r): r is Rule => r !== undefined);
}

export function getRedFlags(): { pattern: RegExp; partitions: Partition[] }[] {
  const manifest = loadManifest();
  return manifest.routing.redFlags.map(rf => ({
    pattern: new RegExp(rf.pattern, "i"),
    partitions: rf.partitions,
  }));
}

export function getAlwaysIncludeRules(): Rule[] {
  const manifest = loadManifest();
  return manifest.routing.alwaysInclude
    .map(id => manifest.rules[id])
    .filter((r): r is Rule => r !== undefined);
}

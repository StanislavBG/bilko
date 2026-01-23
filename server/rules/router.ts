import type { Rule, Partition, RuleMatch, TaskRoutingResult } from "./types";
import { 
  loadManifest, 
  getAllRules, 
  getPrimaryDirective, 
  getRedFlags,
  getAlwaysIncludeRules,
  getRuleDependencies,
  getRuleCrossReferences,
  getPartitionConfig
} from "./manifest";

export function routeTask(taskDescription: string): TaskRoutingResult {
  const manifest = loadManifest();
  const allRules = getAllRules();
  const primaryDirective = getPrimaryDirective();
  const redFlags = getRedFlags();
  const alwaysInclude = getAlwaysIncludeRules();
  
  const matchedRules: RuleMatch[] = [];
  const matchedPartitions = new Set<Partition>();
  const addedRuleIds = new Set<string>();
  
  for (const rule of alwaysInclude) {
    if (!addedRuleIds.has(rule.id)) {
      matchedRules.push({
        rule,
        matchedTriggers: rule.triggers.includes("*") ? ["*"] : [],
        matchedRedFlags: [],
        fromDependency: false,
        fromCrossReference: false,
      });
      addedRuleIds.add(rule.id);
      matchedPartitions.add(rule.partition);
    }
  }
  
  const taskLower = taskDescription.toLowerCase();
  
  for (const rf of redFlags) {
    if (rf.pattern.test(taskLower)) {
      for (const partition of rf.partitions) {
        matchedPartitions.add(partition);
        
        for (const rule of allRules) {
          if (rule.partition === partition && !addedRuleIds.has(rule.id)) {
            matchedRules.push({
              rule,
              matchedTriggers: [],
              matchedRedFlags: [rf.pattern.source],
              fromDependency: false,
              fromCrossReference: false,
            });
            addedRuleIds.add(rule.id);
          }
        }
      }
    }
  }
  
  for (const rule of allRules) {
    if (addedRuleIds.has(rule.id)) continue;
    
    const matchedTriggers: string[] = [];
    for (const trigger of rule.triggers) {
      if (trigger && trigger !== "*" && taskLower.includes(trigger.toLowerCase())) {
        matchedTriggers.push(trigger);
      }
    }
    
    if (matchedTriggers.length > 0) {
      matchedRules.push({
        rule,
        matchedTriggers,
        matchedRedFlags: [],
        fromDependency: false,
        fromCrossReference: false,
      });
      addedRuleIds.add(rule.id);
      matchedPartitions.add(rule.partition);
    }
  }
  
  const rulesToExpand = [...matchedRules];
  while (rulesToExpand.length > 0) {
    const match = rulesToExpand.pop()!;
    
    const deps = getRuleDependencies(match.rule.id);
    for (const dep of deps) {
      if (!addedRuleIds.has(dep.id)) {
        const depMatch: RuleMatch = {
          rule: dep,
          matchedTriggers: [],
          matchedRedFlags: [],
          fromDependency: true,
          fromCrossReference: false,
        };
        matchedRules.push(depMatch);
        addedRuleIds.add(dep.id);
        matchedPartitions.add(dep.partition);
        rulesToExpand.push(depMatch);
      }
    }
    
    const refs = getRuleCrossReferences(match.rule.id);
    for (const ref of refs) {
      if (!addedRuleIds.has(ref.id)) {
        const refMatch: RuleMatch = {
          rule: ref,
          matchedTriggers: [],
          matchedRedFlags: [],
          fromDependency: false,
          fromCrossReference: true,
        };
        matchedRules.push(refMatch);
        addedRuleIds.add(ref.id);
        matchedPartitions.add(ref.partition);
        rulesToExpand.push(refMatch);
      }
    }
  }
  
  const partitionOrder = Array.from(matchedPartitions).sort((a, b) => {
    return getPartitionConfig(a).readOrder - getPartitionConfig(b).readOrder;
  });
  
  const priorityOrder: Record<string, number> = {
    "ABSOLUTE": 0,
    "CRITICAL": 1,
    "HIGH": 2,
    "MEDIUM": 3,
    "LOW": 4,
  };
  
  const readOrder = matchedRules
    .map(m => m.rule)
    .sort((a, b) => {
      const partitionDiff = getPartitionConfig(a.partition).readOrder - getPartitionConfig(b.partition).readOrder;
      if (partitionDiff !== 0) return partitionDiff;
      
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  
  const directlyMatched = matchedRules
    .filter(m => m.matchedTriggers.length > 0 || m.matchedRedFlags.length > 0)
    .map(m => m.rule.id);
  
  const citation = formatCitation(directlyMatched, partitionOrder, allRules);
  
  return {
    task: taskDescription,
    primaryDirective,
    matchedRules,
    partitionsToConsult: partitionOrder,
    readOrder,
    citation,
  };
}

function formatCitation(
  matchedIds: string[], 
  partitions: Partition[], 
  allRules: Rule[]
): string {
  const consulted = matchedIds.length > 0 ? matchedIds.join(", ") : "ARCH-000 (Primary Directive only)";
  
  const allPartitions: Partition[] = ["shared", "architecture", "hub", "apps", "data", "ui", "integration"];
  const notNeeded = allPartitions
    .filter(p => !partitions.includes(p))
    .map(p => {
      const prefix = p === "shared" ? "SHARED" : 
                     p === "architecture" ? "ARCH" :
                     p === "hub" ? "HUB" :
                     p === "apps" ? "APP" :
                     p === "data" ? "DATA" :
                     p === "ui" ? "UI" : "INT";
      return `${prefix}-*`;
    });
  
  let citation = `Rules consulted: ${consulted}`;
  if (notNeeded.length > 0) {
    citation += `\nNot applicable: ${notNeeded.join(", ")}`;
  }
  
  return citation;
}

export function suggestRulesForKeywords(keywords: string[]): Rule[] {
  const allRules = getAllRules();
  const matches: Rule[] = [];
  
  for (const rule of allRules) {
    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();
      for (const trigger of rule.triggers) {
        if (trigger.toLowerCase().includes(keywordLower) || keywordLower.includes(trigger.toLowerCase())) {
          if (!matches.find(m => m.id === rule.id)) {
            matches.push(rule);
          }
          break;
        }
      }
    }
  }
  
  return matches;
}

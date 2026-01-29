import type { Rule, ValidationResult, TaskRoutingResult } from "./types";
import { loadManifest, reloadManifest, getRule, getAllRules, getPrimaryDirective } from "./manifest";
import { routeTask, suggestRulesForKeywords } from "./router";

export class RulesService {
  private initialized = false;
  private ruleCount = 0;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    console.log("[RulesService] Initializing...");
    
    try {
      loadManifest();
      const allRules = getAllRules();
      this.ruleCount = allRules.length;
    } catch (error) {
      console.error("[RulesService] Failed to load manifest:", error);
      throw error;
    }
    
    console.log(`[RulesService] Loaded ${this.ruleCount} rules`);
    console.log("[RulesService] Validation is agentic - see AGT-002-RULES (agents/002-rules-audit.md)");
    
    this.initialized = true;
  }

  reload(): void {
    console.log("[RulesService] Reloading manifest...");
    reloadManifest();
    const allRules = getAllRules();
    this.ruleCount = allRules.length;
    console.log("[RulesService] Reload complete");
  }

  getPrimaryDirective(): Rule {
    return getPrimaryDirective();
  }

  getRule(ruleId: string): Rule | undefined {
    return getRule(ruleId);
  }

  getAllRules(): Rule[] {
    return getAllRules();
  }

  routeTask(taskDescription: string): TaskRoutingResult {
    const result = routeTask(taskDescription);
    
    console.log(`[RulesService] Routed task: "${taskDescription.substring(0, 50)}..."`);
    console.log(`[RulesService] Matched ${result.matchedRules.length} rules`);
    console.log(`[RulesService] Partitions: ${result.partitionsToConsult.join(", ")}`);
    
    return result;
  }

  suggestRules(keywords: string[]): Rule[] {
    return suggestRulesForKeywords(keywords);
  }

  getRuleCount(): number {
    return this.ruleCount;
  }

  formatCitationForTask(taskDescription: string): string {
    const result = this.routeTask(taskDescription);
    return `---\n${result.citation}\nPrimary Directive: Verified\n---`;
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

let serviceInstance: RulesService | null = null;

export function getRulesService(): RulesService {
  if (!serviceInstance) {
    serviceInstance = new RulesService();
  }
  return serviceInstance;
}

export async function initializeRulesService(): Promise<RulesService> {
  const service = getRulesService();
  await service.initialize();
  return service;
}

export type { Rule, TaskRoutingResult } from "./types";

import type { Rule, ValidationResult, TaskRoutingResult } from "./types";
import { loadManifest, reloadManifest, getRule, getAllRules, getPrimaryDirective } from "./manifest";
import { routeTask, suggestRulesForKeywords } from "./router";
import { createLogger } from "../logger";

const log = createLogger("rules");

export class RulesService {
  private initialized = false;
  private ruleCount = 0;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    log.info("Initializing...");
    
    try {
      loadManifest();
      const allRules = getAllRules();
      this.ruleCount = allRules.length;
    } catch (error) {
      log.error("Failed to load manifest", error);
      throw error;
    }
    
    log.info(`Loaded ${this.ruleCount} rules`);
    log.debug("Validation is agentic - see AGT-002-RULES (agents/002-rules-audit.md)");
    
    this.initialized = true;
  }

  reload(): void {
    log.info("Reloading manifest...");
    reloadManifest();
    const allRules = getAllRules();
    this.ruleCount = allRules.length;
    log.info("Reload complete");
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
    
    log.debug(`Routed task: "${taskDescription.substring(0, 50)}..."`);
    log.debug(`Matched ${result.matchedRules.length} rules, Partitions: ${result.partitionsToConsult.join(", ")}`);
    
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

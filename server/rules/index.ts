import type { Rule, ValidationResult, TaskRoutingResult } from "./types";
import { loadManifest, reloadManifest, getRule, getAllRules, getPrimaryDirective } from "./manifest";
import { validateRulesIntegrity, validateRuleRouting, formatValidationReport } from "./validator";
import { routeTask, suggestRulesForKeywords } from "./router";

export class RulesService {
  private initialized = false;
  private validationResult: ValidationResult | null = null;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    console.log("[RulesService] Initializing...");
    
    try {
      loadManifest();
    } catch (error) {
      console.error("[RulesService] Failed to load manifest:", error);
      throw error;
    }
    
    this.validationResult = validateRulesIntegrity();
    
    if (!this.validationResult.valid) {
      console.error("[RulesService] VALIDATION FAILED");
      console.error(formatValidationReport(this.validationResult));
      throw new Error("Rules validation failed. See errors above.");
    }
    
    const coverage = validateRuleRouting();
    if (coverage.uncovered.length > 0) {
      console.error("[RulesService] ROUTING COVERAGE FAILED");
      console.error("The following rules have no path to be reached:");
      for (const id of coverage.uncovered) {
        console.error(`  - ${id}`);
      }
      console.error("");
      console.error("Every rule must be reachable via:");
      console.error("  1. Being in the alwaysInclude list");
      console.error("  2. Having partition covered by a red flag pattern");
      console.error("  3. Being a dependency of a covered rule");
      console.error("  4. Being a cross-reference of a covered rule");
      console.error("  5. Having a wildcard (*) trigger");
      throw new Error("Rules routing coverage failed. All rules must be reachable.");
    }
    
    console.log("[RulesService] Validation passed");
    console.log(`[RulesService] Loaded ${this.validationResult.stats.totalRules} rules`);
    console.log("[RulesService] All rules are reachable via routing");
    
    if (this.validationResult.warnings.length > 0) {
      console.warn(`[RulesService] ${this.validationResult.warnings.length} warnings:`);
      for (const w of this.validationResult.warnings) {
        console.warn(`  [${w.ruleId}] ${w.message}`);
      }
    }
    
    this.initialized = true;
  }

  reload(): void {
    console.log("[RulesService] Reloading manifest...");
    reloadManifest();
    this.validationResult = validateRulesIntegrity();
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

  getValidationResult(): ValidationResult | null {
    return this.validationResult;
  }

  getRoutingCoverage(): { covered: string[]; uncovered: string[] } {
    return validateRuleRouting();
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

export type { Rule, ValidationResult, TaskRoutingResult } from "./types";

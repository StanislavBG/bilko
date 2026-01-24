import type { Express } from "express";
import { getRulesService } from "./index";
import fs from "fs";
import path from "path";

interface RuleMetadata {
  id: string;
  title: string;
  partition: string;
  priority: string;
  version: string;
  description: string;
  dependencies: string[];
  crossReferences: string[];
  triggers: string[];
}

interface PartitionInfo {
  id: string;
  description: string;
  readOrder: number;
  rules: RuleMetadata[];
}

interface RulesCatalogResponse {
  totalRules: number;
  partitions: PartitionInfo[];
  primaryDirectiveId: string;
}

interface RuleContentResponse {
  id: string;
  title: string;
  partition: string;
  priority: string;
  version: string;
  description: string;
  dependencies: string[];
  crossReferences: string[];
  content: string;
}

export function registerRulesRoutes(app: Express): void {
  app.get("/api/rules", (req, res) => {
    try {
      const rulesService = getRulesService();
      
      if (!rulesService.isInitialized()) {
        return res.status(503).json({ 
          error: "Rules service not initialized" 
        });
      }

      const allRules = rulesService.getAllRules();
      const primaryDirective = rulesService.getPrimaryDirective();

      const partitionMap = new Map<string, RuleMetadata[]>();
      const partitionOrder: Record<string, number> = {
        architecture: 0,
        shared: 1,
        hub: 2,
        ui: 3,
        data: 4,
        apps: 5,
        integration: 6
      };
      const partitionDescriptions: Record<string, string> = {
        architecture: "System-wide architectural rules and principles",
        shared: "Cross-project rules (copy to n8n project)",
        hub: "Application Hub shell and access control",
        ui: "User interface patterns and components",
        data: "Data model and persistence rules",
        apps: "Per-application specific rules",
        integration: "External service integration rules"
      };

      for (const rule of allRules) {
        const metadata: RuleMetadata = {
          id: rule.id,
          title: rule.title,
          partition: rule.partition,
          priority: rule.priority,
          version: rule.version,
          description: rule.description,
          dependencies: rule.dependencies,
          crossReferences: rule.crossReferences,
          triggers: rule.triggers
        };

        if (!partitionMap.has(rule.partition)) {
          partitionMap.set(rule.partition, []);
        }
        partitionMap.get(rule.partition)!.push(metadata);
      }

      const partitions: PartitionInfo[] = [];
      for (const [partitionId, rules] of Array.from(partitionMap.entries())) {
        rules.sort((a: RuleMetadata, b: RuleMetadata) => a.id.localeCompare(b.id));
        
        partitions.push({
          id: partitionId,
          description: partitionDescriptions[partitionId] || "",
          readOrder: partitionOrder[partitionId] ?? 99,
          rules
        });
      }

      partitions.sort((a, b) => a.readOrder - b.readOrder);

      const response: RulesCatalogResponse = {
        totalRules: allRules.length,
        partitions,
        primaryDirectiveId: primaryDirective.id
      };

      return res.json(response);
    } catch (error) {
      console.error("[Rules API] Error fetching rules catalog:", error);
      return res.status(500).json({ 
        error: "Failed to fetch rules catalog" 
      });
    }
  });

  app.get("/api/rules/:ruleId", (req, res) => {
    try {
      const rulesService = getRulesService();
      
      if (!rulesService.isInitialized()) {
        return res.status(503).json({ 
          error: "Rules service not initialized" 
        });
      }

      const { ruleId } = req.params;
      const rule = rulesService.getRule(ruleId);

      if (!rule) {
        return res.status(404).json({ 
          error: `Rule not found: ${ruleId}` 
        });
      }

      const filePath = path.resolve(process.cwd(), rule.path);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ 
          error: `Rule file not found: ${rule.path}` 
        });
      }

      const content = fs.readFileSync(filePath, "utf-8");

      const response: RuleContentResponse = {
        id: rule.id,
        title: rule.title,
        partition: rule.partition,
        priority: rule.priority,
        version: rule.version,
        description: rule.description,
        dependencies: rule.dependencies,
        crossReferences: rule.crossReferences,
        content
      };

      return res.json(response);
    } catch (error) {
      console.error("[Rules API] Error fetching rule:", error);
      return res.status(500).json({ 
        error: "Failed to fetch rule content" 
      });
    }
  });
}

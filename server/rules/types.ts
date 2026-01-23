export type Priority = "ABSOLUTE" | "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type Partition = 
  | "shared" 
  | "architecture" 
  | "hub" 
  | "apps" 
  | "data" 
  | "ui" 
  | "integration";

export interface Rule {
  id: string;
  title: string;
  path: string;
  partition: Partition;
  priority: Priority;
  version: string;
  triggers: string[];
  dependencies: string[];
  crossReferences: string[];
  description: string;
}

export interface PartitionConfig {
  path: string;
  description: string;
  readOrder: number;
}

export interface RedFlag {
  pattern: string;
  partitions: Partition[];
}

export interface RoutingConfig {
  redFlags: RedFlag[];
  alwaysInclude: string[];
}

export interface RulesManifest {
  $schema?: string;
  version: string;
  lastUpdated: string;
  primaryDirective: string;
  rules: Record<string, Rule>;
  partitions: Record<Partition, PartitionConfig>;
  routing: RoutingConfig;
}

export interface ValidationError {
  ruleId: string;
  type: "missing_file" | "missing_dependency" | "missing_cross_reference" | "orphan_rule" | "invalid_partition";
  message: string;
  severity: "error" | "warning";
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  stats: {
    totalRules: number;
    rulesByPartition: Record<Partition, number>;
    orphanRules: string[];
    missingFiles: string[];
  };
}

export interface RuleMatch {
  rule: Rule;
  matchedTriggers: string[];
  matchedRedFlags: string[];
  fromDependency: boolean;
  fromCrossReference: boolean;
}

export interface TaskRoutingResult {
  task: string;
  primaryDirective: Rule;
  matchedRules: RuleMatch[];
  partitionsToConsult: Partition[];
  readOrder: Rule[];
  citation: string;
}

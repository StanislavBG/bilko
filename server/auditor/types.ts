export interface AuditCheck {
  id: string;
  name: string;
  description: string;
  severity: "critical" | "warning" | "info";
  run: () => Promise<AuditResult>;
}

export interface AuditResult {
  checkId: string;
  passed: boolean;
  message: string;
  details?: string[];
  endpoint: string;
  runTimestamp: string;
  checkName: string;
  checkDescription: string;
}

export interface AuditReport {
  timestamp: Date;
  passed: boolean;
  criticalFailures: number;
  warnings: number;
  results: AuditResult[];
}

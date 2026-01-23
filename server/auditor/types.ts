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
}

export interface AuditReport {
  timestamp: Date;
  passed: boolean;
  criticalFailures: number;
  warnings: number;
  results: AuditResult[];
}

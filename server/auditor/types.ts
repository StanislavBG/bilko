export interface AuditCheck {
  id: string;
  name: string;
  description: string;
  severity: "critical" | "warning" | "info";
  run: () => Promise<AuditResult>;
}

export interface PatternCheck {
  pattern: string;
  label: string;
  found: boolean;
  matchedText?: string;
  lineNumber?: number;
}

export interface FileEvidence {
  path: string;
  exists: boolean;
  sizeBytes?: number;
  lineCount?: number;
  contentPreview?: string;
  relevantLines?: { lineNumber: number; content: string }[];
}

export interface AuditEvidence {
  filesExamined: FileEvidence[];
  patternsChecked?: PatternCheck[];
  validationSteps?: { step: string; result: string; passed: boolean }[];
  summary: string;
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
  severity: "critical" | "warning" | "info";
  evidence: AuditEvidence;
}

export interface AuditReport {
  timestamp: Date;
  passed: boolean;
  criticalFailures: number;
  warnings: number;
  results: AuditResult[];
}

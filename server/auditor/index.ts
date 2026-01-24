import type { Express, Request, Response, NextFunction } from "express";
import { auditChecks } from "./checks";
import { AuditReport, AuditResult } from "./types";

export async function runAudit(): Promise<AuditReport> {
  const results: AuditResult[] = [];
  let criticalFailures = 0;
  let warnings = 0;

  for (const check of auditChecks) {
    const result = await check.run();
    results.push(result);

    if (!result.passed) {
      if (check.severity === "critical") {
        criticalFailures++;
      } else if (check.severity === "warning") {
        warnings++;
      }
    }
  }

  return {
    timestamp: new Date(),
    passed: criticalFailures === 0,
    criticalFailures,
    warnings,
    results,
  };
}

export function registerAuditorRoutes(app: Express) {
  app.get("/api/audit", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const report = await runAudit();
      res.json(report);
    } catch (err) {
      next(err);
    }
  });
}

export async function validateOnStartup(): Promise<boolean> {
  const report = await runAudit();
  
  console.log("[Auditor] Running startup audit...");
  
  for (const result of report.results) {
    const status = result.passed ? "✓" : "✗";
    console.log(`[Auditor] ${status} ${result.checkId}: ${result.message}`);
    if (result.details && result.details.length > 0) {
      for (const detail of result.details) {
        console.log(`[Auditor]   - ${detail}`);
      }
    }
  }

  if (report.passed) {
    console.log("[Auditor] All checks passed");
  } else {
    console.error(`[Auditor] FAILED: ${report.criticalFailures} critical failures`);
  }

  return report.passed;
}

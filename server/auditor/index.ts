import type { Express, Request, Response, NextFunction } from "express";
import { readFile } from "fs/promises";
import { storage } from "../storage";
import { insertRuleAuditSchema } from "@shared/schema";

export function registerAuditorRoutes(app: Express) {
  // Get the Auditor Base Protocol markdown
  app.get("/api/audit/protocol", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const content = await readFile("rules/agent/002-auditor-base.md", "utf-8");
      res.json({ content });
    } catch (err) {
      next(err);
    }
  });

  // Get all saved audits
  app.get("/api/audits", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const audits = await storage.getAudits();
      res.json(audits);
    } catch (err) {
      next(err);
    }
  });

  // Save a new audit
  app.post("/api/audits", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = insertRuleAuditSchema.parse(req.body);
      const audit = await storage.createAudit(parsed);
      res.status(201).json(audit);
    } catch (err) {
      next(err);
    }
  });
}

export async function validateOnStartup(): Promise<boolean> {
  // With agentic auditing, we no longer run automated checks at startup
  // The Rules Service validates manifest on startup instead
  console.log("[Auditor] Agentic audit mode - no automated checks");
  console.log("[Auditor] Use 'Run Rule Audit' via chat to perform audits");
  return true;
}

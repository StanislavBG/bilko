import { randomUUID } from "crypto";

/**
 * Production callback URL fallback
 * Uses /api/workflows/callback — canonical path per INT-005 and ENV-001
 */
const PROD_CALLBACK_URL = "https://bilkobibitkov.replit.app/api/workflows/callback";

/**
 * Generate a unique trace ID for workflow execution tracking
 */
export function generateTraceId(): string {
  return `trace_${randomUUID().replace(/-/g, "").substring(0, 16)}`;
}

/**
 * Get the callback URL for workflow execution
 * Priority: Explicit env var > Dynamic domain detection > Prod fallback
 */
export function getCallbackUrl(): string {
  if (process.env.CALLBACK_URL_OVERRIDE) {
    return process.env.CALLBACK_URL_OVERRIDE;
  }

  if (process.env.REPLIT_DOMAINS) {
    const currentDomain = process.env.REPLIT_DOMAINS.split(",")[0];
    return `https://${currentDomain}/api/workflows/callback`;
  }

  return PROD_CALLBACK_URL;
}

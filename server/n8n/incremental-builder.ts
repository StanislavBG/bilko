/**
 * Incremental n8n workflow builder.
 *
 * Reads a human-curated manifest JSON and generates n8n nodes incrementally.
 * Supports building up to step N, so you can push, trigger, validate in Memory
 * Explorer, then add the next step.
 *
 * Rate limits applied from manifest config per INT-N8N-002 D11 / ISSUE-013.
 * Gemini headers per D10, D12. API key flow per D13. Parse per D14.
 */

import type { N8nNode } from "./client";
import type { WorkflowManifest, ManifestStep } from "./manifests/types";
import { getCallbackUrl } from "../lib/utils";
import * as fs from "fs";
import * as path from "path";

// ── Public types ──

export interface BuildOptions {
  /** Build up to and including this step ID. Omit to build all steps. */
  upToStep?: string;
  /** Enable troubleshoot mode: callback after every sub-node (prepare, http, parse). */
  troubleshoot?: boolean;
}

export interface BuildResult {
  nodes: N8nNode[];
  connections: Record<string, unknown>;
  /** Which manifest step IDs were included in this build */
  stepsBuilt: string[];
}

// ── Manifest loading ──

export function loadManifest(manifestId: string): WorkflowManifest | null {
  const manifestPath = path.join(__dirname, "manifests", `${manifestId}.json`);
  if (!fs.existsSync(manifestPath)) return null;
  return JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
}

export function listManifests(): string[] {
  const dir = path.join(__dirname, "manifests");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith(".json"))
    .map(f => f.replace(".json", ""));
}

// ── Builder ──

const STEP_X = 250;

export function buildFromManifest(
  manifest: WorkflowManifest,
  options: BuildOptions = {}
): BuildResult {
  const callbackUrl = getCallbackUrl();
  const nodes: N8nNode[] = [];
  const connections: Record<string, unknown> = {};
  const stepsBuilt: string[] = [];

  // Determine steps to include
  let steps = manifest.steps;
  if (options.upToStep) {
    const idx = steps.findIndex(s => s.id === options.upToStep);
    if (idx >= 0) steps = steps.slice(0, idx + 1);
  }

  const { rateLimits, gemini } = manifest;
  let x = 0;
  const Y = 125;

  // ── Triggers ──
  const hasSchedule = !!manifest.triggers.schedule;

  if (hasSchedule) {
    nodes.push({
      name: "Schedule Trigger",
      type: "n8n-nodes-base.scheduleTrigger",
      typeVersion: 1,
      position: [x, 0],
      parameters: {
        rule: {
          interval: [{ field: "cronExpression", expression: manifest.triggers.schedule!.cron }]
        }
      }
    });
  }

  nodes.push({
    name: "Webhook",
    type: "n8n-nodes-base.webhook",
    typeVersion: 1,
    position: [x, hasSchedule ? 250 : 0],
    parameters: {
      path: manifest.webhookPath,
      httpMethod: "POST",
      responseMode: "responseNode"
    }
  });

  let lastNode: string;

  if (hasSchedule) {
    x += STEP_X;
    nodes.push({
      name: "Merge Triggers",
      type: "n8n-nodes-base.merge",
      typeVersion: 2,
      position: [x, Y],
      parameters: { mode: "append" }
    });
    connections["Schedule Trigger"] = { main: [[{ node: "Merge Triggers", type: "main", index: 0 }]] };
    connections["Webhook"] = { main: [[{ node: "Merge Triggers", type: "main", index: 1 }]] };
    lastNode = "Merge Triggers";
  } else {
    lastNode = "Webhook";
  }

  // ── Steps ──

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const isFirst = i === 0;
    const isLast = i === steps.length - 1;
    stepsBuilt.push(step.id);

    const prepName = `Prepare ${step.name} Request`;
    const httpName = step.name;
    const parseName = `Parse ${step.name}`;

    // ── Prepare Code node ──
    x += STEP_X;
    nodes.push({
      name: prepName,
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [x, Y],
      parameters: { jsCode: genPrepareCode(step, manifest, isFirst, options.troubleshoot) }
    });
    connectNode(connections, lastNode, prepName);

    // ── Troubleshoot callback after prepare ──
    if (options.troubleshoot) {
      const cbName = `CB ts-prepare-${step.id}`;
      nodes.push(makeTsCallback(cbName, [x, Y + 175], callbackUrl, manifest.id, `ts-prepare-${step.id}`, i * 3 + 1, step));
      forkNode(connections, prepName, cbName);
    }

    // ── Gemini HTTP Request node ──
    x += STEP_X;
    nodes.push({
      name: httpName,
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4,
      position: [x, Y],
      parameters: geminiHttpParams(gemini, rateLimits)
    });
    connectNode(connections, prepName, httpName);

    // ── Troubleshoot callback after HTTP ──
    if (options.troubleshoot) {
      const cbName = `CB ts-${step.id}-raw`;
      nodes.push(makeTsCallback(cbName, [x, Y + 175], callbackUrl, manifest.id, `ts-${step.id}-raw`, i * 3 + 2, step));
      forkNode(connections, httpName, cbName);
    }

    // ── Parse Code node ──
    x += STEP_X;
    nodes.push({
      name: parseName,
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [x, Y],
      parameters: { jsCode: genParseCode(step, manifest) }
    });
    connectNode(connections, httpName, parseName);

    // ── Troubleshoot callback after parse ──
    if (options.troubleshoot) {
      const cbName = `CB ts-parse-${step.id}`;
      nodes.push(makeTsCallback(cbName, [x, Y + 175], callbackUrl, manifest.id, `ts-parse-${step.id}`, i * 3 + 3, step));
      forkNode(connections, parseName, cbName);
    }

    // ── Milestone callback + Wait node ──
    // Order matters: hardcoded FVP forks as [callback, wait] from Parse node.
    // Milestone callback goes first, wait second, matching production layout.
    if (step.milestoneCallback) {
      const cbName = `Callback ${capitalize(step.milestoneCallback.name)}`;
      nodes.push({
        name: cbName,
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4,
        position: [x + 50, Y + 175],
        parameters: {
          url: callbackUrl,
          method: "POST",
          sendBody: true,
          specifyBody: "json",
          jsonBody: milestoneCbBody(manifest.id, step)
        }
      });
      // First branch: callback (dead-end)
      forkNode(connections, parseName, cbName);
      connections[cbName] = { main: [] };

      // Second branch: wait (continues main flow)
      if (!isLast && rateLimits.betweenSteps.amount > 0) {
        const waitName = `Wait After ${step.name}`;
        x += STEP_X;
        nodes.push({
          name: waitName,
          type: "n8n-nodes-base.wait",
          typeVersion: 1,
          position: [x, Y],
          parameters: {
            amount: rateLimits.betweenSteps.amount,
            unit: rateLimits.betweenSteps.unit
          }
        });
        forkNode(connections, parseName, waitName);
        lastNode = waitName;
      } else {
        lastNode = parseName;
      }
    } else if (!isLast && rateLimits.betweenSteps.amount > 0) {
      // No milestone — simple sequential wait
      const waitName = `Wait After ${step.name}`;
      x += STEP_X;
      nodes.push({
        name: waitName,
        type: "n8n-nodes-base.wait",
        typeVersion: 1,
        position: [x, Y],
        parameters: {
          amount: rateLimits.betweenSteps.amount,
          unit: rateLimits.betweenSteps.unit
        }
      });
      connectNode(connections, parseName, waitName);
      lastNode = waitName;
    } else {
      lastNode = parseName;
    }
  }

  // ── Build Final Output ──
  x += STEP_X;
  const finalName = "Build Final Output";
  nodes.push({
    name: finalName,
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [x, Y],
    parameters: { jsCode: genFinalOutputCode(steps, manifest) }
  });
  connectNode(connections, lastNode, finalName);

  // ── Callback Final ──
  x += STEP_X;
  const cbFinalName = "Callback Final";
  nodes.push({
    name: cbFinalName,
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4,
    position: [x, Y],
    parameters: {
      url: callbackUrl,
      method: "POST",
      sendBody: true,
      specifyBody: "json",
      jsonBody: finalCbBody(manifest.id)
    }
  });
  connectNode(connections, finalName, cbFinalName);

  // ── Respond to Webhook ──
  x += STEP_X;
  const respondName = "Respond to Webhook";
  nodes.push({
    name: respondName,
    type: "n8n-nodes-base.respondToWebhook",
    typeVersion: 1,
    position: [x, Y + 125],
    parameters: {
      respondWith: "json",
      responseBody: `={{ $('${finalName}').first().json }}`
    }
  });
  connectNode(connections, cbFinalName, respondName);

  return { nodes, connections, stepsBuilt };
}

// ── Code generators ──

const SANITIZE_FN = `function sanitizeForJSON(str) {
  if (!str) return '';
  return String(str)
    .replace(/[\\x00-\\x1F\\x7F]/g, ' ')
    .replace(/\\\\/g, '\\\\\\\\')
    .replace(/"/g, '\\\\"')
    .replace(/\\n/g, ' ')
    .replace(/\\r/g, ' ')
    .substring(0, 10000);
}`;

function genPrepareCode(
  step: ManifestStep,
  manifest: WorkflowManifest,
  isFirst: boolean,
  troubleshoot?: boolean
): string {
  const lines: string[] = [];
  lines.push(`// Builder-generated prepare for: ${step.id}`);

  // API key sourcing (D13)
  if (isFirst) {
    lines.push(`const webhookData = $('Webhook').first().json;`);
    lines.push(`const geminiApiKey = webhookData?.body?.geminiApiKey || webhookData?.geminiApiKey || $env?.GEMINI_API_KEY || '';`);
  } else {
    lines.push(`const input = $input.first().json;`);
    lines.push(`const geminiApiKey = input.geminiApiKey;`);
  }

  lines.push(SANITIZE_FN);

  // Resolve prompt inputs
  const inputNames: string[] = [];
  if (step.promptInputs) {
    for (const [varName, def] of Object.entries(step.promptInputs)) {
      inputNames.push(varName);

      // Raw value
      if (def.source === "webhook") {
        const cleanPath = def.path.replace(/^body\./, "");
        lines.push(`const ${varName}_raw = webhookData?.body?.${cleanPath} || webhookData?.${cleanPath} || [];`);
      } else if (def.source === "previous") {
        lines.push(`const ${varName}_raw = input.${def.path};`);
      } else {
        // Named step reference
        lines.push(`const ${varName}_raw = $('Parse ${capitalize(def.source)}').first().json.${def.path};`);
      }

      // Format
      if (def.formatCode) {
        lines.push(`const ${varName} = (() => { const items = ${varName}_raw; return ${def.formatCode}; })();`);
      } else {
        lines.push(`const ${varName} = ${varName}_raw;`);
      }
    }
  }

  // Build prompt
  lines.push(`let prompt = ${JSON.stringify(step.prompt)};`);

  for (const varName of inputNames) {
    const def = step.promptInputs![varName];
    if (def.append) {
      lines.push(`prompt += ${varName};`);
    } else {
      lines.push(`prompt = prompt.replace('{${varName}}', sanitizeForJSON(String(${varName})));`);
    }
  }

  // Gemini request body
  lines.push(`const requestBody = {`);
  lines.push(`  contents: [{ parts: [{ text: prompt }] }],`);
  lines.push(`  generationConfig: { temperature: ${step.temperature ?? 0.3}, maxOutputTokens: ${step.maxTokens ?? 2048} }`);
  lines.push(`};`);

  // Return object: pass through all accumulated data
  if (isFirst) {
    const webhookFields: string[] = [];
    if (step.promptInputs) {
      for (const [varName, def] of Object.entries(step.promptInputs)) {
        if (def.source === "webhook") {
          const cleanPath = def.path.replace(/^body\./, "");
          webhookFields.push(`${cleanPath}: ${varName}_raw`);
        }
      }
    }
    lines.push(`return [{ json: { geminiApiKey, geminiRequestBody: requestBody${webhookFields.length ? ", " + webhookFields.join(", ") : ""} } }];`);
  } else {
    // Spread everything from input, override with new request body
    lines.push(`const { geminiRequestBody: _prev, ...passthrough } = input;`);
    lines.push(`return [{ json: { ...passthrough, geminiApiKey, geminiRequestBody: requestBody } }];`);
  }

  // Troubleshoot diagnostics
  if (troubleshoot) {
    // Replace last line with diagnostics-enriched version
    lines.pop();
    if (isFirst) {
      const webhookFields: string[] = [];
      if (step.promptInputs) {
        for (const [, def] of Object.entries(step.promptInputs)) {
          if (def.source === "webhook") {
            const cleanPath = def.path.replace(/^body\./, "");
            webhookFields.push(`${cleanPath}: ${cleanPath.endsWith("s") ? `${cleanPath.replace(/^body\./, "")}_raw` : `${cleanPath.replace(/^body\./, "")}_raw`}`);
          }
        }
      }
      lines.push(`return [{ json: { geminiApiKey, geminiRequestBody: requestBody, _ts: { step: 'prepare-${step.id}', promptLength: prompt.length, hasApiKey: !!geminiApiKey, timestamp: new Date().toISOString() } } }];`);
    } else {
      lines.push(`const { geminiRequestBody: _prev2, ...passthrough2 } = input;`);
      lines.push(`return [{ json: { ...passthrough2, geminiApiKey, geminiRequestBody: requestBody, _ts: { step: 'prepare-${step.id}', promptLength: prompt.length, hasApiKey: !!geminiApiKey, timestamp: new Date().toISOString() } } }];`);
    }
  }

  return lines.join("\n");
}

function genParseCode(step: ManifestStep, _manifest: WorkflowManifest): string {
  const prepName = `Prepare ${step.name} Request`;
  const lines: string[] = [];
  lines.push(`// Builder-generated parse for: ${step.id}`);

  // Get passthrough from prepare node (D13: API key flow)
  lines.push(`const prepareData = $('${prepName}').first().json;`);
  lines.push(`const { geminiRequestBody: _, ...passthrough } = prepareData;`);

  // Parse Gemini response (D14: strip markdown fences)
  lines.push(`const response = $input.first().json;`);
  lines.push(`let text = response?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';`);
  lines.push("text = text.trim().replace(/^```[a-zA-Z]*\\n?/, '').replace(/\\n?```\\s*$/, '');");
  lines.push("const jsonMatch = text.match(/\\{[\\s\\S]*\\}/);");
  lines.push(`let parsed = {};`);
  lines.push(`if (jsonMatch) { try { parsed = JSON.parse(jsonMatch[0]); } catch (e) { /* fallback */ } }`);

  // Extract output key
  if (step.outputKey) {
    let extraction = `parsed.${step.outputKey} || []`;
    if (step.outputSlice) {
      extraction = `(${extraction}).slice(0, ${step.outputSlice})`;
    }
    lines.push(`const extracted = { ${step.outputKey}: ${extraction} };`);
  } else {
    lines.push(`const extracted = parsed;`);
  }

  // Return with passthrough
  lines.push(`return [{ json: { ...passthrough, ...extracted } }];`);

  return lines.join("\n");
}

function genFinalOutputCode(steps: ManifestStep[], manifest: WorkflowManifest): string {
  const lines: string[] = [];
  lines.push(`// Builder-generated final output assembly`);
  lines.push(`const input = $input.first().json;`);

  // Collect outputs from each step's parse node
  const outputKeys: string[] = [];
  for (const step of steps) {
    if (step.outputKey) {
      const parseName = `Parse ${step.name}`;
      lines.push(`const ${step.outputKey} = $('${parseName}').first().json.${step.outputKey};`);
      outputKeys.push(step.outputKey);
    }
  }

  // Match production FVP output structure: nested phases + timingTable
  const hasSummaries = outputKeys.includes("summaries");
  const hasVideoScript = outputKeys.includes("videoScript");
  const hasImagePrompts = outputKeys.includes("imagePrompts");

  if (hasSummaries && hasVideoScript && hasImagePrompts) {
    // Full FVP pipeline — match hardcoded nested structure exactly
    lines.push(`// Build timing table matching production FVP output`);
    lines.push(`const timingTable = [`);
    lines.push(`  { segment: 'Intro', duration: '5s', visuals: 'Headline Slide', audio: 'Here are today\\'s top 3 football stories...' }`);
    lines.push(`];`);
    lines.push(`const categories = ['Detailed summary with stats/scores', 'Transfer details and contract figures', 'Tactical breakdown or match analysis'];`);
    lines.push(`(summaries || []).forEach((s, i) => {`);
    lines.push(`  timingTable.push({`);
    lines.push(`    segment: 'Topic ' + (i+1) + ': ' + (s.title || 'TBD'),`);
    lines.push(`    duration: '20s',`);
    lines.push(`    visuals: '3 Images (6.6s each)',`);
    lines.push(`    audio: categories[i] || s.category || 'News summary'`);
    lines.push(`  });`);
    lines.push(`});`);
    lines.push(`// Map image prompts to segments`);
    lines.push(`const segmentImages = {};`);
    lines.push(`(imagePrompts || []).forEach(ip => {`);
    lines.push(`  if (!segmentImages[ip.segmentId]) segmentImages[ip.segmentId] = [];`);
    lines.push(`  segmentImages[ip.segmentId].push(ip);`);
    lines.push(`});`);
    lines.push(`const output = {`);
    lines.push(`  success: true,`);
    lines.push(`  data: {`);
    lines.push(`    pipeline: ${JSON.stringify(manifest.id)},`);
    lines.push(`    researchPhase: {`);
    lines.push(`      topicCount: (summaries || []).length,`);
    lines.push(`      summaries: summaries || []`);
    lines.push(`    },`);
    lines.push(`    videoPhase: {`);
    lines.push(`      totalDuration: 65,`);
    lines.push(`      script: videoScript,`);
    lines.push(`      imagePrompts: imagePrompts || [],`);
    lines.push(`      segmentImages: segmentImages`);
    lines.push(`    },`);
    lines.push(`    timingTable: timingTable,`);
    lines.push(`    sourceHeadline: (summaries && summaries[0]) ? summaries[0].title : 'European Football Daily Video'`);
    lines.push(`  },`);
    lines.push(`  metadata: {`);
    lines.push(`    workflowId: ${JSON.stringify(manifest.id)},`);
    lines.push(`    executedAt: new Date().toISOString()`);
    lines.push(`  }`);
    lines.push(`};`);
  } else {
    // Partial build or non-FVP — flat output with whatever steps are built
    lines.push(`const output = {`);
    lines.push(`  success: true,`);
    lines.push(`  data: {`);
    lines.push(`    pipeline: ${JSON.stringify(manifest.id)},`);
    for (const field of outputKeys) {
      lines.push(`    ${field},`);
    }
    const headlineStep = steps.find(s => s.outputKey === "summaries") || steps.find(s => s.outputKey === "topics");
    if (headlineStep?.outputKey === "summaries") {
      lines.push(`    sourceHeadline: (summaries && summaries[0]) ? summaries[0].title : 'Bilko Pipeline Output'`);
    } else if (headlineStep?.outputKey === "topics") {
      lines.push(`    sourceHeadline: (topics && topics[0]) ? topics[0].title : 'Bilko Pipeline Output'`);
    }
    lines.push(`  },`);
    lines.push(`  metadata: {`);
    lines.push(`    workflowId: ${JSON.stringify(manifest.id)},`);
    lines.push(`    manifestVersion: ${JSON.stringify(manifest.version)},`);
    lines.push(`    stepsCompleted: ${steps.length},`);
    lines.push(`    executedAt: new Date().toISOString()`);
    lines.push(`  }`);
    lines.push(`};`);
  }

  lines.push(`return [{ json: output }];`);
  return lines.join("\n");
}

// ── Callback body generators ──

function milestoneCbBody(workflowId: string, step: ManifestStep): string {
  const cb = step.milestoneCallback!;

  // Match production FVP callback shape: topicCount + topic title array
  // (not full objects — downstream code expects this compact format)
  let outputExpr: string;
  if (cb.fields && cb.fields.length === 1 && cb.fields[0] === "summaries") {
    // FVP research-complete callback: send count + title array
    outputExpr = `"topicCount": {{ $json.summaries.length }},
    "topics": {{ JSON.stringify($json.summaries.map(s => s.title)) }}`;
  } else if (cb.fields) {
    outputExpr = cb.fields.map(f => `"${f}": {{ JSON.stringify($json.${f}) }}`).join(",\n    ");
  } else {
    outputExpr = `"stepOutput": {{ JSON.stringify($json) }}`;
  }

  return `={
  "workflowId": "${workflowId}",
  "step": "${cb.name}",
  "stepIndex": 1,
  "traceId": "{{ $('Webhook').first().json.body?.traceId || $('Webhook').first().json.traceId || 'trace_' + $execution.id }}",
  "output": {
    ${outputExpr}
  },
  "executionId": "{{ $execution.id }}",
  "status": "${cb.status}"
}`;
}

function finalCbBody(workflowId: string): string {
  return `={
  "workflowId": "${workflowId}",
  "step": "final-output",
  "stepIndex": 2,
  "traceId": "{{ $('Webhook').first().json.body?.traceId || $('Webhook').first().json.traceId || 'trace_' + $execution.id }}",
  "output": {{ JSON.stringify($input.first().json) }},
  "executionId": "{{ $execution.id }}",
  "status": "success"
}`;
}

// ── Troubleshoot callback node factory ──

function makeTsCallback(
  name: string,
  position: [number, number],
  callbackUrl: string,
  workflowId: string,
  stepName: string,
  stepIndex: number,
  _step: ManifestStep
): N8nNode {
  return {
    name,
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4,
    position,
    parameters: {
      url: callbackUrl,
      method: "POST",
      sendBody: true,
      specifyBody: "json",
      jsonBody: `={
  "workflowId": "${workflowId}",
  "step": "${stepName}",
  "stepIndex": ${stepIndex},
  "traceId": "{{ $('Webhook').first().json.body?.traceId || $('Webhook').first().json.traceId || 'trace_' + $execution.id }}",
  "output": {{ JSON.stringify($input.first().json) }},
  "executionId": "{{ $execution.id }}",
  "status": "in_progress",
  "details": {
    "mode": "troubleshoot",
    "pipeline": "${workflowId}",
    "stepName": "${stepName}",
    "timestamp": "{{ new Date().toISOString() }}"
  }
}`
    }
  };
}

// ── Gemini HTTP Request params (D10, D11, D12, ISSUE-013) ──

function geminiHttpParams(
  gemini: WorkflowManifest["gemini"],
  rateLimits: WorkflowManifest["rateLimits"]
): Record<string, unknown> {
  const params: Record<string, unknown> = {
    url: gemini.url,
    method: "POST",
    sendHeaders: true,
    headerParameters: {
      parameters: [
        { name: "Content-Type", value: "application/json" },
        { name: "User-Agent", value: gemini.userAgent },
        { name: "x-goog-api-key", value: "={{ $json.geminiApiKey }}" }
      ]
    },
    sendBody: true,
    specifyBody: "json",
    jsonBody: "={{ JSON.stringify($json.geminiRequestBody) }}"
  };

  // Batching (ISSUE-013)
  if (rateLimits.batching.batchSize > 0) {
    params.options = {
      batching: {
        batch: {
          batchSize: rateLimits.batching.batchSize,
          batchInterval: rateLimits.batching.intervalMs
        }
      }
    };
  }

  // Retry (D11)
  if (rateLimits.httpRetry.enabled) {
    params.retryOnFail = true;
    params.maxTries = rateLimits.httpRetry.maxTries;
    params.waitBetweenTries = rateLimits.httpRetry.waitMs;
  }

  return params;
}

// ── Connection helpers ──

function connectNode(
  connections: Record<string, unknown>,
  from: string,
  to: string
): void {
  if (!connections[from]) {
    connections[from] = { main: [[{ node: to, type: "main", index: 0 }]] };
  } else {
    const c = connections[from] as { main: { node: string; type: string; index: number }[][] };
    // If main[0] doesn't exist yet, create it
    if (!c.main || c.main.length === 0) {
      c.main = [[{ node: to, type: "main", index: 0 }]];
    } else {
      // Add to existing first output (fan-out)
      c.main[0].push({ node: to, type: "main", index: 0 });
    }
  }
}

function forkNode(
  connections: Record<string, unknown>,
  from: string,
  to: string
): void {
  // Add a second output branch (for callbacks that don't continue the main flow)
  const c = connections[from] as { main: { node: string; type: string; index: number }[][] } | undefined;
  if (!c) {
    connections[from] = { main: [[], [{ node: to, type: "main", index: 0 }]] };
  } else {
    c.main.push([{ node: to, type: "main", index: 0 }]);
  }
  // Dead-end the callback
  connections[to] = { main: [] };
}

// ── Helpers ──

function capitalize(s: string): string {
  return s.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

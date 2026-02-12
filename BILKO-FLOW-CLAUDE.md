# Bilko-Flow Agent Feedback

> **Audience**: This document is feedback directed at the **Bilko-Flow agent** (the AI agent that develops and maintains the `bilko-flow` library). It is NOT instructions for the Bilko application agent. If you are an AI agent working on the Bilko web application codebase, **ignore this file entirely** — it does not apply to you. Your instructions are in `/CLAUDE.md`.

---

## Context: Video Generation Troubleshooting (February 2026)

The following feedback comes from a debugging session on the Bilko application's Newsletter flow, where AI video generation (Veo) was silently failing. The flow would reach "done" state but never produce a video. After tracing the full pipeline — client flow orchestration, API bridge, server-side Veo integration, and response parsing — the root causes were identified and fixed. The issues uncovered point to **structural resilience gaps** in how bilko-flow handles long-running, multi-stage external API calls.

---

## Feedback 1: Response Parsing Must Never Assume Inline Data

### What happened

The `parseVideoResponse()` function in `server/llm/video-generation.ts` had two response shape handlers. Shape 1 handled `generateVideoResponse.generatedSamples[].video.uri` — but it stored the **URI string** directly as `videoBase64`. There was even a comment admitting the bug: `// May need conversion from GCS URI`. The Veo API returns a download URI, not inline base64 data. The video was generated successfully by Google's API but never actually fetched.

### What bilko-flow should learn

The `ai.generate-video` step handler (and any future media generation handler) needs a **two-phase response contract**:

1. **Phase 1: Resolve** — The API returns a reference (URI, GCS path, operation ID). The handler must resolve that reference into actual bytes before declaring the step complete.
2. **Phase 2: Materialize** — Download the actual content, convert to the expected format (base64, buffer, stream), and validate the result is non-empty and decodable.

**Recommendation**: Add a `resolveMediaReference()` utility to `bilko-flow`'s LLM/media layer that:
- Detects if a response contains URIs vs inline data
- Downloads from URIs with proper auth (API key, bearer token)
- Validates the downloaded content (non-zero bytes, correct MIME type)
- Logs the resolution path for debugging

This should be part of the step handler contract for any step type that interacts with media generation APIs. A `TypedError` like `STEP.MEDIA.UNRESOLVED_REFERENCE` would make this failure mode machine-actionable.

---

## Feedback 2: Long-Running Steps Need Explicit Timeout Budgets

### What happened

The Veo polling loop had a 5-minute timeout. Veo video generation routinely takes 3-8 minutes depending on complexity. The Newsletter flow chains 3 sequential clips (initial + 2 scene extensions), meaning the total video generation phase can take 9-24 minutes. A single clip timing out at 5 minutes would cascade-fail all subsequent clips.

### What bilko-flow should learn

The `StepPolicy` type already has `timeoutMs` and `maxAttempts`. But for async-polling steps (where the API itself is async and requires polling), the timeout budget needs to be **layered**:

| Budget | What it covers | Current state |
|--------|---------------|---------------|
| **Submission timeout** | Time to POST the initial request | 30s (hardcoded) |
| **Poll interval** | Time between status checks | 10s (hardcoded) |
| **Poll budget** | Total time to wait for completion | 5min (hardcoded, too short) |
| **Download timeout** | Time to download the result | Not implemented (was missing) |
| **Step total budget** | End-to-end time for the step | Governed by StepPolicy.timeoutMs |

**Recommendation**: Introduce a `AsyncPollingConfig` in the step handler contract:

```typescript
interface AsyncPollingConfig {
  submissionTimeoutMs: number;   // default: 30_000
  pollIntervalMs: number;        // default: 10_000
  pollBudgetMs: number;          // default: 480_000 (8 min)
  downloadTimeoutMs: number;     // default: 120_000
  onPollTick?: (elapsed: number, attempts: number) => void;
}
```

This makes timeout budgets visible, configurable per step, and auditable in execution traces. The `onPollTick` callback enables progress reporting to the UI layer during long waits.

---

## Feedback 3: Multi-Step Chains Need Payload Size Awareness

### What happened

The Newsletter flow's scene extension sends the previous video's base64 in the HTTP request body as `sourceVideoBase64`. After clip 2, this merged video can be 15-20MB as base64. The Express server had a global body limit of 10MB. Scene extension requests were silently rejected with a 413 (Payload Too Large) error that the flow caught as a generic failure.

### What bilko-flow should learn

When steps produce large artifacts that become inputs to subsequent steps, the pipeline must be **payload-size-aware**:

1. **Artifact size tracking**: `StepExecution` should track `outputSizeBytes` so the planner and executor know when payloads are growing beyond transport limits.
2. **Transport strategy selection**: For payloads over a configurable threshold (e.g., 5MB), the step handler should switch from inline base64 to a reference-based approach (temporary file, signed URL, or artifact store pointer).
3. **Chain-aware limits**: When a workflow has sequential steps where output(N) = input(N+1), the compiler or executor should warn if the payload is likely to exceed transport limits based on step type heuristics (video > image > text).

**Recommendation**: Add an `ArtifactTransport` enum to the domain model:

```typescript
type ArtifactTransport =
  | "inline"      // base64 in JSON body (< 5MB)
  | "reference"   // URI/pointer to artifact store (>= 5MB)
  | "streaming";  // chunked transfer for very large payloads
```

Step handlers should negotiate the transport based on artifact size, and the executor should enforce body limits per transport strategy.

---

## Feedback 4: Silent Failure is the Worst Failure Mode

### What happened

When video generation failed (for any of the above reasons), the Newsletter flow caught the error, pushed a brief chat message like "Clip 1 failed: unknown error", and continued to "done" state. The user saw "done" and "video generation failed" with no way to understand what went wrong or retry. The server logs had useful information but the user never saw it.

### What bilko-flow should learn

The `TypedError` model is excellent for machine-actionable errors — but it needs to be **surfaced to the UI layer** with enough context for the user to understand and act. Specifically:

1. **Error categorization for users**: Map `TypedError.code` to user-facing severity levels:
   - `INFO`: "We tried X but it didn't work, here's what you got instead" (graceful degradation)
   - `WARNING`: "X partially failed, Y out of Z items succeeded" (partial success)
   - `ERROR`: "X failed completely, here's why and what you can do" (actionable failure)

2. **Retry affordances**: When `TypedError.retryable === true`, the UI should offer a "Retry" button for that specific step, not require re-running the entire flow.

3. **Execution trace visibility**: The FlowProgress component should have an expandable error detail view that shows:
   - Which step failed
   - The error code and message
   - Server-side timing (how long it polled before failing)
   - Suggested fixes from `TypedError.suggestedFixes`

**Recommendation**: Add an `ErrorPresentation` type to the React layer:

```typescript
interface ErrorPresentation {
  stepId: string;
  severity: "info" | "warning" | "error";
  userMessage: string;         // human-readable summary
  technicalDetail?: string;    // expandable for power users
  retryable: boolean;
  suggestedActions: string[];  // e.g., "Try again", "Check API key", "Use shorter prompt"
}
```

---

## Feedback 5: Response Shape Logging Should Be Built Into the Step Handler Contract

### What happened

The `parseVideoResponse` function had no logging of the actual response shape it received. When the response didn't match either expected shape, it silently returned `{ videos: [] }` and the caller had no way to know why. Adding response shape logging (`Top-level keys: [...]`, `Snippet: ...`) was essential for diagnosing the issue.

### What bilko-flow should learn

Every step handler that calls an external API should **automatically log the response shape** before attempting to parse it. This should be part of the step handler contract, not an afterthought.

**Recommendation**: The `StepExecution` record should include a `rawResponseShape` field:

```typescript
interface StepExecution {
  // ... existing fields ...

  /** Top-level keys and structure of the raw API response, for debugging parse failures.
   *  Captured automatically by the executor before the handler's parse logic runs.
   *  Never contains actual data values — only structural metadata. */
  rawResponseShape?: string;
}
```

The executor should capture this automatically by inspecting `Object.keys()` and basic type information of the raw response before handing it to the step handler's parse logic. This provides a debugging breadcrumb trail without logging sensitive data.

---

## Feedback 6: Media Generation Steps Should Have First-Class Execution Contracts

### What bilko-flow should consider

The current step type system has `ai.generate-video` and `ai.generate-image` as step types, but they share the same generic execution contract as text generation steps. Media generation is fundamentally different:

| Aspect | Text Generation | Media Generation |
|--------|----------------|-----------------|
| Response time | 1-30 seconds | 1-10 minutes |
| Response format | Inline JSON | URI → download |
| Payload size | KB | MB-GB |
| Chaining | Stateless | Stateful (scene extension needs previous clip) |
| Partial success | All or nothing | N of M clips may succeed |
| Cost | Low | High (GPU time) |

**Recommendation**: Consider adding a `MediaGenerationContract` to the step type system that makes these differences explicit:

```typescript
interface MediaGenerationContract {
  expectedDurationRange: [number, number];  // [minMs, maxMs]
  outputTransport: ArtifactTransport;
  supportsPartialSuccess: boolean;
  chainable: boolean;
  chainInputField?: string;    // e.g., "sourceVideoBase64"
  costTier: "low" | "medium" | "high";
}
```

This would let the executor, planner, and UI all make better decisions about timeouts, progress reporting, retry strategies, and user expectations.

---

## Summary

The video generation fix in Bilko exposed that **bilko-flow's resilience model is optimized for fast, inline, text-based API calls** and needs hardening for the media generation use case. The core abstractions (TypedError, StepPolicy, StepExecution) are sound — but they need to be extended with:

1. **Reference resolution** for URI-based API responses
2. **Layered timeout budgets** for async polling steps
3. **Payload size awareness** for artifact-chained workflows
4. **User-facing error presentation** beyond machine-actionable TypedError
5. **Response shape logging** as a built-in debugging contract
6. **First-class media generation contracts** that acknowledge the unique execution profile of video/image generation

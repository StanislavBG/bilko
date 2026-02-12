# bilko-flow Enhancement Request: `video.concatenate` Step Type

## Summary

bilko-flow's DSL currently supports `ai.generate-video` for video generation but has no step type for **video concatenation** — joining multiple clips into a single continuous video. This gap forces consumers (like Bilko's newsletter pipeline) to implement ad-hoc concatenation outside the DSL, breaking the determinism and provenance chain.

## Problem

Veo (and similar video generation models) produce **standalone clips of max 8 seconds each**. To build longer videos (e.g. ~20s), you must:

1. Generate individual clips sequentially (passing the previous clip as visual context for scene continuity)
2. **Concatenate** the clips into a single video file

Step 1 is covered by `ai.generate-video`. Step 2 has no DSL representation and must be handled as an untyped `transform` step, which:

- Loses typed input/output contracts for video data
- Cannot express the FFmpeg dependency in the determinism model
- Cannot validate that clips share compatible codec settings before concat
- Forces each consumer to implement their own FFmpeg wrapper

## Current Workaround (Bilko)

```typescript
// In the consumer's workflow definition (newsletter-workflow.ts):
{
  id: "concatenate-video-clips",
  name: "Concatenate Video Clips (FFmpeg)",
  type: "transform",  // <-- generic, untyped
  description: "Concatenates 3 individual Veo clips...",
  dependsOn: ["generate-video-clips"],
  inputs: { clipsSource: "{{generate-video-clips.clips}}", method: "ffmpeg-concat-demuxer" },
  outputs: { schema: { type: "object", properties: { videoBase64: { type: "string" }, ... } } },
}
```

And a separate `server/llm/video-concat.ts` file implementing the FFmpeg logic manually.

## Proposed Enhancement

### New Step Type: `video.concatenate`

Add a first-class step type to the DSL that represents video concatenation:

```typescript
// In bilko-flow's domain/workflow.ts step types:
{
  id: "concat-clips",
  type: "video.concatenate",
  inputs: {
    clips: "{{generate-clips.clips}}",  // Array<{ videoBase64, mimeType }>
    method: "concat-demuxer",           // "concat-demuxer" | "re-encode"
    outputFormat: "mp4",                // Target container format
  },
  outputs: {
    schema: {
      type: "object",
      properties: {
        videoBase64: { type: "string" },
        mimeType: { type: "string" },
        durationSeconds: { type: "number" },
      },
    },
  },
  policy: { timeoutMs: 120000 },
}
```

### What the Library Should Provide

1. **Type definitions** for the `video.concatenate` step in `domain/workflow.ts`
2. **Validator rules** in `dsl/validator.ts`:
   - `clips` input must reference an array of video objects
   - `method` must be one of the supported strategies
   - Determinism: `video.concatenate` is `Pure` when using `concat-demuxer` (deterministic bit-exact output for same input clips)
3. **Determinism annotation**: The step has no external dependencies (FFmpeg is a local tool), so it's deterministic. The `externalDependencies` array should be empty.
4. **Step handler contract** in `engine/step-runner.ts`:
   - Input: `{ clips: Array<{ videoBase64: string; mimeType: string }>; method: string }`
   - Output: `{ videoBase64: string; mimeType: string; durationSeconds: number }`
   - The library does NOT need to bundle FFmpeg — it defines the contract. Consumers provide the implementation.

### Concatenation Methods

| Method | Description | When to Use |
|--------|-------------|-------------|
| `concat-demuxer` | FFmpeg `-f concat -c copy` — container-level join, no re-encoding | Clips share codec settings (same Veo model) |
| `re-encode` | FFmpeg with `-c:v libx264` — full re-encode | Clips have different codecs/resolutions |

### Example DSL Usage in a Workflow

```typescript
const steps = [
  { id: "gen-clip-1", type: "ai.generate-video", inputs: { prompt: "...", durationSeconds: 8 } },
  { id: "gen-clip-2", type: "ai.generate-video", inputs: { prompt: "...", durationSeconds: 6, sourceVideo: "{{gen-clip-1}}" }, dependsOn: ["gen-clip-1"] },
  { id: "gen-clip-3", type: "ai.generate-video", inputs: { prompt: "...", durationSeconds: 6, sourceVideo: "{{gen-clip-2}}" }, dependsOn: ["gen-clip-2"] },
  { id: "final-video", type: "video.concatenate", inputs: { clips: ["{{gen-clip-1}}", "{{gen-clip-2}}", "{{gen-clip-3}}"], method: "concat-demuxer" }, dependsOn: ["gen-clip-3"] },
];
```

## Impact

- **Bilko newsletter pipeline**: Currently a 13-step DAG. The `concatenate-video-clips` step would become a typed `video.concatenate` step instead of a generic `transform`.
- **Any bilko-flow consumer** building multi-clip video pipelines would benefit from the typed contract.
- **Provenance**: The concat step would be properly tracked in execution transcripts with typed I/O hashing.

## Priority

Medium — the workaround (generic `transform` step + manual FFmpeg wrapper) is functional. The enhancement improves type safety, validation, and reusability across consumers.

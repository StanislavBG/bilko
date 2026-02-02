# European Football Daily Workflow

## Version: 3.0.0 (2026-02-02)

## Workflow ID
`oV6WGX5uBeTZ9tRa`

## Architecture

```
Webhook → Discover Topics (Gemini+GoogleSearch) → Parse Discovered Topics → Topic Analyst
  → Parse Topic Analysis → Compliance Checker → Aggregate Compliant Topics
  → Research Topic (Gemini+GoogleSearch) → Parse Research → Stats Extraction Pipeline
  → Post Generation → Image Pipeline → Imagen API → Callback
```

## Key Changes (v3.0.0)

- **Replaced RSS scraping with Gemini Google Search grounding**
- Two-stage search: (1) discover trending topics, (2) research selected topic in depth
- Eliminated Google News redirect URL issues entirely
- Reduced node count from 46 to 36 nodes
- Uses `google_search` tool for Gemini 2.0 Flash compatibility

## Deleted Nodes
- Fetch RSS Feed
- Extract Articles
- Parse RSS Items
- Parse Topics
- Fetch Source Content (3 nodes)
- Parse Source Content (3 nodes)
- Build Topic Request

## Added Nodes
- **Discover Topics**: Gemini + Google Search grounding to find 5 trending European football topics from last 24 hours
- **Parse Discovered Topics**: Extracts topic objects with headlines, summaries, and source URLs
- **Research Topic**: Deep research on selected topic using Google Search grounding
- **Parse Research**: Extracts comprehensive summary, key facts, stats, and source citations

## Critical Configuration

1. **Tool Name**: Must use `google_search` (not `google_search_retrieval`) for Gemini 2.0 Flash
2. **API Credentials**: Uses n8n credential ID `K9oPxIngg8rE26T6` (httpHeaderAuth)
3. **JSON Sanitization**: Parse Event Summary sanitizes `eventSummary` and `imagePrompt` for Imagen API

## Testing

Execution 200 (2026-02-02): SUCCESS in 60.5s
- Discovered 5 trending topics via Google Search
- Generated post about Man City transfers with source citations
- Created image with overlay text "City Swoop for Semenyo and Guehi in Deadline Day Transfer Blitz"

## Source Files
- Backup: `backups/oV6WGX5uBeTZ9tRa-v300-search-grounding.json`
- Pre-v3 Backup: `backups/oV6WGX5uBeTZ9tRa-v263-pre-search.json`

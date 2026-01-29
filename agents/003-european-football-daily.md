# AGT-003-FOOTBALL: European Football Daily Workflow

**Version:** 1.0.0  
**Priority:** MEDIUM  
**Partition:** agent  
**Dependencies:** AGT-003, INT-003

## Purpose

Defines the European Football Daily workflow - a daily automated news aggregation workflow that identifies positive European football events, gathers fan opinions, generates infographics, and publishes to Facebook.

## Workflow Registration

```json
{
  "id": "european-football-daily",
  "name": "European Football Daily",
  "mode": "n8n",
  "description": "Daily automated European football news aggregation with sentiment analysis",
  "instructions": "Runs at 00:00 daily. Searches Google News RSS, uses Gemini for sentiment analysis, fetches Reddit opinions, generates infographic, posts to Facebook.",
  "endpoint": "N8N_WEBHOOK_FOOTBALL_DAILY",
  "category": "content"
}
```

## Execution Triggers

| Trigger | Schedule | Source |
|---------|----------|--------|
| Schedule | `0 0 * * *` (daily at midnight) | n8n Schedule Trigger |
| Webhook | On-demand | Bilko API call |

## Data Flow

```
RSS Fetch → Parse → Sentiment → Winner → Reddit → Summary → Image → Post → Response
```

### Steps

1. **Fetch News**: Google News RSS for European football (last 24h)
2. **Parse XML**: Convert RSS to JSON, extract articles
3. **Sentiment Analysis**: Gemini API identifies most positive event
4. **Select Winner**: Extract winning article with sentiment score
5. **Reddit Search**: Query r/soccer for fan discussions
6. **Fan Summary**: Gemini summarizes fan reactions
7. **Generate Infographic**: Gemini Imagen creates celebratory image
8. **Compose Post**: Gemini writes Facebook caption
9. **Upload to Facebook**: Graph API posts image + text
10. **Build Response**: AGT-003 compliant output

## Input Schema

Per AGT-003 contract:

```typescript
interface WorkflowInput {
  action: "execute";
  payload: {
    dryRun?: boolean;  // Skip Facebook posting
  };
  context: {
    userId: string;
    traceId: string;
    requestedAt: string;
    sourceService: "bilko" | "replit:shell" | "n8n";
    attempt: number;
  };
}
```

## Output Schema

```typescript
interface WorkflowOutput {
  success: boolean;
  data?: {
    winningEvent: {
      title: string;
      source: string;
      sentimentScore: number;
      reason: string;
      link: string;
    };
    fanSummary: string;
    imageUrl?: string;
    facebookPostId?: string;
  };
  error?: {
    code: string;
    message: string;
    retryable: boolean;
    details?: Record<string, unknown>;
  };
  metadata: {
    workflowId: "european-football-daily";
    executionId?: string;
    executedAt: string;
    durationMs: number;
  };
}
```

## Error Codes

| Code | Description | Retryable |
|------|-------------|-----------|
| `NEWS_FETCH_FAILED` | Google News RSS unavailable | Yes |
| `SENTIMENT_ERROR` | Gemini API error | Yes |
| `REDDIT_ERROR` | Reddit API rate limited | Yes |
| `IMAGE_GEN_FAILED` | Imagen generation failed | Yes |
| `FACEBOOK_ERROR` | Graph API posting failed | No |
| `NO_ARTICLES` | No football news found | No |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google AI Studio API key |
| `FACEBOOK_PAGE_ID` | Target Facebook Page ID |
| `FACEBOOK_PAGE_TOKEN` | Page Access Token with `pages_manage_posts` |
| `N8N_WEBHOOK_FOOTBALL_DAILY` | n8n webhook URL for this workflow |

## n8n Implementation

The workflow is created headlessly via n8n REST API. The n8n client in Bilko:

1. Reads workflow spec from registry
2. Builds n8n node graph programmatically
3. Creates/updates workflow via `POST /api/v1/workflows`
4. Activates workflow for scheduled execution

### Node Graph

```
Schedule Trigger ──┐
                   ├──→ HTTP Request (RSS) → XML Parse → Code (Extract)
Webhook ───────────┘
                            ↓
                   Code (Aggregate) → HTTP Request (Gemini Sentiment)
                            ↓
                   Code (Select Winner) → Code (Keywords)
                            ↓
                   HTTP Request (Reddit) → Code (Extract Comments)
                            ↓
                   HTTP Request (Gemini Summary) → Code (Parse)
                            ↓
                   HTTP Request (Gemini Imagen) → Code (Parse)
                            ↓
                   HTTP Request (Gemini Post) → Code (Parse)
                            ↓
                   HTTP Request (Facebook) → Code (AGT-003 Response)
                            ↓
                   ┌────────┴────────┐
                   ↓                 ↓
           Respond to Webhook   HTTP Request (Callback)
```

## Cross-References

- AGT-003: Workflow Contract (input/output schemas)
- INT-003: Orchestrator Communication Contract
- DATA-002: Communication Trace Storage

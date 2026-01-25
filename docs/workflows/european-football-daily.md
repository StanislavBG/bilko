# European Football Daily - n8n Workflow Design

**Workflow ID**: `european-football-daily`  
**Mode**: n8n (remote execution)  
**Category**: content  
**Schedule**: Daily at 00:00 (cron: `0 0 * * *`)

## Overview

Automated daily workflow that aggregates European football news, identifies the most positive event, gathers fan opinions, generates an infographic, and publishes to Facebook.

## AGENT-003 Contract Compliance

This workflow follows the AGENT-003 Workflow Contract for portable execution.

### Incoming Request (from Bilko)

Bilko sends the standard `WorkflowInput` payload:

```typescript
interface WorkflowInput {
  action: string;              // "execute"
  payload: Record<string, unknown>;  // { dryRun?: boolean }
  context: {
    userId: string;            // User who triggered
    traceId: string;           // Correlation ID for tracing
    requestedAt: string;       // ISO 8601 timestamp
    sourceService: string;     // "replit:shell" | "bilko" | "n8n"
    attempt: number;           // Retry attempt number
  };
}
```

**Headers sent by Bilko**:
- `X-Bilko-User-Id`: User ID
- `X-Bilko-Request-Id`: Request ID
- `X-Bilko-Trace-Id`: Trace ID for correlation
- `X-Bilko-Timestamp`: Request timestamp
- `X-Bilko-Attempt`: Attempt number

### Response (to Bilko)

The workflow returns the standard `WorkflowOutput`:

```typescript
interface WorkflowOutput {
  success: boolean;
  data?: {
    winningEvent: {
      title: string;
      source: string;
      sentimentScore: number;
      reason: string;
      link: string;        // URL to original article
    };
    fanSummary: string;
    imageUrl?: string;
    facebookPostId?: string;
  };
  error?: {
    code: string;          // "NEWS_FETCH_FAILED", "SENTIMENT_ERROR", etc.
    message: string;
    retryable: boolean;
    details?: Record<string, unknown>;
  };
  metadata: {
    workflowId: "european-football-daily";
    executionId?: string;  // n8n execution ID
    executedAt: string;    // ISO 8601
    durationMs: number;
  };
}
```

## Services Used (Free Tier)

| Service | Purpose | Cost |
|---------|---------|------|
| Google News RSS | News aggregation | Free |
| Gemini API | Sentiment analysis, summarization, post composition | Free tier (15 RPM) |
| Reddit JSON API | Fan opinions | Free (no auth) |
| Gemini Imagen | Infographic generation | Free tier |
| Facebook Graph API | Post publishing | Free (with app) |

---

## Workflow Steps

### Step 1: Schedule Trigger

**n8n Node**: Schedule Trigger

**Configuration**:
```json
{
  "rule": {
    "interval": [
      {
        "field": "cronExpression",
        "expression": "0 0 * * *"
      }
    ]
  }
}
```

**Output**:
```json
{
  "timestamp": "2026-01-26T00:00:00.000Z",
  "workflow": {
    "id": "european-football-daily",
    "name": "European Football Daily"
  }
}
```

---

### Step 2: Google News RSS Fetch

**n8n Node**: HTTP Request

**Configuration**:
```json
{
  "method": "GET",
  "url": "https://news.google.com/rss/search",
  "qs": {
    "q": "european football OR premier league OR champions league OR la liga OR bundesliga OR serie a when:1d",
    "hl": "en-US",
    "gl": "US",
    "ceid": "US:en"
  },
  "responseFormat": "text"
}
```

**Output**: Raw XML RSS feed

---

### Step 3: Parse RSS XML

**n8n Node**: XML

**Configuration**:
```json
{
  "mode": "xmlToJson",
  "options": {
    "explicitArray": false
  }
}
```

**Output**:
```json
{
  "rss": {
    "channel": {
      "item": [
        {
          "title": "Manchester United celebrates historic victory...",
          "link": "https://news.google.com/...",
          "pubDate": "Sun, 26 Jan 2026 10:30:00 GMT",
          "source": { "_": "BBC Sport", "$": { "url": "https://bbc.com" } }
        }
      ]
    }
  }
}
```

---

### Step 4: Extract Articles Array

**n8n Node**: Code (JavaScript)

**Input**: Parsed RSS JSON from Step 3
**Output**: Individual article items (one per n8n item)

**Code**:
```javascript
const items = $input.first().json.rss.channel.item;
const articles = Array.isArray(items) ? items : [items];

return articles.slice(0, 20).map((item, index) => ({
  json: {
    id: index,
    title: item.title,
    link: item.link,
    pubDate: item.pubDate,
    source: item.source?._ || item.source || 'Unknown'
  }
}));
```

---

### Step 5: Aggregate Articles

**n8n Node**: Aggregate (Item Lists)

**Purpose**: Collect all individual article items into a single array for sentiment analysis.

**Configuration**:
```json
{
  "aggregate": "aggregateAllItemData",
  "options": {
    "outputFormat": "fieldify"
  }
}
```

**Input**: Multiple article items from Step 4
**Output**: Single item with all articles aggregated

```json
{
  "articles": [
    { "id": 0, "title": "...", "link": "...", "pubDate": "...", "source": "..." },
    { "id": 1, "title": "...", "link": "...", "pubDate": "...", "source": "..." }
  ]
}
```

---

### Step 6: Sentiment Analysis (Gemini)

**n8n Node**: HTTP Request

**Input**: Aggregated articles array from Step 5
**Output**: JSON array with sentiment scores for each article

**Configuration**:
```json
{
  "method": "POST",
  "url": "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
  "qs": {
    "key": "{{ $credentials.geminiApi.apiKey }}"
  },
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "contents": [{
      "parts": [{
        "text": "Analyze these football news headlines and rate each from 1-10 for positivity/cheerfulness. Focus on celebrations, victories, achievements, comebacks. Return ONLY valid JSON array.\n\nHeadlines:\n{{ $json.articles.map(a => a.title).join('\\n') }}\n\nFormat: [{\"id\": 0, \"title\": \"...\", \"score\": 8, \"reason\": \"...\"}]"
      }]
    }]
  },
  "json": true
}
```

**Prompt Template**:
```
Analyze these football news headlines and rate each from 1-10 for positivity/cheerfulness.

Scoring criteria:
- 9-10: Major victory, championship win, record-breaking achievement
- 7-8: Good win, positive milestone, player return from injury
- 5-6: Neutral news, transfers, upcoming matches
- 3-4: Disappointing result, minor setback
- 1-2: Serious injury, scandal, major defeat

Headlines:
{headlines}

Return ONLY valid JSON array:
[{"id": 0, "title": "...", "score": 8, "reason": "celebration of..."}]
```

**Output**: JSON array with sentiment scores

---

### Step 7: Select Winner

**n8n Node**: Code (JavaScript)

**Input**: Gemini response with sentiment scores
**Output**: Single winning article with full metadata preserved

**Code**:
```javascript
const response = $input.first().json;
const text = response.candidates[0].content.parts[0].text;

// Extract JSON from response (handle markdown code blocks)
const jsonMatch = text.match(/\[[\s\S]*\]/);
if (!jsonMatch) {
  throw new Error('No valid JSON found in Gemini response');
}

const scored = JSON.parse(jsonMatch[0]);
const winner = scored.reduce((max, item) => 
  item.score > max.score ? item : max
, scored[0]);

// Preserve original article metadata from aggregated articles
const originalArticles = $('Aggregate Articles').first().json.articles;
const originalArticle = originalArticles.find(a => a.id === winner.id) || {};

return [{
  json: {
    winner: {
      id: winner.id,
      title: winner.title,
      score: winner.score,
      reason: winner.reason,
      link: originalArticle.link,
      source: originalArticle.source,
      pubDate: originalArticle.pubDate
    },
    allScored: scored
  }
}];
```

**Output**: Single winning article with highest positivity score and original metadata

---

### Step 8: Extract Search Keywords

**n8n Node**: Code (JavaScript)

**Input**: Winner object from Step 7
**Output**: Winner object enriched with search query

**Code**:
```javascript
const title = $input.first().json.winner.title;

// Extract team names, player names, key terms
const keywords = title
  .replace(/[^\w\s]/g, '')
  .split(' ')
  .filter(word => word.length > 3)
  .slice(0, 5)
  .join(' ');

return [{
  json: {
    ...$input.first().json,
    searchQuery: keywords
  }
}];
```

---

### Step 9: Reddit Fan Opinions Search

**n8n Node**: HTTP Request

**Input**: Search query from Step 8
**Output**: Reddit search results JSON

**Configuration**:
```json
{
  "method": "GET",
  "url": "https://www.reddit.com/r/soccer/search.json",
  "qs": {
    "q": "{{ $json.searchQuery }}",
    "sort": "hot",
    "t": "day",
    "limit": 10
  },
  "headers": {
    "User-Agent": "Bilko/1.0 (European Football Daily Workflow)"
  }
}
```

---

### Step 10: Extract Reddit Comments

**n8n Node**: Code (JavaScript)

**Input**: Reddit search response from Step 9
**Output**: Winner object enriched with fan post data

**Code**:
```javascript
const response = $input.first().json;
const posts = response.data?.children || [];

const opinions = posts.slice(0, 5).map(post => ({
  title: post.data.title,
  score: post.data.score,
  numComments: post.data.num_comments,
  subreddit: post.data.subreddit,
  url: `https://reddit.com${post.data.permalink}`
}));

// Retrieve winner data from Step 7
const previousData = $('Select Winner').first().json;

return [{
  json: {
    ...previousData,
    fanPosts: opinions
  }
}];
```

---

### Step 11: Generate Fan Summary (Gemini API)

**n8n Node**: HTTP Request

**Input**: Winner object with fan posts from Step 10
**Output**: Raw Gemini API response

**Configuration**:
```json
{
  "method": "POST",
  "url": "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
  "qs": {
    "key": "{{ $credentials.geminiApi.apiKey }}"
  },
  "body": {
    "contents": [{
      "parts": [{
        "text": "Based on these Reddit post titles about a football event, summarize the fan sentiment in 2-3 sentences. Be enthusiastic but professional.\n\nEvent: {{ $json.winner.title }}\n\nFan posts:\n{{ $json.fanPosts.map(p => '- ' + p.title).join('\\n') }}\n\nProvide a brief summary of how fans are reacting."
      }]
    }]
  }
}
```

---

### Step 11b: Parse Fan Summary

**n8n Node**: Code (JavaScript)  
**n8n Node Name**: `Parse Fan Summary`

**Purpose**: Extract text from Gemini response and normalize into fanSummary field.

**Input**: Raw Gemini API response
**Output**: Enriched data object with fanSummary field

**Code**:
```javascript
const response = $input.first().json;
const fanSummary = response.candidates?.[0]?.content?.parts?.[0]?.text || 'Fan reactions are positive!';

// Merge with previous data from Extract Reddit Comments
const previousData = $('Extract Reddit Comments').first().json;

return [{
  json: {
    ...previousData,
    fanSummary: fanSummary.trim()
  }
}];
```

---

### Step 12: Generate Infographic (Gemini Imagen API)

**n8n Node**: HTTP Request

**Input**: Data object with fanSummary from Step 11b
**Output**: Raw Imagen API response

**Configuration**:
```json
{
  "method": "POST",
  "url": "https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict",
  "qs": {
    "key": "{{ $credentials.geminiApi.apiKey }}"
  },
  "body": {
    "instances": [{
      "prompt": "Create a celebratory sports infographic for: {{ $json.winner.title }}. Style: Modern, professional, vibrant colors, football theme. Include: celebration imagery, trophy/medal icons, dynamic composition. Text overlay: 'BREAKING NEWS'. Aspect ratio: 16:9 landscape."
    }],
    "parameters": {
      "sampleCount": 1,
      "aspectRatio": "16:9"
    }
  }
}
```

**Note**: If Imagen is not available, fallback to DALL-E or skip image generation.

---

### Step 12b: Parse Infographic Response

**n8n Node**: Code (JavaScript)  
**n8n Node Name**: `Parse Infographic Response`

**Purpose**: Extract image URL or base64 from Imagen response and normalize into imageUrl field.

**Input**: Raw Imagen API response
**Output**: Enriched data object with imageUrl field

**Code**:
```javascript
const response = $input.first().json;
const predictions = response.predictions || [];
const imageData = predictions[0];

// Imagen returns either base64 or a URL depending on configuration
const imageUrl = imageData?.bytesBase64Encoded 
  ? `data:image/png;base64,${imageData.bytesBase64Encoded}`
  : imageData?.uri || null;

// Merge with previous data
const previousData = $('Parse Fan Summary').first().json;

return [{
  json: {
    ...previousData,
    imageUrl: imageUrl,
    imageBase64: imageData?.bytesBase64Encoded || null
  }
}];
```

---

### Step 13: Compose Facebook Post (Gemini API)

**n8n Node**: HTTP Request

**Input**: Data object with winner, fanSummary, imageUrl from Step 12b
**Output**: Raw Gemini API response

**Configuration**:
```json
{
  "method": "POST",
  "url": "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
  "qs": {
    "key": "{{ $credentials.geminiApi.apiKey }}"
  },
  "body": {
    "contents": [{
      "parts": [{
        "text": "Write a brief, professional Facebook post (max 280 characters) congratulating the team/player/organization from this news. Be enthusiastic but professional. Include 2-3 relevant hashtags.\n\nNews: {{ $json.winner.title }}\nFan sentiment: {{ $json.fanSummary }}\n\nWrite the post text only, no quotes."
      }]
    }]
  }
}
```

---

### Step 13b: Parse Post Text

**n8n Node**: Code (JavaScript)  
**n8n Node Name**: `Parse Post Text`

**Purpose**: Extract post text from Gemini response and normalize into postText field.

**Input**: Raw Gemini API response
**Output**: Complete data object with postText field ready for Facebook

**Code**:
```javascript
const response = $input.first().json;
const postText = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

// Merge with previous data from Parse Infographic Response
const previousData = $('Parse Infographic Response').first().json;

return [{
  json: {
    ...previousData,
    postText: postText.trim()
  }
}];
```

---

### Step 14: Upload Image to Facebook

**n8n Node**: HTTP Request

**Input**: Complete data object from Step 13b with postText, imageUrl, imageBase64
**Output**: Facebook post ID

**Configuration**:
```json
{
  "method": "POST",
  "url": "https://graph.facebook.com/v18.0/{{ $credentials.facebookPage.pageId }}/photos",
  "body": {
    "url": "{{ $json.imageUrl }}",
    "caption": "{{ $json.postText }}",
    "access_token": "{{ $credentials.facebookPage.accessToken }}"
  }
}
```

**Alternative** (if using base64):
```json
{
  "method": "POST",
  "url": "https://graph.facebook.com/v18.0/{{ $credentials.facebookPage.pageId }}/photos",
  "formData": {
    "source": "{{ $json.imageBase64 }}",
    "caption": "{{ $json.postText }}",
    "access_token": "{{ $credentials.facebookPage.accessToken }}"
  }
}
```

---

### Step 15: Build AGENT-003 Response

**n8n Node**: Code (JavaScript)

**Purpose**: Construct the standard WorkflowOutput response per AGENT-003 contract.

**Input**: Facebook post response from Step 14, plus data from parsing steps
**Output**: AGENT-003 compliant WorkflowOutput

**Code**:
```javascript
// Get data from parsing steps (which have accumulated all fields)
const postData = $('Parse Post Text').first().json;
const facebookResponse = $('Upload Image to Facebook').first().json;

// Get start time from trigger (either Schedule or Webhook)
let startTime;
try {
  startTime = $('Schedule Trigger').first().json.timestamp;
} catch (e) {
  startTime = $('Webhook').first().json.context?.requestedAt || new Date().toISOString();
}

const durationMs = Date.now() - new Date(startTime).getTime();

return [{
  json: {
    success: true,
    data: {
      winningEvent: {
        title: postData.winner.title,
        source: postData.winner.source,
        sentimentScore: postData.winner.score,
        reason: postData.winner.reason,
        link: postData.winner.link
      },
      fanSummary: postData.fanSummary,
      imageUrl: postData.imageUrl,
      facebookPostId: facebookResponse?.id || facebookResponse?.post_id
    },
    metadata: {
      workflowId: "european-football-daily",
      executionId: $execution.id,
      executedAt: new Date().toISOString(),
      durationMs: durationMs
    }
  }
}];
```

---

### Step 16: Return Response (Respond to Webhook)

**n8n Node**: Respond to Webhook

**Purpose**: Return AGENT-003 compliant response to Bilko if triggered via webhook.

**Configuration**:
```json
{
  "respondWith": "json",
  "responseBody": "={{ $json }}"
}
```

**Note**: This step is only executed when the workflow is triggered via webhook (manual execution from Bilko). For scheduled executions, this step is skipped but the workflow still logs the result.

---

### Step 17 (Optional): Callback for Scheduled Runs

**n8n Node**: HTTP Request

**Purpose**: For scheduled (non-webhook) executions, POST the result back to Bilko for tracing.

**Input**: AGENT-003 WorkflowOutput from Step 15
**Output**: Bilko trace confirmation

**Configuration**:
```json
{
  "method": "POST",
  "url": "{{ $env.BILKO_URL }}/api/n8n/callback",
  "headers": {
    "Content-Type": "application/json",
    "X-N8N-Signature": "{{ $env.N8N_CALLBACK_SECRET }}"
  },
  "body": "={{ $json }}"
}
```

**Note**: The callback sends the complete WorkflowOutput, which Bilko stores in communication_traces with:
- `sourceService`: "n8n"
- `destinationService`: "bilko"
- `workflowId`: "european-football-daily"
- Full response payload for auditing

---

## Error Handling

### Recommended Error Workflow

Add an Error Trigger workflow that catches failures and:
1. Logs the error to Bilko with status: "error"
2. Optionally sends notification (email/Slack)

### Per-Step Error Handling

| Step | Error Scenario | Fallback |
|------|----------------|----------|
| RSS Fetch | Network timeout | Retry 3x, then fail gracefully |
| Gemini API | Rate limit | Queue and retry after 60s |
| Reddit API | No results | Skip fan opinions, proceed with event only |
| Imagen | Generation failed | Skip infographic, post text-only |
| Facebook | Auth expired | Log error, notify admin |

---

## Environment Variables (n8n)

```
BILKO_URL=https://your-bilko-instance.replit.app
N8N_CALLBACK_SECRET=your-shared-secret
```

## Credentials Required (n8n)

1. **geminiApi**: `{ "apiKey": "..." }`
2. **facebookPage**: `{ "pageId": "...", "accessToken": "..." }`

---

## Testing

### Manual Trigger

Add a Webhook node at the start (parallel to Schedule) for manual testing:

```
POST /webhook/european-football-daily/test
```

### Dry Run Mode

Add a parameter to skip Facebook posting:

```json
{
  "dryRun": true
}
```

When dryRun is true, step 13 returns mock data instead of posting.

---

## Workflow Diagram

```
     ┌──────────────────┐     ┌──────────────────┐
     │ Schedule Trigger │     │      Webhook     │
     │   (00:00 daily)  │     │ (manual trigger) │
     └────────┬─────────┘     └────────┬─────────┘
              │                        │
              └───────────┬────────────┘
                          │
                          ▼
               ┌──────────────────┐
               │ 2. Google News   │
               │    RSS Fetch     │
               └────────┬─────────┘
                        │
                        ▼
               ┌──────────────────┐
               │ 3. Parse XML     │
               └────────┬─────────┘
                        │
                        ▼
               ┌──────────────────┐
               │ 4. Extract       │
               │    Articles      │
               └────────┬─────────┘
                        │
                        ▼
               ┌──────────────────┐
               │ 5. Aggregate     │
               │    Articles      │
               └────────┬─────────┘
                        │
                        ▼
               ┌──────────────────┐
               │ 6. Gemini        │
               │    Sentiment     │
               └────────┬─────────┘
                        │
                        ▼
               ┌──────────────────┐
               │ 7. Select Winner │
               └────────┬─────────┘
                        │
                        ▼
               ┌──────────────────┐
               │ 8. Extract       │
               │    Keywords      │
               └────────┬─────────┘
                        │
                        ▼
               ┌──────────────────┐
               │ 9. Reddit Search │
               └────────┬─────────┘
                        │
                        ▼
               ┌──────────────────┐
               │ 10. Extract      │
               │  Reddit Comments │
               └────────┬─────────┘
                        │
                        ▼
               ┌──────────────────┐
               │ 11. Generate     │
               │  Fan Summary API │
               └────────┬─────────┘
                        │
                        ▼
               ┌──────────────────┐
               │ 11b. Parse       │
               │   Fan Summary    │
               └────────┬─────────┘
                        │
                        ▼
               ┌──────────────────┐
               │ 12. Generate     │
               │  Infographic API │
               └────────┬─────────┘
                        │
                        ▼
               ┌──────────────────┐
               │ 12b. Parse       │
               │Infographic Resp. │
               └────────┬─────────┘
                        │
                        ▼
               ┌──────────────────┐
               │ 13. Compose      │
               │  FB Post API     │
               └────────┬─────────┘
                        │
                        ▼
               ┌──────────────────┐
               │ 13b. Parse       │
               │    Post Text     │
               └────────┬─────────┘
                        │
                        ▼
               ┌──────────────────┐
               │ 14. Upload Image │
               │   to Facebook    │
               └────────┬─────────┘
                        │
                        ▼
               ┌──────────────────┐
               │ 15. Build        │
               │ AGENT-003 Output │
               └────────┬─────────┘
                        │
          ┌─────────────┴─────────────┐
          │                           │
          ▼                           ▼
┌──────────────────┐       ┌──────────────────┐
│ 16. Respond to   │       │ 17. Callback to  │
│     Webhook      │       │     Bilko        │
│ (if API trigger) │       │ (if scheduled)   │
└──────────────────┘       └──────────────────┘
```

## n8n Node Names Reference

For the JavaScript code steps that reference other nodes via `$('Node Name')`, use these exact names:

| Step | n8n Node Name |
|------|---------------|
| 1a | Schedule Trigger |
| 1b | Webhook |
| 5 | Aggregate Articles |
| 7 | Select Winner |
| 10 | Extract Reddit Comments |
| 11b | Parse Fan Summary |
| 12b | Parse Infographic Response |
| 13b | Parse Post Text |
| 14 | Upload Image to Facebook |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-26 | Initial design |

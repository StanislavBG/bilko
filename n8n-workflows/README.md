# n8n Workflows for Bilko Bibitkov

This directory contains n8n workflow JSON files that can be imported directly into n8n.

## Available Workflows

### European Football Daily
**File**: `european-football-daily.json`

Daily automated European football news aggregation workflow that:
1. Fetches European football news from Google News RSS
2. Analyzes sentiment using Gemini API
3. Selects the most positive/cheerful event
4. Gathers fan opinions from Reddit r/soccer
5. Generates a celebratory infographic
6. Posts to Facebook with the image and caption

## Setup Instructions

### 1. Import Workflow to n8n

1. Open your n8n instance
2. Click **+ Add workflow** or go to **Workflows > Import**
3. Copy the contents of `european-football-daily.json`
4. Paste into the import dialog
5. Click **Import**

### 2. Configure Environment Variables in n8n

Set these environment variables in your n8n instance:

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google AI Studio API key for Gemini |
| `FACEBOOK_PAGE_ID` | Your Facebook Page ID |
| `FACEBOOK_PAGE_TOKEN` | Facebook Page Access Token with `pages_manage_posts` permission |
| `BILKO_CALLBACK_URL` | Bilko callback endpoint (default: http://localhost:5000/api/workflows/callback) |
| `WORKFLOW_CALLBACK_SECRET` | Secret for authenticating callbacks to Bilko |

### 3. Getting API Keys

#### Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Click **Create API Key**
3. Copy the key

#### Facebook Page Token
1. Go to [Meta Developer Portal](https://developers.facebook.com/)
2. Create an app or use existing
3. Add **Facebook Login** and **Pages API** products
4. Generate a Page Access Token with `pages_manage_posts` permission

### 4. Activate the Workflow

1. In n8n, open the imported workflow
2. Click the toggle in the top-right to **Activate** the workflow
3. The Schedule Trigger will run daily at 00:00 UTC
4. You can also trigger manually via the Webhook endpoint

## Webhook Endpoint

After activation, the workflow exposes a webhook at:
```
POST https://your-n8n-instance/webhook/european-football-daily
```

### Request Body
```json
{
  "context": {
    "source": "bilko",
    "requestedAt": "2026-01-25T12:00:00Z",
    "requestedBy": "user-id"
  },
  "parameters": {
    "dryRun": false
  }
}
```

### Response (AGENT-003 Format)
```json
{
  "success": true,
  "data": {
    "winningEvent": {
      "title": "Real Madrid wins Champions League",
      "source": "ESPN",
      "sentimentScore": 0.95,
      "reason": "Historic victory celebration",
      "link": "https://..."
    },
    "fanSummary": "Fans are ecstatic...",
    "imageUrl": "data:image/png;base64,...",
    "facebookPostId": "123456789"
  },
  "metadata": {
    "workflowId": "european-football-daily",
    "executionId": "abc123",
    "executedAt": "2026-01-25T00:05:00Z",
    "durationMs": 45000
  }
}
```

## Troubleshooting

### Gemini API Errors
- Ensure your API key is valid and has quota remaining
- Check that the model name is correct (`gemini-1.5-flash`)

### Facebook Posting Errors
- Verify Page Access Token is valid and not expired
- Ensure token has `pages_manage_posts` permission
- Check that Page ID is correct

### Reddit Search Issues
- Reddit's API may rate limit requests
- The workflow uses the public JSON API (no authentication required)

## Node Reference

| Node Name | Purpose |
|-----------|---------|
| Schedule Trigger | Runs daily at 00:00 UTC |
| Webhook | Manual trigger endpoint |
| Google News RSS Fetch | Fetches European football news |
| Parse XML | Converts RSS XML to JSON |
| Extract Articles | Extracts article data |
| Aggregate Articles | Combines articles |
| Gemini Sentiment Analysis | Analyzes sentiment |
| Select Winner | Picks most positive event |
| Extract Keywords | Gets search keywords |
| Reddit Search | Searches r/soccer |
| Extract Reddit Comments | Parses Reddit data |
| Generate Fan Summary | Summarizes fan reactions |
| Parse Fan Summary | Extracts summary text |
| Generate Infographic | Creates celebratory image |
| Parse Infographic Response | Extracts image data |
| Compose Facebook Post | Creates post caption |
| Parse Post Text | Extracts caption text |
| Upload Image to Facebook | Posts to Facebook |
| Build AGENT-003 Response | Formats output |
| Callback to Bilko | Notifies Bilko (scheduled runs) |
| Respond to Webhook | Returns response (webhook runs) |

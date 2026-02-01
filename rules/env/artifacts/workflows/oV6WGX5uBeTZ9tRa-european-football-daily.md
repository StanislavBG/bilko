# European Football Daily Workflow

**n8n ID**: `oV6WGX5uBeTZ9tRa`  
**Webhook Path**: `european-football-daily`  
**Version**: 2.0.0  
**Last Updated**: 2026-02-01

## Objectives

Multi-source European football news aggregation with AI-generated Facebook posts featuring wallpaper-style imagery.

### Success Criteria

1. **Content Quality**: Objective journalism style - no bias, numbered citations to sources
2. **Image Style**: Wallpaper-style imagery with informative text overlays (not clickbait)
3. **Deduplication**: Recent topics are filtered to avoid repetitive posts
4. **Distribution**: Ready-to-publish Facebook post format

### Key Outputs

| Output | Description |
|--------|-------------|
| `postContent` | Facebook post text with numbered citations |
| `imagePrompt` | Prompt for AI image generation |
| `tagline` | 3-6 word overlay for image (factual, not generic) |
| `hashtags` | Relevant hashtags for reach |

## Key Nodes

### Generate Tagline

Creates the text overlay for AI-generated images.

**Prompt Guidelines** (v1.1.0):
- 3-6 words maximum
- If headline contains a score, INCLUDE the score (e.g., "Barcelona 3-0 Madrid")
- If headline contains numbers (transfer fees, points, goals), include them
- Prioritize team names and factual information
- NO generic phrases: "Game On", "Breaking News", "Big Win", "What A Match"
- Should inform the viewer of WHAT happened, not just generate excitement

**Good Examples**:
- "Barcelona 3-0 Real Madrid"
- "Man City Clinches Title"
- "£80M Transfer Complete"
- "Liverpool Top After Win"

**Bad Examples** (prohibited):
- "Game On!"
- "What A Match!"
- "Football Fever"
- "Big News Today"

### Topic Analyst

Extracts structured data from news headlines:
- `hasScore`: Boolean - true if headline contains match score
- `hasNumbers`: Boolean - true if contains transfer fees, goals, points
- `teams`: Array of team names mentioned
- `event`: Brief event description
- `dataRichness`: Score 1-10 prioritizing headlines with actual data

### Aggregate Compliant Topics

Selects the best topic based on:
1. Compliance (safe for image generation)
2. Data richness (scores > generic news)
3. Brand value (major clubs/leagues)

## Changelog

### v2.0.0 (2026-02-01)
- Merged objectives and JSON definition into single artifact file
- Moved from `rules/env/004-efd-workflow.md` to artifacts folder
- Added detailed success criteria and key outputs table

### v1.1.0 (2026-01-31)
- Updated Generate Tagline prompt to produce informative titles with scores/teams instead of generic catchphrases
- Added `hasScore`, `teams`, `event` fields to tagline prompt; prohibited generic phrases

### v1.0.0 (2026-01-25)
- Initial workflow creation

## Workflow Definition

<details>
<summary>Click to expand n8n workflow JSON (2400+ lines)</summary>

```json
{
  "updatedAt": "2026-01-31T22:24:51.612Z",
  "createdAt": "2026-01-25T09:36:24.234Z",
  "id": "oV6WGX5uBeTZ9tRa",
  "name": "[EFD] European Football Daily",
  "description": null,
  "active": true,
  "isArchived": false,
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "european-football-daily",
        "responseMode": "onReceived",
        "options": {}
      },
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [
        0,
        208
      ],
      "id": "0025e044-d2ba-4e9f-8e73-98ca642c1087",
      "webhookId": "191adfc0-b71a-41c2-8a26-25ca9ec0b6c1"
    },
    {
      "parameters": {
        "url": "https://news.google.com/rss/search?q=european+football+champions+league+OR+premier+league+OR+la+liga+OR+bundesliga+OR+serie+a&hl=en-US&gl=US&ceid=US:en",
        "options": {}
      },
      "name": "Fetch RSS",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "position": [
        512,
        112
      ],
      "id": "a0c4d441-f13a-4003-8f49-1a710d29c12e"
    },
    {
      "parameters": {
        "options": {}
      },
      "name": "Parse XML",
      "type": "n8n-nodes-base.xml",
      "typeVersion": 1,
      "position": [
        752,
        112
      ],
      "id": "9466c9e8-2426-4e44-8a8e-ef37a1138c38"
    },
    {
      "parameters": {
        "jsCode": "const rss = $input.first().json;\nconst webhookData = $('Webhook').first().json.body || {};\nconst recentTopics = webhookData.recentTopics || [];\n\n// Build normalized headline set for exact matching\nconst recentHeadlinesNormalized = new Set(\n  recentTopics.map(t => t.headline.toLowerCase().trim().replace(/[^a-z0-9\\s]/g, ''))\n);\n\nconst items = rss?.rss?.channel?.item || [];\n\nconst articles = items.slice(0, 20).map(item => ({\n  title: item.title || '',\n  sourceHeadline: item.title || '', // Preserve original for callback\n  link: item.link || '',\n  source: 'Google News',\n  pubDate: item.pubDate || ''\n})).filter(a => {\n  const normalizedTitle = a.title.toLowerCase().trim().replace(/[^a-z0-9\\s]/g, '');\n  \n  // PRIMARY: Normalized exact headline match\n  if (recentHeadlinesNormalized.has(normalizedTitle)) {\n    return false;\n  }\n  \n  // SECONDARY: Word overlap check (>50% = likely duplicate)\n  const words = new Set(normalizedTitle.split(/\\s+/).filter(w => w.length > 3));\n  if (words.size >= 3) {\n    for (const recent of recentTopics) {\n      const recentNorm = recent.headline.toLowerCase().replace(/[^a-z0-9\\s]/g, '');\n      const recentWords = new Set(recentNorm.split(/\\s+/).filter(w => w.length > 3));\n      if (recentWords.size >= 3) {\n        const overlap = [...words].filter(w => recentWords.has(w)).length;\n        const similarity = overlap / Math.min(words.size, recentWords.size);\n        if (similarity > 0.5) {\n          return false;\n        }\n      }\n    }\n  }\n  \n  return true;\n}).slice(0, 10);\n\n// Fallback if all filtered out\nif (articles.length === 0 && items.length > 0) {\n  const first = items[0];\n  return [{\n    json: {\n      title: first.title || 'European Football Update',\n      sourceHeadline: first.title || 'European Football Update',\n      link: first.link || '',\n      source: 'Google News',\n      pubDate: first.pubDate || '',\n      forcedFallback: true,\n      recentTopicsCount: recentTopics.length\n    }\n  }];\n}\n\nreturn articles.map(a => ({ json: { ...a, recentTopicsCount: recentTopics.length } }));"
      },
      "name": "Extract Articles",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        1008,
        112
      ],
      "id": "2a98ef6a-8bc2-4312-9ae1-9c72f99e4b84"
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://bilkobibitkov.replit.app/api/workflows/callback",
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"workflowId\": \"european-football-daily\",\n  \"step\": \"extract-articles\",\n  \"stepIndex\": 1,\n  \"traceId\": \"{{ $('Webhook').first().json.body.traceId || $('Webhook').first().json.body.traceId || 'trace_' + $execution.id }}\",\n  \"output\": {\n    \"articles\": {{ JSON.stringify($input.all().map(i => i.json)) }},\n    \"count\": {{ $input.all().length }}\n  },\n  \"executionId\": \"{{ $execution.id }}\"\n}",
        "options": {}
      },
      "name": "Callback Articles",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "position": [
        1104,
        256
      ],
      "id": "c6ed77f1-fb89-4efe-875f-2c7668fa7140"
    },
    {
      "parameters": {
        "method": "POST",
        "url": "=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            },
            {
              "name": "x-goog-api-key",
              "value": "={{ $input.first().json.geminiApiKey }}"
            },
            {
              "name": "User-Agent",
              "value": "Mozilla/5.0 (compatible; BilkoBibitkov/1.0; +https://bilkobibitkov.replit.app)"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify($json.geminiRequestBody) }}",
        "options": {},
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth"
      },
      "name": "Generate Post",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "position": [
        2816,
        -32
      ],
      "id": "7c494835-fa77-48c9-ae73-269be50bb6af",
      "retryOnFail": true,
      "maxTries": 5,
      "waitBetweenTries": 5000,
      "credentials": {
        "httpHeaderAuth": {
          "id": "K9oPxIngg8rE26T6",
          "name": "Header Auth account"
        }
      }
    },
    {
      "parameters": {
        "jsCode": "const input = $input.first().json;\nconst prevData = $(\"Parse Hashtags\").first().json;\n\nconst text = input?.candidates?.[0]?.content?.parts?.[0]?.text || \"{}\";\nconst cleaned = text.replace(/^\\`\\`\\`[a-zA-Z]*\\\\n?/, \"\").replace(/\\\\n?\\`\\`\\`\\\\s*$/, \"\");\n\ntry {\n  const post = JSON.parse(cleaned);\n  let postContent = post.postContent || \"\";\n  \n  // Add source citations at the end (before hashtags)\n  const sourceUrls = prevData.sourceUrls || [];\n  if (sourceUrls.length > 0) {\n    // Find where hashtags start (# followed by word)\n    const hashtagMatch = postContent.match(/#[A-Za-z]/);\n    let beforeHashtags = postContent;\n    let hashtags = \"\";\n    \n    if (hashtagMatch) {\n      const hashtagIndex = postContent.indexOf(hashtagMatch[0]);\n      beforeHashtags = postContent.slice(0, hashtagIndex).trim();\n      hashtags = postContent.slice(hashtagIndex).trim();\n    }\n    \n    // Build citation line with numbered hyperlinks\n    const citations = sourceUrls.map((s, i) => \n      \"[\" + (i + 1) + \"](\" + s.url + \")\"\n    ).join(\" \");\n    \n    // Reconstruct post with sources\n    postContent = beforeHashtags + \"\\n\\nSources: \" + citations + \"\\n\\n\" + hashtags;\n  }\n  \n  return [{\n    json: {\n      postContent: postContent,\n      sentiment: post.sentiment || \"neutral\",\n      statsHighlighted: post.statsHighlighted || [],\n      safeImagePrompt: prevData.selectedTopic?.safeImagePrompt,\n      anonymizedDescriptions: prevData.selectedTopic?.anonymizedDescriptions || prevData.anonymizedDescriptions || {},\n      selectedTopic: prevData.selectedTopic,\n      comprehensiveSummary: prevData.comprehensiveSummary,\n      extractedStats: prevData.extractedStats || {},\n      teams: prevData.teams,\n      competition: prevData.competition,\n      keyFacts: prevData.keyFacts,\n      sourceUrls: prevData.sourceUrls,\n      sourceCount: prevData.sourceCount,\n      sourceLink: sourceUrls[0]?.url || \"\",\n      geminiApiKey: prevData.geminiApiKey,\n      callbackUrl: prevData.callbackUrl\n    }\n  }];\n} catch (e) {\n  const sourceUrls = prevData.sourceUrls || [];\n  const citations = sourceUrls.map((s, i) => \"[\" + (i + 1) + \"](\" + s.url + \")\").join(\" \");\n  \n  return [{\n    json: {\n      postContent: \"Football news update! Exciting developments in European football today.\\n\\nSources: \" + citations,\n      sentiment: \"neutral\",\n      statsHighlighted: [],\n      safeImagePrompt: prevData.selectedTopic?.safeImagePrompt || \"Exciting football stadium scene\",\n      anonymizedDescriptions: prevData.selectedTopic?.anonymizedDescriptions || {},\n      selectedTopic: prevData.selectedTopic,\n      comprehensiveSummary: prevData.comprehensiveSummary,\n      extractedStats: prevData.extractedStats || {},\n      teams: prevData.teams,\n      competition: prevData.competition,\n      keyFacts: prevData.keyFacts,\n      sourceUrls: prevData.sourceUrls,\n      sourceCount: prevData.sourceCount,\n      sourceLink: sourceUrls[0]?.url || \"\",\n      geminiApiKey: prevData.geminiApiKey,\n      callbackUrl: prevData.callbackUrl,\n      parseError: e.message\n    }\n  }];\n}"
      },
      "name": "Parse Post",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        2000,
        112
      ],
      "id": "5ffc1c44-ad8f-4df3-bb2c-2ac5ec931d9f"
    },
    {
      "parameters": {
        "method": "POST",
        "url": "=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            },
            {
              "name": "x-goog-api-key",
              "value": "={{ $input.first().json.geminiApiKey }}"
            },
            {
              "name": "User-Agent",
              "value": "Mozilla/5.0 (compatible; BilkoBibitkov/1.0; +https://bilkobibitkov.replit.app)"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify($json.requestBody) }}",
        "options": {},
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth"
      },
      "id": "fb8ce752-bb66-4d73-abb2-24fad043a177",
      "name": "Generate Image",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "position": [
        2256,
        112
      ],
      "credentials": {
        "httpHeaderAuth": {
          "id": "K9oPxIngg8rE26T6",
          "name": "Header Auth account"
        }
      }
    },
    {
      "parameters": {
        "jsCode": "const input = $input.first().json;\nconst prevData = $(\"Parse Post\").first().json;\n\n// Get Gemini response\nconst text = input?.candidates?.[0]?.content?.parts?.[0]?.text || \"{}\";\nconst cleaned = text.replace(/^```[a-zA-Z]*\\n?/, \"\").replace(/\\n?```\\s*$/, \"\");\n\ntry {\n  const imageData = JSON.parse(cleaned);\n  return [{\n    json: {\n      imagePrompt: imageData.imagePrompt,\n      style: imageData.style || \"photorealistic\",\n      postContent: prevData.postContent,\n      selectedTopic: prevData.selectedTopic,\n      extractedStats: prevData.extractedStats || {},\n      sourceLink: prevData.sourceLink || \"\",\n      geminiApiKey: prevData.geminiApiKey,\n      callbackUrl: prevData.callbackUrl\n    }\n  }];\n} catch (e) {\n  return [{\n    json: {\n      imagePrompt: \"Exciting football celebration scene in a modern stadium\",\n      style: \"photorealistic\",\n      postContent: prevData.postContent,\n      selectedTopic: prevData.selectedTopic,\n      extractedStats: prevData.extractedStats || {},\n      sourceLink: prevData.sourceLink || \"\",\n      geminiApiKey: prevData.geminiApiKey,\n      callbackUrl: prevData.callbackUrl,\n      parseError: e.message\n    }\n  }];\n}"
      },
      "name": "Parse Image Prompt",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        2512,
        112
      ],
      "id": "654ab797-28bc-4e88-a66c-74887fbedae5"
    },
    {
      "parameters": {
        "jsCode": "const brandingResult = $input.first().json;\n\nconst postContent = brandingResult.postContent || \"Football news update!\";\nconst imagePrompt = brandingResult.imagePrompt || \"European football celebration\";\nconst sourceLink = brandingResult.sourceLink || \"\";\nconst extractedStats = brandingResult.extractedStats || {};\nconst selectedTopic = brandingResult.selectedTopic || {};\nconst sourceUrls = brandingResult.sourceUrls || [];\nconst comprehensiveSummary = brandingResult.comprehensiveSummary || \"\";\nconst keyFacts = brandingResult.keyFacts || [];\nconst infographicElements = brandingResult.infographicElements || [];\n\nlet imageDataUri = brandingResult.imageDataUri || null;\nif (brandingResult.success && brandingResult.brandedImageBase64) {\n  imageDataUri = \"data:image/png;base64,\" + brandingResult.brandedImageBase64;\n}\n\n// Build source citations for transparency post\nconst citations = sourceUrls.map((s, i) => \"[\" + (i + 1) + \"] \" + s.url).join(\"\\n\");\n\nlet transparencyPost = \"I've developed this AI-driven system to efficiently curate European football news, serving as a professional 'proof of work' for AI integration. Grounded in transparency and the human-in-the-loop principle, this project demonstrates how AI can enhance specialized content. Follow for updates, or visit my bio to learn how to build similar systems.\\n\\nBilko Bibitkov Human-Centric AI Curation\\n\\n\" + brandingResult.sourceCount + \" sources analyzed for this report.\";\n\nif (citations) {\n  transparencyPost += \"\\n\\nSources:\\n\" + citations;\n}\n\nconst output = {\n  success: true,\n  selectedTopic: {\n    headline: selectedTopic.headline || \"\",\n    sourceHeadline: selectedTopic.sourceHeadline || selectedTopic.headline || \"\",\n    sourceHeadlineHash: selectedTopic.sourceHeadlineHash || \"\",\n    teams: selectedTopic.teams || [],\n    event: selectedTopic.event || \"\",\n    dataRichness: extractedStats.dataConfidence || selectedTopic.dataRichness || 0,\n    brandValue: selectedTopic.brandValue || 0,\n    extractedStats: extractedStats,\n    enhancedTagline: brandingResult.tagline || \"\"\n  },\n  data: {\n    postContent: postContent,\n    comprehensiveSummary: comprehensiveSummary,\n    keyFacts: keyFacts,\n    imagePrompt: imagePrompt,\n    imageUrl: imageDataUri,\n    tagline: brandingResult.tagline || \"\",\n    infographicElements: infographicElements,\n    transparencyPost: transparencyPost,\n    sourceLink: sourceLink,\n    sourceUrls: sourceUrls,\n    sourceCount: brandingResult.sourceCount || 1,\n    contentFiltered: !imageDataUri\n  }\n};\n\nreturn [{ json: output }];"
      },
      "name": "Build Final Output",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        3600,
        112
      ],
      "id": "71b64e2c-1852-4ef6-a21d-732907892df3"
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://bilkobibitkov.replit.app/api/workflows/callback",
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"workflowId\": \"european-football-daily\",\n  \"step\": \"final-output\",\n  \"stepIndex\": 3,\n  \"traceId\": \"{{ $('Webhook').first().json.body.traceId || $('Webhook').first().json.body.traceId || 'trace_' + $execution.id }}\",\n  \"output\": {{ JSON.stringify($input.first().json) }},\n  \"executionId\": \"{{ $execution.id }}\"\n}",
        "options": {}
      },
      "name": "Callback Final",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "position": [
        3008,
        112
      ],
      "id": "5a99a7c6-1f47-47eb-a13d-888ae0334bcf"
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ $('Build Final Output').first().json }}",
        "options": {}
      },
      "name": "Respond to Webhook",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1,
      "position": [
        3264,
        208
      ],
      "id": "4ea89a64-7267-4476-aac6-d67c10a7da98"
    },
    {
      "parameters": {
        "content": "PRODUCTION"
      },
      "type": "n8n-nodes-base.stickyNote",
      "typeVersion": 1,
      "position": [
        416,
        496
      ],
      "id": "303bff0e-4feb-4c29-903e-cd2782ab38ba",
      "name": "Sticky Note"
    },
    {
      "parameters": {
        "method": "POST",
        "url": "=https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            },
            {
              "name": "x-goog-api-key",
              "value": "={{ $json.geminiApiKey }}"
            },
            {
              "name": "User-Agent",
              "value": "Mozilla/5.0 (compatible; BilkoBibitkov/1.0; +https://bilkobibitkov.replit.app)"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"contents\": [{\n    \"parts\": [{\n      \"text\": \"{{ $json.imagePrompt }}. Include bold stylized text overlay on the image saying: {{ $json.tagline }}\"\n    }]\n  }],\n  \"generation_config\": {\n    \"response_modalities\": [\"IMAGE\"],\n    \"image_config\": {\n      \"aspect_ratio\": \"1:1\"\n    }\n  }\n}",
        "options": {},
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth"
      },
      "id": "74affa50-0102-49a6-8190-3e24f1ec0a2e",
      "name": "Call Imagen API",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "position": [
        3104,
        112
      ],
      "retryOnFail": true,
      "maxTries": 3,
      "waitBetweenTries": 5000,
      "credentials": {
        "httpHeaderAuth": {
          "id": "K9oPxIngg8rE26T6",
          "name": "Header Auth account"
        }
      }
    },
    {
      "parameters": {
        "jsCode": "const input = $input.first().json;\nconst prevData = $(\"Parse Tagline\").first().json;\n\nconst parts = input?.candidates?.[0]?.content?.parts || [];\nconst imagePart = parts.find(p => p.inlineData?.mimeType?.startsWith(\"image/\"));\n\nif (imagePart && imagePart.inlineData?.data) {\n  const mimeType = imagePart.inlineData.mimeType;\n  const base64Data = imagePart.inlineData.data;\n  const imageDataUri = \"data:\" + mimeType + \";base64,\" + base64Data;\n\n  return [{\n    json: {\n      imageDataUri: imageDataUri,\n      imagePrompt: prevData.imagePrompt,\n      tagline: prevData.tagline,\n      infographicElements: prevData.infographicElements,\n      postContent: prevData.postContent,\n      selectedTopic: prevData.selectedTopic,\n      extractedStats: prevData.extractedStats || {},\n      comprehensiveSummary: prevData.comprehensiveSummary,\n      keyFacts: prevData.keyFacts,\n      sourceUrls: prevData.sourceUrls,\n      sourceCount: prevData.sourceCount,\n      sourceLink: prevData.sourceLink,\n      geminiApiKey: prevData.geminiApiKey,\n      callbackUrl: prevData.callbackUrl\n    }\n  }];\n} else {\n  return [{\n    json: {\n      imageDataUri: null,\n      imagePrompt: prevData.imagePrompt,\n      tagline: prevData.tagline,\n      infographicElements: prevData.infographicElements,\n      postContent: prevData.postContent,\n      selectedTopic: prevData.selectedTopic,\n      extractedStats: prevData.extractedStats || {},\n      comprehensiveSummary: prevData.comprehensiveSummary,\n      keyFacts: prevData.keyFacts,\n      sourceUrls: prevData.sourceUrls,\n      sourceCount: prevData.sourceCount,\n      sourceLink: prevData.sourceLink,\n      geminiApiKey: prevData.geminiApiKey,\n      callbackUrl: prevData.callbackUrl,\n      imagenError: \"No image data in response\"\n    }\n  }];\n}"
      },
      "id": "ec694419-9c45-4f5d-b2a9-56f136492315",
      "name": "Parse Imagen Response",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        3360,
        112
      ]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            },
            {
              "name": "User-Agent",
              "value": "Mozilla/5.0 (compatible; BilkoBibitkov/1.0)"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"contents\": [{\n    \"parts\": [{\n      \"text\": \"Analyze this football news headline and extract key information for social media.\\n\\nHEADLINE: {{ $json.title }}\\n\\nReturn ONLY a JSON object with:\\n- headline: the original headline\\n- teams: array of team names mentioned (prioritize big clubs: Real Madrid, Barcelona, Man City, Liverpool, Bayern, PSG, Juventus, etc.)\\n- event: brief description (match result, transfer, injury, etc.)\\n- hasScore: boolean - true if headline contains a match score like 3-0, 2-1\\n- hasNumbers: boolean - true if contains significant numbers (transfer fees, goals, points, positions)\\n- dataRichness: score 1-10 (10=has scores/stats/numbers, 5=has team names, 1=vague/generic)\\n- brandValue: score 1-10 (10=mentions top clubs/leagues/tournaments, 1=unknown teams)\\n- imageability: score 1-10 how easy to create a generic image\\n- imageSuggestion: a generic image concept avoiding real people names\\n\\nPrioritize headlines with: actual scores, transfer fees, league standings, big club names.\\nExample: { \\\"headline\\\": \\\"Barcelona 3-0 Real Madrid\\\", \\\"teams\\\": [\\\"Barcelona\\\", \\\"Real Madrid\\\"], \\\"event\\\": \\\"El Clasico victory\\\", \\\"hasScore\\\": true, \\\"hasNumbers\\\": true, \\\"dataRichness\\\": 10, \\\"brandValue\\\": 10, \\\"imageability\\\": 9, \\\"imageSuggestion\\\": \\\"celebrating football team in red and blue\\\" }\"\n    }]\n  }]\n}",
        "options": {
          "batching": {
            "batch": {
              "batchSize": 1,
              "batchInterval": 2000
            }
          }
        },
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth"
      },
      "id": "3bcffc23-1424-49a1-afd7-7f0514ed2ef7",
      "name": "Topic Analyst",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "position": [
        1312,
        -32
      ],
      "credentials": {
        "httpHeaderAuth": {
          "id": "K9oPxIngg8rE26T6",
          "name": "Header Auth account"
        }
      }
    },
    {
      "parameters": {
        "jsCode": "const input = $input.first().json;\nconst geminiApiKey = $(\"Webhook\").first().json.body.geminiApiKey;\nconst callbackUrl = $(\"Webhook\").first().json.body.callbackUrl;\n\n// Get the source article data from Extract Articles using item index\nconst articleItems = $(\"Extract Articles\").all();\nconst currentIndex = $runIndex;\nconst articleData = articleItems[currentIndex]?.json || {};\nconst sourceLink = articleData.link || \"\";\nconst sourceHeadline = articleData.sourceHeadline || articleData.title || \"\";\nconst sourceHeadlineHash = articleData.titleHash || \"\";\n\n// Get the text response from Gemini\nconst text = input?.candidates?.[0]?.content?.parts?.[0]?.text || \"{}\";\n\n// Strip markdown fences if present\nconst cleaned = text.replace(/^```[a-zA-Z]*\\n?/, \"\").replace(/\\n?```\\s*$/, \"\");\n\ntry {\n  const analysis = JSON.parse(cleaned);\n  return [{\n    json: {\n      ...analysis,\n      sourceLink: sourceLink,\n      sourceHeadline: sourceHeadline,\n      sourceHeadlineHash: sourceHeadlineHash,\n      geminiApiKey,\n      callbackUrl\n    }\n  }];\n} catch (e) {\n  return [{\n    json: {\n      headline: \"Football news update\",\n      people: [],\n      teams: [],\n      event: \"general news\",\n      imageability: 5,\n      imageSuggestion: \"generic football stadium scene\",\n      sourceLink: sourceLink,\n      sourceHeadline: sourceHeadline,\n      sourceHeadlineHash: sourceHeadlineHash,\n      parseError: e.message,\n      geminiApiKey,\n      callbackUrl\n    }\n  }];\n}"
      },
      "id": "4a292d0b-d120-4074-87fc-6667de4e4de6",
      "name": "Parse Topic Analysis",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        1616,
        -32
      ]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            },
            {
              "name": "User-Agent",
              "value": "Mozilla/5.0 (compatible; BilkoBibitkov/1.0)"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "options": {
          "batching": {
            "batch": {
              "batchSize": 1,
              "batchInterval": 2000
            }
          }
        },
        "contentType": "json",
        "jsonBody": "={{ JSON.stringify($json.requestBody) }}",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth"
      },
      "id": "9c51724e-f9eb-4bea-a72c-3dbf6c163d0a",
      "name": "Compliance Checker",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "position": [
        1920,
        -32
      ],
      "credentials": {
        "httpHeaderAuth": {
          "id": "K9oPxIngg8rE26T6",
          "name": "Header Auth account"
        }
      }
    },
    {
      "parameters": {
        "jsCode": "const input = $input.first().json;\nconst prevData = $(\"Parse Topic Analysis\").first().json;\n\n// Get the text response from Gemini\nconst text = input?.candidates?.[0]?.content?.parts?.[0]?.text || \"{}\";\n\n// Strip markdown fences if present\nconst cleaned = text.replace(/^```[a-zA-Z]*\\n?/, \"\").replace(/\\n?```\\s*$/, \"\");\n\ntry {\n  const compliance = JSON.parse(cleaned);\n  return [{\n    json: {\n      headline: prevData.headline,\n      people: prevData.people,\n      teams: prevData.teams,\n      event: prevData.event,\n      imageability: prevData.imageability,\n      imageSuggestion: prevData.imageSuggestion,\n      sourceLink: prevData.sourceLink,\n      sourceHeadline: prevData.sourceHeadline,\n      sourceHeadlineHash: prevData.sourceHeadlineHash,\n      compliant: compliance.compliant !== false,\n      complianceReason: compliance.reason,\n      anonymizedDescriptions: compliance.anonymizedDescriptions || {},\n      safeImagePrompt: compliance.safeImagePrompt,\n      geminiApiKey: prevData.geminiApiKey,\n      callbackUrl: prevData.callbackUrl\n    }\n  }];\n} catch (e) {\n  return [{\n    json: {\n      ...prevData,\n      compliant: true,\n      complianceReason: \"Parse error, using fallback: \" + e.message,\n      anonymizedDescriptions: {},\n      safeImagePrompt: \"Generic football stadium celebration scene with fans cheering\"\n    }\n  }];\n}"
      },
      "id": "e2dd7a80-e193-4290-a91b-542eb7f02b52",
      "name": "Parse Compliance Check",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        2208,
        -32
      ]
    },
    {
      "parameters": {
        "jsCode": "// Collect all items (each article's compliance check result)\nconst items = $input.all();\nconst geminiApiKey = items[0]?.json?.geminiApiKey;\nconst callbackUrl = items[0]?.json?.callbackUrl;\n\n// Filter to only compliant topics and sort by data-richness + brand value\nconst compliantTopics = items\n  .map(item => item.json)\n  .filter(topic => topic.compliant === true)\n  .sort((a, b) => {\n    // Combined score prioritizing data-rich, high-brand topics\n    const scoreA = (a.dataRichness || 0) * 2 + (a.brandValue || 0) * 1.5 + (a.imageability || 0);\n    const scoreB = (b.dataRichness || 0) * 2 + (b.brandValue || 0) * 1.5 + (b.imageability || 0);\n    return scoreB - scoreA;\n  });\n\n// If no compliant topics, create a safe fallback\nif (compliantTopics.length === 0) {\n  return [{\n    json: {\n      selectedTopic: {\n        headline: 'European Football Weekly Update',\n        teams: [],\n        event: 'weekly roundup',\n        safeImagePrompt: 'Exciting football match scene in a packed stadium with cheering fans',\n        anonymizedDescriptions: {},\n        fallback: true\n      },\n      allTopics: items.map(i => i.json),\n      geminiApiKey,\n      callbackUrl\n    }\n  }];\n}\n\n// Select the best topic (highest combined score)\nreturn [{\n  json: {\n    selectedTopic: compliantTopics[0],\n    alternativeTopics: compliantTopics.slice(1, 3),\n    allTopics: items.map(i => i.json),\n    geminiApiKey,\n    callbackUrl\n  }\n}];"
      },
      "id": "2426cf99-5a5b-4963-9ffc-81c4ec3cee01",
      "name": "Aggregate Compliant Topics",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        2512,
        -32
      ]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            },
            {
              "name": "x-goog-api-key",
              "value": "={{ $json.geminiApiKey }}"
            },
            {
              "name": "User-Agent",
              "value": "Mozilla/5.0 (compatible; BilkoBibitkov/1.0)"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"contents\": [{\n    \"parts\": [{\n      \"text\": \"Find the 3 most relevant, high-reach hashtags for this European football topic.\\n\\nTOPIC: {{ $json.selectedTopic.headline }}\\nEVENT: {{ $json.selectedTopic.event }}\\nTEAMS: {{ ($json.selectedTopic.teams || []).join(', ') }}\\nKEY DATA: {{ $json.selectedTopic?.extractedStats?.keyStatistic || 'general football news' }}\\n\\nRules:\\n- Return EXACTLY 3 hashtags\\n- Must be real, widely-used hashtags on social media\\n- Must be directly relevant to this specific topic/teams/event\\n- Include the # symbol\\n- Prefer hashtags with high engagement (millions of posts)\\n\\nReturn ONLY a JSON object: {\\\"hashtags\\\": [\\\"#tag1\\\", \\\"#tag2\\\", \\\"#tag3\\\"]}\"\n    }]\n  }]\n}",
        "options": {},
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth"
      },
      "id": "hashtag-researcher-1769380010487",
      "name": "Hashtag Researcher",
      "type": "n8n-nodes-base.httpRequest",
      "position": [
        2816,
        -32
      ],
      "typeVersion": 4.2,
      "credentials": {
        "httpHeaderAuth": {
          "id": "K9oPxIngg8rE26T6",
          "name": "Header Auth account"
        }
      }
    },
    {
      "parameters": {
        "jsCode": "// Get Gemini response from HTTP Request\nconst geminiResponse = $input.first().json;\n\n// Get original data from Aggregate Compliant Topics or Parse Statistics (whichever is available)\nlet originalData;\ntry {\n  originalData = $(\"Parse Statistics\").first().json;\n} catch (e) {\n  try {\n    originalData = $(\"Aggregate Compliant Topics\").first().json;\n  } catch (e2) {\n    originalData = {};\n  }\n}\n\nconst geminiApiKey = originalData.geminiApiKey;\nconst callbackUrl = originalData.callbackUrl;\nconst selectedTopic = originalData.selectedTopic || {};\nconst extractedStats = selectedTopic.extractedStats || originalData.extractedStats || {};\nconst teams = selectedTopic.teams || [];\nconst competition = selectedTopic.competition || \"\";\nconst sourceUrls = originalData.sourceUrls || [];\nconst sourceCount = originalData.sourceCount || 1;\n\n// Parse hashtags from Gemini response\nlet hashtags = [\"#football\", \"#soccer\", \"#UEFA\"]; // fallback\ntry {\n  const candidates = geminiResponse.candidates || [];\n  if (candidates.length > 0) {\n    let text = candidates[0].content?.parts?.[0]?.text || \"\";\n    text = text.replace(/```json\\n?/g, \"\").replace(/```/g, \"\").trim();\n    const parsed = JSON.parse(text);\n    if (parsed.hashtags && Array.isArray(parsed.hashtags)) {\n      hashtags = parsed.hashtags.slice(0, 3);\n    }\n  }\n} catch (e) {\n  // Keep fallback\n}\n\nreturn [{\n  json: {\n    selectedTopic: selectedTopic,\n    extractedStats: extractedStats,\n    teams: teams,\n    competition: competition,\n    sourceUrls: sourceUrls,\n    sourceCount: sourceCount,\n    sourceLink: selectedTopic?.sourceLink || \"\",\n    anonymizedDescriptions: selectedTopic?.anonymizedDescriptions || {},\n    hashtags: hashtags,\n    hashtagString: hashtags.join(\" \"),\n    geminiApiKey: geminiApiKey,\n    callbackUrl: callbackUrl\n  }\n}];"
      },
      "id": "parse-hashtags-1769380010487",
      "name": "Parse Hashtags",
      "type": "n8n-nodes-base.code",
      "position": [
        3008,
        -32
      ],
      "typeVersion": 2
    },
    {
      "id": "prepare-post-request-1769980000001",
      "name": "Prepare Post Request",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        2750,
        -32
      ],
      "parameters": {
        "jsCode": "// Sanitize content for JSON serialization\nconst prevData = $input.first().json;\nconst selectedTopic = prevData.selectedTopic || {};\nconst extractedStats = prevData.extractedStats || selectedTopic.extractedStats || {};\nconst teams = prevData.teams || selectedTopic.teams || [];\nconst competition = prevData.competition || selectedTopic.competition || '';\nconst hashtagString = prevData.hashtagString || '#football #soccer #UEFA';\nconst sourceCount = prevData.sourceCount || 1;\nconst keyFacts = prevData.keyFacts || [];\n\n// Sanitize function - remove characters that break JSON\nconst sanitize = (str) => {\n  if (typeof str !== 'string') return String(str || '');\n  return str\n    .replace(/[\\x00-\\x1F\\x7F]/g, ' ')\n    .replace(/\\\\/g, '\\\\\\\\')\n    .replace(/\"/g, \"'\")\n    .replace(/\\n/g, ' ')\n    .substring(0, 2000)\n    .trim();\n};\n\n// Build sanitized values\nconst headline = sanitize(selectedTopic.headline || 'Football news');\nconst comprehensiveSummary = sanitize(prevData.comprehensiveSummary || 'Football update');\nconst teamsStr = sanitize(teams.join(', '));\nconst competitionStr = sanitize(competition);\nconst keyFactsStr = sanitize(keyFacts.slice(0, 3).join('; '));\n\n// Build the prompt\nconst promptText = `You are an objective European football journalist creating a comprehensive Facebook post.\n\nTOPIC: ${headline}\nCOMPREHENSIVE SUMMARY: ${comprehensiveSummary}\nTEAMS: ${teamsStr}\nCOMPETITION: ${competitionStr}\nHASHTAGS TO USE: ${hashtagString}\n\nEXTRACTED STATISTICS:\n- Score: ${extractedStats.score || 'not available'}\n- Possession: Home ${extractedStats.possession?.home || '?'}% - Away ${extractedStats.possession?.away || '?'}%\n- Shots: Home ${extractedStats.shots?.home || '?'} - Away ${extractedStats.shots?.away || '?'}\n- Transfer Fee: ${extractedStats.transferFee || 'N/A'}\n- League Position: ${extractedStats.leaguePosition || 'N/A'}\n- Points: ${extractedStats.points || 'N/A'}\n\nKEY FACTS: ${keyFactsStr}\nSOURCE COUNT: ${sourceCount} sources analyzed\n\nCreate an OBJECTIVE journalism-style Facebook post (3-4 paragraphs) that:\n1. LEADS with the most significant statistic or result\n2. Presents facts neutrally without bias toward any team\n3. Includes ALL available statistics naturally in the narrative\n4. Provides context about implications for the league/tournament\n5. Uses measured language - avoid superlatives and hype\n6. MUST end with these EXACT hashtags: ${hashtagString}\n\nReturn ONLY a JSON object with:\n- postContent: the full post text including hashtags\n- sentiment: positive/neutral/negative\n- statsHighlighted: array of stats you included`;\n\n// Build Gemini request body\nconst requestBody = {\n  contents: [{\n    parts: [{\n      text: promptText\n    }]\n  }]\n};\n\nreturn [{\n  json: {\n    geminiRequestBody: requestBody,\n    selectedTopic: selectedTopic,\n    extractedStats: extractedStats,\n    teams: teams,\n    competition: competition,\n    hashtagString: hashtagString,\n    sourceUrls: prevData.sourceUrls || [],\n    sourceCount: sourceCount,\n    sourceLink: prevData.sourceLink || selectedTopic.sourceLink || '',\n    geminiApiKey: prevData.geminiApiKey,\n    callbackUrl: prevData.callbackUrl\n  }\n}];"
      }
    },
    {
      "parameters": {
        "method": "POST",
        "url": "=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            },
            {
              "name": "User-Agent",
              "value": "BilkoBibitkovApp/1.0"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"contents\": [{\n    \"parts\": [{\n      \"text\": \"Create a SHORT, DATA-FOCUSED tagline for a sports infographic.\\n\\nTOPIC: {{ $json.selectedTopic?.headline }}\\nSCORE: {{ $json.extractedStats?.score || 'N/A' }}\\nPOSSESSION: {{ $json.extractedStats?.possession?.home || '?' }}% - {{ $json.extractedStats?.possession?.away || '?' }}%\\nSHOTS: {{ $json.extractedStats?.shots?.home || '?' }} - {{ $json.extractedStats?.shots?.away || '?' }}\\nTRANSFER FEE: {{ $json.extractedStats?.transferFee || 'N/A' }}\\nLEAGUE POSITION: {{ $json.extractedStats?.leaguePosition || 'N/A' }}\\nPOINTS: {{ $json.extractedStats?.points || 'N/A' }}\\nSOURCES: {{ $json.sourceCount }} sources analyzed\\n\\nCreate a tagline that:\\n1. Is 3-6 words maximum\\n2. MUST include the most important number/stat\\n3. Is punchy and impactful\\n4. Works as a headline overlay\\n\\nExamples with data:\\n- Score available: '2-1 Victory!'\\n- Transfer: '€85M Move Confirmed'\\n- League: 'Top of the Table'\\n- Stats: '67% Possession Dominance'\\n\\nReturn ONLY JSON: { \\\"tagline\\\": \\\"your tagline here\\\" }\"\n    }]\n  }]\n}",
        "options": {
          "response": {
            "response": {}
          }
        },
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth"
      },
      "name": "Generate Tagline",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "position": [
        2608,
        112
      ],
      "id": "tagline-gen-1769390960853",
      "credentials": {
        "httpHeaderAuth": {
          "id": "K9oPxIngg8rE26T6",
          "name": "Header Auth account"
        }
      }
    },
    {
      "parameters": {
        "jsCode": "const input = $input.first().json;\nconst prevData = $(\"Build Image Request\").first().json;\n\nconst text = input?.candidates?.[0]?.content?.parts?.[0]?.text || \"{}\";\nconst cleaned = text.replace(/^```[a-zA-Z]*\\n?/, \"\").replace(/\\n?```\\s*$/, \"\");\n\ntry {\n  const taglineData = JSON.parse(cleaned);\n  return [{\n    json: {\n      tagline: taglineData.tagline || \"Match Report\",\n      imagePrompt: prevData.imagePrompt,\n      infographicElements: prevData.infographicElements,\n      postContent: prevData.postContent,\n      selectedTopic: prevData.selectedTopic,\n      extractedStats: prevData.extractedStats || {},\n      comprehensiveSummary: prevData.comprehensiveSummary,\n      keyFacts: prevData.keyFacts,\n      sourceUrls: prevData.sourceUrls,\n      sourceCount: prevData.sourceCount,\n      sourceLink: prevData.sourceLink,\n      geminiApiKey: prevData.geminiApiKey,\n      callbackUrl: prevData.callbackUrl\n    }\n  }];\n} catch (e) {\n  // Generate fallback tagline from stats\n  let fallbackTagline = \"Match Report\";\n  if (prevData.extractedStats?.score) {\n    fallbackTagline = prevData.extractedStats.score + \" Final\";\n  } else if (prevData.extractedStats?.transferFee) {\n    fallbackTagline = prevData.extractedStats.transferFee + \" Deal\";\n  } else if (prevData.extractedStats?.leaguePosition) {\n    fallbackTagline = \"#\" + prevData.extractedStats.leaguePosition + \" Ranking\";\n  }\n  \n  return [{\n    json: {\n      tagline: fallbackTagline,\n      imagePrompt: prevData.imagePrompt,\n      infographicElements: prevData.infographicElements,\n      postContent: prevData.postContent,\n      selectedTopic: prevData.selectedTopic,\n      extractedStats: prevData.extractedStats || {},\n      comprehensiveSummary: prevData.comprehensiveSummary,\n      keyFacts: prevData.keyFacts,\n      sourceUrls: prevData.sourceUrls,\n      sourceCount: prevData.sourceCount,\n      sourceLink: prevData.sourceLink,\n      geminiApiKey: prevData.geminiApiKey,\n      callbackUrl: prevData.callbackUrl,\n      parseError: e.message\n    }\n  }];\n}"
      },
      "name": "Parse Tagline",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        2864,
        112
      ],
      "id": "parse-tagline-1769390960853"
    },
    {
      "id": "brand-image-node-1769619318863",
      "name": "Brand Image",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "position": [
        3580,
        112
      ],
      "parameters": {
        "method": "POST",
        "url": "https://bilkobibitkov.replit.app/api/images/brand",
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({ imageBase64: $json.imageDataUri ? $json.imageDataUri.replace(/^data:image\\/[^;]+;base64,/, \"\") : null }) }}",
        "options": {}
      }
    },
    {
      "id": "parse-brand-node-1769619318863",
      "name": "Parse Brand Response",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        3800,
        112
      ],
      "parameters": {
        "jsCode": "const input = $input.first().json;\nconst prevData = $(\"Parse Imagen Response\").first().json;\n\nconst parts = input?.candidates?.[0]?.content?.parts || [];\nconst imagePart = parts.find(p => p.inlineData?.mimeType?.startsWith(\"image/\"));\n\nlet brandedImageBase64 = null;\nif (imagePart && imagePart.inlineData?.data) {\n  brandedImageBase64 = imagePart.inlineData.data;\n}\n\nreturn [{\n  json: {\n    success: !!brandedImageBase64,\n    brandedImageBase64: brandedImageBase64,\n    imageDataUri: prevData.imageDataUri,\n    imagePrompt: prevData.imagePrompt,\n    tagline: prevData.tagline,\n    infographicElements: prevData.infographicElements,\n    postContent: prevData.postContent,\n    selectedTopic: prevData.selectedTopic,\n    extractedStats: prevData.extractedStats || {},\n    comprehensiveSummary: prevData.comprehensiveSummary,\n    keyFacts: prevData.keyFacts,\n    sourceUrls: prevData.sourceUrls,\n    sourceCount: prevData.sourceCount,\n    sourceLink: prevData.sourceLink,\n    geminiApiKey: prevData.geminiApiKey,\n    callbackUrl: prevData.callbackUrl\n  }\n}];"
      }
    },
    {
      "id": "cc_body_builder",
      "name": "Build Compliance Request",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        1620,
        -32
      ],
      "parameters": {
        "jsCode": "// Build the Gemini API request body for compliance checking\nconst headline = $input.first().json.headline;\nconst people = $input.first().json.people || [];\nconst imageSuggestion = $input.first().json.imageSuggestion;\nconst geminiApiKey = $input.first().json.geminiApiKey;\nconst runIndex = $input.first().json.runIndex;\nconst link = $input.first().json.link;\n\nconst prompt = `You are an AI image compliance expert. Analyze this football topic and create anonymous visual descriptions.\n\nTOPIC: ${headline}\nPEOPLE: ${JSON.stringify(people)}\nIMAGE IDEA: ${imageSuggestion}\n\nFor each person listed, generate an anonymous physical description (height, build, hair, attire) without using their name.\n\nReturn ONLY valid JSON with these fields:\n- compliant: true\n- reason: why its safe for image generation  \n- anonymizedDescriptions: object mapping each person name to their anonymous description\n- safeImagePrompt: the image prompt rewritten with anonymous descriptions`;\n\nreturn {\n  json: {\n    headline,\n    people,\n    imageSuggestion,\n    geminiApiKey,\n    runIndex,\n    link,\n    requestBody: {\n      contents: [{\n        parts: [{ text: prompt }]\n      }]\n    }\n  }\n};\n"
      }
    },
    {
      "id": "gi_body_builder",
      "name": "Build Image Request",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        2006,
        112
      ],
      "parameters": {
        "jsCode": "const prevData = $input.first().json;\nconst selectedTopic = prevData.selectedTopic || {};\nconst extractedStats = prevData.extractedStats || {};\nconst keyFacts = prevData.keyFacts || [];\nconst sourceCount = prevData.sourceCount || 1;\nconst teams = selectedTopic.teams || [];\n\n// WALLPAPER-FIRST DESIGN: Prioritize cinematic scene with minimal overlays\n// Select only 2-3 MOST IMPACTFUL stats (not all of them)\nconst statPriority = [];\n\n// Priority 1: Score (most important for match results)\nif (extractedStats.score) {\n  statPriority.push({\n    type: 'score',\n    value: extractedStats.score,\n    display: extractedStats.score\n  });\n}\n\n// Priority 2: Transfer fee (for transfer news)\nif (extractedStats.transferFee && !extractedStats.score) {\n  statPriority.push({\n    type: 'transfer',\n    value: extractedStats.transferFee,\n    display: extractedStats.transferFee\n  });\n}\n\n// Priority 3: League position (for standings news)\nif (extractedStats.leaguePosition && statPriority.length < 2) {\n  const ordinal = extractedStats.leaguePosition + (['st','nd','rd'][((extractedStats.leaguePosition+90)%100-10)%10-1]||'th');\n  statPriority.push({\n    type: 'position',\n    value: extractedStats.leaguePosition,\n    display: ordinal + ' Place'\n  });\n}\n\n// Priority 4: Possession (visual stat for match)\nif (extractedStats.possession?.home && statPriority.length < 2) {\n  statPriority.push({\n    type: 'possession',\n    value: extractedStats.possession.home,\n    display: extractedStats.possession.home + '% Possession'\n  });\n}\n\n// Priority 5: Points (if league standings)\nif (extractedStats.points && statPriority.length < 2) {\n  statPriority.push({\n    type: 'points',\n    value: extractedStats.points,\n    display: extractedStats.points + ' pts'\n  });\n}\n\n// Limit to MAX 2 overlay elements for clean aesthetic\nconst selectedStats = statPriority.slice(0, 2);\n\n// Build team color context\nconst teamColors = teams.length >= 2 \n  ? 'colors inspired by ' + teams[0] + ' and ' + teams[1]\n  : teams.length === 1 \n    ? 'colors inspired by ' + teams[0]\n    : 'deep blue and gold accents';\n\n// Determine scene type based on news category\nlet sceneType = 'epic stadium atmosphere at golden hour';\nif (extractedStats.transferFee) {\n  sceneType = 'dramatic press conference lighting with stadium silhouette in background';\n} else if (extractedStats.leaguePosition) {\n  sceneType = 'trophy room with championship memorabilia, dramatic spotlight';\n} else if (extractedStats.score) {\n  sceneType = 'packed stadium celebrating, flares and confetti, wide cinematic angle';\n}\n\n// WALLPAPER-FIRST prompt structure\nlet fullPrompt = 'Create a CINEMATIC DESKTOP WALLPAPER image (16:9 aspect ratio). ';\nfullPrompt += 'Primary focus: ' + sceneType + '. ';\nfullPrompt += 'Style: High-end sports broadcast quality, dramatic lighting, ' + teamColors + '. ';\nfullPrompt += 'Composition: 70% atmospheric scene, 30% clean negative space for optional text overlay. ';\nfullPrompt += 'Aesthetic: Premium, immersive, like a movie poster or AAA game cover. ';\n\n// Add MINIMAL stat overlays (2 max)\nif (selectedStats.length > 0) {\n  const overlays = selectedStats.map(s => {\n    if (s.type === 'score') {\n      return 'SCORE: \"' + s.display + '\" - large, elegant typography in lower third';\n    } else if (s.type === 'transfer') {\n      return 'FEE BADGE: \"' + s.display + '\" - gold accent, corner placement';\n    } else if (s.type === 'position') {\n      return 'RANK: \"' + s.display + '\" - subtle, integrated into scene';\n    } else if (s.type === 'possession') {\n      return 'STAT: \"' + s.display + '\" - thin bar graphic, bottom edge';\n    } else if (s.type === 'points') {\n      return 'POINTS: \"' + s.display + '\" - small badge, corner';\n    }\n    return '';\n  }).filter(Boolean);\n  \n  fullPrompt += 'Minimal overlays: ' + overlays.join('. ') + '. ';\n} else {\n  fullPrompt += 'No text overlays - pure atmospheric image. ';\n}\n\nfullPrompt += 'CRITICAL: NO faces, NO real people, NO player likenesses. Focus on atmosphere, stadium, crowd energy, abstract team elements. ';\nfullPrompt += 'Quality: 4K desktop wallpaper, sharp details, professional color grading.';\n\nconst requestBody = {\n  contents: [{\n    parts: [{\n      text: fullPrompt\n    }]\n  }]\n};\n\nreturn [{\n  json: {\n    requestBody,\n    imagePrompt: fullPrompt,\n    selectedStats: selectedStats,\n    sceneType: sceneType,\n    postContent: prevData.postContent,\n    selectedTopic: prevData.selectedTopic,\n    extractedStats: extractedStats,\n    comprehensiveSummary: prevData.comprehensiveSummary,\n    keyFacts: keyFacts,\n    sourceUrls: prevData.sourceUrls,\n    sourceCount: sourceCount,\n    sourceLink: prevData.sourceLink,\n    geminiApiKey: prevData.geminiApiKey,\n    callbackUrl: prevData.callbackUrl\n  }\n}];"
      }
    },
    {
      "id": "fetch-article-content-1769975476415",
      "name": "Fetch Article Content",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "position": [
        2600,
        -150
      ],
      "parameters": {
        "method": "GET",
        "url": "={{ $json.selectedTopic.sourceLink }}",
        "options": {
          "redirect": {
            "redirect": {
              "followRedirects": true,
              "maxRedirects": 5
            }
          },
          "response": {
            "response": {
              "responseFormat": "text"
            }
          },
          "timeout": 15000
        }
      },
      "retryOnFail": true,
      "maxTries": 2,
      "waitBetweenTries": 2000
    },
    {
      "id": "prepare-stats-request-1769980000000",
      "name": "Prepare Stats Request",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        2675,
        -150
      ],
      "parameters": {
        "jsCode": "// Sanitize article content to prevent JSON serialization issues\nconst articleData = $('Fetch Article Content').first().json;\nconst aggregateData = $('Aggregate Compliant Topics').first().json;\nconst selectedTopic = aggregateData.selectedTopic || {};\n\n// Get raw content and sanitize it\nlet rawContent = articleData?.data || 'No content available';\n\n// Remove problematic characters and limit length\nrawContent = rawContent\n  .replace(/[\\x00-\\x1F\\x7F]/g, ' ')  // Remove control characters\n  .replace(/\\\\n/g, ' ')  // Replace escaped newlines\n  .replace(/\\n/g, ' ')   // Replace actual newlines\n  .replace(/\\r/g, ' ')   // Replace carriage returns\n  .replace(/\\t/g, ' ')   // Replace tabs\n  .replace(/\\\\/g, ' ')   // Remove backslashes\n  .replace(/\"/g, \"'\")    // Replace double quotes with single\n  .substring(0, 6000)    // Limit content length\n  .trim();\n\n// Build the prompt text\nconst promptText = `Extract SPECIFIC STATISTICS from this football article. Look for:\n\n1. MATCH SCORES (e.g., 3-0, 2-1)\n2. POSSESSION PERCENTAGES\n3. SHOT COUNTS\n4. TRANSFER FEES (in millions)\n5. LEAGUE STANDINGS/POINTS\n6. GOAL SCORERS (without names, just counts)\n7. ANY OTHER NUMERICAL DATA\n\nARTICLE CONTENT:\n${rawContent}\n\nHEADLINE: ${selectedTopic.headline || 'No headline'}\n\nReturn ONLY valid JSON:\n{\n  \"score\": \"3-0\" or null,\n  \"homeTeam\": \"Team A\" or null,\n  \"awayTeam\": \"Team B\" or null,\n  \"possession\": { \"home\": 65, \"away\": 35 } or null,\n  \"shots\": { \"home\": 15, \"away\": 8 } or null,\n  \"transferFee\": \"80M\" or null,\n  \"leaguePosition\": 1 or null,\n  \"points\": 45 or null,\n  \"goalCount\": 3 or null,\n  \"keyStatistic\": \"most important number/stat found\",\n  \"dataRichness\": 1-10 (how much real data found)\n}`;\n\n// Build the Gemini request body\nconst requestBody = {\n  contents: [{\n    parts: [{\n      text: promptText\n    }]\n  }]\n};\n\nreturn [{\n  json: {\n    geminiRequestBody: requestBody,\n    selectedTopic: selectedTopic,\n    geminiApiKey: aggregateData.geminiApiKey,\n    callbackUrl: aggregateData.callbackUrl\n  }\n}];"
      }
    },
    {
      "id": "extract-statistics-1769975476415",
      "name": "Extract Statistics",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "position": [
        2750,
        -150
      ],
      "parameters": {
        "method": "POST",
        "url": "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            },
            {
              "name": "User-Agent",
              "value": "Mozilla/5.0 (compatible; BilkoBibitkov/1.0)"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify($json.geminiRequestBody) }}",
        "options": {},
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth"
      },
      "credentials": {
        "httpHeaderAuth": {
          "id": "K9oPxIngg8rE26T6",
          "name": "Header Auth account"
        }
      }
    },
    {
      "id": "parse-statistics-1769975476415",
      "name": "Parse Statistics",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        2900,
        -150
      ],
      "parameters": {
        "jsCode": "const geminiResponse = $input.first().json;\nconst aggregateData = $(\"Aggregate Compliant Topics\").first().json;\nconst geminiApiKey = aggregateData.geminiApiKey;\nconst callbackUrl = aggregateData.callbackUrl;\nconst selectedTopic = aggregateData.selectedTopic;\n\nlet extractedStats = {\n  score: null,\n  homeTeam: null,\n  awayTeam: null,\n  possession: null,\n  shots: null,\n  transferFee: null,\n  leaguePosition: null,\n  points: null,\n  goalCount: null,\n  keyStatistic: null,\n  dataRichness: 1\n};\n\ntry {\n  const candidates = geminiResponse.candidates || [];\n  if (candidates.length > 0) {\n    let text = candidates[0].content?.parts?.[0]?.text || \"\";\n    text = text.replace(/```json\\n?/g, \"\").replace(/```/g, \"\").trim();\n    const parsed = JSON.parse(text);\n    extractedStats = { ...extractedStats, ...parsed };\n  }\n} catch (e) {\n  // Keep defaults\n}\n\n// Build enhanced tagline based on extracted data\nlet enhancedTagline = selectedTopic.headline;\nif (extractedStats.score && extractedStats.homeTeam && extractedStats.awayTeam) {\n  enhancedTagline = extractedStats.homeTeam + \" \" + extractedStats.score + \" \" + extractedStats.awayTeam;\n} else if (extractedStats.score) {\n  enhancedTagline = selectedTopic.teams?.[0] + \" \" + extractedStats.score + \" \" + (selectedTopic.teams?.[1] || \"\");\n} else if (extractedStats.transferFee) {\n  enhancedTagline = extractedStats.transferFee + \" Transfer Complete\";\n} else if (extractedStats.leaguePosition && extractedStats.points) {\n  enhancedTagline = selectedTopic.teams?.[0] + \" #\" + extractedStats.leaguePosition + \" (\" + extractedStats.points + \" pts)\";\n}\n\nreturn [{\n  json: {\n    selectedTopic: {\n      ...selectedTopic,\n      extractedStats: extractedStats,\n      enhancedTagline: enhancedTagline.trim(),\n      hasRealData: extractedStats.dataRichness >= 5\n    },\n    sourceLink: selectedTopic.sourceLink || \"\",\n    anonymizedDescriptions: selectedTopic.anonymizedDescriptions || {},\n    geminiApiKey: geminiApiKey,\n    callbackUrl: callbackUrl\n  }\n}];"
      }
    },
    {
      "parameters": {
        "jsCode": "const prevData = $input.first().json;\nconst selectedTopic = prevData.selectedTopic || {};\nconst headline = selectedTopic.headline || '';\nconst teams = selectedTopic.teams || [];\n\n// Build search query from topic\nconst searchTerms = [];\nif (teams.length > 0) {\n  searchTerms.push(...teams.slice(0, 2));\n}\n\n// Extract key words from headline\nconst keyWords = headline\n  .replace(/[^a-zA-Z0-9\\s]/g, '')\n  .split(/\\s+/)\n  .filter(w => w.length > 4 && !['about', 'after', 'before', 'their', 'there', 'where', 'which', 'would', 'could', 'should'].includes(w.toLowerCase()))\n  .slice(0, 3);\n\nsearchTerms.push(...keyWords);\nconst searchQuery = searchTerms.join(' ');\n\n// Build Google News RSS URL for topic-specific search\nconst encodedQuery = encodeURIComponent(searchQuery + ' football');\nconst searchUrl = 'https://news.google.com/rss/search?q=' + encodedQuery + '&hl=en-US&gl=US&ceid=US:en';\n\nreturn [{\n  json: {\n    ...prevData,\n    searchQuery: searchQuery,\n    searchUrl: searchUrl,\n    primarySource: {\n      url: selectedTopic.sourceLink || '',\n      headline: selectedTopic.sourceHeadline || headline\n    }\n  }\n}];"
      },
      "name": "Build Search Query",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        1900,
        -200
      ],
      "id": "search-query-builder-001"
    },
    {
      "parameters": {
        "url": "={{ $json.searchUrl }}",
        "options": {}
      },
      "name": "Search Related Sources",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "position": [
        2100,
        -200
      ],
      "id": "search-related-sources-001"
    },
    {
      "parameters": {
        "options": {}
      },
      "name": "Parse Search Results",
      "type": "n8n-nodes-base.xml",
      "typeVersion": 1,
      "position": [
        2300,
        -200
      ],
      "id": "parse-search-results-001"
    },
    {
      "parameters": {
        "jsCode": "const rssData = $input.first().json;\nconst prevData = $(\"Build Search Query\").first().json;\nconst primarySource = prevData.primarySource || {};\n\n// Extract articles from RSS\nconst items = rssData?.rss?.channel?.item || [];\n\n// Collect up to 5 sources (including primary)\nconst sources = [];\n\n// Add primary source first\nif (primarySource.url) {\n  sources.push({\n    url: primarySource.url,\n    headline: primarySource.headline,\n    isPrimary: true\n  });\n}\n\n// Add related sources (skip duplicates)\nconst seenUrls = new Set([primarySource.url?.toLowerCase()]);\n\nfor (const item of items.slice(0, 10)) {\n  if (sources.length >= 5) break;\n  \n  const link = item.link || '';\n  const title = item.title || '';\n  \n  // Skip if duplicate or same domain as primary\n  if (seenUrls.has(link.toLowerCase())) continue;\n  \n  // Skip Google News redirect wrapper - extract actual URL\n  let actualUrl = link;\n  if (link.includes('news.google.com')) {\n    // Keep the redirect link as-is for now\n    actualUrl = link;\n  }\n  \n  seenUrls.add(actualUrl.toLowerCase());\n  sources.push({\n    url: actualUrl,\n    headline: title,\n    isPrimary: false\n  });\n}\n\nreturn [{\n  json: {\n    ...prevData,\n    sources: sources,\n    sourceCount: sources.length\n  }\n}];"
      },
      "name": "Collect Sources",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        2500,
        -200
      ],
      "id": "collect-sources-001"
    },
    {
      "parameters": {
        "jsCode": "const prevData = $input.first().json;\nconst sources = prevData.sources || [];\n\n// Create HTTP requests for each source\nconst requests = sources.map((source, index) => ({\n  json: {\n    sourceIndex: index,\n    sourceUrl: source.url,\n    sourceHeadline: source.headline,\n    isPrimary: source.isPrimary,\n    allSources: sources,\n    selectedTopic: prevData.selectedTopic,\n    geminiApiKey: prevData.geminiApiKey,\n    callbackUrl: prevData.callbackUrl\n  }\n}));\n\nreturn requests;"
      },
      "name": "Split Sources",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        2700,
        -200
      ],
      "id": "split-sources-001"
    },
    {
      "parameters": {
        "url": "={{ $json.sourceUrl }}",
        "options": {
          "response": {
            "response": {
              "fullResponse": false,
              "responseFormat": "text"
            }
          },
          "timeout": 10000
        }
      },
      "name": "Fetch Source Content",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "position": [
        2900,
        -200
      ],
      "id": "fetch-source-content-001",
      "continueOnFail": true
    },
    {
      "parameters": {
        "jsCode": "const htmlContent = $input.first().json.data || $input.first().json || '';\nconst prevItem = $input.first().json;\nconst sourceIndex = prevItem.sourceIndex ?? 0;\nconst sourceUrl = prevItem.sourceUrl || '';\nconst sourceHeadline = prevItem.sourceHeadline || '';\nconst isPrimary = prevItem.isPrimary || false;\nconst allSources = prevItem.allSources || [];\n\n// Extract text from HTML (basic extraction)\nlet text = '';\nif (typeof htmlContent === 'string') {\n  // Remove scripts and styles\n  text = htmlContent\n    .replace(/<script[^>]*>[\\s\\S]*?<\\/script>/gi, '')\n    .replace(/<style[^>]*>[\\s\\S]*?<\\/style>/gi, '')\n    .replace(/<nav[^>]*>[\\s\\S]*?<\\/nav>/gi, '')\n    .replace(/<header[^>]*>[\\s\\S]*?<\\/header>/gi, '')\n    .replace(/<footer[^>]*>[\\s\\S]*?<\\/footer>/gi, '')\n    .replace(/<aside[^>]*>[\\s\\S]*?<\\/aside>/gi, '')\n    .replace(/<[^>]+>/g, ' ')\n    .replace(/&nbsp;/g, ' ')\n    .replace(/&amp;/g, '&')\n    .replace(/&lt;/g, '<')\n    .replace(/&gt;/g, '>')\n    .replace(/\\s+/g, ' ')\n    .trim()\n    .slice(0, 8000);\n}\n\nreturn [{\n  json: {\n    sourceIndex,\n    sourceUrl,\n    sourceHeadline,\n    isPrimary,\n    content: text,\n    allSources,\n    selectedTopic: prevItem.selectedTopic,\n    geminiApiKey: prevItem.geminiApiKey,\n    callbackUrl: prevItem.callbackUrl\n  }\n}];"
      },
      "name": "Parse Source Content",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        3100,
        -200
      ],
      "id": "parse-source-content-001"
    },
    {
      "parameters": {
        "aggregate": "aggregateAllItemData",
        "options": {}
      },
      "name": "Aggregate Sources",
      "type": "n8n-nodes-base.aggregate",
      "typeVersion": 1,
      "position": [
        3300,
        -200
      ],
      "id": "aggregate-sources-001"
    },
    {
      "parameters": {
        "jsCode": "const items = $input.first().json.data || [];\nconst firstItem = items[0] || {};\nconst allSources = firstItem.allSources || [];\nconst selectedTopic = firstItem.selectedTopic || {};\n\n// Build combined content\nconst articlesText = items\n  .sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0))\n  .map((item, idx) => {\n    const label = item.isPrimary ? '[PRIMARY SOURCE]' : '[SOURCE ' + (idx + 1) + ']';\n    return label + '\\nHeadline: ' + item.sourceHeadline + '\\nContent: ' + (item.content || 'No content available').slice(0, 3000);\n  })\n  .join('\\n\\n---\\n\\n');\n\n// Build source URLs for citations\nconst sourceUrls = allSources.map((s, i) => ({\n  index: i + 1,\n  url: s.url,\n  headline: s.headline\n}));\n\nreturn [{\n  json: {\n    articlesText,\n    sourceUrls,\n    sourceCount: items.length,\n    selectedTopic,\n    geminiApiKey: firstItem.geminiApiKey,\n    callbackUrl: firstItem.callbackUrl\n  }\n}];"
      },
      "name": "Merge All Content",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        3500,
        -200
      ],
      "id": "merge-all-content-001"
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            },
            {
              "name": "x-goog-api-key",
              "value": "={{ $json.geminiApiKey }}"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"contents\": [{\n    \"parts\": [{\n      \"text\": \"You are an objective football journalist synthesizing multiple sources into a comprehensive summary.\\n\\nARTICLES:\\n{{ $json.articlesText }}\\n\\nAnalyze ALL sources and extract:\\n\\nReturn ONLY a JSON object with:\\n{\\n  \\\"summary\\\": \\\"2-3 paragraph objective summary synthesizing all sources (NO player names, focus on facts and numbers)\\\",\\n  \\\"stats\\\": {\\n    \\\"score\\\": \\\"final score if match (e.g. 2-1) or null\\\",\\n    \\\"possession\\\": { \\\"home\\\": number or null, \\\"away\\\": number or null },\\n    \\\"shots\\\": { \\\"home\\\": number or null, \\\"away\\\": number or null },\\n    \\\"shotsOnTarget\\\": { \\\"home\\\": number or null, \\\"away\\\": number or null },\\n    \\\"xG\\\": { \\\"home\\\": number or null, \\\"away\\\": number or null },\\n    \\\"corners\\\": { \\\"home\\\": number or null, \\\"away\\\": number or null },\\n    \\\"fouls\\\": { \\\"home\\\": number or null, \\\"away\\\": number or null },\\n    \\\"yellowCards\\\": { \\\"home\\\": number or null, \\\"away\\\": number or null },\\n    \\\"redCards\\\": { \\\"home\\\": number or null, \\\"away\\\": number or null },\\n    \\\"transferFee\\\": \\\"transfer amount if applicable or null\\\",\\n    \\\"leaguePosition\\\": number or null,\\n    \\\"points\\\": number or null,\\n    \\\"goalDifference\\\": number or null,\\n    \\\"winStreak\\\": number or null,\\n    \\\"cleanSheets\\\": number or null,\\n    \\\"otherStats\\\": [\\\"any other significant numbers found\\\"]\\n  },\\n  \\\"teams\\\": [\\\"team names mentioned\\\"],\\n  \\\"competition\\\": \\\"league/tournament name\\\",\\n  \\\"keyFacts\\\": [\\\"3-5 bullet point facts\\\"],\\n  \\\"dataConfidence\\\": \\\"high/medium/low - based on source agreement\\\"\\n}\\n\\nBe thorough - extract EVERY statistic mentioned across ALL sources. Prioritize numbers and objective facts.\\\"\\n    }]\\n  }]\\n}\"\n    }",
        "options": {},
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth"
      },
      "name": "Comprehensive Summary",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "position": [
        3700,
        -200
      ],
      "id": "comprehensive-summary-001",
      "credentials": {
        "httpHeaderAuth": {
          "id": "K9oPxIngg8rE26T6",
          "name": "Header Auth account"
        }
      }
    },
    {
      "parameters": {
        "jsCode": "const input = $input.first().json;\nconst prevData = $(\"Merge All Content\").first().json;\n\nconst text = input?.candidates?.[0]?.content?.parts?.[0]?.text || \"{}\";\nconst cleaned = text.replace(/^```[a-zA-Z]*\\n?/, \"\").replace(/\\n?```\\s*$/, \"\");\n\ntry {\n  const summary = JSON.parse(cleaned);\n  return [{\n    json: {\n      comprehensiveSummary: summary.summary,\n      extractedStats: summary.stats,\n      teams: summary.teams,\n      competition: summary.competition,\n      keyFacts: summary.keyFacts,\n      dataConfidence: summary.dataConfidence,\n      sourceUrls: prevData.sourceUrls,\n      sourceCount: prevData.sourceCount,\n      selectedTopic: prevData.selectedTopic,\n      geminiApiKey: prevData.geminiApiKey,\n      callbackUrl: prevData.callbackUrl\n    }\n  }];\n} catch (e) {\n  return [{\n    json: {\n      comprehensiveSummary: prevData.selectedTopic?.headline || \"Football news update\",\n      extractedStats: {},\n      teams: prevData.selectedTopic?.teams || [],\n      competition: \"\",\n      keyFacts: [],\n      dataConfidence: \"low\",\n      sourceUrls: prevData.sourceUrls,\n      sourceCount: prevData.sourceCount,\n      selectedTopic: prevData.selectedTopic,\n      geminiApiKey: prevData.geminiApiKey,\n      callbackUrl: prevData.callbackUrl,\n      parseError: e.message\n    }\n  }];\n}"
      },
      "name": "Parse Summary",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        3900,
        -200
      ],
      "id": "parse-summary-001"
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://bilkobibitkov.replit.app/api/workflows/callback",
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"workflowId\": \"european-football-daily\",\n  \"step\": \"comprehensive-summary\",\n  \"stepIndex\": 5,\n  \"traceId\": \"{{ $('Webhook').first().json.body.traceId || 'trace_' + $execution.id }}\",\n  \"output\": {\n    \"summary\": {{ JSON.stringify($json.comprehensiveSummary || \"\") }},\n    \"stats\": {{ JSON.stringify($json.extractedStats || {}) }},\n    \"teams\": {{ JSON.stringify($json.teams || []) }},\n    \"competition\": {{ JSON.stringify($json.competition || \"\") }},\n    \"keyFacts\": {{ JSON.stringify($json.keyFacts || []) }},\n    \"sourceCount\": {{ $json.sourceCount || 0 }},\n    \"dataConfidence\": {{ JSON.stringify($json.dataConfidence || \"low\") }}\n  },\n  \"executionId\": \"{{ $execution.id }}\"\n}",
        "options": {}
      },
      "name": "Callback Summary",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "position": [
        4000,
        -300
      ],
      "id": "callback-summary-001",
      "continueOnFail": true
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://bilkobibitkov.replit.app/api/workflows/callback",
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"workflowId\": \"european-football-daily\",\n  \"step\": \"tagline-generated\",\n  \"stepIndex\": 7,\n  \"traceId\": \"{{ $('Webhook').first().json.body.traceId || 'trace_' + $execution.id }}\",\n  \"output\": {\n    \"tagline\": {{ JSON.stringify($json.tagline || \"\") }},\n    \"imagePrompt\": {{ JSON.stringify($json.imagePrompt || \"\").substring(0, 500) }},\n    \"selectedStats\": {{ JSON.stringify($json.selectedStats || []) }},\n    \"sceneType\": {{ JSON.stringify($json.sceneType || \"\") }}\n  },\n  \"executionId\": \"{{ $execution.id }}\"\n}",
        "options": {}
      },
      "name": "Callback Tagline",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "position": [
        2950,
        250
      ],
      "id": "callback-tagline-001",
      "continueOnFail": true
    }
  ],
  "connections": {
    "Webhook": {
      "main": [
        [
          {
            "node": "Fetch RSS",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Fetch RSS": {
      "main": [
        [
          {
            "node": "Parse XML",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Parse XML": {
      "main": [
        [
          {
            "node": "Extract Articles",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Extract Articles": {
      "main": [
        [
          {
            "node": "Topic Analyst",
            "type": "main",
            "index": 0
          },
          {
            "node": "Callback Articles",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Generate Post": {
      "main": [
        [
          {
            "node": "Parse Post",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Generate Image": {
      "main": [
        [
          {
            "node": "Parse Image Prompt",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Build Final Output": {
      "main": [
        [
          {
            "node": "Callback Final",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Callback Final": {
      "main": [
        [
          {
            "node": "Respond to Webhook",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Call Imagen API": {
      "main": [
        [
          {
            "node": "Parse Imagen Response",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Parse Imagen Response": {
      "main": [
        [
          {
            "node": "Brand Image",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Topic Analyst": {
      "main": [
        [
          {
            "node": "Parse Topic Analysis",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Parse Topic Analysis": {
      "main": [
        [
          {
            "node": "Build Compliance Request",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Compliance Checker": {
      "main": [
        [
          {
            "node": "Parse Compliance Check",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Parse Compliance Check": {
      "main": [
        [
          {
            "node": "Aggregate Compliant Topics",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Aggregate Compliant Topics": {
      "main": [
        [
          {
            "node": "Fetch Article Content",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Parse Post": {
      "main": [
        [
          {
            "node": "Build Image Request",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Parse Image Prompt": {
      "main": [
        [
          {
            "node": "Generate Tagline",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Hashtag Researcher": {
      "main": [
        [
          {
            "node": "Parse Hashtags",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Parse Hashtags": {
      "main": [
        [
          {
            "node": "Prepare Post Request",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Prepare Post Request": {
      "main": [
        [
          {
            "node": "Generate Post",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Generate Tagline": {
      "main": [
        [
          {
            "node": "Parse Tagline",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Parse Tagline": {
      "main": [
        [
          {
            "node": "Call Imagen API",
            "type": "main",
            "index": 0
          },
          {
            "node": "Callback Tagline",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Brand Image": {
      "main": [
        [
          {
            "node": "Parse Brand Response",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Parse Brand Response": {
      "main": [
        [
          {
            "node": "Build Final Output",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Build Compliance Request": {
      "main": [
        [
          {
            "node": "Compliance Checker",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Build Image Request": {
      "main": [
        [
          {
            "node": "Generate Image",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Fetch Article Content": {
      "main": [
        [
          {
            "node": "Prepare Stats Request",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Prepare Stats Request": {
      "main": [
        [
          {
            "node": "Extract Statistics",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Extract Statistics": {
      "main": [
        [
          {
            "node": "Parse Statistics",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Parse Statistics": {
      "main": [
        [
          {
            "node": "Hashtag Researcher",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Build Search Query": {
      "main": [
        [
          {
            "node": "Search Related Sources",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Search Related Sources": {
      "main": [
        [
          {
            "node": "Parse Search Results",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Parse Search Results": {
      "main": [
        [
          {
            "node": "Collect Sources",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Collect Sources": {
      "main": [
        [
          {
            "node": "Split Sources",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Split Sources": {
      "main": [
        [
          {
            "node": "Fetch Source Content",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Fetch Source Content": {
      "main": [
        [
          {
            "node": "Parse Source Content",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Parse Source Content": {
      "main": [
        [
          {
            "node": "Aggregate Sources",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Aggregate Sources": {
      "main": [
        [
          {
            "node": "Merge All Content",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Merge All Content": {
      "main": [
        [
          {
            "node": "Comprehensive Summary",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Comprehensive Summary": {
      "main": [
        [
          {
            "node": "Parse Summary",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Parse Summary": {
      "main": [
        [
          {
            "node": "Hashtag Researcher",
            "type": "main",
            "index": 0
          },
          {
            "node": "Callback Summary",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "settings": {
    "executionOrder": "v1",
    "callerPolicy": "workflowsFromSameOwner",
    "availableInMCP": false
  },
  "staticData": {
    "node:Schedule Trigger": {
      "recurrenceRules": []
    }
  },
  "meta": null,
  "pinData": {},
  "versionId": "922d2045-d278-4ab5-9d7d-fa05025eb58e",
  "activeVersionId": "922d2045-d278-4ab5-9d7d-fa05025eb58e",
  "versionCounter": 348,
  "triggerCount": 1,
  "shared": [
    {
      "updatedAt": "2026-01-25T09:36:24.236Z",
      "createdAt": "2026-01-25T09:36:24.236Z",
      "role": "workflow:owner",
      "workflowId": "oV6WGX5uBeTZ9tRa",
      "projectId": "tYcTNrTV20x5m3NS",
      "project": {
        "updatedAt": "2026-01-21T18:01:18.310Z",
        "createdAt": "2026-01-21T18:01:12.176Z",
        "id": "tYcTNrTV20x5m3NS",
        "name": "Bilko Bibitkov <bilkobibitkov2000@gmail.com>",
        "type": "personal",
        "icon": null,
        "description": null,
        "creatorId": "80f5768f-36e3-4197-9886-2f8e29df41d7",
        "projectRelations": [
          {
            "updatedAt": "2026-01-21T18:01:12.176Z",
            "createdAt": "2026-01-21T18:01:12.176Z",
            "userId": "80f5768f-36e3-4197-9886-2f8e29df41d7",
            "projectId": "tYcTNrTV20x5m3NS",
            "user": {
              "updatedAt": "2026-01-31T08:03:32.000Z",
              "createdAt": "2026-01-21T18:01:09.996Z",
              "id": "80f5768f-36e3-4197-9886-2f8e29df41d7",
              "email": "bilkobibitkov2000@gmail.com",
              "firstName": "Bilko",
              "lastName": "Bibitkov",
              "personalizationAnswers": null,
              "settings": {
                "userActivated": true,
                "userClaimedAiCredits": true,
                "easyAIWorkflowOnboarded": true,
                "firstSuccessfulWorkflowId": "d144QoAsV5hIbzvQ",
                "userActivatedAt": 1769150504302,
                "npsSurvey": {
                  "responded": true,
                  "lastShownAt": 1769766178056
                }
              },
              "disabled": false,
              "mfaEnabled": false,
              "lastActiveAt": "2026-01-31",
              "isPending": false
            }
          }
        ]
      }
    }
  ],
  "tags": [],
  "activeVersion": {
    "updatedAt": "2026-01-31T22:24:51.616Z",
    "createdAt": "2026-01-31T22:24:51.616Z",
    "versionId": "922d2045-d278-4ab5-9d7d-fa05025eb58e",
    "workflowId": "oV6WGX5uBeTZ9tRa",
    "nodes": [
      {
        "parameters": {
          "httpMethod": "POST",
          "path": "european-football-daily",
          "responseMode": "onReceived",
          "options": {}
        },
        "name": "Webhook",
        "type": "n8n-nodes-base.webhook",
        "typeVersion": 1,
        "position": [
          0,
          208
        ],
        "id": "0025e044-d2ba-4e9f-8e73-98ca642c1087",
        "webhookId": "191adfc0-b71a-41c2-8a26-25ca9ec0b6c1"
      },
      {
        "parameters": {
          "url": "https://news.google.com/rss/search?q=european+football+champions+league+OR+premier+league+OR+la+liga+OR+bundesliga+OR+serie+a&hl=en-US&gl=US&ceid=US:en",
          "options": {}
        },
        "name": "Fetch RSS",
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4,
        "position": [
          512,
          112
        ],
        "id": "a0c4d441-f13a-4003-8f49-1a710d29c12e"
      },
      {
        "parameters": {
          "options": {}
        },
        "name": "Parse XML",
        "type": "n8n-nodes-base.xml",
        "typeVersion": 1,
        "position": [
          752,
          112
        ],
        "id": "9466c9e8-2426-4e44-8a8e-ef37a1138c38"
      },
      {
        "parameters": {
          "jsCode": "const rss = $input.first().json;\nconst webhookData = $('Webhook').first().json.body || {};\nconst recentTopics = webhookData.recentTopics || [];\n\n// Build normalized headline set for exact matching\nconst recentHeadlinesNormalized = new Set(\n  recentTopics.map(t => t.headline.toLowerCase().trim().replace(/[^a-z0-9\\s]/g, ''))\n);\n\nconst items = rss?.rss?.channel?.item || [];\n\nconst articles = items.slice(0, 20).map(item => ({\n  title: item.title || '',\n  sourceHeadline: item.title || '', // Preserve original for callback\n  link: item.link || '',\n  source: 'Google News',\n  pubDate: item.pubDate || ''\n})).filter(a => {\n  const normalizedTitle = a.title.toLowerCase().trim().replace(/[^a-z0-9\\s]/g, '');\n  \n  // PRIMARY: Normalized exact headline match\n  if (recentHeadlinesNormalized.has(normalizedTitle)) {\n    return false;\n  }\n  \n  // SECONDARY: Word overlap check (>50% = likely duplicate)\n  const words = new Set(normalizedTitle.split(/\\s+/).filter(w => w.length > 3));\n  if (words.size >= 3) {\n    for (const recent of recentTopics) {\n      const recentNorm = recent.headline.toLowerCase().replace(/[^a-z0-9\\s]/g, '');\n      const recentWords = new Set(recentNorm.split(/\\s+/).filter(w => w.length > 3));\n      if (recentWords.size >= 3) {\n        const overlap = [...words].filter(w => recentWords.has(w)).length;\n        const similarity = overlap / Math.min(words.size, recentWords.size);\n        if (similarity > 0.5) {\n          return false;\n        }\n      }\n    }\n  }\n  \n  return true;\n}).slice(0, 10);\n\n// Fallback if all filtered out\nif (articles.length === 0 && items.length > 0) {\n  const first = items[0];\n  return [{\n    json: {\n      title: first.title || 'European Football Update',\n      sourceHeadline: first.title || 'European Football Update',\n      link: first.link || '',\n      source: 'Google News',\n      pubDate: first.pubDate || '',\n      forcedFallback: true,\n      recentTopicsCount: recentTopics.length\n    }\n  }];\n}\n\nreturn articles.map(a => ({ json: { ...a, recentTopicsCount: recentTopics.length } }));"
        },
        "name": "Extract Articles",
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [
          1008,
          112
        ],
        "id": "2a98ef6a-8bc2-4312-9ae1-9c72f99e4b84"
      },
      {
        "parameters": {
          "method": "POST",
          "url": "https://bilkobibitkov.replit.app/api/workflows/callback",
          "sendBody": true,
          "specifyBody": "json",
          "jsonBody": "={\n  \"workflowId\": \"european-football-daily\",\n  \"step\": \"extract-articles\",\n  \"stepIndex\": 1,\n  \"traceId\": \"{{ $('Webhook').first().json.body.traceId || $('Webhook').first().json.body.traceId || 'trace_' + $execution.id }}\",\n  \"output\": {\n    \"articles\": {{ JSON.stringify($input.all().map(i => i.json)) }},\n    \"count\": {{ $input.all().length }}\n  },\n  \"executionId\": \"{{ $execution.id }}\"\n}",
          "options": {}
        },
        "name": "Callback Articles",
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4,
        "position": [
          1104,
          256
        ],
        "id": "c6ed77f1-fb89-4efe-875f-2c7668fa7140"
      },
      {
        "parameters": {
          "method": "POST",
          "url": "=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
          "sendHeaders": true,
          "headerParameters": {
            "parameters": [
              {
                "name": "Content-Type",
                "value": "application/json"
              },
              {
                "name": "x-goog-api-key",
                "value": "={{ $input.first().json.geminiApiKey }}"
              },
              {
                "name": "User-Agent",
                "value": "Mozilla/5.0 (compatible; BilkoBibitkov/1.0; +https://bilkobibitkov.replit.app)"
              }
            ]
          },
          "sendBody": true,
          "specifyBody": "json",
          "jsonBody": "={{ JSON.stringify($json.geminiRequestBody) }}",
          "options": {},
          "authentication": "genericCredentialType",
          "genericAuthType": "httpHeaderAuth"
        },
        "name": "Generate Post",
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4,
        "position": [
          2816,
          -32
        ],
        "id": "7c494835-fa77-48c9-ae73-269be50bb6af",
        "retryOnFail": true,
        "maxTries": 5,
        "waitBetweenTries": 5000,
        "credentials": {
          "httpHeaderAuth": {
            "id": "K9oPxIngg8rE26T6",
            "name": "Header Auth account"
          }
        }
      },
      {
        "parameters": {
          "jsCode": "const input = $input.first().json;\nconst prevData = $(\"Aggregate Compliant Topics\").first().json;\nconst hashtagData = $(\"Parse Hashtags\").first().json;\n\n// Get Gemini response\nconst text = input?.candidates?.[0]?.content?.parts?.[0]?.text || \"{}\";\nconst cleaned = text.replace(/^```[a-zA-Z]*\\n?/, \"\").replace(/\\n?```\\s*$/, \"\");\n\ntry {\n  const post = JSON.parse(cleaned);\n  return [{\n    json: {\n      postContent: post.postContent,\n      sentiment: post.sentiment || \"positive\",\n      safeImagePrompt: prevData.selectedTopic.safeImagePrompt,\n      anonymizedDescriptions: prevData.selectedTopic.anonymizedDescriptions || hashtagData.anonymizedDescriptions || {},\n      selectedTopic: prevData.selectedTopic,\n      sourceLink: prevData.selectedTopic?.sourceLink || \"\",\n      geminiApiKey: prevData.geminiApiKey,\n      callbackUrl: prevData.callbackUrl\n    }\n  }];\n} catch (e) {\n  return [{\n    json: {\n      postContent: \"Football news update! Exciting developments in European football today.\",\n      sentiment: \"positive\",\n      safeImagePrompt: prevData.selectedTopic?.safeImagePrompt || \"Exciting football stadium scene with cheering fans\",\n      anonymizedDescriptions: prevData.selectedTopic?.anonymizedDescriptions || {},\n      selectedTopic: prevData.selectedTopic,\n      sourceLink: prevData.selectedTopic?.sourceLink || \"\",\n      geminiApiKey: prevData.geminiApiKey,\n      callbackUrl: prevData.callbackUrl,\n      parseError: e.message\n    }\n  }];\n}"
        },
        "name": "Parse Post",
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [
          2000,
          112
        ],
        "id": "5ffc1c44-ad8f-4df3-bb2c-2ac5ec931d9f"
      },
      {
        "parameters": {
          "method": "POST",
          "url": "=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
          "sendHeaders": true,
          "headerParameters": {
            "parameters": [
              {
                "name": "Content-Type",
                "value": "application/json"
              },
              {
                "name": "x-goog-api-key",
                "value": "={{ $input.first().json.geminiApiKey }}"
              },
              {
                "name": "User-Agent",
                "value": "Mozilla/5.0 (compatible; BilkoBibitkov/1.0; +https://bilkobibitkov.replit.app)"
              }
            ]
          },
          "sendBody": true,
          "specifyBody": "json",
          "jsonBody": "={{ JSON.stringify($json.requestBody) }}",
          "options": {},
          "authentication": "genericCredentialType",
          "genericAuthType": "httpHeaderAuth"
        },
        "id": "fb8ce752-bb66-4d73-abb2-24fad043a177",
        "name": "Generate Image",
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4,
        "position": [
          2256,
          112
        ],
        "credentials": {
          "httpHeaderAuth": {
            "id": "K9oPxIngg8rE26T6",
            "name": "Header Auth account"
          }
        }
      },
      {
        "parameters": {
          "jsCode": "const input = $input.first().json;\nconst prevData = $(\"Parse Post\").first().json;\n\n// Get Gemini response\nconst text = input?.candidates?.[0]?.content?.parts?.[0]?.text || \"{}\";\nconst cleaned = text.replace(/^```[a-zA-Z]*\\n?/, \"\").replace(/\\n?```\\s*$/, \"\");\n\ntry {\n  const imageData = JSON.parse(cleaned);\n  return [{\n    json: {\n      imagePrompt: imageData.imagePrompt,\n      style: imageData.style || \"photorealistic\",\n      postContent: prevData.postContent,\n      selectedTopic: prevData.selectedTopic,\n      sourceLink: prevData.sourceLink || \"\",\n      geminiApiKey: prevData.geminiApiKey,\n      callbackUrl: prevData.callbackUrl\n    }\n  }];\n} catch (e) {\n  return [{\n    json: {\n      imagePrompt: \"Exciting football celebration scene in a modern stadium\",\n      style: \"photorealistic\",\n      postContent: prevData.postContent,\n      selectedTopic: prevData.selectedTopic,\n      sourceLink: prevData.sourceLink || \"\",\n      geminiApiKey: prevData.geminiApiKey,\n      callbackUrl: prevData.callbackUrl,\n      parseError: e.message\n    }\n  }];\n}"
        },
        "name": "Parse Image Prompt",
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [
          2512,
          112
        ],
        "id": "654ab797-28bc-4e88-a66c-74887fbedae5"
      },
      {
        "parameters": {
          "jsCode": "const brandingResult = $input.first().json;\nconst prevData = $(\"Parse Imagen Response\").first().json;\nconst aggregateData = $(\"Aggregate Compliant Topics\").first().json;\n\nconst postContent = prevData.postContent || \"Football news update!\";\nconst imagePrompt = prevData.imagePrompt || \"European football celebration\";\nconst sourceLink = prevData.sourceLink || \"\";\n\n// Get the selected topic from aggregation step (includes sourceHeadline)\nconst selectedTopic = aggregateData.selectedTopic || {};\n\n// Use branded image if available, otherwise fallback to original\nlet imageDataUri = prevData.imageDataUri || null;\nif (brandingResult.success && brandingResult.brandedImageBase64) {\n  imageDataUri = \"data:image/png;base64,\" + brandingResult.brandedImageBase64;\n}\n\n// Create transparency/disclosure post\nlet transparencyPost = \"I've developed this AI-driven system to efficiently curate European football news, serving as a professional 'proof of work' for AI integration. Grounded in transparency and the human-in-the-loop principle, this project demonstrates how AI can enhance specialized content. Follow for updates, or visit my bio to learn how to build similar systems.\\n\\nBilko Bibitkov Human-Centric AI Curation\";\n\nif (sourceLink) {\n  transparencyPost += \"\\n\\nSource: \" + sourceLink;\n}\n\nconst output = {\n  success: true,\n  selectedTopic: {\n    headline: selectedTopic.headline || \"\",\n    sourceHeadline: selectedTopic.sourceHeadline || selectedTopic.headline || \"\",\n    sourceHeadlineHash: selectedTopic.sourceHeadlineHash || \"\",\n    teams: selectedTopic.teams || [],\n    event: selectedTopic.event || \"\",\n    dataRichness: selectedTopic.dataRichness || 0,\n    brandValue: selectedTopic.brandValue || 0\n  },\n  data: {\n    postContent: postContent,\n    imagePrompt: imagePrompt,\n    imageUrl: imageDataUri,\n    transparencyPost: transparencyPost,\n    sourceLink: sourceLink,\n    contentFiltered: !imageDataUri,\n    brandingApplied: brandingResult.success === true\n  },\n  metadata: {\n    workflowId: \"european-football-daily\",\n    executedAt: new Date().toISOString(),\n    aiGenerated: true\n  }\n};\nreturn [{ json: output }];"
        },
        "name": "Build Final Output",
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [
          3600,
          112
        ],
        "id": "71b64e2c-1852-4ef6-a21d-732907892df3"
      },
      {
        "parameters": {
          "method": "POST",
          "url": "https://bilkobibitkov.replit.app/api/workflows/callback",
          "sendBody": true,
          "specifyBody": "json",
          "jsonBody": "={\n  \"workflowId\": \"european-football-daily\",\n  \"step\": \"final-output\",\n  \"stepIndex\": 3,\n  \"traceId\": \"{{ $('Webhook').first().json.body.traceId || $('Webhook').first().json.body.traceId || 'trace_' + $execution.id }}\",\n  \"output\": {{ JSON.stringify($input.first().json) }},\n  \"executionId\": \"{{ $execution.id }}\"\n}",
          "options": {}
        },
        "name": "Callback Final",
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4,
        "position": [
          3008,
          112
        ],
        "id": "5a99a7c6-1f47-47eb-a13d-888ae0334bcf"
      },
      {
        "parameters": {
          "respondWith": "json",
          "responseBody": "={{ $('Build Final Output').first().json }}",
          "options": {}
        },
        "name": "Respond to Webhook",
        "type": "n8n-nodes-base.respondToWebhook",
        "typeVersion": 1,
        "position": [
          3264,
          208
        ],
        "id": "4ea89a64-7267-4476-aac6-d67c10a7da98"
      },
      {
        "parameters": {
          "content": "PRODUCTION"
        },
        "type": "n8n-nodes-base.stickyNote",
        "typeVersion": 1,
        "position": [
          416,
          496
        ],
        "id": "303bff0e-4feb-4c29-903e-cd2782ab38ba",
        "name": "Sticky Note"
      },
      {
        "parameters": {
          "method": "POST",
          "url": "=https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent",
          "sendHeaders": true,
          "headerParameters": {
            "parameters": [
              {
                "name": "Content-Type",
                "value": "application/json"
              },
              {
                "name": "x-goog-api-key",
                "value": "={{ $json.geminiApiKey }}"
              },
              {
                "name": "User-Agent",
                "value": "Mozilla/5.0 (compatible; BilkoBibitkov/1.0; +https://bilkobibitkov.replit.app)"
              }
            ]
          },
          "sendBody": true,
          "specifyBody": "json",
          "jsonBody": "={\n  \"contents\": [{\n    \"parts\": [{\n      \"text\": \"{{ $json.imagePrompt }}. Include bold stylized text overlay on the image saying: {{ $json.tagline }}\"\n    }]\n  }],\n  \"generation_config\": {\n    \"response_modalities\": [\"IMAGE\"],\n    \"image_config\": {\n      \"aspect_ratio\": \"1:1\"\n    }\n  }\n}",
          "options": {},
          "authentication": "genericCredentialType",
          "genericAuthType": "httpHeaderAuth"
        },
        "id": "74affa50-0102-49a6-8190-3e24f1ec0a2e",
        "name": "Call Imagen API",
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4,
        "position": [
          3104,
          112
        ],
        "retryOnFail": true,
        "maxTries": 3,
        "waitBetweenTries": 5000,
        "credentials": {
          "httpHeaderAuth": {
            "id": "K9oPxIngg8rE26T6",
            "name": "Header Auth account"
          }
        }
      },
      {
        "parameters": {
          "jsCode": "const input = $input.first().json;\nconst prevData = $(\"Parse Tagline\").first().json;\n\n// Get image from Nano Banana Pro response format\nconst parts = input?.candidates?.[0]?.content?.parts || [];\nconst imagePart = parts.find(p => p.inlineData?.mimeType?.startsWith(\"image/\"));\n\nif (imagePart && imagePart.inlineData?.data) {\n  const mimeType = imagePart.inlineData.mimeType;\n  const base64Data = imagePart.inlineData.data;\n  const imageDataUri = \"data:\" + mimeType + \";base64,\" + base64Data;\n\n  return [{\n    json: {\n      imageDataUri: imageDataUri,\n      imagePrompt: prevData.imagePrompt,\n      tagline: prevData.tagline,\n      postContent: prevData.postContent,\n      sourceLink: prevData.sourceLink || \"\",\n      geminiApiKey: prevData.geminiApiKey,\n      callbackUrl: prevData.callbackUrl\n    }\n  }];\n} else {\n  // Fallback when image generation fails\n  return [{\n    json: {\n      imageDataUri: null,\n      imagePrompt: prevData.imagePrompt,\n      tagline: prevData.tagline,\n      postContent: prevData.postContent,\n      sourceLink: prevData.sourceLink || \"\",\n      geminiApiKey: prevData.geminiApiKey,\n      callbackUrl: prevData.callbackUrl,\n      imagenError: \"No image data in response\"\n    }\n  }];\n}"
        },
        "id": "ec694419-9c45-4f5d-b2a9-56f136492315",
        "name": "Parse Imagen Response",
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [
          3360,
          112
        ]
      },
      {
        "parameters": {
          "method": "POST",
          "url": "=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
          "sendHeaders": true,
          "headerParameters": {
            "parameters": [
              {
                "name": "Content-Type",
                "value": "application/json"
              },
              {
                "name": "User-Agent",
                "value": "Mozilla/5.0 (compatible; BilkoBibitkov/1.0)"
              }
            ]
          },
          "sendBody": true,
          "specifyBody": "json",
          "jsonBody": "={\n  \"contents\": [{\n    \"parts\": [{\n      \"text\": \"Analyze this football news headline and extract key information for social media.\\n\\nHEADLINE: {{ $json.title }}\\n\\nReturn ONLY a JSON object with:\\n- headline: the original headline\\n- teams: array of team names mentioned (prioritize big clubs: Real Madrid, Barcelona, Man City, Liverpool, Bayern, PSG, Juventus, etc.)\\n- event: brief description (match result, transfer, injury, etc.)\\n- hasScore: boolean - true if headline contains a match score like 3-0, 2-1\\n- hasNumbers: boolean - true if contains significant numbers (transfer fees, goals, points, positions)\\n- dataRichness: score 1-10 (10=has scores/stats/numbers, 5=has team names, 1=vague/generic)\\n- brandValue: score 1-10 (10=mentions top clubs/leagues/tournaments, 1=unknown teams)\\n- imageability: score 1-10 how easy to create a generic image\\n- imageSuggestion: a generic image concept avoiding real people names\\n\\nPrioritize headlines with: actual scores, transfer fees, league standings, big club names.\\nExample: { \\\"headline\\\": \\\"Barcelona 3-0 Real Madrid\\\", \\\"teams\\\": [\\\"Barcelona\\\", \\\"Real Madrid\\\"], \\\"event\\\": \\\"El Clasico victory\\\", \\\"hasScore\\\": true, \\\"hasNumbers\\\": true, \\\"dataRichness\\\": 10, \\\"brandValue\\\": 10, \\\"imageability\\\": 9, \\\"imageSuggestion\\\": \\\"celebrating football team in red and blue\\\" }\"\n    }]\n  }]\n}",
          "options": {
            "batching": {
              "batch": {
                "batchSize": 1,
                "batchInterval": 2000
              }
            }
          },
          "authentication": "genericCredentialType",
          "genericAuthType": "httpHeaderAuth"
        },
        "id": "3bcffc23-1424-49a1-afd7-7f0514ed2ef7",
        "name": "Topic Analyst",
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4,
        "position": [
          1312,
          -32
        ],
        "credentials": {
          "httpHeaderAuth": {
            "id": "K9oPxIngg8rE26T6",
            "name": "Header Auth account"
          }
        }
      },
      {
        "parameters": {
          "jsCode": "const input = $input.first().json;\nconst geminiApiKey = $(\"Webhook\").first().json.body.geminiApiKey;\nconst callbackUrl = $(\"Webhook\").first().json.body.callbackUrl;\n\n// Get the source article data from Extract Articles using item index\nconst articleItems = $(\"Extract Articles\").all();\nconst currentIndex = $runIndex;\nconst articleData = articleItems[currentIndex]?.json || {};\nconst sourceLink = articleData.link || \"\";\nconst sourceHeadline = articleData.sourceHeadline || articleData.title || \"\";\nconst sourceHeadlineHash = articleData.titleHash || \"\";\n\n// Get the text response from Gemini\nconst text = input?.candidates?.[0]?.content?.parts?.[0]?.text || \"{}\";\n\n// Strip markdown fences if present\nconst cleaned = text.replace(/^```[a-zA-Z]*\\n?/, \"\").replace(/\\n?```\\s*$/, \"\");\n\ntry {\n  const analysis = JSON.parse(cleaned);\n  return [{\n    json: {\n      ...analysis,\n      sourceLink: sourceLink,\n      sourceHeadline: sourceHeadline,\n      sourceHeadlineHash: sourceHeadlineHash,\n      geminiApiKey,\n      callbackUrl\n    }\n  }];\n} catch (e) {\n  return [{\n    json: {\n      headline: \"Football news update\",\n      people: [],\n      teams: [],\n      event: \"general news\",\n      imageability: 5,\n      imageSuggestion: \"generic football stadium scene\",\n      sourceLink: sourceLink,\n      sourceHeadline: sourceHeadline,\n      sourceHeadlineHash: sourceHeadlineHash,\n      parseError: e.message,\n      geminiApiKey,\n      callbackUrl\n    }\n  }];\n}"
        },
        "id": "4a292d0b-d120-4074-87fc-6667de4e4de6",
        "name": "Parse Topic Analysis",
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [
          1616,
          -32
        ]
      },
      {
        "parameters": {
          "method": "POST",
          "url": "=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
          "sendHeaders": true,
          "headerParameters": {
            "parameters": [
              {
                "name": "Content-Type",
                "value": "application/json"
              },
              {
                "name": "User-Agent",
                "value": "Mozilla/5.0 (compatible; BilkoBibitkov/1.0)"
              }
            ]
          },
          "sendBody": true,
          "specifyBody": "json",
          "options": {
            "batching": {
              "batch": {
                "batchSize": 1,
                "batchInterval": 2000
              }
            }
          },
          "contentType": "json",
          "jsonBody": "={{ JSON.stringify($json.requestBody) }}",
          "authentication": "genericCredentialType",
          "genericAuthType": "httpHeaderAuth"
        },
        "id": "9c51724e-f9eb-4bea-a72c-3dbf6c163d0a",
        "name": "Compliance Checker",
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4,
        "position": [
          1920,
          -32
        ],
        "credentials": {
          "httpHeaderAuth": {
            "id": "K9oPxIngg8rE26T6",
            "name": "Header Auth account"
          }
        }
      },
      {
        "parameters": {
          "jsCode": "const input = $input.first().json;\nconst prevData = $(\"Parse Topic Analysis\").first().json;\n\n// Get the text response from Gemini\nconst text = input?.candidates?.[0]?.content?.parts?.[0]?.text || \"{}\";\n\n// Strip markdown fences if present\nconst cleaned = text.replace(/^```[a-zA-Z]*\\n?/, \"\").replace(/\\n?```\\s*$/, \"\");\n\ntry {\n  const compliance = JSON.parse(cleaned);\n  return [{\n    json: {\n      headline: prevData.headline,\n      people: prevData.people,\n      teams: prevData.teams,\n      event: prevData.event,\n      imageability: prevData.imageability,\n      imageSuggestion: prevData.imageSuggestion,\n      sourceLink: prevData.sourceLink,\n      sourceHeadline: prevData.sourceHeadline,\n      sourceHeadlineHash: prevData.sourceHeadlineHash,\n      compliant: compliance.compliant !== false,\n      complianceReason: compliance.reason,\n      anonymizedDescriptions: compliance.anonymizedDescriptions || {},\n      safeImagePrompt: compliance.safeImagePrompt,\n      geminiApiKey: prevData.geminiApiKey,\n      callbackUrl: prevData.callbackUrl\n    }\n  }];\n} catch (e) {\n  return [{\n    json: {\n      ...prevData,\n      compliant: true,\n      complianceReason: \"Parse error, using fallback: \" + e.message,\n      anonymizedDescriptions: {},\n      safeImagePrompt: \"Generic football stadium celebration scene with fans cheering\"\n    }\n  }];\n}"
        },
        "id": "e2dd7a80-e193-4290-a91b-542eb7f02b52",
        "name": "Parse Compliance Check",
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [
          2208,
          -32
        ]
      },
      {
        "parameters": {
          "jsCode": "// Collect all items (each article's compliance check result)\nconst items = $input.all();\nconst geminiApiKey = items[0]?.json?.geminiApiKey;\nconst callbackUrl = items[0]?.json?.callbackUrl;\n\n// Filter to only compliant topics and sort by data-richness + brand value\nconst compliantTopics = items\n  .map(item => item.json)\n  .filter(topic => topic.compliant === true)\n  .sort((a, b) => {\n    // Combined score prioritizing data-rich, high-brand topics\n    const scoreA = (a.dataRichness || 0) * 2 + (a.brandValue || 0) * 1.5 + (a.imageability || 0);\n    const scoreB = (b.dataRichness || 0) * 2 + (b.brandValue || 0) * 1.5 + (b.imageability || 0);\n    return scoreB - scoreA;\n  });\n\n// If no compliant topics, create a safe fallback\nif (compliantTopics.length === 0) {\n  return [{\n    json: {\n      selectedTopic: {\n        headline: 'European Football Weekly Update',\n        teams: [],\n        event: 'weekly roundup',\n        safeImagePrompt: 'Exciting football match scene in a packed stadium with cheering fans',\n        anonymizedDescriptions: {},\n        fallback: true\n      },\n      allTopics: items.map(i => i.json),\n      geminiApiKey,\n      callbackUrl\n    }\n  }];\n}\n\n// Select the best topic (highest combined score)\nreturn [{\n  json: {\n    selectedTopic: compliantTopics[0],\n    alternativeTopics: compliantTopics.slice(1, 3),\n    allTopics: items.map(i => i.json),\n    geminiApiKey,\n    callbackUrl\n  }\n}];"
        },
        "id": "2426cf99-5a5b-4963-9ffc-81c4ec3cee01",
        "name": "Aggregate Compliant Topics",
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [
          2512,
          -32
        ]
      },
      {
        "parameters": {
          "method": "POST",
          "url": "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
          "sendHeaders": true,
          "headerParameters": {
            "parameters": [
              {
                "name": "Content-Type",
                "value": "application/json"
              },
              {
                "name": "x-goog-api-key",
                "value": "={{ $json.geminiApiKey }}"
              },
              {
                "name": "User-Agent",
                "value": "Mozilla/5.0 (compatible; BilkoBibitkov/1.0)"
              }
            ]
          },
          "sendBody": true,
          "specifyBody": "json",
          "jsonBody": "={\n  \"contents\": [{\n    \"parts\": [{\n      \"text\": \"Find the 3 most relevant, high-reach hashtags for this European football topic.\\n\\nTOPIC: {{ $json.selectedTopic.headline }}\\nEVENT: {{ $json.selectedTopic.event }}\\nTEAMS: {{ ($json.selectedTopic.teams || []).join(', ') }}\\n\\nRules:\\n- Return EXACTLY 3 hashtags\\n- Must be real, widely-used hashtags on social media\\n- Must be directly relevant to this specific topic/teams/event\\n- Include the # symbol\\n- Prefer hashtags with high engagement (millions of posts)\\n\\nReturn ONLY a JSON object: {\\\"hashtags\\\": [\\\"#tag1\\\", \\\"#tag2\\\", \\\"#tag3\\\"]}\"\n    }]\n  }]\n}",
          "options": {},
          "authentication": "genericCredentialType",
          "genericAuthType": "httpHeaderAuth"
        },
        "id": "hashtag-researcher-1769380010487",
        "name": "Hashtag Researcher",
        "type": "n8n-nodes-base.httpRequest",
        "position": [
          2816,
          -32
        ],
        "typeVersion": 4.2,
        "credentials": {
          "httpHeaderAuth": {
            "id": "K9oPxIngg8rE26T6",
            "name": "Header Auth account"
          }
        }
      },
      {
        "parameters": {
          "jsCode": "// Get Gemini response from HTTP Request\nconst geminiResponse = $input.first().json;\n\n// Get original data from Aggregate Compliant Topics (2 nodes back)\nconst originalData = $(\"Aggregate Compliant Topics\").first().json;\nconst geminiApiKey = originalData.geminiApiKey;\nconst callbackUrl = originalData.callbackUrl;\nconst selectedTopic = originalData.selectedTopic;\n\n// Parse hashtags from Gemini response\nlet hashtags = [\"#football\", \"#soccer\", \"#UEFA\"]; // fallback\ntry {\n  const candidates = geminiResponse.candidates || [];\n  if (candidates.length > 0) {\n    let text = candidates[0].content?.parts?.[0]?.text || \"\";\n    text = text.replace(/```json\\n?/g, \"\").replace(/```/g, \"\").trim();\n    const parsed = JSON.parse(text);\n    if (parsed.hashtags && Array.isArray(parsed.hashtags)) {\n      hashtags = parsed.hashtags.slice(0, 3);\n    }\n  }\n} catch (e) {\n  // Keep fallback\n}\n\nreturn [{\n  json: {\n    selectedTopic: selectedTopic,\n    sourceLink: selectedTopic.sourceLink || \"\",\n    anonymizedDescriptions: selectedTopic.anonymizedDescriptions || {},\n    hashtags: hashtags,\n    hashtagString: hashtags.join(\" \"),\n    geminiApiKey: geminiApiKey,\n    callbackUrl: callbackUrl\n  }\n}];"
        },
        "id": "parse-hashtags-1769380010487",
        "name": "Parse Hashtags",
        "type": "n8n-nodes-base.code",
        "position": [
          3008,
          -32
        ],
        "typeVersion": 2
      },
      {
        "parameters": {
          "method": "POST",
          "url": "=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
          "sendHeaders": true,
          "headerParameters": {
            "parameters": [
              {
                "name": "Content-Type",
                "value": "application/json"
              },
              {
                "name": "User-Agent",
                "value": "BilkoBibitkovApp/1.0"
              }
            ]
          },
          "sendBody": true,
          "specifyBody": "json",
          "jsonBody": "={\n  \"contents\": [{\n    \"parts\": [{\n      \"text\": \"Create an informative headline for a European football image.\\n\\nTOPIC: {{ $json.selectedTopic?.headline || \\\"Football news\\\" }}\\nTEAMS: {{ ($json.selectedTopic?.teams || []).join(' vs ') }}\\nEVENT: {{ $json.selectedTopic?.event || \\\"update\\\" }}\\nHAS SCORE: {{ $json.selectedTopic?.hasScore || false }}\\nHAS NUMBERS: {{ $json.selectedTopic?.hasNumbers || false }}\\n\\nRules:\\n- 3-6 words maximum\\n- If HAS SCORE is true, INCLUDE the actual score from the headline (e.g., \\\"Barcelona 3-0 Madrid\\\")\\n- If HAS NUMBERS is true, include the key number (transfer fee, points, goals)\\n- Prioritize team names and factual information\\n- NO generic phrases like \\\"Game On\\\", \\\"Breaking News\\\", \\\"Big Win\\\", \\\"What A Match\\\"\\n- Should inform the viewer of WHAT happened, not just generate excitement\\n\\nGood examples:\\n- \\\"Barcelona 3-0 Real Madrid\\\"\\n- \\\"Man City Clinches Title\\\"\\n- \\\"£80M Transfer Complete\\\"\\n- \\\"Liverpool Top After Win\\\"\\n\\nBad examples (DO NOT USE):\\n- \\\"Game On!\\\"\\n- \\\"What A Match!\\\"\\n- \\\"Football Fever\\\"\\n- \\\"Big News Today\\\"\\n\\nReturn ONLY a JSON object: {\\\"tagline\\\": \\\"your informative headline here\\\"}\"\n    }]\n  }]\n}",
          "options": {
            "response": {
              "response": {}
            }
          },
          "authentication": "genericCredentialType",
          "genericAuthType": "httpHeaderAuth"
        },
        "name": "Generate Tagline",
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4,
        "position": [
          2608,
          112
        ],
        "id": "tagline-gen-1769390960853",
        "credentials": {
          "httpHeaderAuth": {
            "id": "K9oPxIngg8rE26T6",
            "name": "Header Auth account"
          }
        }
      },
      {
        "parameters": {
          "jsCode": "const input = $input.first().json;\nconst prevData = $(\"Parse Image Prompt\").first().json;\n\n// Get Gemini response\nconst text = input?.candidates?.[0]?.content?.parts?.[0]?.text || \"{}\";\nconst cleaned = text.replace(/^```[a-zA-Z]*\\n?/, \"\").replace(/\\n?```\\s*$/, \"\");\n\ntry {\n  const taglineData = JSON.parse(cleaned);\n  return [{\n    json: {\n      tagline: taglineData.tagline || \"Game On!\",\n      imagePrompt: prevData.imagePrompt,\n      style: prevData.style,\n      postContent: prevData.postContent,\n      selectedTopic: prevData.selectedTopic,\n      sourceLink: prevData.sourceLink || \"\",\n      geminiApiKey: prevData.geminiApiKey,\n      callbackUrl: prevData.callbackUrl\n    }\n  }];\n} catch (e) {\n  return [{\n    json: {\n      tagline: \"Game On!\",\n      imagePrompt: prevData.imagePrompt,\n      style: prevData.style,\n      postContent: prevData.postContent,\n      selectedTopic: prevData.selectedTopic,\n      sourceLink: prevData.sourceLink || \"\",\n      geminiApiKey: prevData.geminiApiKey,\n      callbackUrl: prevData.callbackUrl,\n      parseError: e.message\n    }\n  }];\n}"
        },
        "name": "Parse Tagline",
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [
          2864,
          112
        ],
        "id": "parse-tagline-1769390960853"
      },
      {
        "id": "brand-image-node-1769619318863",
        "name": "Brand Image",
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4,
        "position": [
          3580,
          112
        ],
        "parameters": {
          "method": "POST",
          "url": "https://bilkobibitkov.replit.app/api/images/brand",
          "sendBody": true,
          "specifyBody": "json",
          "jsonBody": "={{ JSON.stringify({ imageBase64: $json.imageDataUri ? $json.imageDataUri.replace(/^data:image\\/[^;]+;base64,/, \"\") : null }) }}",
          "options": {}
        }
      },
      {
        "id": "parse-brand-node-1769619318863",
        "name": "Parse Brand Response",
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [
          3800,
          112
        ],
        "parameters": {
          "jsCode": "const brandingResponse = $input.first().json;\nconst prevData = $(\"Parse Imagen Response\").first().json;\n\n// Pass through branding response with original data\nreturn [{\n  json: {\n    // Branding response fields\n    success: brandingResponse.success === true,\n    brandedImageBase64: brandingResponse.brandedImageBase64 || null,\n    \n    // Original data from Parse Imagen Response\n    imageDataUri: prevData.imageDataUri,\n    imagePrompt: prevData.imagePrompt,\n    tagline: prevData.tagline,\n    postContent: prevData.postContent,\n    sourceLink: prevData.sourceLink || \"\",\n    geminiApiKey: prevData.geminiApiKey,\n    callbackUrl: prevData.callbackUrl\n  }\n}];"
        }
      },
      {
        "id": "cc_body_builder",
        "name": "Build Compliance Request",
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [
          1620,
          -32
        ],
        "parameters": {
          "jsCode": "// Build the Gemini API request body for compliance checking\nconst headline = $input.first().json.headline;\nconst people = $input.first().json.people || [];\nconst imageSuggestion = $input.first().json.imageSuggestion;\nconst geminiApiKey = $input.first().json.geminiApiKey;\nconst runIndex = $input.first().json.runIndex;\nconst link = $input.first().json.link;\n\nconst prompt = `You are an AI image compliance expert. Analyze this football topic and create anonymous visual descriptions.\n\nTOPIC: ${headline}\nPEOPLE: ${JSON.stringify(people)}\nIMAGE IDEA: ${imageSuggestion}\n\nFor each person listed, generate an anonymous physical description (height, build, hair, attire) without using their name.\n\nReturn ONLY valid JSON with these fields:\n- compliant: true\n- reason: why its safe for image generation  \n- anonymizedDescriptions: object mapping each person name to their anonymous description\n- safeImagePrompt: the image prompt rewritten with anonymous descriptions`;\n\nreturn {\n  json: {\n    headline,\n    people,\n    imageSuggestion,\n    geminiApiKey,\n    runIndex,\n    link,\n    requestBody: {\n      contents: [{\n        parts: [{ text: prompt }]\n      }]\n    }\n  }\n};\n"
        }
      },
      {
        "id": "gi_body_builder",
        "name": "Build Image Request",
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [
          2006,
          112
        ],
        "parameters": {
          "jsCode": "// Build the Gemini API request body for image prompt generation\nconst item = $input.first().json;\nconst safeImagePrompt = item.safeImagePrompt || '';\nconst anonymizedDescriptions = item.anonymizedDescriptions || {};\nconst geminiApiKey = item.geminiApiKey;\n\nconst prompt = `Create an image prompt for AI image generation based on this concept: ${safeImagePrompt}. \nInclude any people descriptions: ${JSON.stringify(anonymizedDescriptions)}.\nCreate a detailed, cinematic prompt. Focus on action and atmosphere. NO real person names.\nReturn ONLY valid JSON with: imagePrompt (your detailed prompt), style (photorealistic)`;\n\nreturn {\n  json: {\n    ...item,\n    requestBody: {\n      contents: [{\n        parts: [{ text: prompt }]\n      }]\n    }\n  }\n};\n"
        }
      }
    ],
    "connections": {
      "Webhook": {
        "main": [
          [
            {
              "node": "Fetch RSS",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Fetch RSS": {
        "main": [
          [
            {
              "node": "Parse XML",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Parse XML": {
        "main": [
          [
            {
              "node": "Extract Articles",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Extract Articles": {
        "main": [
          [
            {
              "node": "Topic Analyst",
              "type": "main",
              "index": 0
            },
            {
              "node": "Callback Articles",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Generate Post": {
        "main": [
          [
            {
              "node": "Parse Post",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Generate Image": {
        "main": [
          [
            {
              "node": "Parse Image Prompt",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Build Final Output": {
        "main": [
          [
            {
              "node": "Callback Final",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Callback Final": {
        "main": [
          [
            {
              "node": "Respond to Webhook",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Call Imagen API": {
        "main": [
          [
            {
              "node": "Parse Imagen Response",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Parse Imagen Response": {
        "main": [
          [
            {
              "node": "Brand Image",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Topic Analyst": {
        "main": [
          [
            {
              "node": "Parse Topic Analysis",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Parse Topic Analysis": {
        "main": [
          [
            {
              "node": "Build Compliance Request",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Compliance Checker": {
        "main": [
          [
            {
              "node": "Parse Compliance Check",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Parse Compliance Check": {
        "main": [
          [
            {
              "node": "Aggregate Compliant Topics",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Aggregate Compliant Topics": {
        "main": [
          [
            {
              "node": "Hashtag Researcher",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Parse Post": {
        "main": [
          [
            {
              "node": "Build Image Request",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Parse Image Prompt": {
        "main": [
          [
            {
              "node": "Generate Tagline",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Hashtag Researcher": {
        "main": [
          [
            {
              "node": "Parse Hashtags",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Parse Hashtags": {
        "main": [
          [
            {
              "node": "Prepare Post Request",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Prepare Post Request": {
        "main": [
          [
            {
              "node": "Generate Post",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Generate Tagline": {
        "main": [
          [
            {
              "node": "Parse Tagline",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Parse Tagline": {
        "main": [
          [
            {
              "node": "Call Imagen API",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Brand Image": {
        "main": [
          [
            {
              "node": "Parse Brand Response",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Parse Brand Response": {
        "main": [
          [
            {
              "node": "Build Final Output",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Build Compliance Request": {
        "main": [
          [
            {
              "node": "Compliance Checker",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Build Image Request": {
        "main": [
          [
            {
              "node": "Generate Image",
              "type": "main",
              "index": 0
            }
          ]
        ]
      }
    },
    "authors": "Bilko Bibitkov",
    "name": null,
    "description": null,
    "autosaved": false,
    "workflowPublishHistory": [
      {
        "createdAt": "2026-01-31T22:24:51.846Z",
        "id": 161,
        "workflowId": "oV6WGX5uBeTZ9tRa",
        "versionId": "922d2045-d278-4ab5-9d7d-fa05025eb58e",
        "event": "activated",
        "userId": "80f5768f-36e3-4197-9886-2f8e29df41d7"
      }
    ]
  }
}```

</details>

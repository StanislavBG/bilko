#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const workflowPath = path.join(__dirname, '../../rules/env/artifacts/prod/workflows/european-football-daily.json');
const backupDir = path.join(__dirname, 'backups');

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.writeFileSync(path.join(backupDir, `efd_pre_multi_source_${timestamp}.json`), JSON.stringify(workflow, null, 2));

console.log('Adding multi-source enrichment nodes...');

const newNodes = [
  {
    parameters: {
      jsCode: `const prevData = $input.first().json;
const selectedTopic = prevData.selectedTopic || {};
const headline = selectedTopic.headline || '';
const teams = selectedTopic.teams || [];

// Build search query from topic
const searchTerms = [];
if (teams.length > 0) {
  searchTerms.push(...teams.slice(0, 2));
}

// Extract key words from headline
const keyWords = headline
  .replace(/[^a-zA-Z0-9\\s]/g, '')
  .split(/\\s+/)
  .filter(w => w.length > 4 && !['about', 'after', 'before', 'their', 'there', 'where', 'which', 'would', 'could', 'should'].includes(w.toLowerCase()))
  .slice(0, 3);

searchTerms.push(...keyWords);
const searchQuery = searchTerms.join(' ');

// Build Google News RSS URL for topic-specific search
const encodedQuery = encodeURIComponent(searchQuery + ' football');
const searchUrl = 'https://news.google.com/rss/search?q=' + encodedQuery + '&hl=en-US&gl=US&ceid=US:en';

return [{
  json: {
    ...prevData,
    searchQuery: searchQuery,
    searchUrl: searchUrl,
    primarySource: {
      url: selectedTopic.sourceLink || '',
      headline: selectedTopic.sourceHeadline || headline
    }
  }
}];`
    },
    name: "Build Search Query",
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [1900, -200],
    id: "search-query-builder-001"
  },
  {
    parameters: {
      url: "={{ $json.searchUrl }}",
      options: {}
    },
    name: "Search Related Sources",
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4,
    position: [2100, -200],
    id: "search-related-sources-001"
  },
  {
    parameters: {
      options: {}
    },
    name: "Parse Search Results",
    type: "n8n-nodes-base.xml",
    typeVersion: 1,
    position: [2300, -200],
    id: "parse-search-results-001"
  },
  {
    parameters: {
      jsCode: `const rssData = $input.first().json;
const prevData = $("Build Search Query").first().json;
const primarySource = prevData.primarySource || {};

// Extract articles from RSS
const items = rssData?.rss?.channel?.item || [];

// Collect up to 5 sources (including primary)
const sources = [];

// Add primary source first
if (primarySource.url) {
  sources.push({
    url: primarySource.url,
    headline: primarySource.headline,
    isPrimary: true
  });
}

// Add related sources (skip duplicates)
const seenUrls = new Set([primarySource.url?.toLowerCase()]);

for (const item of items.slice(0, 10)) {
  if (sources.length >= 5) break;
  
  const link = item.link || '';
  const title = item.title || '';
  
  // Skip if duplicate or same domain as primary
  if (seenUrls.has(link.toLowerCase())) continue;
  
  // Skip Google News redirect wrapper - extract actual URL
  let actualUrl = link;
  if (link.includes('news.google.com')) {
    // Keep the redirect link as-is for now
    actualUrl = link;
  }
  
  seenUrls.add(actualUrl.toLowerCase());
  sources.push({
    url: actualUrl,
    headline: title,
    isPrimary: false
  });
}

return [{
  json: {
    ...prevData,
    sources: sources,
    sourceCount: sources.length
  }
}];`
    },
    name: "Collect Sources",
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [2500, -200],
    id: "collect-sources-001"
  },
  {
    parameters: {
      jsCode: `const prevData = $input.first().json;
const sources = prevData.sources || [];

// Create HTTP requests for each source
const requests = sources.map((source, index) => ({
  json: {
    sourceIndex: index,
    sourceUrl: source.url,
    sourceHeadline: source.headline,
    isPrimary: source.isPrimary,
    allSources: sources,
    selectedTopic: prevData.selectedTopic,
    geminiApiKey: prevData.geminiApiKey,
    callbackUrl: prevData.callbackUrl
  }
}));

return requests;`
    },
    name: "Split Sources",
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [2700, -200],
    id: "split-sources-001"
  },
  {
    parameters: {
      url: "={{ $json.sourceUrl }}",
      options: {
        response: {
          response: {
            fullResponse: false,
            responseFormat: "text"
          }
        },
        timeout: 10000
      }
    },
    name: "Fetch Source Content",
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4,
    position: [2900, -200],
    id: "fetch-source-content-001",
    continueOnFail: true
  },
  {
    parameters: {
      jsCode: `const htmlContent = $input.first().json.data || $input.first().json || '';
const prevItem = $input.first().json;
const sourceIndex = prevItem.sourceIndex ?? 0;
const sourceUrl = prevItem.sourceUrl || '';
const sourceHeadline = prevItem.sourceHeadline || '';
const isPrimary = prevItem.isPrimary || false;
const allSources = prevItem.allSources || [];

// Extract text from HTML (basic extraction)
let text = '';
if (typeof htmlContent === 'string') {
  // Remove scripts and styles
  text = htmlContent
    .replace(/<script[^>]*>[\\s\\S]*?<\\/script>/gi, '')
    .replace(/<style[^>]*>[\\s\\S]*?<\\/style>/gi, '')
    .replace(/<nav[^>]*>[\\s\\S]*?<\\/nav>/gi, '')
    .replace(/<header[^>]*>[\\s\\S]*?<\\/header>/gi, '')
    .replace(/<footer[^>]*>[\\s\\S]*?<\\/footer>/gi, '')
    .replace(/<aside[^>]*>[\\s\\S]*?<\\/aside>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\\s+/g, ' ')
    .trim()
    .slice(0, 8000);
}

return [{
  json: {
    sourceIndex,
    sourceUrl,
    sourceHeadline,
    isPrimary,
    content: text,
    allSources,
    selectedTopic: prevItem.selectedTopic,
    geminiApiKey: prevItem.geminiApiKey,
    callbackUrl: prevItem.callbackUrl
  }
}];`
    },
    name: "Parse Source Content",
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [3100, -200],
    id: "parse-source-content-001"
  },
  {
    parameters: {
      aggregate: "aggregateAllItemData",
      options: {}
    },
    name: "Aggregate Sources",
    type: "n8n-nodes-base.aggregate",
    typeVersion: 1,
    position: [3300, -200],
    id: "aggregate-sources-001"
  },
  {
    parameters: {
      jsCode: `const items = $input.first().json.data || [];
const firstItem = items[0] || {};
const allSources = firstItem.allSources || [];
const selectedTopic = firstItem.selectedTopic || {};

// Build combined content
const articlesText = items
  .sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0))
  .map((item, idx) => {
    const label = item.isPrimary ? '[PRIMARY SOURCE]' : '[SOURCE ' + (idx + 1) + ']';
    return label + '\\nHeadline: ' + item.sourceHeadline + '\\nContent: ' + (item.content || 'No content available').slice(0, 3000);
  })
  .join('\\n\\n---\\n\\n');

// Build source URLs for citations
const sourceUrls = allSources.map((s, i) => ({
  index: i + 1,
  url: s.url,
  headline: s.headline
}));

return [{
  json: {
    articlesText,
    sourceUrls,
    sourceCount: items.length,
    selectedTopic,
    geminiApiKey: firstItem.geminiApiKey,
    callbackUrl: firstItem.callbackUrl
  }
}];`
    },
    name: "Merge All Content",
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [3500, -200],
    id: "merge-all-content-001"
  },
  {
    parameters: {
      method: "POST",
      url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: "Content-Type", value: "application/json" },
          { name: "x-goog-api-key", value: "={{ $json.geminiApiKey }}" }
        ]
      },
      sendBody: true,
      specifyBody: "json",
      jsonBody: `={
  "contents": [{
    "parts": [{
      "text": "You are an objective football journalist synthesizing multiple sources into a comprehensive summary.\\n\\nARTICLES:\\n{{ $json.articlesText }}\\n\\nAnalyze ALL sources and extract:\\n\\nReturn ONLY a JSON object with:\\n{\\n  \\"summary\\": \\"2-3 paragraph objective summary synthesizing all sources (NO player names, focus on facts and numbers)\\",\\n  \\"stats\\": {\\n    \\"score\\": \\"final score if match (e.g. 2-1) or null\\",\\n    \\"possession\\": { \\"home\\": number or null, \\"away\\": number or null },\\n    \\"shots\\": { \\"home\\": number or null, \\"away\\": number or null },\\n    \\"shotsOnTarget\\": { \\"home\\": number or null, \\"away\\": number or null },\\n    \\"xG\\": { \\"home\\": number or null, \\"away\\": number or null },\\n    \\"corners\\": { \\"home\\": number or null, \\"away\\": number or null },\\n    \\"fouls\\": { \\"home\\": number or null, \\"away\\": number or null },\\n    \\"yellowCards\\": { \\"home\\": number or null, \\"away\\": number or null },\\n    \\"redCards\\": { \\"home\\": number or null, \\"away\\": number or null },\\n    \\"transferFee\\": \\"transfer amount if applicable or null\\",\\n    \\"leaguePosition\\": number or null,\\n    \\"points\\": number or null,\\n    \\"goalDifference\\": number or null,\\n    \\"winStreak\\": number or null,\\n    \\"cleanSheets\\": number or null,\\n    \\"otherStats\\": [\\"any other significant numbers found\\"]\\n  },\\n  \\"teams\\": [\\"team names mentioned\\"],\\n  \\"competition\\": \\"league/tournament name\\",\\n  \\"keyFacts\\": [\\"3-5 bullet point facts\\"],\\n  \\"dataConfidence\\": \\"high/medium/low - based on source agreement\\"\\n}\\n\\nBe thorough - extract EVERY statistic mentioned across ALL sources. Prioritize numbers and objective facts.\\"\\n    }]\\n  }]\\n}"
    }`,
      options: {},
      authentication: "genericCredentialType",
      genericAuthType: "httpHeaderAuth"
    },
    name: "Comprehensive Summary",
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4,
    position: [3700, -200],
    id: "comprehensive-summary-001",
    credentials: {
      httpHeaderAuth: {
        id: "K9oPxIngg8rE26T6",
        name: "Header Auth account"
      }
    }
  },
  {
    parameters: {
      jsCode: `const input = $input.first().json;
const prevData = $("Merge All Content").first().json;

const text = input?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
const cleaned = text.replace(/^\`\`\`[a-zA-Z]*\\n?/, "").replace(/\\n?\`\`\`\\s*$/, "");

try {
  const summary = JSON.parse(cleaned);
  return [{
    json: {
      comprehensiveSummary: summary.summary,
      extractedStats: summary.stats,
      teams: summary.teams,
      competition: summary.competition,
      keyFacts: summary.keyFacts,
      dataConfidence: summary.dataConfidence,
      sourceUrls: prevData.sourceUrls,
      sourceCount: prevData.sourceCount,
      selectedTopic: prevData.selectedTopic,
      geminiApiKey: prevData.geminiApiKey,
      callbackUrl: prevData.callbackUrl
    }
  }];
} catch (e) {
  return [{
    json: {
      comprehensiveSummary: prevData.selectedTopic?.headline || "Football news update",
      extractedStats: {},
      teams: prevData.selectedTopic?.teams || [],
      competition: "",
      keyFacts: [],
      dataConfidence: "low",
      sourceUrls: prevData.sourceUrls,
      sourceCount: prevData.sourceCount,
      selectedTopic: prevData.selectedTopic,
      geminiApiKey: prevData.geminiApiKey,
      callbackUrl: prevData.callbackUrl,
      parseError: e.message
    }
  }];
}`
    },
    name: "Parse Summary",
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [3900, -200],
    id: "parse-summary-001"
  }
];

workflow.nodes.push(...newNodes);

const newConnections = {
  "Build Search Query": {
    main: [[{ node: "Search Related Sources", type: "main", index: 0 }]]
  },
  "Search Related Sources": {
    main: [[{ node: "Parse Search Results", type: "main", index: 0 }]]
  },
  "Parse Search Results": {
    main: [[{ node: "Collect Sources", type: "main", index: 0 }]]
  },
  "Collect Sources": {
    main: [[{ node: "Split Sources", type: "main", index: 0 }]]
  },
  "Split Sources": {
    main: [[{ node: "Fetch Source Content", type: "main", index: 0 }]]
  },
  "Fetch Source Content": {
    main: [[{ node: "Parse Source Content", type: "main", index: 0 }]]
  },
  "Parse Source Content": {
    main: [[{ node: "Aggregate Sources", type: "main", index: 0 }]]
  },
  "Aggregate Sources": {
    main: [[{ node: "Merge All Content", type: "main", index: 0 }]]
  },
  "Merge All Content": {
    main: [[{ node: "Comprehensive Summary", type: "main", index: 0 }]]
  },
  "Comprehensive Summary": {
    main: [[{ node: "Parse Summary", type: "main", index: 0 }]]
  }
};

Object.assign(workflow.connections, newConnections);

fs.writeFileSync(workflowPath, JSON.stringify(workflow, null, 2));
console.log('Multi-source enrichment nodes added successfully!');
console.log('Next: Run update-fb-post-citations.cjs to update FB post generation');

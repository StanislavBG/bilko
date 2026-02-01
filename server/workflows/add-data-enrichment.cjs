const fs = require('fs');
const path = require('path');

const workflowPath = path.join(__dirname, '../../rules/env/artifacts/prod/workflows/european-football-daily.json');
const backupPath = path.join(__dirname, 'backups/oV6WGX5uBeTZ9tRa_PROD.json');

const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf-8'));

const fetchArticleNode = {
  id: "fetch-article-content-" + Date.now(),
  name: "Fetch Article Content",
  type: "n8n-nodes-base.httpRequest",
  typeVersion: 4,
  position: [2600, -150],
  parameters: {
    method: "GET",
    url: "={{ $json.selectedTopic.sourceLink }}",
    options: {
      redirect: {
        redirect: {
          followRedirects: true,
          maxRedirects: 5
        }
      },
      response: {
        response: {
          responseFormat: "text"
        }
      },
      timeout: 15000
    }
  },
  retryOnFail: true,
  maxTries: 2,
  waitBetweenTries: 2000
};

const extractStatisticsNode = {
  id: "extract-statistics-" + Date.now(),
  name: "Extract Statistics",
  type: "n8n-nodes-base.httpRequest",
  typeVersion: 4,
  position: [2750, -150],
  parameters: {
    method: "POST",
    url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
    sendHeaders: true,
    headerParameters: {
      parameters: [
        { name: "Content-Type", value: "application/json" },
        { name: "User-Agent", value: "Mozilla/5.0 (compatible; BilkoBibitkov/1.0)" }
      ]
    },
    sendBody: true,
    specifyBody: "json",
    jsonBody: `={{ JSON.stringify({
  contents: [{
    parts: [{
      text: "Extract SPECIFIC STATISTICS from this football article. Look for:\\n\\n1. MATCH SCORES (e.g., 3-0, 2-1)\\n2. POSSESSION PERCENTAGES\\n3. SHOT COUNTS\\n4. TRANSFER FEES (in millions)\\n5. LEAGUE STANDINGS/POINTS\\n6. GOAL SCORERS (without names, just counts)\\n7. ANY OTHER NUMERICAL DATA\\n\\nARTICLE CONTENT:\\n" + ($('Fetch Article Content').first().json.data || "No content").substring(0, 8000) + "\\n\\nHEADLINE: " + $json.selectedTopic.headline + "\\n\\nReturn ONLY valid JSON:\\n{\\n  \\"score\\": \\"3-0\\" or null,\\n  \\"homeTeam\\": \\"Team A\\" or null,\\n  \\"awayTeam\\": \\"Team B\\" or null,\\n  \\"possession\\": { \\"home\\": 65, \\"away\\": 35 } or null,\\n  \\"shots\\": { \\"home\\": 15, \\"away\\": 8 } or null,\\n  \\"transferFee\\": \\"80M\\" or null,\\n  \\"leaguePosition\\": 1 or null,\\n  \\"points\\": 45 or null,\\n  \\"goalCount\\": 3 or null,\\n  \\"keyStatistic\\": \\"most important number/stat found\\",\\n  \\"dataRichness\\": 1-10 (how much real data found)\\n}"
    }]
  }]
}) }}`,
    options: {},
    authentication: "genericCredentialType",
    genericAuthType: "httpHeaderAuth"
  },
  credentials: {
    httpHeaderAuth: {
      id: "K9oPxIngg8rE26T6",
      name: "Header Auth account"
    }
  }
};

const parseStatisticsNode = {
  id: "parse-statistics-" + Date.now(),
  name: "Parse Statistics",
  type: "n8n-nodes-base.code",
  typeVersion: 2,
  position: [2900, -150],
  parameters: {
    jsCode: `const geminiResponse = $input.first().json;
const aggregateData = $("Aggregate Compliant Topics").first().json;
const geminiApiKey = aggregateData.geminiApiKey;
const callbackUrl = aggregateData.callbackUrl;
const selectedTopic = aggregateData.selectedTopic;

let extractedStats = {
  score: null,
  homeTeam: null,
  awayTeam: null,
  possession: null,
  shots: null,
  transferFee: null,
  leaguePosition: null,
  points: null,
  goalCount: null,
  keyStatistic: null,
  dataRichness: 1
};

try {
  const candidates = geminiResponse.candidates || [];
  if (candidates.length > 0) {
    let text = candidates[0].content?.parts?.[0]?.text || "";
    text = text.replace(/\`\`\`json\\n?/g, "").replace(/\`\`\`/g, "").trim();
    const parsed = JSON.parse(text);
    extractedStats = { ...extractedStats, ...parsed };
  }
} catch (e) {
  // Keep defaults
}

// Build enhanced tagline based on extracted data
let enhancedTagline = selectedTopic.headline;
if (extractedStats.score && extractedStats.homeTeam && extractedStats.awayTeam) {
  enhancedTagline = extractedStats.homeTeam + " " + extractedStats.score + " " + extractedStats.awayTeam;
} else if (extractedStats.score) {
  enhancedTagline = selectedTopic.teams?.[0] + " " + extractedStats.score + " " + (selectedTopic.teams?.[1] || "");
} else if (extractedStats.transferFee) {
  enhancedTagline = extractedStats.transferFee + " Transfer Complete";
} else if (extractedStats.leaguePosition && extractedStats.points) {
  enhancedTagline = selectedTopic.teams?.[0] + " #" + extractedStats.leaguePosition + " (" + extractedStats.points + " pts)";
}

return [{
  json: {
    selectedTopic: {
      ...selectedTopic,
      extractedStats: extractedStats,
      enhancedTagline: enhancedTagline.trim(),
      hasRealData: extractedStats.dataRichness >= 5
    },
    sourceLink: selectedTopic.sourceLink || "",
    anonymizedDescriptions: selectedTopic.anonymizedDescriptions || {},
    geminiApiKey: geminiApiKey,
    callbackUrl: callbackUrl
  }
}];`
  }
};

workflow.nodes.push(fetchArticleNode);
workflow.nodes.push(extractStatisticsNode);
workflow.nodes.push(parseStatisticsNode);

workflow.connections["Aggregate Compliant Topics"] = {
  main: [[
    { node: "Fetch Article Content", type: "main", index: 0 }
  ]]
};

workflow.connections["Fetch Article Content"] = {
  main: [[
    { node: "Extract Statistics", type: "main", index: 0 }
  ]]
};

workflow.connections["Extract Statistics"] = {
  main: [[
    { node: "Parse Statistics", type: "main", index: 0 }
  ]]
};

workflow.connections["Parse Statistics"] = {
  main: [[
    { node: "Hashtag Researcher", type: "main", index: 0 }
  ]]
};

fs.writeFileSync(backupPath, JSON.stringify(workflow, null, 2));
console.log("Modified workflow saved to:", backupPath);
console.log("New nodes added: Fetch Article Content, Extract Statistics, Parse Statistics");

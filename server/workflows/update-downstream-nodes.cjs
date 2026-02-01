const fs = require('fs');
const path = require('path');

const backupPath = path.join(__dirname, 'backups/oV6WGX5uBeTZ9tRa_PROD.json');
const workflow = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));

// Find and update the Generate Tagline node to use extracted statistics
const taglineNodeIndex = workflow.nodes.findIndex(n => n.name === "Generate Tagline");
if (taglineNodeIndex >= 0) {
  workflow.nodes[taglineNodeIndex].parameters.jsonBody = `={
  "contents": [{
    "parts": [{
      "text": "Create a DATA-RICH headline for a European football image.\\n\\nTOPIC: {{ $json.selectedTopic?.headline || \\"Football news\\" }}\\nTEAMS: {{ ($json.selectedTopic?.teams || []).join(' vs ') }}\\nEVENT: {{ $json.selectedTopic?.event || \\"update\\" }}\\n\\nEXTRACTED REAL DATA (USE THIS IF AVAILABLE):\\n- Score: {{ $json.selectedTopic?.extractedStats?.score || \\"not found\\" }}\\n- Home Team: {{ $json.selectedTopic?.extractedStats?.homeTeam || \\"unknown\\" }}\\n- Away Team: {{ $json.selectedTopic?.extractedStats?.awayTeam || \\"unknown\\" }}\\n- Possession: {{ JSON.stringify($json.selectedTopic?.extractedStats?.possession) || \\"not found\\" }}\\n- Transfer Fee: {{ $json.selectedTopic?.extractedStats?.transferFee || \\"not found\\" }}\\n- League Position: {{ $json.selectedTopic?.extractedStats?.leaguePosition || \\"not found\\" }}\\n- Points: {{ $json.selectedTopic?.extractedStats?.points || \\"not found\\" }}\\n- Key Statistic: {{ $json.selectedTopic?.extractedStats?.keyStatistic || \\"none\\" }}\\n- Enhanced Tagline (pre-computed): {{ $json.selectedTopic?.enhancedTagline || \\"none\\" }}\\n\\nRules:\\n- 3-6 words maximum\\n- PRIORITIZE REAL DATA: If we have a score, USE IT (e.g., \\"Barcelona 3-0 Madrid\\")\\n- If transfer fee exists, use it (e.g., \\"£80M Transfer Done\\")\\n- If league position/points exist, use them\\n- The Enhanced Tagline is already computed from real data - consider using it directly\\n- DO NOT use generic phrases like \\"Game On\\", \\"What A Match\\"\\n\\nReturn ONLY a JSON object: {\\"tagline\\": \\"your data-rich headline here\\"}"
    }]
  }]
}`;
  console.log("Updated Generate Tagline node with extracted statistics prompt");
}

// Update Generate Post node to include statistics in the post content
const postNodeIndex = workflow.nodes.findIndex(n => n.name === "Generate Post");
if (postNodeIndex >= 0) {
  workflow.nodes[postNodeIndex].parameters.jsonBody = `={
  "contents": [{
    "parts": [{
      "text": "You are a European football social media manager. Create an INFORMATIVE, DATA-RICH Facebook post.\\n\\nTOPIC: {{ $json.selectedTopic.headline }}\\nEVENT: {{ $json.selectedTopic.event }}\\nTEAMS: {{ ($json.selectedTopic.teams || []).join(', ') }}\\nHASHTAGS TO USE: {{ $json.hashtagString }}\\n\\nEXTRACTED STATISTICS (INCLUDE THESE):\\n- Score: {{ $json.selectedTopic?.extractedStats?.score || \\"not available\\" }}\\n- Possession: {{ JSON.stringify($json.selectedTopic?.extractedStats?.possession) || \\"not available\\" }}\\n- Shots: {{ JSON.stringify($json.selectedTopic?.extractedStats?.shots) || \\"not available\\" }}\\n- Transfer Fee: {{ $json.selectedTopic?.extractedStats?.transferFee || \\"not available\\" }}\\n- League Position: {{ $json.selectedTopic?.extractedStats?.leaguePosition || \\"not available\\" }}\\n- Points: {{ $json.selectedTopic?.extractedStats?.points || \\"not available\\" }}\\n- Key Statistic: {{ $json.selectedTopic?.extractedStats?.keyStatistic || \\"not available\\" }}\\n\\nCreate an informative Facebook post (2-3 short paragraphs) that:\\n1. LEADS WITH SPECIFIC DATA - scores, percentages, transfer fees, standings\\n2. Include ALL available statistics in the post\\n3. Provides context about what this means for the league/tournament\\n4. Ends with a question to drive engagement\\n5. MUST end with these EXACT hashtags: {{ $json.hashtagString }}\\n\\nStyle guidelines:\\n- Be factual and NUMBERS-FOCUSED\\n- Highlight every statistic available\\n- NO generic filler - pack it with data\\n- Do NOT mention specific player or coach names\\n\\nReturn ONLY a JSON object with postContent (the text including hashtags) and sentiment (positive/neutral/negative)"
    }]
  }]
}`;
  console.log("Updated Generate Post node with statistics integration");
}

// Also update Parse Hashtags to pass through the extracted stats properly
const parseHashtagsIndex = workflow.nodes.findIndex(n => n.name === "Parse Hashtags");
if (parseHashtagsIndex >= 0) {
  workflow.nodes[parseHashtagsIndex].parameters.jsCode = `// Get Gemini response from HTTP Request
const geminiResponse = $input.first().json;

// Get original data from Parse Statistics (now has extractedStats)
const originalData = $("Parse Statistics").first().json;
const geminiApiKey = originalData.geminiApiKey;
const callbackUrl = originalData.callbackUrl;
const selectedTopic = originalData.selectedTopic;

// Parse hashtags from Gemini response
let hashtags = ["#football", "#soccer", "#UEFA"]; // fallback
try {
  const candidates = geminiResponse.candidates || [];
  if (candidates.length > 0) {
    let text = candidates[0].content?.parts?.[0]?.text || "";
    text = text.replace(/\`\`\`json\\n?/g, "").replace(/\`\`\`/g, "").trim();
    const parsed = JSON.parse(text);
    if (parsed.hashtags && Array.isArray(parsed.hashtags)) {
      hashtags = parsed.hashtags.slice(0, 3);
    }
  }
} catch (e) {
  // Keep fallback
}

return [{
  json: {
    selectedTopic: selectedTopic,
    sourceLink: selectedTopic.sourceLink || "",
    anonymizedDescriptions: selectedTopic.anonymizedDescriptions || {},
    hashtags: hashtags,
    hashtagString: hashtags.join(" "),
    geminiApiKey: geminiApiKey,
    callbackUrl: callbackUrl
  }
}];`;
  console.log("Updated Parse Hashtags to reference Parse Statistics instead of Aggregate Compliant Topics");
}

// Update Hashtag Researcher to reference Parse Statistics
const hashtagResearcherIndex = workflow.nodes.findIndex(n => n.name === "Hashtag Researcher");
if (hashtagResearcherIndex >= 0) {
  workflow.nodes[hashtagResearcherIndex].parameters.jsonBody = `={
  "contents": [{
    "parts": [{
      "text": "Find the 3 most relevant, high-reach hashtags for this European football topic.\\n\\nTOPIC: {{ $json.selectedTopic.headline }}\\nEVENT: {{ $json.selectedTopic.event }}\\nTEAMS: {{ ($json.selectedTopic.teams || []).join(', ') }}\\nKEY DATA: {{ $json.selectedTopic?.extractedStats?.keyStatistic || 'general football news' }}\\n\\nRules:\\n- Return EXACTLY 3 hashtags\\n- Must be real, widely-used hashtags on social media\\n- Must be directly relevant to this specific topic/teams/event\\n- Include the # symbol\\n- Prefer hashtags with high engagement (millions of posts)\\n\\nReturn ONLY a JSON object: {\\"hashtags\\": [\\"#tag1\\", \\"#tag2\\", \\"#tag3\\"]}"
    }]
  }]
}`;
  console.log("Updated Hashtag Researcher to use extracted stats");
}

fs.writeFileSync(backupPath, JSON.stringify(workflow, null, 2));
console.log("\\nWorkflow updated with data-rich prompts. Backup saved.");

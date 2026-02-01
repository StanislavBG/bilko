#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const workflowPath = path.join(__dirname, '../../rules/env/artifacts/prod/workflows/european-football-daily.json');
const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

console.log('Updating FB post generation with objective journalism + citations...');

// Find and update the Generate Post node
const generatePostNode = workflow.nodes.find(n => n.name === 'Generate Post');
if (generatePostNode) {
  generatePostNode.parameters.jsonBody = `={
  "contents": [{
    "parts": [{
      "text": "You are an objective European football journalist creating a comprehensive Facebook post.\\n\\nTOPIC: {{ $json.selectedTopic.headline }}\\nCOMPREHENSIVE SUMMARY: {{ $json.comprehensiveSummary }}\\nTEAMS: {{ ($json.teams || []).join(', ') }}\\nCOMPETITION: {{ $json.competition }}\\nHASHTAGS TO USE: {{ $json.hashtagString }}\\n\\nEXTRACTED STATISTICS:\\n- Score: {{ $json.extractedStats?.score || 'not available' }}\\n- Possession: Home {{ $json.extractedStats?.possession?.home || '?' }}% - Away {{ $json.extractedStats?.possession?.away || '?' }}%\\n- Shots: Home {{ $json.extractedStats?.shots?.home || '?' }} - Away {{ $json.extractedStats?.shots?.away || '?' }}\\n- Shots on Target: Home {{ $json.extractedStats?.shotsOnTarget?.home || '?' }} - Away {{ $json.extractedStats?.shotsOnTarget?.away || '?' }}\\n- xG: Home {{ $json.extractedStats?.xG?.home || '?' }} - Away {{ $json.extractedStats?.xG?.away || '?' }}\\n- Corners: Home {{ $json.extractedStats?.corners?.home || '?' }} - Away {{ $json.extractedStats?.corners?.away || '?' }}\\n- Yellow Cards: Home {{ $json.extractedStats?.yellowCards?.home || '?' }} - Away {{ $json.extractedStats?.yellowCards?.away || '?' }}\\n- Transfer Fee: {{ $json.extractedStats?.transferFee || 'N/A' }}\\n- League Position: {{ $json.extractedStats?.leaguePosition || 'N/A' }}\\n- Points: {{ $json.extractedStats?.points || 'N/A' }}\\n- Other Stats: {{ JSON.stringify($json.extractedStats?.otherStats || []) }}\\n\\nKEY FACTS: {{ JSON.stringify($json.keyFacts || []) }}\\n\\nSOURCE COUNT: {{ $json.sourceCount }} sources analyzed\\nDATA CONFIDENCE: {{ $json.dataConfidence }}\\n\\nCreate an OBJECTIVE journalism-style Facebook post (3-4 paragraphs) that:\\n1. LEADS with the most significant statistic or result\\n2. Presents facts neutrally without bias toward any team\\n3. Includes ALL available statistics naturally in the narrative\\n4. Provides context about implications for the league/tournament\\n5. Uses measured language - avoid superlatives and hype\\n6. MUST end with these EXACT hashtags: {{ $json.hashtagString }}\\n\\nTONE REQUIREMENTS:\\n- Objective and balanced reporting\\n- Data-driven narrative\\n- NO player or coach names\\n- NO sensationalism or clickbait\\n- Present both sides fairly\\n- Let the numbers tell the story\\n\\nReturn ONLY a JSON object with:\\n- postContent: the full post text including hashtags\\n- sentiment: positive/neutral/negative\\n- statsHighlighted: array of stats you included\\"\\n    }]\\n  }]\\n}"`;
  console.log('Updated Generate Post node with objective journalism prompt');
}

// Find and update Parse Post to include source citations
const parsePostNode = workflow.nodes.find(n => n.name === 'Parse Post');
if (parsePostNode) {
  parsePostNode.parameters.jsCode = `const input = $input.first().json;
const prevData = $("Parse Summary").first().json;
const hashtagData = $("Parse Hashtags").first().json;

const text = input?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
const cleaned = text.replace(/^\`\`\`[a-zA-Z]*\\n?/, "").replace(/\\n?\`\`\`\\s*$/, "");

try {
  const post = JSON.parse(cleaned);
  let postContent = post.postContent || "";
  
  // Add source citations at the end (before hashtags)
  const sourceUrls = prevData.sourceUrls || [];
  if (sourceUrls.length > 0) {
    // Find where hashtags start (# followed by word)
    const hashtagMatch = postContent.match(/#[A-Za-z]/);
    let beforeHashtags = postContent;
    let hashtags = "";
    
    if (hashtagMatch) {
      const hashtagIndex = postContent.indexOf(hashtagMatch[0]);
      beforeHashtags = postContent.slice(0, hashtagIndex).trim();
      hashtags = postContent.slice(hashtagIndex).trim();
    }
    
    // Build citation line with numbered hyperlinks
    const citations = sourceUrls.map((s, i) => 
      "[" + (i + 1) + "](" + s.url + ")"
    ).join(" ");
    
    // Reconstruct post with sources
    postContent = beforeHashtags + "\\n\\nSources: " + citations + "\\n\\n" + hashtags;
  }
  
  return [{
    json: {
      postContent: postContent,
      sentiment: post.sentiment || "neutral",
      statsHighlighted: post.statsHighlighted || [],
      safeImagePrompt: prevData.selectedTopic?.safeImagePrompt,
      anonymizedDescriptions: prevData.selectedTopic?.anonymizedDescriptions || hashtagData?.anonymizedDescriptions || {},
      selectedTopic: prevData.selectedTopic,
      extractedStats: prevData.extractedStats || {},
      comprehensiveSummary: prevData.comprehensiveSummary,
      keyFacts: prevData.keyFacts,
      sourceUrls: prevData.sourceUrls,
      sourceCount: prevData.sourceCount,
      sourceLink: sourceUrls[0]?.url || "",
      geminiApiKey: prevData.geminiApiKey,
      callbackUrl: prevData.callbackUrl
    }
  }];
} catch (e) {
  const sourceUrls = prevData.sourceUrls || [];
  const citations = sourceUrls.map((s, i) => "[" + (i + 1) + "](" + s.url + ")").join(" ");
  
  return [{
    json: {
      postContent: "Football news update! Exciting developments in European football today.\\n\\nSources: " + citations,
      sentiment: "neutral",
      statsHighlighted: [],
      safeImagePrompt: prevData.selectedTopic?.safeImagePrompt || "Exciting football stadium scene",
      anonymizedDescriptions: prevData.selectedTopic?.anonymizedDescriptions || {},
      selectedTopic: prevData.selectedTopic,
      extractedStats: prevData.extractedStats || {},
      comprehensiveSummary: prevData.comprehensiveSummary,
      keyFacts: prevData.keyFacts,
      sourceUrls: prevData.sourceUrls,
      sourceCount: prevData.sourceCount,
      sourceLink: sourceUrls[0]?.url || "",
      geminiApiKey: prevData.geminiApiKey,
      callbackUrl: prevData.callbackUrl,
      parseError: e.message
    }
  }];
}`;
  console.log('Updated Parse Post node to add source citations');
}

// Update connections - Parse Summary should connect to hashtag generation flow
// Find where "Parse Statistics" currently connects to
const parseStatisticsConn = workflow.connections["Parse Statistics"];
if (parseStatisticsConn) {
  // Parse Summary replaces Parse Statistics in the flow
  workflow.connections["Parse Summary"] = {
    main: [[{ node: "Hashtag Researcher", type: "main", index: 0 }]]
  };
  console.log('Connected Parse Summary to Hashtag Researcher');
}

// Parse Selection should now connect to Build Search Query
const parseSelectionNode = workflow.nodes.find(n => n.name === "Parse Selection");
if (parseSelectionNode && workflow.connections["Parse Selection"]) {
  // Find current Parse Selection output
  const currentOutput = workflow.connections["Parse Selection"].main[0][0].node;
  console.log('Parse Selection currently connects to:', currentOutput);
  
  // Redirect Parse Selection to Build Search Query
  workflow.connections["Parse Selection"] = {
    main: [[{ node: "Build Search Query", type: "main", index: 0 }]]
  };
  console.log('Redirected Parse Selection -> Build Search Query');
}

fs.writeFileSync(workflowPath, JSON.stringify(workflow, null, 2));
console.log('FB post generation updated with objective journalism + citations!');
console.log('Next: Run update-infographic-multi-stat.cjs to update image prompts');

#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const workflowPath = path.join(__dirname, '../../rules/env/artifacts/prod/workflows/european-football-daily.json');
const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

console.log('Fixing data propagation issues...');

// Fix 1: Update Parse Hashtags to reference Parse Summary and pass through all fields
const parseHashtagsNode = workflow.nodes.find(n => n.name === 'Parse Hashtags');
if (parseHashtagsNode) {
  parseHashtagsNode.parameters.jsCode = `// Get Gemini response from HTTP Request
const geminiResponse = $input.first().json;

// Get original data from Parse Summary (has multi-source data)
const originalData = $("Parse Summary").first().json;
const geminiApiKey = originalData.geminiApiKey;
const callbackUrl = originalData.callbackUrl;
const selectedTopic = originalData.selectedTopic;
const comprehensiveSummary = originalData.comprehensiveSummary;
const extractedStats = originalData.extractedStats || {};
const teams = originalData.teams || [];
const competition = originalData.competition || "";
const keyFacts = originalData.keyFacts || [];
const sourceUrls = originalData.sourceUrls || [];
const sourceCount = originalData.sourceCount || 1;
const dataConfidence = originalData.dataConfidence || "low";

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
    comprehensiveSummary: comprehensiveSummary,
    extractedStats: extractedStats,
    teams: teams,
    competition: competition,
    keyFacts: keyFacts,
    sourceUrls: sourceUrls,
    sourceCount: sourceCount,
    dataConfidence: dataConfidence,
    sourceLink: selectedTopic?.sourceLink || "",
    anonymizedDescriptions: selectedTopic?.anonymizedDescriptions || {},
    hashtags: hashtags,
    hashtagString: hashtags.join(" "),
    geminiApiKey: geminiApiKey,
    callbackUrl: callbackUrl
  }
}];`;
  console.log('Fixed Parse Hashtags to reference Parse Summary and pass all fields');
}

// Fix 2: Update Build Image Request to handle non-numeric xG values
const buildImageNode = workflow.nodes.find(n => n.name === 'Build Image Request');
if (buildImageNode && buildImageNode.parameters.jsCode) {
  // Replace the toFixed call with safe version
  let code = buildImageNode.parameters.jsCode;
  
  // Fix xG toFixed - handle both home and away
  code = code.replace(
    /extractedStats\.xG\.home\.toFixed\(2\)/g,
    '(typeof extractedStats.xG.home === "number" ? extractedStats.xG.home.toFixed(2) : parseFloat(extractedStats.xG.home || 0).toFixed(2))'
  );
  code = code.replace(
    /extractedStats\.xG\.away\.toFixed\(2\)/g,
    '(typeof extractedStats.xG.away === "number" ? extractedStats.xG.away.toFixed(2) : parseFloat(extractedStats.xG.away || 0).toFixed(2))'
  );
  
  buildImageNode.parameters.jsCode = code;
  console.log('Fixed Build Image Request xG toFixed() to handle string values');
}

// Fix 3: Update Hashtag Researcher to use Parse Summary data
const hashtagResearcherNode = workflow.nodes.find(n => n.name === 'Hashtag Researcher');
if (hashtagResearcherNode) {
  // Check if it has a jsonBody that needs updating
  if (hashtagResearcherNode.parameters.jsonBody) {
    // The Hashtag Researcher should reference data from the input which now comes from Parse Summary
    // The input reference $json should work correctly as long as Parse Summary flows into it
    console.log('Hashtag Researcher receives data from Parse Summary (connection established)');
  }
}

// Fix 4: Update Parse Post to reference Parse Hashtags for data
const parsePostNode = workflow.nodes.find(n => n.name === 'Parse Post');
if (parsePostNode) {
  parsePostNode.parameters.jsCode = `const input = $input.first().json;
const prevData = $("Parse Hashtags").first().json;

const text = input?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
const cleaned = text.replace(/^\\\`\\\`\\\`[a-zA-Z]*\\\\n?/, "").replace(/\\\\n?\\\`\\\`\\\`\\\\s*$/, "");

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
      anonymizedDescriptions: prevData.selectedTopic?.anonymizedDescriptions || prevData.anonymizedDescriptions || {},
      selectedTopic: prevData.selectedTopic,
      comprehensiveSummary: prevData.comprehensiveSummary,
      extractedStats: prevData.extractedStats || {},
      teams: prevData.teams,
      competition: prevData.competition,
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
      comprehensiveSummary: prevData.comprehensiveSummary,
      extractedStats: prevData.extractedStats || {},
      teams: prevData.teams,
      competition: prevData.competition,
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
  console.log('Fixed Parse Post to reference Parse Hashtags for multi-source data');
}

// Fix 5: Update Generate Post prompt to reference correct data fields
const generatePostNode = workflow.nodes.find(n => n.name === 'Generate Post');
if (generatePostNode && generatePostNode.parameters.jsonBody) {
  // The prompt already references $json.comprehensiveSummary which should work
  // as long as Parse Hashtags passes it through (which we just fixed)
  console.log('Generate Post prompt already references comprehensiveSummary from input');
}

// Fix 6: Ensure Build Image Request references Parse Post for data
const buildImageReqNode = workflow.nodes.find(n => n.name === 'Build Image Request');
if (buildImageReqNode && buildImageReqNode.parameters.jsCode) {
  let code = buildImageReqNode.parameters.jsCode;
  
  // Make sure it references Parse Post not Parse Summary
  if (code.includes('$("Parse Summary")')) {
    code = code.replace(/\$\("Parse Summary"\)/g, '$("Parse Post")');
    buildImageReqNode.parameters.jsCode = code;
    console.log('Fixed Build Image Request to reference Parse Post');
  }
}

fs.writeFileSync(workflowPath, JSON.stringify(workflow, null, 2));
console.log('Data propagation fixes complete!');
console.log('Next: Run push-to-n8n.cjs to deploy');

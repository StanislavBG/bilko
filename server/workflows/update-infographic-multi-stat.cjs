#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const workflowPath = path.join(__dirname, '../../rules/env/artifacts/prod/workflows/european-football-daily.json');
const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

console.log('Updating image prompts for multi-stat infographics...');

// Find and update Build Image Request node
const buildImageNode = workflow.nodes.find(n => n.name === 'Build Image Request');
if (buildImageNode) {
  buildImageNode.parameters.jsCode = `const prevData = $input.first().json;
const selectedTopic = prevData.selectedTopic || {};
const extractedStats = prevData.extractedStats || {};
const keyFacts = prevData.keyFacts || [];
const sourceCount = prevData.sourceCount || 1;

// Build comprehensive infographic elements
const infographicElements = [];

// Score overlay (most prominent)
if (extractedStats.score) {
  infographicElements.push('LARGE SCORE OVERLAY: "' + extractedStats.score + '" in bold white text with drop shadow');
}

// Possession comparison bar
if (extractedStats.possession?.home && extractedStats.possession?.away) {
  infographicElements.push('POSSESSION BAR: horizontal split bar showing ' + extractedStats.possession.home + '% vs ' + extractedStats.possession.away + '%');
}

// Shots comparison
if (extractedStats.shots?.home && extractedStats.shots?.away) {
  infographicElements.push('SHOTS GRAPHIC: "Shots: ' + extractedStats.shots.home + ' - ' + extractedStats.shots.away + '"');
}

// Shots on target
if (extractedStats.shotsOnTarget?.home && extractedStats.shotsOnTarget?.away) {
  infographicElements.push('ON TARGET: "' + extractedStats.shotsOnTarget.home + ' - ' + extractedStats.shotsOnTarget.away + ' on target"');
}

// xG data
if (extractedStats.xG?.home && extractedStats.xG?.away) {
  infographicElements.push('xG METRIC: "xG: ' + extractedStats.xG.home.toFixed(2) + ' - ' + extractedStats.xG.away.toFixed(2) + '"');
}

// Corners
if (extractedStats.corners?.home && extractedStats.corners?.away) {
  infographicElements.push('CORNER KICKS: "' + extractedStats.corners.home + ' - ' + extractedStats.corners.away + '"');
}

// Cards
const homeYellow = extractedStats.yellowCards?.home || 0;
const awayYellow = extractedStats.yellowCards?.away || 0;
const homeRed = extractedStats.redCards?.home || 0;
const awayRed = extractedStats.redCards?.away || 0;
if (homeYellow + awayYellow + homeRed + awayRed > 0) {
  infographicElements.push('CARDS: Yellow ' + homeYellow + '-' + awayYellow + ', Red ' + homeRed + '-' + awayRed);
}

// Transfer fee badge
if (extractedStats.transferFee) {
  infographicElements.push('TRANSFER FEE BADGE: "' + extractedStats.transferFee + '" in gold/yellow accent');
}

// League position indicator
if (extractedStats.leaguePosition) {
  const ordinal = extractedStats.leaguePosition + (['st','nd','rd'][((extractedStats.leaguePosition+90)%100-10)%10-1]||'th');
  infographicElements.push('LEAGUE POSITION: "' + ordinal + ' Place" with table icon');
}

// Points display
if (extractedStats.points) {
  infographicElements.push('POINTS: "' + extractedStats.points + ' pts"');
}

// Goal difference
if (extractedStats.goalDifference) {
  const prefix = extractedStats.goalDifference > 0 ? '+' : '';
  infographicElements.push('GOAL DIFFERENCE: "GD: ' + prefix + extractedStats.goalDifference + '"');
}

// Win streak
if (extractedStats.winStreak && extractedStats.winStreak >= 3) {
  infographicElements.push('WIN STREAK: "' + extractedStats.winStreak + ' WINS IN A ROW" flame icon');
}

// Clean sheets
if (extractedStats.cleanSheets) {
  infographicElements.push('CLEAN SHEETS: "' + extractedStats.cleanSheets + ' Clean Sheets" shield icon');
}

// Other notable stats
const otherStats = extractedStats.otherStats || [];
otherStats.slice(0, 3).forEach(stat => {
  infographicElements.push('STAT BADGE: "' + stat + '"');
});

// Source count badge
if (sourceCount > 1) {
  infographicElements.push('SOURCE BADGE: "' + sourceCount + ' Sources Analyzed" in corner');
}

// Build the infographic prompt
const teams = selectedTopic.teams || [];
const teamColors = teams.length >= 2 
  ? 'using colors associated with ' + teams[0] + ' and ' + teams[1]
  : teams.length === 1 
    ? 'using colors associated with ' + teams[0]
    : 'using vibrant football colors';

const basePrompt = selectedTopic.safeImagePrompt || 'Modern football stadium atmosphere with dramatic lighting';

let fullPrompt = 'Create a professional SPORTS INFOGRAPHIC image. ' + basePrompt + '. ';
fullPrompt += 'Style: Clean, modern sports broadcast graphics ' + teamColors + '. ';
fullPrompt += 'Dark background with vibrant stat overlays. ';

if (infographicElements.length > 0) {
  fullPrompt += 'Include these data visualizations: ' + infographicElements.join('. ') + '. ';
} else {
  fullPrompt += 'Include subtle stadium atmosphere and team imagery. ';
}

fullPrompt += 'Professional typography, clear hierarchy, broadcast-quality graphics. NO faces, NO real people, NO text that could be misread.';

const requestBody = {
  contents: [{
    parts: [{
      text: fullPrompt
    }]
  }]
};

return [{
  json: {
    requestBody,
    imagePrompt: fullPrompt,
    infographicElements,
    postContent: prevData.postContent,
    selectedTopic: prevData.selectedTopic,
    extractedStats: extractedStats,
    comprehensiveSummary: prevData.comprehensiveSummary,
    keyFacts: keyFacts,
    sourceUrls: prevData.sourceUrls,
    sourceCount: sourceCount,
    sourceLink: prevData.sourceLink,
    geminiApiKey: prevData.geminiApiKey,
    callbackUrl: prevData.callbackUrl
  }
}];`;
  console.log('Updated Build Image Request with comprehensive infographic logic');
}

// Update Generate Tagline to use multi-stat data
const generateTaglineNode = workflow.nodes.find(n => n.name === 'Generate Tagline');
if (generateTaglineNode) {
  generateTaglineNode.parameters.jsonBody = `={
  "contents": [{
    "parts": [{
      "text": "Create a SHORT, DATA-FOCUSED tagline for a sports infographic.\\n\\nTOPIC: {{ $json.selectedTopic?.headline }}\\nSCORE: {{ $json.extractedStats?.score || 'N/A' }}\\nPOSSESSION: {{ $json.extractedStats?.possession?.home || '?' }}% - {{ $json.extractedStats?.possession?.away || '?' }}%\\nSHOTS: {{ $json.extractedStats?.shots?.home || '?' }} - {{ $json.extractedStats?.shots?.away || '?' }}\\nTRANSFER FEE: {{ $json.extractedStats?.transferFee || 'N/A' }}\\nLEAGUE POSITION: {{ $json.extractedStats?.leaguePosition || 'N/A' }}\\nPOINTS: {{ $json.extractedStats?.points || 'N/A' }}\\nSOURCES: {{ $json.sourceCount }} sources analyzed\\n\\nCreate a tagline that:\\n1. Is 3-6 words maximum\\n2. MUST include the most important number/stat\\n3. Is punchy and impactful\\n4. Works as a headline overlay\\n\\nExamples with data:\\n- Score available: '2-1 Victory!'\\n- Transfer: '€85M Move Confirmed'\\n- League: 'Top of the Table'\\n- Stats: '67% Possession Dominance'\\n\\nReturn ONLY JSON: { \\"tagline\\": \\"your tagline here\\" }"
    }]
  }]
}`;
  console.log('Updated Generate Tagline with multi-stat focus');
}

// Update Parse Tagline to pass through all data
const parseTaglineNode = workflow.nodes.find(n => n.name === 'Parse Tagline');
if (parseTaglineNode) {
  parseTaglineNode.parameters.jsCode = `const input = $input.first().json;
const prevData = $("Build Image Request").first().json;

const text = input?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
const cleaned = text.replace(/^\`\`\`[a-zA-Z]*\\n?/, "").replace(/\\n?\`\`\`\\s*$/, "");

try {
  const taglineData = JSON.parse(cleaned);
  return [{
    json: {
      tagline: taglineData.tagline || "Match Report",
      imagePrompt: prevData.imagePrompt,
      infographicElements: prevData.infographicElements,
      postContent: prevData.postContent,
      selectedTopic: prevData.selectedTopic,
      extractedStats: prevData.extractedStats || {},
      comprehensiveSummary: prevData.comprehensiveSummary,
      keyFacts: prevData.keyFacts,
      sourceUrls: prevData.sourceUrls,
      sourceCount: prevData.sourceCount,
      sourceLink: prevData.sourceLink,
      geminiApiKey: prevData.geminiApiKey,
      callbackUrl: prevData.callbackUrl
    }
  }];
} catch (e) {
  // Generate fallback tagline from stats
  let fallbackTagline = "Match Report";
  if (prevData.extractedStats?.score) {
    fallbackTagline = prevData.extractedStats.score + " Final";
  } else if (prevData.extractedStats?.transferFee) {
    fallbackTagline = prevData.extractedStats.transferFee + " Deal";
  } else if (prevData.extractedStats?.leaguePosition) {
    fallbackTagline = "#" + prevData.extractedStats.leaguePosition + " Ranking";
  }
  
  return [{
    json: {
      tagline: fallbackTagline,
      imagePrompt: prevData.imagePrompt,
      infographicElements: prevData.infographicElements,
      postContent: prevData.postContent,
      selectedTopic: prevData.selectedTopic,
      extractedStats: prevData.extractedStats || {},
      comprehensiveSummary: prevData.comprehensiveSummary,
      keyFacts: prevData.keyFacts,
      sourceUrls: prevData.sourceUrls,
      sourceCount: prevData.sourceCount,
      sourceLink: prevData.sourceLink,
      geminiApiKey: prevData.geminiApiKey,
      callbackUrl: prevData.callbackUrl,
      parseError: e.message
    }
  }];
}`;
  console.log('Updated Parse Tagline to pass all data through');
}

// Update Parse Imagen Response to include all data
const parseImagenNode = workflow.nodes.find(n => n.name === 'Parse Imagen Response');
if (parseImagenNode) {
  parseImagenNode.parameters.jsCode = `const input = $input.first().json;
const prevData = $("Parse Tagline").first().json;

const parts = input?.candidates?.[0]?.content?.parts || [];
const imagePart = parts.find(p => p.inlineData?.mimeType?.startsWith("image/"));

if (imagePart && imagePart.inlineData?.data) {
  const mimeType = imagePart.inlineData.mimeType;
  const base64Data = imagePart.inlineData.data;
  const imageDataUri = "data:" + mimeType + ";base64," + base64Data;

  return [{
    json: {
      imageDataUri: imageDataUri,
      imagePrompt: prevData.imagePrompt,
      tagline: prevData.tagline,
      infographicElements: prevData.infographicElements,
      postContent: prevData.postContent,
      selectedTopic: prevData.selectedTopic,
      extractedStats: prevData.extractedStats || {},
      comprehensiveSummary: prevData.comprehensiveSummary,
      keyFacts: prevData.keyFacts,
      sourceUrls: prevData.sourceUrls,
      sourceCount: prevData.sourceCount,
      sourceLink: prevData.sourceLink,
      geminiApiKey: prevData.geminiApiKey,
      callbackUrl: prevData.callbackUrl
    }
  }];
} else {
  return [{
    json: {
      imageDataUri: null,
      imagePrompt: prevData.imagePrompt,
      tagline: prevData.tagline,
      infographicElements: prevData.infographicElements,
      postContent: prevData.postContent,
      selectedTopic: prevData.selectedTopic,
      extractedStats: prevData.extractedStats || {},
      comprehensiveSummary: prevData.comprehensiveSummary,
      keyFacts: prevData.keyFacts,
      sourceUrls: prevData.sourceUrls,
      sourceCount: prevData.sourceCount,
      sourceLink: prevData.sourceLink,
      geminiApiKey: prevData.geminiApiKey,
      callbackUrl: prevData.callbackUrl,
      imagenError: "No image data in response"
    }
  }];
}`;
  console.log('Updated Parse Imagen Response with full data chain');
}

// Update Parse Brand Response
const parseBrandNode = workflow.nodes.find(n => n.name === 'Parse Brand Response');
if (parseBrandNode) {
  parseBrandNode.parameters.jsCode = `const input = $input.first().json;
const prevData = $("Parse Imagen Response").first().json;

const parts = input?.candidates?.[0]?.content?.parts || [];
const imagePart = parts.find(p => p.inlineData?.mimeType?.startsWith("image/"));

let brandedImageBase64 = null;
if (imagePart && imagePart.inlineData?.data) {
  brandedImageBase64 = imagePart.inlineData.data;
}

return [{
  json: {
    success: !!brandedImageBase64,
    brandedImageBase64: brandedImageBase64,
    imageDataUri: prevData.imageDataUri,
    imagePrompt: prevData.imagePrompt,
    tagline: prevData.tagline,
    infographicElements: prevData.infographicElements,
    postContent: prevData.postContent,
    selectedTopic: prevData.selectedTopic,
    extractedStats: prevData.extractedStats || {},
    comprehensiveSummary: prevData.comprehensiveSummary,
    keyFacts: prevData.keyFacts,
    sourceUrls: prevData.sourceUrls,
    sourceCount: prevData.sourceCount,
    sourceLink: prevData.sourceLink,
    geminiApiKey: prevData.geminiApiKey,
    callbackUrl: prevData.callbackUrl
  }
}];`;
  console.log('Updated Parse Brand Response with full data chain');
}

// Update Build Final Output to include comprehensive data
const buildFinalNode = workflow.nodes.find(n => n.name === 'Build Final Output');
if (buildFinalNode) {
  buildFinalNode.parameters.jsCode = `const brandingResult = $input.first().json;

const postContent = brandingResult.postContent || "Football news update!";
const imagePrompt = brandingResult.imagePrompt || "European football celebration";
const sourceLink = brandingResult.sourceLink || "";
const extractedStats = brandingResult.extractedStats || {};
const selectedTopic = brandingResult.selectedTopic || {};
const sourceUrls = brandingResult.sourceUrls || [];
const comprehensiveSummary = brandingResult.comprehensiveSummary || "";
const keyFacts = brandingResult.keyFacts || [];
const infographicElements = brandingResult.infographicElements || [];

let imageDataUri = brandingResult.imageDataUri || null;
if (brandingResult.success && brandingResult.brandedImageBase64) {
  imageDataUri = "data:image/png;base64," + brandingResult.brandedImageBase64;
}

// Build source citations for transparency post
const citations = sourceUrls.map((s, i) => "[" + (i + 1) + "] " + s.url).join("\\n");

let transparencyPost = "I've developed this AI-driven system to efficiently curate European football news, serving as a professional 'proof of work' for AI integration. Grounded in transparency and the human-in-the-loop principle, this project demonstrates how AI can enhance specialized content. Follow for updates, or visit my bio to learn how to build similar systems.\\n\\nBilko Bibitkov Human-Centric AI Curation\\n\\n" + brandingResult.sourceCount + " sources analyzed for this report.";

if (citations) {
  transparencyPost += "\\n\\nSources:\\n" + citations;
}

const output = {
  success: true,
  selectedTopic: {
    headline: selectedTopic.headline || "",
    sourceHeadline: selectedTopic.sourceHeadline || selectedTopic.headline || "",
    sourceHeadlineHash: selectedTopic.sourceHeadlineHash || "",
    teams: selectedTopic.teams || [],
    event: selectedTopic.event || "",
    dataRichness: extractedStats.dataConfidence || selectedTopic.dataRichness || 0,
    brandValue: selectedTopic.brandValue || 0,
    extractedStats: extractedStats,
    enhancedTagline: brandingResult.tagline || ""
  },
  data: {
    postContent: postContent,
    comprehensiveSummary: comprehensiveSummary,
    keyFacts: keyFacts,
    imagePrompt: imagePrompt,
    imageUrl: imageDataUri,
    tagline: brandingResult.tagline || "",
    infographicElements: infographicElements,
    transparencyPost: transparencyPost,
    sourceLink: sourceLink,
    sourceUrls: sourceUrls,
    sourceCount: brandingResult.sourceCount || 1,
    contentFiltered: !imageDataUri
  }
};

return [{ json: output }];`;
  console.log('Updated Build Final Output with comprehensive data');
}

fs.writeFileSync(workflowPath, JSON.stringify(workflow, null, 2));
console.log('Infographic multi-stat updates complete!');
console.log('Next: Run push-to-n8n.cjs to deploy to n8n');

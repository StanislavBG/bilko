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
fs.writeFileSync(path.join(backupDir, `efd_pre_wallpaper_${timestamp}.json`), JSON.stringify(workflow, null, 2));

console.log('Refining Build Image Request for wallpaper aesthetic...');

// Find and update Build Image Request node
const buildImageNode = workflow.nodes.find(n => n.name === 'Build Image Request');
if (buildImageNode) {
  buildImageNode.parameters.jsCode = `const prevData = $input.first().json;
const selectedTopic = prevData.selectedTopic || {};
const extractedStats = prevData.extractedStats || {};
const keyFacts = prevData.keyFacts || [];
const sourceCount = prevData.sourceCount || 1;
const teams = selectedTopic.teams || [];

// WALLPAPER-FIRST DESIGN: Prioritize cinematic scene with minimal overlays
// Select only 2-3 MOST IMPACTFUL stats (not all of them)
const statPriority = [];

// Priority 1: Score (most important for match results)
if (extractedStats.score) {
  statPriority.push({
    type: 'score',
    value: extractedStats.score,
    display: extractedStats.score
  });
}

// Priority 2: Transfer fee (for transfer news)
if (extractedStats.transferFee && !extractedStats.score) {
  statPriority.push({
    type: 'transfer',
    value: extractedStats.transferFee,
    display: extractedStats.transferFee
  });
}

// Priority 3: League position (for standings news)
if (extractedStats.leaguePosition && statPriority.length < 2) {
  const ordinal = extractedStats.leaguePosition + (['st','nd','rd'][((extractedStats.leaguePosition+90)%100-10)%10-1]||'th');
  statPriority.push({
    type: 'position',
    value: extractedStats.leaguePosition,
    display: ordinal + ' Place'
  });
}

// Priority 4: Possession (visual stat for match)
if (extractedStats.possession?.home && statPriority.length < 2) {
  statPriority.push({
    type: 'possession',
    value: extractedStats.possession.home,
    display: extractedStats.possession.home + '% Possession'
  });
}

// Priority 5: Points (if league standings)
if (extractedStats.points && statPriority.length < 2) {
  statPriority.push({
    type: 'points',
    value: extractedStats.points,
    display: extractedStats.points + ' pts'
  });
}

// Limit to MAX 2 overlay elements for clean aesthetic
const selectedStats = statPriority.slice(0, 2);

// Build team color context
const teamColors = teams.length >= 2 
  ? 'colors inspired by ' + teams[0] + ' and ' + teams[1]
  : teams.length === 1 
    ? 'colors inspired by ' + teams[0]
    : 'deep blue and gold accents';

// Determine scene type based on news category
let sceneType = 'epic stadium atmosphere at golden hour';
if (extractedStats.transferFee) {
  sceneType = 'dramatic press conference lighting with stadium silhouette in background';
} else if (extractedStats.leaguePosition) {
  sceneType = 'trophy room with championship memorabilia, dramatic spotlight';
} else if (extractedStats.score) {
  sceneType = 'packed stadium celebrating, flares and confetti, wide cinematic angle';
}

// WALLPAPER-FIRST prompt structure
let fullPrompt = 'Create a CINEMATIC DESKTOP WALLPAPER image (16:9 aspect ratio). ';
fullPrompt += 'Primary focus: ' + sceneType + '. ';
fullPrompt += 'Style: High-end sports broadcast quality, dramatic lighting, ' + teamColors + '. ';
fullPrompt += 'Composition: 70% atmospheric scene, 30% clean negative space for optional text overlay. ';
fullPrompt += 'Aesthetic: Premium, immersive, like a movie poster or AAA game cover. ';

// Add MINIMAL stat overlays (2 max)
if (selectedStats.length > 0) {
  const overlays = selectedStats.map(s => {
    if (s.type === 'score') {
      return 'SCORE: "' + s.display + '" - large, elegant typography in lower third';
    } else if (s.type === 'transfer') {
      return 'FEE BADGE: "' + s.display + '" - gold accent, corner placement';
    } else if (s.type === 'position') {
      return 'RANK: "' + s.display + '" - subtle, integrated into scene';
    } else if (s.type === 'possession') {
      return 'STAT: "' + s.display + '" - thin bar graphic, bottom edge';
    } else if (s.type === 'points') {
      return 'POINTS: "' + s.display + '" - small badge, corner';
    }
    return '';
  }).filter(Boolean);
  
  fullPrompt += 'Minimal overlays: ' + overlays.join('. ') + '. ';
} else {
  fullPrompt += 'No text overlays - pure atmospheric image. ';
}

fullPrompt += 'CRITICAL: NO faces, NO real people, NO player likenesses. Focus on atmosphere, stadium, crowd energy, abstract team elements. ';
fullPrompt += 'Quality: 4K desktop wallpaper, sharp details, professional color grading.';

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
    selectedStats: selectedStats,
    sceneType: sceneType,
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
  console.log('Updated Build Image Request with wallpaper-first aesthetic');
}

// Add Callback after Comprehensive Summary
const callbackSummaryNode = {
  parameters: {
    method: "POST",
    url: "https://bilkobibitkov.replit.app/api/workflows/callback",
    sendBody: true,
    specifyBody: "json",
    jsonBody: `={
  "workflowId": "european-football-daily",
  "step": "comprehensive-summary",
  "stepIndex": 5,
  "traceId": "{{ $('Webhook').first().json.body.traceId || 'trace_' + $execution.id }}",
  "output": {
    "summary": {{ JSON.stringify($json.comprehensiveSummary || "") }},
    "stats": {{ JSON.stringify($json.extractedStats || {}) }},
    "teams": {{ JSON.stringify($json.teams || []) }},
    "competition": {{ JSON.stringify($json.competition || "") }},
    "keyFacts": {{ JSON.stringify($json.keyFacts || []) }},
    "sourceCount": {{ $json.sourceCount || 0 }},
    "dataConfidence": {{ JSON.stringify($json.dataConfidence || "low") }}
  },
  "executionId": "{{ $execution.id }}"
}`,
    options: {}
  },
  name: "Callback Summary",
  type: "n8n-nodes-base.httpRequest",
  typeVersion: 4,
  position: [4000, -300],
  id: "callback-summary-001",
  continueOnFail: true
};

// Add Callback after Generate Tagline  
const callbackTaglineNode = {
  parameters: {
    method: "POST",
    url: "https://bilkobibitkov.replit.app/api/workflows/callback",
    sendBody: true,
    specifyBody: "json",
    jsonBody: `={
  "workflowId": "european-football-daily",
  "step": "tagline-generated",
  "stepIndex": 7,
  "traceId": "{{ $('Webhook').first().json.body.traceId || 'trace_' + $execution.id }}",
  "output": {
    "tagline": {{ JSON.stringify($json.tagline || "") }},
    "imagePrompt": {{ JSON.stringify($json.imagePrompt || "").substring(0, 500) }},
    "selectedStats": {{ JSON.stringify($json.selectedStats || []) }},
    "sceneType": {{ JSON.stringify($json.sceneType || "") }}
  },
  "executionId": "{{ $execution.id }}"
}`,
    options: {}
  },
  name: "Callback Tagline",
  type: "n8n-nodes-base.httpRequest",
  typeVersion: 4,
  position: [2950, 250],
  id: "callback-tagline-001",
  continueOnFail: true
};

// Check if nodes already exist
const existingSummaryCallback = workflow.nodes.find(n => n.name === 'Callback Summary');
const existingTaglineCallback = workflow.nodes.find(n => n.name === 'Callback Tagline');

if (!existingSummaryCallback) {
  workflow.nodes.push(callbackSummaryNode);
  console.log('Added Callback Summary node');
}

if (!existingTaglineCallback) {
  workflow.nodes.push(callbackTaglineNode);
  console.log('Added Callback Tagline node');
}

// Add connections for callbacks
// Parse Summary should connect to both Hashtag Researcher AND Callback Summary
if (workflow.connections["Parse Summary"]) {
  // Keep existing connection to Hashtag Researcher
  const existingConn = workflow.connections["Parse Summary"].main[0];
  
  // Add parallel connection to Callback Summary
  if (!existingConn.find(c => c.node === "Callback Summary")) {
    existingConn.push({ node: "Callback Summary", type: "main", index: 0 });
    console.log('Connected Parse Summary -> Callback Summary (parallel)');
  }
}

// Parse Tagline should connect to both Call Imagen API AND Callback Tagline
if (workflow.connections["Parse Tagline"]) {
  const existingConn = workflow.connections["Parse Tagline"].main[0];
  
  if (!existingConn.find(c => c.node === "Callback Tagline")) {
    existingConn.push({ node: "Callback Tagline", type: "main", index: 0 });
    console.log('Connected Parse Tagline -> Callback Tagline (parallel)');
  }
}

fs.writeFileSync(workflowPath, JSON.stringify(workflow, null, 2));
console.log('Wallpaper aesthetic refinement and callbacks added!');
console.log('Next: Run push-to-n8n.cjs to deploy');

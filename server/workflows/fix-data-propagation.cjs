const fs = require('fs');
const path = require('path');

const backupPath = path.join(__dirname, 'backups/oV6WGX5uBeTZ9tRa_PROD.json');
const workflow = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));

// Fix 1: Update "Parse Post" to reference "Parse Statistics" instead of "Aggregate Compliant Topics"
const parsePostIndex = workflow.nodes.findIndex(n => n.name === "Parse Post");
if (parsePostIndex >= 0) {
  workflow.nodes[parsePostIndex].parameters.jsCode = `const input = $input.first().json;
const prevData = $("Parse Statistics").first().json;
const hashtagData = $("Parse Hashtags").first().json;

// Get Gemini response
const text = input?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
const cleaned = text.replace(/^\`\`\`[a-zA-Z]*\\n?/, "").replace(/\\n?\`\`\`\\s*$/, "");

try {
  const post = JSON.parse(cleaned);
  return [{
    json: {
      postContent: post.postContent,
      sentiment: post.sentiment || "positive",
      safeImagePrompt: prevData.selectedTopic.safeImagePrompt,
      anonymizedDescriptions: prevData.selectedTopic.anonymizedDescriptions || hashtagData.anonymizedDescriptions || {},
      selectedTopic: prevData.selectedTopic,
      extractedStats: prevData.selectedTopic.extractedStats || {},
      sourceLink: prevData.selectedTopic?.sourceLink || "",
      geminiApiKey: prevData.geminiApiKey,
      callbackUrl: prevData.callbackUrl
    }
  }];
} catch (e) {
  return [{
    json: {
      postContent: "Football news update! Exciting developments in European football today.",
      sentiment: "positive",
      safeImagePrompt: prevData.selectedTopic?.safeImagePrompt || "Exciting football stadium scene with cheering fans",
      anonymizedDescriptions: prevData.selectedTopic?.anonymizedDescriptions || {},
      selectedTopic: prevData.selectedTopic,
      extractedStats: prevData.selectedTopic?.extractedStats || {},
      sourceLink: prevData.selectedTopic?.sourceLink || "",
      geminiApiKey: prevData.geminiApiKey,
      callbackUrl: prevData.callbackUrl,
      parseError: e.message
    }
  }];
}`;
  console.log("Fixed Parse Post to reference Parse Statistics");
}

// Fix 2: Update "Build Image Request" to use extracted stats for infographic-style prompts
const buildImageIndex = workflow.nodes.findIndex(n => n.name === "Build Image Request");
if (buildImageIndex >= 0) {
  workflow.nodes[buildImageIndex].parameters.jsCode = `// Build the Gemini API request body for image prompt generation
const item = $input.first().json;
const safeImagePrompt = item.safeImagePrompt || '';
const anonymizedDescriptions = item.anonymizedDescriptions || {};
const extractedStats = item.extractedStats || {};
const geminiApiKey = item.geminiApiKey;

// Build stats string for infographic elements
let statsElements = [];
if (extractedStats.score) statsElements.push("Score overlay: " + extractedStats.score);
if (extractedStats.possession?.home) statsElements.push("Possession bar: " + extractedStats.possession.home + "% vs " + extractedStats.possession.away + "%");
if (extractedStats.transferFee) statsElements.push("Transfer fee badge: " + extractedStats.transferFee);
if (extractedStats.leaguePosition) statsElements.push("League position: #" + extractedStats.leaguePosition);
if (extractedStats.points) statsElements.push("Points total: " + extractedStats.points);

const infographicElements = statsElements.length > 0 
  ? "Include these INFOGRAPHIC ELEMENTS as styled overlays: " + statsElements.join(", ") + "." 
  : "";

const prompt = \`Create an INFOGRAPHIC-STYLE image prompt for European football content.
Base concept: \${safeImagePrompt}
People descriptions: \${JSON.stringify(anonymizedDescriptions)}

\${infographicElements}

Style requirements:
- Modern sports broadcast aesthetic
- Clean data visualization overlays (score boxes, stat bars)
- Professional sports graphics with team colors
- Dynamic composition with space for text overlays
- NO real person faces or recognizable individuals

Return ONLY valid JSON with: imagePrompt (detailed infographic-style prompt), style (photorealistic)\`;

return {
  json: {
    ...item,
    requestBody: {
      contents: [{
        parts: [{ text: prompt }]
      }]
    }
  }
};
`;
  console.log("Fixed Build Image Request with infographic-style prompts");
}

// Fix 3: Update "Parse Image Prompt" to pass extractedStats forward
const parseImagePromptIndex = workflow.nodes.findIndex(n => n.name === "Parse Image Prompt");
if (parseImagePromptIndex >= 0) {
  workflow.nodes[parseImagePromptIndex].parameters.jsCode = `const input = $input.first().json;
const prevData = $("Parse Post").first().json;

// Get Gemini response
const text = input?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
const cleaned = text.replace(/^\`\`\`[a-zA-Z]*\\n?/, "").replace(/\\n?\`\`\`\\s*$/, "");

try {
  const imageData = JSON.parse(cleaned);
  return [{
    json: {
      imagePrompt: imageData.imagePrompt,
      style: imageData.style || "photorealistic",
      postContent: prevData.postContent,
      selectedTopic: prevData.selectedTopic,
      extractedStats: prevData.extractedStats || {},
      sourceLink: prevData.sourceLink || "",
      geminiApiKey: prevData.geminiApiKey,
      callbackUrl: prevData.callbackUrl
    }
  }];
} catch (e) {
  return [{
    json: {
      imagePrompt: "Exciting football celebration scene in a modern stadium",
      style: "photorealistic",
      postContent: prevData.postContent,
      selectedTopic: prevData.selectedTopic,
      extractedStats: prevData.extractedStats || {},
      sourceLink: prevData.sourceLink || "",
      geminiApiKey: prevData.geminiApiKey,
      callbackUrl: prevData.callbackUrl,
      parseError: e.message
    }
  }];
}`;
  console.log("Fixed Parse Image Prompt to pass extractedStats forward");
}

// Fix 4: Update Parse Tagline to include extractedStats
const parseTaglineIndex = workflow.nodes.findIndex(n => n.name === "Parse Tagline");
if (parseTaglineIndex >= 0) {
  workflow.nodes[parseTaglineIndex].parameters.jsCode = `const input = $input.first().json;
const prevData = $("Parse Image Prompt").first().json;

// Get Gemini response
const text = input?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
const cleaned = text.replace(/^\`\`\`[a-zA-Z]*\\n?/, "").replace(/\\n?\`\`\`\\s*$/, "");

try {
  const taglineData = JSON.parse(cleaned);
  return [{
    json: {
      tagline: taglineData.tagline || "Game On!",
      imagePrompt: prevData.imagePrompt,
      style: prevData.style,
      postContent: prevData.postContent,
      selectedTopic: prevData.selectedTopic,
      extractedStats: prevData.extractedStats || {},
      sourceLink: prevData.sourceLink || "",
      geminiApiKey: prevData.geminiApiKey,
      callbackUrl: prevData.callbackUrl
    }
  }];
} catch (e) {
  return [{
    json: {
      tagline: "Game On!",
      imagePrompt: prevData.imagePrompt,
      style: prevData.style,
      postContent: prevData.postContent,
      selectedTopic: prevData.selectedTopic,
      extractedStats: prevData.extractedStats || {},
      sourceLink: prevData.sourceLink || "",
      geminiApiKey: prevData.geminiApiKey,
      callbackUrl: prevData.callbackUrl,
      parseError: e.message
    }
  }];
}`;
  console.log("Fixed Parse Tagline to include extractedStats");
}

// Fix 5: Update Build Final Output to include extractedStats
const buildFinalIndex = workflow.nodes.findIndex(n => n.name === "Build Final Output");
if (buildFinalIndex >= 0) {
  const currentCode = workflow.nodes[buildFinalIndex].parameters.jsCode;
  // Update to include extractedStats in the output
  workflow.nodes[buildFinalIndex].parameters.jsCode = `const brandingResult = $input.first().json;
const prevData = $("Parse Imagen Response").first().json;
const aggregateData = $("Parse Statistics").first().json;

const postContent = prevData.postContent || "Football news update!";
const imagePrompt = prevData.imagePrompt || "European football celebration";
const sourceLink = prevData.sourceLink || "";
const extractedStats = prevData.extractedStats || aggregateData.selectedTopic?.extractedStats || {};

// Get the selected topic from Parse Statistics (includes extractedStats)
const selectedTopic = aggregateData.selectedTopic || {};

// Use branded image if available, otherwise fallback to original
let imageDataUri = prevData.imageDataUri || null;
if (brandingResult.success && brandingResult.brandedImageBase64) {
  imageDataUri = "data:image/png;base64," + brandingResult.brandedImageBase64;
}

// Create transparency/disclosure post
let transparencyPost = "I've developed this AI-driven system to efficiently curate European football news, serving as a professional 'proof of work' for AI integration. Grounded in transparency and the human-in-the-loop principle, this project demonstrates how AI can enhance specialized content. Follow for updates, or visit my bio to learn how to build similar systems.\\n\\nBilko Bibitkov Human-Centric AI Curation";

if (sourceLink) {
  transparencyPost += "\\n\\nSource: " + sourceLink;
}

const output = {
  success: true,
  selectedTopic: {
    headline: selectedTopic.headline || "",
    sourceHeadline: selectedTopic.sourceHeadline || selectedTopic.headline || "",
    sourceHeadlineHash: selectedTopic.sourceHeadlineHash || "",
    teams: selectedTopic.teams || [],
    event: selectedTopic.event || "",
    dataRichness: extractedStats.dataRichness || selectedTopic.dataRichness || 0,
    brandValue: selectedTopic.brandValue || 0,
    extractedStats: extractedStats,
    enhancedTagline: selectedTopic.enhancedTagline || ""
  },
  data: {
    postContent: postContent,
    imagePrompt: imagePrompt,
    imageUrl: imageDataUri,
    transparencyPost: transparencyPost,
    sourceLink: sourceLink,
    contentFiltered: !imageDataUri,
    extractedStats: extractedStats
  }
};

return [{ json: output }];`;
  console.log("Fixed Build Final Output to include extractedStats");
}

fs.writeFileSync(backupPath, JSON.stringify(workflow, null, 2));
console.log("\\nAll data propagation fixes applied. Backup saved.");

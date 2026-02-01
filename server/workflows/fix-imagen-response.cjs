const fs = require('fs');
const path = require('path');

const backupPath = path.join(__dirname, 'backups/oV6WGX5uBeTZ9tRa_PROD.json');
const workflow = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));

// Fix Parse Imagen Response to pass through extractedStats and selectedTopic
const parseImagenIndex = workflow.nodes.findIndex(n => n.name === "Parse Imagen Response");
if (parseImagenIndex >= 0) {
  workflow.nodes[parseImagenIndex].parameters.jsCode = `const input = $input.first().json;
const prevData = $("Parse Tagline").first().json;

// Get image from Nano Banana Pro response format
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
      postContent: prevData.postContent,
      selectedTopic: prevData.selectedTopic,
      extractedStats: prevData.extractedStats || {},
      sourceLink: prevData.sourceLink || "",
      geminiApiKey: prevData.geminiApiKey,
      callbackUrl: prevData.callbackUrl
    }
  }];
} else {
  // Fallback when image generation fails
  return [{
    json: {
      imageDataUri: null,
      imagePrompt: prevData.imagePrompt,
      tagline: prevData.tagline,
      postContent: prevData.postContent,
      selectedTopic: prevData.selectedTopic,
      extractedStats: prevData.extractedStats || {},
      sourceLink: prevData.sourceLink || "",
      geminiApiKey: prevData.geminiApiKey,
      callbackUrl: prevData.callbackUrl,
      imagenError: "No image data in response"
    }
  }];
}`;
  console.log("Fixed Parse Imagen Response to pass through extractedStats and selectedTopic");
}

// Also fix Parse Brand Response to pass through extractedStats
const parseBrandIndex = workflow.nodes.findIndex(n => n.name === "Parse Brand Response");
if (parseBrandIndex >= 0) {
  workflow.nodes[parseBrandIndex].parameters.jsCode = `const brandingResponse = $input.first().json;
const prevData = $("Parse Imagen Response").first().json;

// Pass through branding response with original data including extractedStats
return [{
  json: {
    // Branding response fields
    success: brandingResponse.success === true,
    brandedImageBase64: brandingResponse.brandedImageBase64 || null,
    
    // Original data from Parse Imagen Response
    imageDataUri: prevData.imageDataUri,
    imagePrompt: prevData.imagePrompt,
    tagline: prevData.tagline,
    postContent: prevData.postContent,
    selectedTopic: prevData.selectedTopic,
    extractedStats: prevData.extractedStats || {},
    sourceLink: prevData.sourceLink || "",
    geminiApiKey: prevData.geminiApiKey,
    callbackUrl: prevData.callbackUrl
  }
}];`;
  console.log("Fixed Parse Brand Response to pass through extractedStats");
}

// Update Build Final Output to use the data from the chain directly
const buildFinalIndex = workflow.nodes.findIndex(n => n.name === "Build Final Output");
if (buildFinalIndex >= 0) {
  workflow.nodes[buildFinalIndex].parameters.jsCode = `const brandingResult = $input.first().json;
// Now use data from Parse Brand Response which has the full chain data
const postContent = brandingResult.postContent || "Football news update!";
const imagePrompt = brandingResult.imagePrompt || "European football celebration";
const sourceLink = brandingResult.sourceLink || "";
const extractedStats = brandingResult.extractedStats || {};
const selectedTopic = brandingResult.selectedTopic || {};

// Use branded image if available, otherwise fallback to original
let imageDataUri = brandingResult.imageDataUri || null;
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
    tagline: brandingResult.tagline || "",
    transparencyPost: transparencyPost,
    sourceLink: sourceLink,
    contentFiltered: !imageDataUri,
    extractedStats: extractedStats
  }
};

return [{ json: output }];`;
  console.log("Updated Build Final Output to use in-chain data directly");
}

fs.writeFileSync(backupPath, JSON.stringify(workflow, null, 2));
console.log("\\nAll imagen response fixes applied. Backup saved.");

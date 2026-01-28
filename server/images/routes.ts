import type { Express } from "express";
import sharp from "sharp";

export function registerImageRoutes(app: Express): void {
  app.post("/api/images/brand", async (req, res) => {
    try {
      const { imageBase64, text = "Bilko AI Academy", position = "bottom" } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ error: "imageBase64 is required" });
      }

      const imageBuffer = Buffer.from(imageBase64, "base64");
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();
      
      const width = metadata.width || 1024;
      const height = metadata.height || 1024;
      const barHeight = 36;
      const fontSize = 16;

      const svgOverlay = `
        <svg width="${width}" height="${barHeight}">
          <rect x="0" y="0" width="${width}" height="${barHeight}" fill="black"/>
          <text 
            x="${width / 2}" 
            y="${barHeight / 2 + fontSize / 3}" 
            font-family="Arial, sans-serif" 
            font-size="${fontSize}" 
            font-weight="bold"
            fill="white" 
            text-anchor="middle"
          >${text}</text>
        </svg>
      `;

      const brandedImage = await sharp(imageBuffer)
        .extend({
          bottom: barHeight,
          background: { r: 0, g: 0, b: 0, alpha: 1 }
        })
        .composite([{
          input: Buffer.from(svgOverlay),
          top: height,
          left: 0
        }])
        .png()
        .toBuffer();

      const brandedBase64 = brandedImage.toString("base64");

      res.json({
        success: true,
        brandedImageBase64: brandedBase64,
        originalWidth: width,
        originalHeight: height,
        brandedHeight: height + barHeight
      });

    } catch (error: any) {
      console.error("[images/brand] Error:", error.message);
      res.status(500).json({ 
        error: "Failed to brand image", 
        details: error.message 
      });
    }
  });
}

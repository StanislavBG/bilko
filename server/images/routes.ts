import type { Express } from "express";
import sharp from "sharp";

export function registerImageRoutes(app: Express): void {
  app.post("/api/images/brand", async (req, res) => {
    try {
      const { imageBase64, text = "Bilko Bibitkov AI Academy", position = "bottom-right" } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ error: "imageBase64 is required", success: false });
      }

      if (typeof imageBase64 !== "string" || imageBase64.length < 100) {
        return res.status(400).json({ 
          error: "imageBase64 must be a valid base64-encoded image", 
          success: false 
        });
      }

      let imageBuffer: Buffer;
      try {
        imageBuffer = Buffer.from(imageBase64, "base64");
      } catch (e) {
        return res.status(400).json({ 
          error: "Invalid base64 encoding", 
          success: false 
        });
      }
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
            x="${width - 12}" 
            y="${barHeight / 2 + fontSize / 3}" 
            font-family="Arial, sans-serif" 
            font-size="${fontSize}" 
            font-weight="bold"
            fill="white" 
            text-anchor="end"
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
        success: false,
        error: "Failed to brand image", 
        details: error.message 
      });
    }
  });
}

import type { Express } from "express";
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { createLogger } from "../logger";

const log = createLogger("uploads");

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads", "bilkos-way");

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const ALLOWED_TYPES: Record<string, string[]> = {
  video: ["video/mp4"],
  infographic: ["image/png", "image/jpeg", "image/webp"],
  pdf: ["application/pdf"],
};

const EXTENSIONS: Record<string, string> = {
  "video/mp4": ".mp4",
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};

const MAX_SIZES: Record<string, number> = {
  video: 100 * 1024 * 1024, // 100MB
  infographic: 10 * 1024 * 1024, // 10MB
  pdf: 25 * 1024 * 1024, // 25MB
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const topicId = req.params.topicId;
    const mediaType = req.params.mediaType;
    const ext = EXTENSIONS[file.mimetype] || path.extname(file.originalname);
    // Format: topicId--mediaType.ext (e.g. the-development-environment--video.mp4)
    cb(null, `${topicId}--${mediaType}${ext}`);
  },
});

function createUpload(mediaType: string) {
  return multer({
    storage,
    limits: { fileSize: MAX_SIZES[mediaType] || 25 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = ALLOWED_TYPES[mediaType];
      if (allowed && allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Invalid file type. Expected: ${allowed?.join(", ")}`));
      }
    },
  });
}

export interface TopicMedia {
  topicId: string;
  mediaType: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
}

function getMediaForTopic(topicId: string): TopicMedia[] {
  const media: TopicMedia[] = [];
  if (!fs.existsSync(UPLOADS_DIR)) return media;

  const files = fs.readdirSync(UPLOADS_DIR);
  for (const filename of files) {
    if (!filename.startsWith(`${topicId}--`)) continue;
    const filePath = path.join(UPLOADS_DIR, filename);
    const stat = fs.statSync(filePath);

    // Parse: topicId--mediaType.ext
    const withoutTopic = filename.slice(topicId.length + 2);
    const dotIdx = withoutTopic.lastIndexOf(".");
    const mediaType = dotIdx >= 0 ? withoutTopic.slice(0, dotIdx) : withoutTopic;
    const ext = dotIdx >= 0 ? withoutTopic.slice(dotIdx) : "";

    const mimeMap: Record<string, string> = {
      ".mp4": "video/mp4",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".webp": "image/webp",
      ".pdf": "application/pdf",
    };

    media.push({
      topicId,
      mediaType,
      filename,
      originalName: filename,
      mimeType: mimeMap[ext] || "application/octet-stream",
      size: stat.size,
      url: `/api/uploads/bilkos-way/${filename}`,
    });
  }
  return media;
}

export function registerUploadRoutes(app: Express): void {
  // Serve uploaded files statically
  app.use(
    "/api/uploads/bilkos-way",
    (req, res, next) => {
      // Set appropriate content-type headers
      const filePath = path.join(UPLOADS_DIR, path.basename(req.path));
      if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath).toLowerCase();
        const mimeMap: Record<string, string> = {
          ".mp4": "video/mp4",
          ".png": "image/png",
          ".jpg": "image/jpeg",
          ".webp": "image/webp",
          ".pdf": "application/pdf",
        };
        if (mimeMap[ext]) {
          res.setHeader("Content-Type", mimeMap[ext]);
        }
      }
      next();
    },
    express.static(UPLOADS_DIR)
  );

  // Upload a file for a topic
  app.post(
    "/api/uploads/bilkos-way/:topicId/:mediaType",
    (req, res, next) => {
      const { mediaType } = req.params;
      if (!ALLOWED_TYPES[mediaType]) {
        return res.status(400).json({
          error: `Invalid media type: ${mediaType}. Must be one of: ${Object.keys(ALLOWED_TYPES).join(", ")}`,
        });
      }
      const upload = createUpload(mediaType);
      upload.single("file")(req, res, (err: any) => {
        if (err) {
          log.error("Upload error", { message: err.message });
          return res.status(400).json({ error: err.message });
        }
        next();
      });
    },
    (req, res) => {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No file provided" });
      }

      const { topicId, mediaType } = req.params;
      log.info(`Uploaded ${mediaType} for topic ${topicId}: ${file.filename}`);

      res.json({
        success: true,
        media: {
          topicId,
          mediaType,
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          url: `/api/uploads/bilkos-way/${file.filename}`,
        },
      });
    }
  );

  // Get all media for a topic
  app.get("/api/uploads/bilkos-way/topic/:topicId", (req, res) => {
    const { topicId } = req.params;
    const media = getMediaForTopic(topicId);
    res.json({ media });
  });

  // Get all media for all topics
  app.get("/api/uploads/bilkos-way/all", (_req, res) => {
    if (!fs.existsSync(UPLOADS_DIR)) {
      return res.json({ media: {} });
    }
    const files = fs.readdirSync(UPLOADS_DIR);
    const mediaByTopic: Record<string, TopicMedia[]> = {};

    for (const filename of files) {
      const dashDashIdx = filename.indexOf("--");
      if (dashDashIdx < 0) continue;
      const topicId = filename.slice(0, dashDashIdx);
      if (!mediaByTopic[topicId]) {
        mediaByTopic[topicId] = [];
      }
      const filePath = path.join(UPLOADS_DIR, filename);
      const stat = fs.statSync(filePath);
      const withoutTopic = filename.slice(topicId.length + 2);
      const dotIdx = withoutTopic.lastIndexOf(".");
      const mediaType = dotIdx >= 0 ? withoutTopic.slice(0, dotIdx) : withoutTopic;
      const ext = dotIdx >= 0 ? withoutTopic.slice(dotIdx) : "";
      const mimeMap: Record<string, string> = {
        ".mp4": "video/mp4",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".webp": "image/webp",
        ".pdf": "application/pdf",
      };
      mediaByTopic[topicId].push({
        topicId,
        mediaType,
        filename,
        originalName: filename,
        mimeType: mimeMap[ext] || "application/octet-stream",
        size: stat.size,
        url: `/api/uploads/bilkos-way/${filename}`,
      });
    }

    res.json({ media: mediaByTopic });
  });

  // Delete media for a topic
  app.delete("/api/uploads/bilkos-way/:topicId/:mediaType", (req, res) => {
    const { topicId, mediaType } = req.params;
    const media = getMediaForTopic(topicId);
    const target = media.find((m) => m.mediaType === mediaType);
    if (!target) {
      return res.status(404).json({ error: "Media not found" });
    }
    const filePath = path.join(UPLOADS_DIR, target.filename);
    fs.unlinkSync(filePath);
    log.info(`Deleted ${mediaType} for topic ${topicId}`);
    res.json({ success: true });
  });
}

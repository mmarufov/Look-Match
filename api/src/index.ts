// /Users/mac/lookmatch/api/src/index.ts
import express, { Request, Response } from "express";
import cors from "cors";
import multer from "multer";
import { ImageAnnotatorClient } from "@google-cloud/vision";
import fs from "node:fs";
import path from "node:path";

// Resolve credentials: use env var if set, otherwise try ./google-credentials.json in project root
const keyPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.join(process.cwd(), "google-credentials.json");

const hasKeyFile = fs.existsSync(keyPath);
const visionClient = hasKeyFile
  ? new ImageAnnotatorClient({ keyFilename: keyPath })
  : new ImageAnnotatorClient();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "10mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    service: "lookmatch-api",
    creds: hasKeyFile ? "file" : process.env.GOOGLE_APPLICATION_CREDENTIALS ? "env" : "none",
  });
});
// Analyze endpoint: expects multipart/form-data with field name "image"
app.post(
  "/analyze",
  upload.single("image"),
  async (req: Request & { file?: Express.Multer.File }, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ ok: false, error: "No image uploaded" });
      }

      // Label detection
      const [labelResult] = await visionClient.labelDetection({
        image: { content: req.file.buffer },
      });

      const labels =
        (labelResult.labelAnnotations || [])
          .map((l) => ({ description: l.description, score: l.score }))
          .filter((l) => !!l.description)
          .slice(0, 8);

      // Web detection (best guess tags)
      const [webResult] = await visionClient.webDetection({
        image: { content: req.file.buffer },
      });
      const webTags =
        (webResult.webDetection?.bestGuessLabels || []).map((x) => x.label) || [];

      res.json({ ok: true, labels, webTags });
    } catch (err: any) {
      console.error("Vision error:", err);
      res.status(500).json({ ok: false, error: err.message || "Vision error" });
    }
  }
);

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
  if (!hasKeyFile && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.warn(
      "⚠️  No Google credentials found. Set GOOGLE_APPLICATION_CREDENTIALS or place google-credentials.json in the API root."
    );
  }
});

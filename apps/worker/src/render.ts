import path from "path";
import { fileURLToPath } from "url";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import type { ProductCard, ReelScript } from "@reels-factory/shared";
import { VIDEO_CONFIG } from "@reels-factory/video-templates";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getS3Client() {
  const endpoint = process.env.S3_ENDPOINT;
  return new S3Client({
    region: process.env.S3_REGION ?? "us-east-1",
    endpoint,
    forcePathStyle: Boolean(endpoint),
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY ?? "minioadmin",
      secretAccessKey: process.env.S3_SECRET_KEY ?? "minioadmin",
    },
  });
}

async function renderMockPlaceholder(jobId: string): Promise<string> {
  const bucket = process.env.S3_BUCKET ?? "reels-factory";
  const key = `videos/${jobId}.txt`;
  const body = Buffer.from(
    "Reels Factory placeholder — enable Remotion render in production worker."
  );
  const s3 = getS3Client();
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: "text/plain",
    })
  );
  const publicUrl = process.env.S3_PUBLIC_URL;
  if (publicUrl) return `${publicUrl.replace(/\/$/, "")}/${key}`;
  return `${process.env.S3_ENDPOINT ?? "http://localhost:9000"}/${bucket}/${key}`;
}

export async function renderReelToS3(
  jobId: string,
  product: ProductCard,
  script: ReelScript
): Promise<string> {
  if (process.env.MOCK_RENDER === "true") {
    return renderMockPlaceholder(jobId);
  }
  const entry = path.resolve(
    __dirname,
    "../../../packages/video-templates/src/Root.tsx"
  );
  const outDir = path.resolve(__dirname, "../../.render-output");
  fs.mkdirSync(outDir, { recursive: true });
  const outputPath = path.join(outDir, `${jobId}.mp4`);

  const bundleLocation = await bundle({
    entryPoint: entry,
    webpackOverride: (config) => config,
  });

  const inputProps = { product, script };
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: VIDEO_CONFIG.compositionId,
    inputProps,
  });

  try {
    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: "h264",
      outputLocation: outputPath,
      inputProps,
    });
  } catch (err) {
    console.warn("[render] Remotion failed, using mock:", err);
    return renderMockPlaceholder(jobId);
  }

  const bucket = process.env.S3_BUCKET ?? "reels-factory";
  const key = `videos/${jobId}.mp4`;
  const body = fs.readFileSync(outputPath);

  const s3 = getS3Client();
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: "video/mp4",
    })
  );

  const publicUrl = process.env.S3_PUBLIC_URL;
  if (publicUrl) {
    return `${publicUrl.replace(/\/$/, "")}/${key}`;
  }
  const endpoint = process.env.S3_ENDPOINT ?? "http://localhost:9000";
  return `${endpoint}/${bucket}/${key}`;
}

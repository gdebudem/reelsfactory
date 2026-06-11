import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { fetchImageBuffer, PLACEHOLDER_IMAGE_URL } from "@reels-factory/scene-images/fetch-image";
import {
  extractSceneStorageKey,
  isBrokenSceneImageUrl,
} from "@reels-factory/scene-images/scene-url";

export function hasWebStorageConfigured(): boolean {
  return Boolean(
    process.env.S3_BUCKET?.trim() &&
      process.env.S3_ACCESS_KEY?.trim() &&
      process.env.S3_SECRET_KEY?.trim()
  );
}

function getS3Client(): S3Client {
  const endpoint = process.env.S3_ENDPOINT?.trim();
  return new S3Client({
    region: process.env.S3_REGION?.trim() || "auto",
    endpoint: endpoint || undefined,
    forcePathStyle: Boolean(endpoint),
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY!,
      secretAccessKey: process.env.S3_SECRET_KEY!,
    },
  });
}

function extractKeyFromPublicUrl(imageUrl: string): string | null {
  const publicBase = process.env.S3_PUBLIC_URL?.replace(/\/$/, "");
  if (publicBase && imageUrl.startsWith(`${publicBase}/`)) {
    return decodeURIComponent(imageUrl.slice(publicBase.length + 1));
  }

  const bucket = process.env.S3_BUCKET?.trim();
  const endpoint = process.env.S3_ENDPOINT?.replace(/\/$/, "");
  if (bucket && endpoint) {
    const prefix = `${endpoint}/${bucket}/`;
    if (imageUrl.startsWith(prefix)) {
      return decodeURIComponent(imageUrl.slice(prefix.length));
    }
  }

  return extractSceneStorageKey(imageUrl);
}

async function getObjectFromStorage(key: string): Promise<{
  buffer: Buffer;
  contentType: string;
}> {
  const s3 = getS3Client();
  const res = await s3.send(
    new GetObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key,
    })
  );
  if (!res.Body) throw new Error("Empty S3 object");
  const buffer = Buffer.from(await res.Body.transformToByteArray());
  const contentType = res.ContentType?.split(";")[0]?.trim() ?? "image/png";
  return { buffer, contentType };
}

export async function resolveSceneImageBytes(imageUrl: string): Promise<{
  buffer: Buffer;
  contentType: string;
}> {
  if (isBrokenSceneImageUrl(imageUrl) && !imageUrl.startsWith("data:")) {
    const key = extractKeyFromPublicUrl(imageUrl);
    if (key && hasWebStorageConfigured()) {
      return getObjectFromStorage(key);
    }
  }

  try {
    return await fetchImageBuffer(imageUrl);
  } catch (httpErr) {
    const key = extractKeyFromPublicUrl(imageUrl);
    if (key && hasWebStorageConfigured()) {
      return getObjectFromStorage(key);
    }
    throw httpErr;
  }
}

export async function resolveSceneImagePlaceholder(): Promise<{
  buffer: Buffer;
  contentType: string;
}> {
  return fetchImageBuffer(PLACEHOLDER_IMAGE_URL);
}

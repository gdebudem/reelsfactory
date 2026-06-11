import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export function hasStorageConfigured() {
  return Boolean(
    process.env.S3_BUCKET?.trim() &&
      process.env.S3_ACCESS_KEY?.trim() &&
      process.env.S3_SECRET_KEY?.trim()
  );
}

export function getS3Client() {
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

export function buildPublicObjectUrl(key: string) {
  const publicUrl = process.env.S3_PUBLIC_URL?.replace(/\/$/, "");
  if (publicUrl) return `${publicUrl}/${key}`;
  const bucket = process.env.S3_BUCKET!;
  const endpoint = process.env.S3_ENDPOINT?.replace(/\/$/, "");
  if (endpoint) {
    console.warn(
      "[storage] S3_PUBLIC_URL not set — image URLs may not load in browser. See R2_SETUP.md"
    );
    return `${endpoint}/${bucket}/${key}`;
  }
  const region = process.env.S3_REGION || "us-east-1";
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

export async function uploadToStorage(
  key: string,
  body: Buffer,
  contentType: string
) {
  const s3 = getS3Client();
  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return buildPublicObjectUrl(key);
}

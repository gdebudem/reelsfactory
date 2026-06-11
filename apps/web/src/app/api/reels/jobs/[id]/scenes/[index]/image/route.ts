import { sceneImageSchema } from "@reels-factory/shared";
import { prisma } from "@/lib/prisma";
import {
  resolveSceneImageBytes,
  resolveSceneImagePlaceholder,
} from "@/lib/scene-image-storage";

export const dynamic = "force-dynamic";

function parseSceneIndex(raw: string): number | null {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0 || n > 3) return null;
  return n;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; index: string }> }
) {
  const { id, index: indexRaw } = await params;
  const sceneIndex = parseSceneIndex(indexRaw);
  if (sceneIndex === null) {
    return new Response("Invalid scene index", { status: 400 });
  }

  const job = await prisma.reelJob.findUnique({
    where: { id },
    select: { sceneImagesJson: true },
  });
  if (!job?.sceneImagesJson) {
    return new Response("Not found", { status: 404 });
  }

  const scenes = job.sceneImagesJson as unknown[];
  const raw = scenes.find(
    (s) =>
      typeof s === "object" &&
      s !== null &&
      (s as { sceneIndex?: number }).sceneIndex === sceneIndex
  );
  const parsed = sceneImageSchema.safeParse(raw);
  if (!parsed.success) {
    return new Response("Scene not found", { status: 404 });
  }

  const { imageUrl } = parsed.data;

  try {
    const { buffer, contentType } = await resolveSceneImageBytes(imageUrl);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fetch failed";
    console.warn(
      `[scene-image] proxy failed job=${id} scene=${sceneIndex} url=${imageUrl.slice(0, 80)}:`,
      message
    );
    try {
      const placeholder = await resolveSceneImagePlaceholder();
      return new Response(new Uint8Array(placeholder.buffer), {
        headers: {
          "Content-Type": placeholder.contentType,
          "Cache-Control": "public, max-age=300",
        },
      });
    } catch {
      return new Response(message, { status: 502 });
    }
  }
}

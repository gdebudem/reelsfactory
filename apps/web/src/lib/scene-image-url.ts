import type { SceneImage } from "@reels-factory/shared";

/** R2 / our storage — browser can load directly. */
export function isPublicSceneStorageUrl(url: string): boolean {
  if (url.startsWith("data:")) return true;
  return (
    /\.r2\.dev\//i.test(url) ||
    /\/scene-images\//i.test(url) ||
    url.includes("placehold.co")
  );
}

export function getSceneImageDisplayUrl(
  jobId: string,
  scene: SceneImage
): string {
  if (isPublicSceneStorageUrl(scene.imageUrl)) {
    return scene.imageUrl;
  }
  return `/api/reels/jobs/${jobId}/scenes/${scene.sceneIndex}/image`;
}

export function getSceneImageProxyUrl(
  jobId: string,
  sceneIndex: number
): string {
  return `/api/reels/jobs/${jobId}/scenes/${sceneIndex}/image`;
}

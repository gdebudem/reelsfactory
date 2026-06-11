import type { SceneImage } from "@reels-factory/shared";

export function getSceneImageProxyUrl(
  jobId: string,
  sceneIndex: number
): string {
  return `/api/reels/jobs/${jobId}/scenes/${sceneIndex}/image`;
}

/** Always serve via API — handles R2 private URLs, hotlink blocks, data URLs. */
export function getSceneImageDisplayUrl(
  jobId: string,
  scene: SceneImage
): string {
  return getSceneImageProxyUrl(jobId, scene.sceneIndex);
}

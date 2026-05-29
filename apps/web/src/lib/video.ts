const DEMO_VIDEO_HOSTS = ["samplelib.com", "sample-videos.com"];

export function isDemoVideoUrl(url: string | null | undefined) {
  if (!url) return false;
  try {
    const host = new URL(url).hostname;
    return DEMO_VIDEO_HOSTS.some((h) => host.includes(h));
  } catch {
    return false;
  }
}

const KEY = "reels-last-job-id";

export function setLastJobId(jobId: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(KEY, jobId);
  } catch {
    /* ignore */
  }
}

export function getLastJobId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function resolveJobIdFromRoute(
  pathname: string,
  searchParams: URLSearchParams
): string | null {
  const resultMatch = pathname.match(/^\/create\/result\/([^/]+)/);
  if (resultMatch?.[1]) return resultMatch[1];
  return searchParams.get("job");
}

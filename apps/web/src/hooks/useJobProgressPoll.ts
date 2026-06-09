"use client";

import { useEffect, useRef, useState } from "react";
import type {
  PipelineProgress,
  ProductCard,
  ProductIntel,
  ReelScript,
  SceneImage,
} from "@reels-factory/shared";
import { isPreviewReadyStatus } from "@reels-factory/shared";

export type PolledJob = {
  id: string;
  status: string;
  productUrl: string;
  videoUrl: string | null;
  errorMessage: string | null;
  productJson: ProductCard;
  productIntelJson: ProductIntel | null;
  scriptJson: ReelScript | null;
  sceneImagesJson: SceneImage[] | null;
  progressJson: PipelineProgress | null;
};

const POLL_MS_ACTIVE = 1500;
const POLL_MS_IDLE = 3000;

const ACTIVE_STATUSES = new Set([
  "paid",
  "queued",
  "researching",
  "scripting",
  "generating_images",
  "image_generating",
  "render_queued",
  "rendering",
]);

function pollInterval(status: string): number {
  return ACTIVE_STATUSES.has(status) ? POLL_MS_ACTIVE : POLL_MS_IDLE;
}

function shouldKeepPolling(
  status: string,
  renderStarted: boolean
): boolean {
  if (status === "ready" || status === "failed") return false;
  if (isPreviewReadyStatus(status) && !renderStarted) return false;
  return true;
}

type Options = {
  enabled?: boolean;
  renderStarted?: boolean;
};

export function useJobProgressPoll(
  jobId: string | null | undefined,
  options: Options = {}
) {
  const { enabled = true, renderStarted = false } = options;
  const [job, setJob] = useState<PolledJob | null>(null);
  const [loading, setLoading] = useState(Boolean(jobId && enabled));
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!jobId || !enabled) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    async function poll() {
      try {
        const res = await fetch(`/api/reels/jobs/${jobId}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!active) return;

        if (data.job) {
          setJob(data.job);
          setLoading(false);
        }

        const status = (data.job?.status as string) ?? "";
        if (!shouldKeepPolling(status, renderStarted)) return;

        pollTimerRef.current = setTimeout(poll, pollInterval(status));
      } catch {
        if (!active) return;
        pollTimerRef.current = setTimeout(poll, POLL_MS_IDLE);
      }
    }

    poll();

    return () => {
      active = false;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [jobId, enabled, renderStarted]);

  return { job, loading };
}

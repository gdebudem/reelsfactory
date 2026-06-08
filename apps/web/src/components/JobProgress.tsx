"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GeneratedScenesPanel } from "./GeneratedScenesPanel";
import { PipelineLog } from "./PipelineLog";
import { isDemoVideoUrl } from "@/lib/video";
import {
  getActivePipelineLogMessage,
  isPreviewReadyStatus,
  type PipelineProgress,
  type ProductCard,
  type SceneImage,
} from "@reels-factory/shared";

type Job = {
  id: string;
  status: string;
  videoUrl: string | null;
  errorMessage: string | null;
  productJson: ProductCard;
  sceneImagesJson: SceneImage[] | null;
  progressJson: PipelineProgress | null;
};

const STORYBOARD_TRIGGER = new Set(["paid", "failed", "draft"]);
const STORYBOARD_IN_PROGRESS = new Set([
  "paid",
  "queued",
  "researching",
  "scripting",
  "generating_images",
  "image_generating",
]);
const RENDER_IN_PROGRESS = new Set(["render_queued", "rendering"]);
const POLL_MS_ACTIVE = 1500;
const POLL_MS_IDLE = 3000;

function shouldKeepPolling(status: string, renderStarted: boolean): boolean {
  if (status === "ready" || status === "failed") return false;
  if (isPreviewReadyStatus(status) && !renderStarted) return false;
  return true;
}

function pollInterval(status: string): number {
  if (
    STORYBOARD_IN_PROGRESS.has(status) ||
    RENDER_IN_PROGRESS.has(status)
  ) {
    return POLL_MS_ACTIVE;
  }
  return POLL_MS_IDLE;
}

export function JobProgress({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [approving, setApproving] = useState(false);
  const [renderStarted, setRenderStarted] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const storyboardRequested = useRef(false);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;

    async function poll() {
      try {
        const res = await fetch(`/api/reels/jobs/${jobId}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!active) return;

        if (data.job) {
          setJob(data.job);
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
  }, [jobId, renderStarted]);

  useEffect(() => {
    if (storyboardRequested.current) return;

    async function triggerStoryboard() {
      const statusRes = await fetch(`/api/reels/jobs/${jobId}`, {
        cache: "no-store",
      });
      const statusData = await statusRes.json();
      const status = statusData.job?.status as string | undefined;
      if (!status || !STORYBOARD_TRIGGER.has(status)) return;

      storyboardRequested.current = true;
      await fetch(`/api/reels/jobs/${jobId}/storyboard`, { method: "POST" });

      const refresh = await fetch(`/api/reels/jobs/${jobId}`, {
        cache: "no-store",
      });
      const refreshData = await refresh.json();
      if (refreshData.job) setJob(refreshData.job);
    }

    void triggerStoryboard();
  }, [jobId]);

  async function approveAndRender() {
    setApproving(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/reels/jobs/${jobId}/approve`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Не удалось запустить рендер");
      }
      setRenderStarted(true);
      setJob((prev) =>
        prev ? { ...prev, status: "render_queued" } : prev
      );
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setApproving(false);
    }
  }

  const product = job?.productJson;
  const productLabel = product?.title?.trim();

  const logPanel = (
    <PipelineLog
      productLabel={productLabel}
      entries={job?.progressJson?.logs ?? []}
      activeMessage={
        job
          ? getActivePipelineLogMessage(job.progressJson, job.status)
          : null
      }
    />
  );

  if (!job) {
    return (
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="py-20 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          <p className="mt-4 text-slate-600">Загрузка…</p>
        </div>
        <PipelineLog productLabel={undefined} entries={[]} />
      </div>
    );
  }

  if (job.status === "failed") {
    return (
      <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
        <div className="space-y-4">
          <p className="text-lg font-semibold text-red-800">Ошибка</p>
          <p className="text-sm text-red-600">{job.errorMessage}</p>
          <button
            type="button"
            onClick={() => router.push("/create")}
            className="text-indigo-600 underline"
          >
            Попробовать снова
          </button>
        </div>
        {logPanel}
      </div>
    );
  }

  if (isPreviewReadyStatus(job.status)) {
    const hasAiImages = (job.sceneImagesJson?.length ?? 0) >= 4;

    return (
      <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {hasAiImages ? "Картинки готовы" : "Раскадровка готова"}
            </h2>
            <p className="mt-2 text-slate-600">
              Проверьте результат и подтвердите создание видео
            </p>
          </div>

          {hasAiImages && job.sceneImagesJson ? (
            <GeneratedScenesPanel scenes={job.sceneImagesJson} />
          ) : null}

          {actionError && (
            <p className="text-sm text-red-600">{actionError}</p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={approving}
              onClick={approveAndRender}
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-3 font-medium text-white disabled:opacity-50"
            >
              {approving ? "Запуск…" : "Подтвердить и создать видео"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/create")}
              className="rounded-xl border border-slate-200 px-6 py-3 text-slate-700"
            >
              Изменить настройки
            </button>
          </div>
        </div>
        {logPanel}
      </div>
    );
  }

  if (job.status === "ready") {
    const demoVideo = isDemoVideoUrl(job.videoUrl);

    return (
      <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-green-700">Готово!</h2>
          {demoVideo ? (
            <p className="text-sm text-amber-800">
              Видео — демо-заглушка. Настройте S3/R2 для реального MP4.
            </p>
          ) : null}
          {job.videoUrl && !demoVideo && (
            <>
              <video
                src={job.videoUrl}
                controls
                className="w-full max-w-md rounded-2xl shadow-lg"
              />
              <a
                href={job.videoUrl}
                download
                className="inline-block rounded-xl bg-indigo-600 px-6 py-3 font-medium text-white"
              >
                Скачать MP4
              </a>
            </>
          )}
          <button
            type="button"
            onClick={() => router.push("/create")}
            className="text-indigo-600 underline"
          >
            Создать ещё
          </button>
        </div>
        {logPanel}
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
      <div className="space-y-4 py-6 lg:py-0">
        <h2 className="text-2xl font-bold text-slate-900">Готовим ваш ролик…</h2>
        <p className="text-slate-600">
          Следите за прогрессом в логе справа
        </p>
        {(job.sceneImagesJson?.length ?? 0) >= 4 ? (
          <GeneratedScenesPanel scenes={job.sceneImagesJson!} />
        ) : null}
      </div>
      {logPanel}
    </div>
  );
}

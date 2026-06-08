"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PhonePreview } from "./PhonePreview";
import { ScriptPanel } from "./ScriptPanel";
import { GeneratedScenesPanel } from "./GeneratedScenesPanel";
import { StoryboardPanel } from "./StoryboardPanel";
import { IntelPanel, jobStatusLabel } from "./IntelPanel";
import { PipelineChecklist } from "./PipelineChecklist";
import { isDemoVideoUrl } from "@/lib/video";
import {
  isPreviewReadyStatus,
  type PipelineProgress,
  type ProductCard,
  type ProductIntel,
  type ReelScript,
  type SceneImage,
} from "@reels-factory/shared";

type Job = {
  id: string;
  status: string;
  videoUrl: string | null;
  errorMessage: string | null;
  productJson: ProductCard;
  productIntelJson: ProductIntel | null;
  scriptJson: ReelScript | null;
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
  const script = job?.scriptJson;
  const intel = job?.productIntelJson;

  if (!job) {
    return (
      <div className="py-20 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        <p className="mt-4 text-slate-600">Загрузка…</p>
      </div>
    );
  }

  if (job.status === "failed") {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="font-semibold text-red-800">Ошибка</p>
          <p className="mt-2 text-sm text-red-600">{job.errorMessage}</p>
          <button
            type="button"
            onClick={() => router.push("/create")}
            className="mt-4 text-indigo-600 underline"
          >
            Попробовать снова
          </button>
        </div>
        <PipelineChecklist
          progress={job.progressJson}
          jobStatus={job.status}
        />
      </div>
    );
  }

  if (isPreviewReadyStatus(job.status)) {
    if (!script || !product) {
      return (
        <div className="py-12 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          <p className="mt-4 text-slate-600">Завершаем раскадровку…</p>
        </div>
      );
    }

    const hasAiImages = (job.sceneImagesJson?.length ?? 0) >= 4;

    return (
      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-violet-900">
              {hasAiImages
                ? "Картинки готовы — проверьте сцены"
                : "Раскадровка готова — проверьте сценарий"}
            </h2>
            <p className="mt-2 text-slate-600">
              {hasAiImages
                ? "Ниже 4 сгенерированные картинки. Видео соберём только после подтверждения."
                : "Ниже 4 сцены с текстом. Видео начнёт генерироваться только после подтверждения."}
            </p>
          </div>

          <PipelineChecklist
            progress={job.progressJson}
            jobStatus={job.status}
            compact
          />

          {hasAiImages && job.sceneImagesJson ? (
            <GeneratedScenesPanel scenes={job.sceneImagesJson} />
          ) : (
            <StoryboardPanel product={product} script={script} />
          )}
          {intel && <IntelPanel intel={intel} />}
          <ScriptPanel script={script} />

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
        <div className="flex flex-col items-center gap-3 lg:items-end">
          <p className="text-center text-sm font-medium text-slate-600 lg:text-right">
            Превью
          </p>
          <PhonePreview product={product} script={script} />
        </div>
      </div>
    );
  }

  if (job.status === "ready") {
    const demoVideo = isDemoVideoUrl(job.videoUrl);

    return (
      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-green-700">
              {demoVideo ? "Сценарий готов!" : "Готово!"}
            </h2>
            {demoVideo ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-medium">Видео в плеере — демо-заглушка</p>
                <p className="mt-1">
                  Реальный MP4 с вашим товаром появится после настройки
                  хранилища (S3/R2) и рендера на worker.
                </p>
              </div>
            ) : (
              <p className="mt-2 text-slate-600">
                Скачайте ролик и публикуйте в соцсетях
              </p>
            )}
            {job.videoUrl && !demoVideo && (
              <>
                <video
                  src={job.videoUrl}
                  controls
                  className="mt-6 w-full max-w-md rounded-2xl shadow-lg"
                />
                <a
                  href={job.videoUrl}
                  download
                  className="mt-4 inline-block rounded-xl bg-indigo-600 px-6 py-3 font-medium text-white"
                >
                  Скачать MP4
                </a>
              </>
            )}
            <button
              type="button"
              onClick={() => router.push("/create")}
              className="mt-4 text-indigo-600 underline"
            >
              Создать ещё
            </button>
          </div>

          <PipelineChecklist
            progress={job.progressJson}
            jobStatus={job.status}
            compact
          />

          {script && <ScriptPanel script={script} />}
          {intel && <IntelPanel intel={intel} />}
        </div>
        <div className="flex flex-col items-center gap-3 lg:items-end">
          <p className="text-center text-sm font-medium text-slate-600 lg:text-right">
            Превью вашего ролика
          </p>
          <PhonePreview product={product} script={script} />
        </div>
      </div>
    );
  }

  const isRendering = RENDER_IN_PROGRESS.has(job.status);
  const isStoryboarding = STORYBOARD_IN_PROGRESS.has(job.status);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
      <div className="space-y-6">
        <div className="py-6 lg:py-0">
          <h2 className="text-2xl font-bold">
            {isRendering ? "Создаём видео…" : "Готовим ваш ролик…"}
          </h2>
          <p className="mt-2 text-slate-600">
            {isRendering
              ? "Склеиваем картинки и музыку — обычно ~1–2 минуты"
              : "ИИ ищет товар на маркетплейсах, пишет сценарий и готовит картинки"}
          </p>
          <p className="mt-4 text-sm font-medium text-indigo-700">
            {jobStatusLabel(job.status)}
          </p>
        </div>

        <PipelineChecklist
          progress={job.progressJson}
          jobStatus={job.status}
        />

        {intel ? <IntelPanel intel={intel} /> : null}
        {(job.sceneImagesJson?.length ?? 0) >= 4 ? (
          <GeneratedScenesPanel scenes={job.sceneImagesJson!} />
        ) : null}
        {script && product ? (
          <>
            {(job.sceneImagesJson?.length ?? 0) < 4 ? (
              <StoryboardPanel product={product} script={script} />
            ) : null}
            <ScriptPanel script={script} />
          </>
        ) : null}
      </div>
      <div className="flex justify-center lg:justify-end">
        <PhonePreview product={product} script={script} />
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GeneratedScenesPanel } from "./GeneratedScenesPanel";
import { PipelineLog } from "./PipelineLog";
import { StoryboardLinks } from "./StoryboardLinks";
import { StoryboardPanel } from "./StoryboardPanel";
import { isDemoVideoUrl } from "@/lib/video";
import { useJobProgressPoll } from "@/hooks/useJobProgressPoll";
import { setLastJobId } from "@/lib/last-job-id";
import {
  getActivePipelineLogMessage,
  isPreviewReadyStatus,
  type ProductCard,
  type ProductIntel,
  type ReelScript,
} from "@reels-factory/shared";

const STORYBOARD_TRIGGER = new Set(["paid", "failed", "draft"]);

export function JobProgress({ jobId }: { jobId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [approving, setApproving] = useState(false);
  const [renderStarted, setRenderStarted] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const storyboardPollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const paidMarked = useRef(false);

  const { job, loading } = useJobProgressPoll(jobId, { renderStarted });

  useEffect(() => {
    setLastJobId(jobId);
  }, [jobId]);

  useEffect(() => {
    if (paidMarked.current) return;
    if (searchParams.get("paid") !== "1") return;
    paidMarked.current = true;
    void fetch(`/api/reels/jobs/${jobId}/mark-paid`, { method: "POST" });
  }, [jobId, searchParams]);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      if (cancelled) return;

      try {
        const statusRes = await fetch(`/api/reels/jobs/${jobId}`, {
          cache: "no-store",
        });
        const statusData = await statusRes.json();
        const status = statusData.job?.status as string | undefined;
        if (!status || cancelled) return;

        const keepPolling =
          STORYBOARD_TRIGGER.has(status) ||
          status === "researching" ||
          status === "scripting" ||
          status === "generating_images" ||
          status === "image_generating" ||
          status === "images_ready";

        if (keepPolling) {
          await fetch(`/api/reels/jobs/${jobId}/storyboard`, {
            method: "POST",
          });
        }

        if (keepPolling) {
          storyboardPollRef.current = setTimeout(tick, 20_000);
        }
      } catch {
        if (!cancelled) {
          storyboardPollRef.current = setTimeout(tick, 20_000);
        }
      }
    }

    void tick();

    return () => {
      cancelled = true;
      if (storyboardPollRef.current) clearTimeout(storyboardPollRef.current);
    };
  }, [jobId]);

  async function retryPipeline() {
    setRetrying(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/reels/jobs/${jobId}/storyboard`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Не удалось повторить генерацию");
      }
      setRenderStarted(false);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setRetrying(false);
    }
  }

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
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setApproving(false);
    }
  }

  const productLabel = job?.productJson?.title?.trim();

  const logPanel = (
    <PipelineLog
      productLabel={productLabel}
      entries={job?.progressJson?.logs ?? []}
      activeMessage={
        job
          ? getActivePipelineLogMessage(job.progressJson, job.status)
          : null
      }
      usage={job?.progressJson?.usage}
    />
  );

  if (loading && !job) {
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

  if (!job) {
    return (
      <div className="grid gap-10 lg:grid-cols-2">
        <p className="text-slate-600">Задача не найдена</p>
        {logPanel}
      </div>
    );
  }

  if (job.status === "failed" || job.status === "script_failed" || job.status === "design_qa_failed" || job.status === "images_failed") {
    const userMessage =
      job.status === "script_failed"
        ? (job.errorMessage ?? "Не удалось сгенерировать сценарий. Попробуйте снова.")
        : job.status === "design_qa_failed"
          ? (job.errorMessage ?? "Кадры не прошли проверку дизайна. Попробуйте снова.")
          : job.status === "images_failed"
            ? (job.errorMessage ?? "Не удалось сгенерировать кадры. Попробуйте снова.")
          : job.errorMessage;
    const canRetry =
      job.status === "script_failed" ||
      job.status === "design_qa_failed" ||
      job.status === "images_failed";
    return (
      <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
        <div className="space-y-4">
          <p className="text-lg font-semibold text-red-800">Ошибка</p>
          <p className="text-sm text-red-600">{userMessage}</p>
          {actionError ? (
            <p className="text-sm text-red-600">{actionError}</p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            {canRetry ? (
              <button
                type="button"
                disabled={retrying}
                onClick={retryPipeline}
                className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {retrying ? "Запуск…" : "Повторить"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => router.push("/create")}
              className="text-indigo-600 underline"
            >
              Новый ролик
            </button>
          </div>
        </div>
        {logPanel}
      </div>
    );
  }

  if (isPreviewReadyStatus(job.status)) {
    const hasAiImages = (job.sceneImagesJson?.length ?? 0) >= 4;
    const product = job.productJson as ProductCard;
    const script = job.scriptJson as ReelScript | null;
    const intel = job.productIntelJson as ProductIntel | null;

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
            <>
              <StoryboardLinks
                product={product}
                productUrl={job.productUrl}
                intel={intel}
              />
              <GeneratedScenesPanel
                jobId={jobId}
                scenes={job.sceneImagesJson}
              />
            </>
          ) : null}

          {!hasAiImages && script ? (
            <StoryboardPanel
              product={product}
              script={script}
              productUrl={job.productUrl}
              intel={intel}
            />
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
          <GeneratedScenesPanel jobId={jobId} scenes={job.sceneImagesJson!} />
        ) : null}
      </div>
      {logPanel}
    </div>
  );
}

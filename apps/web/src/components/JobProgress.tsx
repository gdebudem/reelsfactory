"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PhonePreview } from "./PhonePreview";
import { ScriptPanel } from "./ScriptPanel";
import { StoryboardPanel } from "./StoryboardPanel";
import { IntelPanel, jobStatusLabel } from "./IntelPanel";
import { isDemoVideoUrl } from "@/lib/video";
import type { ProductCard, ProductIntel, ReelScript } from "@reels-factory/shared";

type Job = {
  id: string;
  status: string;
  videoUrl: string | null;
  errorMessage: string | null;
  productJson: ProductCard;
  productIntelJson: ProductIntel | null;
  scriptJson: ReelScript | null;
};

const IN_PROGRESS = new Set([
  "queued",
  "researching",
  "scripting",
  "render_queued",
  "rendering",
]);

export function JobProgress({
  jobId,
  pipelineStarted = false,
}: {
  jobId: string;
  pipelineStarted?: boolean;
}) {
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [starting, setStarting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [renderStarted, setRenderStarted] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function poll() {
      const res = await fetch(`/api/reels/jobs/${jobId}`);
      const data = await res.json();
      if (!active) return;
      setJob(data.job);
      const status = data.job.status as string;
      if (status === "ready" || status === "failed") return;
      if (status === "storyboard_ready" && !renderStarted) return;
      setTimeout(poll, 2500);
    }

    poll();
    return () => {
      active = false;
    };
  }, [jobId, renderStarted]);

  useEffect(() => {
    if (starting || pipelineStarted) return;

    async function maybeStartStoryboard() {
      const statusRes = await fetch(`/api/reels/jobs/${jobId}`);
      const statusData = await statusRes.json();
      const status = statusData.job?.status as string | undefined;

      if (
        !status ||
        IN_PROGRESS.has(status) ||
        status === "storyboard_ready" ||
        status === "ready" ||
        status === "failed"
      ) {
        return;
      }

      if (status === "draft" || status === "paid") {
        setStarting(true);
        await fetch(`/api/reels/jobs/${jobId}/start`, { method: "POST" });
      }
    }

    void maybeStartStoryboard();
  }, [jobId, starting, pipelineStarted]);

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
    );
  }

  if (job.status === "storyboard_ready") {
    if (!script || !product) {
      return (
        <div className="py-12 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          <p className="mt-4 text-slate-600">Завершаем раскадровку…</p>
        </div>
      );
    }

    return (
      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-violet-900">
              Раскадровка готова
            </h2>
            <p className="mt-2 text-slate-600">
              Проверьте сцены и текст. Если всё устраивает — подтвердите и мы
              сгенерируем видео с надписями и музыкой.
            </p>
          </div>

          <StoryboardPanel product={product} script={script} />
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

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
      <div className="space-y-6">
        <div className="py-6 lg:py-0">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600 lg:mx-0" />
          <h2 className="mt-6 text-2xl font-bold">
            {job.status === "render_queued" || job.status === "rendering"
              ? "Создаём видео…"
              : "Готовим раскадровку…"}
          </h2>
          <p className="mt-2 text-slate-600">
            {job.status === "render_queued" || job.status === "rendering"
              ? "Обычно ~1–2 минуты"
              : "ИИ изучает товар и пишет сценарий"}
          </p>
          <p className="mt-4 text-sm font-medium text-indigo-700">
            {jobStatusLabel(job.status)}
          </p>
        </div>
        {intel ? (
          <IntelPanel intel={intel} />
        ) : job.status === "researching" || job.status === "queued" ? (
          <p className="text-sm text-slate-500">
            ИИ ищет отзывы и упоминания товара в интернете…
          </p>
        ) : null}
        {script ? (
          <>
            <StoryboardPanel product={product!} script={script} />
            <ScriptPanel script={script} />
          </>
        ) : job.status === "scripting" || job.status === "researching" ? (
          <p className="text-sm text-slate-500">Пишем сценарий по сценам…</p>
        ) : null}
      </div>
      <div className="flex justify-center lg:justify-end">
        <PhonePreview product={product} script={script} />
      </div>
    </div>
  );
}

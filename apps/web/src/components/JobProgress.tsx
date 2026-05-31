"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PhonePreview } from "./PhonePreview";
import { ScriptPanel } from "./ScriptPanel";
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

export function JobProgress({
  jobId,
  pipelineStarted = false,
}: {
  jobId: string;
  pipelineStarted?: boolean;
}) {
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [starting, setStarting] = useState(pipelineStarted);

  useEffect(() => {
    let active = true;

    async function poll() {
      const res = await fetch(`/api/reels/jobs/${jobId}`);
      const data = await res.json();
      if (!active) return;
      setJob(data.job);
      if (data.job.status === "ready" || data.job.status === "failed") return;
      setTimeout(poll, 2500);
    }

    poll();
    return () => {
      active = false;
    };
  }, [jobId]);

  useEffect(() => {
    if (starting) return;
    const run = async () => {
      setStarting(true);
      const statusRes = await fetch(`/api/reels/jobs/${jobId}`);
      const statusData = await statusRes.json();
      const status = statusData.job?.status as string | undefined;
      if (
        status === "queued" ||
        status === "researching" ||
        status === "scripting" ||
        status === "rendering" ||
        status === "ready" ||
        status === "failed"
      ) {
        return;
      }
      await fetch(`/api/reels/jobs/${jobId}/start`, { method: "POST" });
    };
    run();
  }, [jobId, starting]);

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
        <p className="font-semibold text-red-800">Ошибка рендера</p>
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
                  OpenAI уже написал ваш сценарий (слева). Реальный MP4 с вашим
                  товаром появится после настройки хранилища (S3/R2) и рендера
                  на worker.
                </p>
                <p className="mt-2 text-amber-800">
                  Смотрите превью справа — там ваш товар и новый текст.
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
          <h2 className="mt-6 text-2xl font-bold">Создаём ваш ролик…</h2>
          <p className="mt-2 text-slate-600">Обычно ~1–2 минуты</p>
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
          <ScriptPanel script={script} />
        ) : job.status === "scripting" || job.status === "researching" ? (
          <p className="text-sm text-slate-500">Готовим вирусный сценарий…</p>
        ) : (
          <p className="text-sm text-slate-500">Готовим сценарий…</p>
        )}
      </div>
      <div className="flex justify-center lg:justify-end">
        <PhonePreview product={product} script={script} />
      </div>
    </div>
  );
}

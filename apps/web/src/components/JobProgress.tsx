"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PhonePreview } from "./PhonePreview";
import type { ProductCard, ReelScript } from "@reels-factory/shared";

type Job = {
  id: string;
  status: string;
  videoUrl: string | null;
  errorMessage: string | null;
  productJson: ProductCard;
  scriptJson: ReelScript | null;
};

export function JobProgress({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [starting, setStarting] = useState(false);

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
      await fetch(`/api/reels/jobs/${jobId}/start`, { method: "POST" });
    };
    run();
  }, [jobId, starting]);

  const product = job?.productJson;
  const script = job?.scriptJson;

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

  if (job.status === "ready" && job.videoUrl) {
    return (
      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="text-2xl font-bold text-green-700">Готово!</h2>
          <p className="mt-2 text-slate-600">
            Скачайте ролик и публикуйте в соцсетях
          </p>
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
          <button
            type="button"
            onClick={() => router.push("/create")}
            className="ml-4 mt-4 text-indigo-600 underline"
          >
            Создать ещё
          </button>
        </div>
        <PhonePreview product={product} script={script} />
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <div className="py-12 text-center lg:text-left">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600 lg:mx-0" />
        <h2 className="mt-6 text-2xl font-bold">Создаём ваш ролик…</h2>
        <p className="mt-2 text-slate-600">Обычно ~2 минуты</p>
        <p className="mt-4 text-sm text-slate-500">Статус: {job.status}</p>
      </div>
      <PhonePreview product={product} script={script} />
    </div>
  );
}

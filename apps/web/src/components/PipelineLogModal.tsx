"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ProductCard } from "@reels-factory/shared";
import { getActivePipelineLogMessage } from "@reels-factory/shared";
import { useJobProgressPoll } from "@/hooks/useJobProgressPoll";
import {
  getLastJobId,
  resolveJobIdFromRoute,
  setLastJobId,
} from "@/lib/last-job-id";
import { PipelineLog } from "./PipelineLog";

type JobSummary = {
  id: string;
  status: string;
  reelType: string;
  createdAt: string;
  productJson: ProductCard;
  logCount: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
};

export function PipelineLogModal({ open, onClose }: Props) {
  const pathname = usePathname();
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [jobsError, setJobsError] = useState<string | null>(null);

  const { job, loading: loadingJob } = useJobProgressPoll(selectedJobId, {
    enabled: open && Boolean(selectedJobId),
  });

  useEffect(() => {
    if (!open) return;
    setLoadingJobs(true);
    setJobsError(null);

    fetch("/api/reels/jobs", { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? "Не удалось загрузить список роликов");
        }
        const list = (data.jobs ?? []) as JobSummary[];
        setJobs(list);

        const fromRoute = resolveJobIdFromRoute(
          pathname,
          new URLSearchParams(
            typeof window !== "undefined" ? window.location.search : ""
          )
        );
        const remembered = getLastJobId();
        const preferred =
          (fromRoute && list.some((j) => j.id === fromRoute) ? fromRoute : null) ??
          (remembered && list.some((j) => j.id === remembered)
            ? remembered
            : null) ??
          list[0]?.id ??
          null;
        setSelectedJobId(preferred);
      })
      .catch((e) => {
        setJobsError(e instanceof Error ? e.message : "Ошибка загрузки");
      })
      .finally(() => setLoadingJobs(false));
  }, [open, pathname]);

  useEffect(() => {
    if (!selectedJobId) return;
    setLastJobId(selectedJobId);
  }, [selectedJobId]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const productLabel = job?.productJson?.title?.trim();
  const selectedSummary = jobs.find((j) => j.id === selectedJobId);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4">
      <div
        className="flex h-[min(92vh,920px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        role="dialog"
        aria-labelledby="pipeline-log-title"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2
              id="pipeline-log-title"
              className="text-xl font-bold text-slate-900"
            >
              Лог пайплайна
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Все запросы и этапы · сохраняется в базе
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden md:grid-cols-[minmax(0,240px)_minmax(0,1fr)] md:grid-rows-1">
          <div className="max-h-[min(35vh,220px)] min-h-0 overflow-y-auto overscroll-contain border-b border-slate-200 md:max-h-none md:border-b-0 md:border-r">
            {loadingJobs ? (
              <p className="px-4 py-6 text-sm text-slate-500">Загрузка…</p>
            ) : jobsError ? (
              <p className="px-4 py-6 text-sm text-red-600">{jobsError}</p>
            ) : jobs.length === 0 ? (
              <div className="space-y-3 px-4 py-6 text-sm text-slate-500">
                <p>Пока нет роликов с логом.</p>
                <Link
                  href="/create"
                  onClick={onClose}
                  className="text-indigo-600 underline"
                >
                  Создать ролик
                </Link>
              </div>
            ) : (
              jobs.map((j) => {
                const title = j.productJson?.title?.trim() || "Без названия";
                const active = j.id === selectedJobId;
                return (
                  <button
                    key={j.id}
                    type="button"
                    onClick={() => setSelectedJobId(j.id)}
                    className={`block w-full border-l-4 px-4 py-3 text-left text-sm transition ${
                      active
                        ? "border-cyan-600 bg-cyan-50 text-cyan-950"
                        : "border-transparent text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="line-clamp-2 font-medium">{title}</span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {j.status} · {j.logCount} записей
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className="flex min-h-0 min-w-0 flex-col overflow-hidden p-4 md:p-6">
            {!selectedJobId ? (
              <p className="text-slate-500">Выберите ролик слева</p>
            ) : loadingJob && !job ? (
              <p className="text-slate-500">Загрузка лога…</p>
            ) : (
              <>
                <div className="min-h-0 flex-1 overflow-hidden">
                  <PipelineLog
                    embedded
                    productLabel={
                      productLabel ?? selectedSummary?.productJson?.title
                    }
                    entries={job?.progressJson?.logs ?? []}
                    activeMessage={
                      job
                        ? getActivePipelineLogMessage(
                            job.progressJson,
                            job.status
                          )
                        : null
                    }
                    usage={job?.progressJson?.usage}
                  />
                </div>
                <div className="mt-3 flex shrink-0 justify-end border-t border-slate-100 pt-3">
                  <Link
                    href={`/create/result/${selectedJobId}#log`}
                    onClick={onClose}
                    className="text-sm text-indigo-600 underline"
                  >
                    Открыть страницу ролика
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

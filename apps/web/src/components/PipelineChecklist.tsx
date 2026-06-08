"use client";

import { useEffect, useRef } from "react";
import {
  PIPELINE_STEP_IDS,
  PIPELINE_STEP_LABELS,
  resolvePipelineStepState,
  type PipelineProgress,
  type PipelineStepState,
} from "@reels-factory/shared";

type Props = {
  progress: PipelineProgress | null | undefined;
  jobStatus: string;
  compact?: boolean;
};

function formatUpdatedAt(iso: string | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function StepIcon({ state }: { state: PipelineStepState }) {
  if (state === "done") {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
        ✓
      </span>
    );
  }
  if (state === "active") {
    return (
      <span className="relative flex h-6 w-6 shrink-0 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-indigo-300 opacity-40" />
        <span className="relative h-4 w-4 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
      </span>
    );
  }
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-200 bg-slate-50" />
  );
}

export function PipelineChecklist({ progress, jobStatus, compact }: Props) {
  const listRef = useRef<HTMLUListElement>(null);
  const activeRef = useRef<HTMLLIElement>(null);

  const steps = PIPELINE_STEP_IDS.map((stepId) => ({
    stepId,
    state: resolvePipelineStepState(stepId, progress, jobStatus),
  }));

  const doneCount = steps.filter((s) => s.state === "done").length;
  const activeStep = steps.find((s) => s.state === "active");
  const updatedLabel = formatUpdatedAt(progress?.updatedAt);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeStep?.stepId, progress?.updatedAt]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
            Что делает ИИ
          </h3>
          {!compact && (
            <p className="mt-1 text-sm text-slate-500">
              Каждый шаг обновляется в реальном времени
            </p>
          )}
          {activeStep && (
            <p className="mt-2 text-sm font-medium text-indigo-700">
              Сейчас: {PIPELINE_STEP_LABELS[activeStep.stepId]}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
            {doneCount}/{PIPELINE_STEP_IDS.length}
          </span>
          {updatedLabel && (
            <span className="text-[10px] text-slate-400">
              обновлено {updatedLabel}
            </span>
          )}
        </div>
      </div>

      <ul
        ref={listRef}
        className={`mt-4 space-y-1.5 overflow-y-auto pr-1 ${
          compact ? "max-h-72" : "max-h-[28rem]"
        }`}
      >
        {steps.map(({ stepId, state }) => (
          <li
            key={stepId}
            ref={state === "active" ? activeRef : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
              state === "active"
                ? "border border-indigo-200 bg-indigo-50 font-medium text-indigo-900 shadow-sm"
                : state === "done"
                  ? "text-slate-600"
                  : "text-slate-400"
            }`}
          >
            <StepIcon state={state} />
            <span>{PIPELINE_STEP_LABELS[stepId]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

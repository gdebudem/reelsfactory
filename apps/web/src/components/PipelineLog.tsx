"use client";

import { useEffect, useRef } from "react";
import type { PipelineLogEntry, PipelineProgress } from "@reels-factory/shared";
import {
  formatPipelineCostFooter,
  formatUsd,
  summarizePipelineUsage,
} from "@reels-factory/shared";

export function formatLogTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date
    .toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
    .replace(/:/g, ".");
}

function logEntryClass(kind?: PipelineLogEntry["kind"]): string {
  switch (kind) {
    case "service":
      return "text-slate-600";
    case "request":
      return "text-cyan-800";
    case "usage":
      return "text-indigo-700";
    case "billing":
      return "text-amber-800 font-medium";
    case "error":
      return "text-red-600";
    default:
      return "text-slate-800";
  }
}

function logPrefix(kind?: PipelineLogEntry["kind"]): string {
  switch (kind) {
    case "service":
      return "[сервис] ";
    case "request":
      return "[запрос] ";
    case "usage":
      return "[токены] ";
    case "billing":
      return "[биллинг] ";
    case "error":
      return "[ошибка] ";
    default:
      return "";
  }
}

type Props = {
  productLabel?: string;
  entries: PipelineLogEntry[];
  activeMessage?: string | null;
  usage?: PipelineProgress["usage"];
};

export function PipelineLog({
  productLabel,
  entries,
  activeMessage,
  usage,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (nearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [entries.length, activeMessage]);

  const summary = summarizePipelineUsage(usage);
  const costFooter = formatPipelineCostFooter(summary);
  const hasUsage =
    summary.chatTotal > 0 ||
    summary.imageCount > 0 ||
    summary.tavilySearches > 0 ||
    summary.totalUsd > 0;

  const hasBillingAlert = entries.some((e) => e.kind === "billing");

  return (
    <div
      id="log"
      className="flex max-h-[calc(100vh-8rem)] min-h-[320px] flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:min-h-[420px] lg:max-h-[calc(100vh-6rem)]"
    >
      <h3 className="text-center text-2xl font-normal text-slate-800">лог</h3>
      <p className="mt-1 text-center text-xs text-slate-400">
        сохраняется в базе · доступен всегда
      </p>

      <p className="mt-6 text-sm text-slate-700">
        рекламируем товар :{" "}
        <span className="font-medium">{productLabel || "—"}</span>
      </p>

      {hasBillingAlert ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          В логе есть предупреждения о лимите OpenAI — пополните баланс на
          platform.openai.com → Billing
        </p>
      ) : null}

      <div
        ref={scrollRef}
        className="mt-6 flex-1 space-y-2 overflow-y-auto text-left text-sm leading-relaxed"
      >
        {entries.length === 0 && !activeMessage ? (
          <p className="text-center text-slate-400">ожидаем действия…</p>
        ) : null}

        {entries.map((entry, i) => (
          <p key={`${entry.at}-${i}`} className={logEntryClass(entry.kind)}>
            <span className="tabular-nums text-slate-500">
              {formatLogTime(entry.at)}
            </span>{" "}
            <span>
              {logPrefix(entry.kind)}
              {entry.text}
            </span>
          </p>
        ))}

        {activeMessage ? (
          <p className="text-indigo-700">
            <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-indigo-400 align-middle" />{" "}
            {activeMessage}…
          </p>
        ) : null}

        <div ref={bottomRef} />
      </div>

      {hasUsage ? (
        <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-600 space-y-1">
          <p className="font-medium text-slate-700">расход за job (оценка)</p>
          {summary.chatTotal > 0 ? (
            <p>
              OpenAI chat: {summary.chatPrompt.toLocaleString("ru-RU")} prompt +{" "}
              {summary.chatCompletion.toLocaleString("ru-RU")} completion ={" "}
              {summary.chatTotal.toLocaleString("ru-RU")} токенов ·{" "}
              {formatUsd(summary.chatUsd)}
            </p>
          ) : null}
          {summary.imageAiCount > 0 ? (
            <p>
              OpenAI images: {summary.imageAiCount} AI-запросов ·{" "}
              {formatUsd(summary.imageUsd)}
            </p>
          ) : null}
          {summary.imageCount > summary.imageAiCount ? (
            <p>
              картинки fallback: {summary.imageCount - summary.imageAiCount}{" "}
              (фото с сайта, $0)
            </p>
          ) : null}
          {summary.tavilySearches > 0 ? (
            <p>
              Tavily: {summary.tavilySearches} поисков ·{" "}
              {formatUsd(summary.tavilyUsd)}
            </p>
          ) : null}
          {summary.totalUsd > 0 ? (
            <p className="font-semibold text-indigo-800">
              Итого ≈ {formatUsd(summary.totalUsd)}
            </p>
          ) : null}
          {costFooter && summary.totalUsd === 0 && summary.chatTotal === 0 ? (
            <p>{costFooter}</p>
          ) : null}
          <p className="text-slate-400 pt-1">
            Цены приблизительные (тарифы OpenAI / Tavily)
          </p>
        </div>
      ) : null}
    </div>
  );
}

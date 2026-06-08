"use client";

import { useEffect, useRef } from "react";
import type { PipelineLogEntry } from "@reels-factory/shared";

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

type Props = {
  productLabel?: string;
  entries: PipelineLogEntry[];
  activeMessage?: string | null;
};

export function PipelineLog({ productLabel, entries, activeMessage }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [entries.length, activeMessage]);

  return (
    <div className="flex min-h-[320px] flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:min-h-[420px]">
      <h3 className="text-center text-2xl font-normal text-slate-800">лог</h3>

      <p className="mt-6 text-sm text-slate-700">
        рекламируем товар :{" "}
        <span className="font-medium">{productLabel || "—"}</span>
      </p>

      <div className="mt-8 flex-1 space-y-2 overflow-y-auto text-center text-sm leading-relaxed text-slate-800">
        {entries.length === 0 && !activeMessage ? (
          <p className="text-slate-400">ожидаем действия…</p>
        ) : null}

        {entries.map((entry, i) => (
          <p key={`${entry.at}-${i}`}>
            <span className="tabular-nums text-slate-500">
              {formatLogTime(entry.at)}
            </span>{" "}
            {entry.text}
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
    </div>
  );
}

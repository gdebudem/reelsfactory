"use client";

import type { ProductIntel } from "@reels-factory/shared";

export function IntelPanel({ intel }: { intel: ProductIntel }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
      <p className="text-sm font-semibold text-slate-800">Исследование товара</p>

      {intel.rankedSellingPoints && intel.rankedSellingPoints.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500">Ключевые выгоды</p>
          <ul className="mt-1 list-disc pl-4 text-sm text-slate-700">
            {intel.rankedSellingPoints.slice(0, 4).map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      {intel.socialProof && (
        <p className="text-sm text-emerald-700">★ {intel.socialProof}</p>
      )}

      {intel.externalSnippets && intel.externalSnippets.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500">Из сети</p>
          {intel.externalSnippets.slice(0, 2).map((s) => (
            <blockquote
              key={s.url}
              className="mt-1 border-l-2 border-indigo-300 pl-3 text-sm text-slate-600"
            >
              «{s.quote.slice(0, 120)}»
              <span className="block text-xs text-slate-400">{s.source}</span>
            </blockquote>
          ))}
        </div>
      )}

      {intel.researchSources && intel.researchSources.length > 0 && (
        <details className="text-xs text-slate-500">
          <summary className="cursor-pointer">Источники ({intel.researchSources.length})</summary>
          <ul className="mt-1 max-h-24 overflow-y-auto">
            {intel.researchSources.slice(0, 6).map((url) => (
              <li key={url} className="truncate">
                <a href={url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                  {url}
                </a>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Черновик",
  paid: "Оплачено",
  queued: "В очереди",
  researching: "ИИ изучает товар…",
  scripting: "Пишем сценарий…",
  rendering: "Создаём видео…",
  ready: "Готово",
  failed: "Ошибка",
};

export function jobStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

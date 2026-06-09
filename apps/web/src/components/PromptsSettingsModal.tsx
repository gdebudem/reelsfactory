"use client";

import { useEffect, useState } from "react";
import type { PipelinePromptId, PipelinePromptView } from "@reels-factory/shared";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function PromptsSettingsModal({ open, onClose }: Props) {
  const [prompts, setPrompts] = useState<PipelinePromptView[]>([]);
  const [selectedId, setSelectedId] = useState<PipelinePromptId | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const selected = prompts.find((p) => p.id === selectedId) ?? null;

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    fetch("/api/prompts", { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Не удалось загрузить");
        const list = data.prompts as PipelinePromptView[];
        setPrompts(list);
        const first = list[0];
        if (first) {
          setSelectedId(first.id);
          setDraft(first.content);
        }
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Ошибка загрузки");
      })
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!selected) return;
    setDraft(selected.content);
  }, [selected?.id, selected?.content]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function saveCurrent() {
    if (!selectedId) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/prompts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overrides: { [selectedId]: draft } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Не удалось сохранить");
      const list = data.prompts as PipelinePromptView[];
      setPrompts(list);
      setMessage("Сохранено");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  async function resetCurrent() {
    if (!selectedId) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/prompts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: [selectedId] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Не удалось сбросить");
      const list = data.prompts as PipelinePromptView[];
      setPrompts(list);
      const updated = list.find((p) => p.id === selectedId);
      if (updated) setDraft(updated.content);
      setMessage("Сброшено к умолчанию");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  const stages = [...new Set(prompts.map((p) => p.stage))];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Настроить промты
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Все промты пайплайна. Изменения применяются к новым роликам.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center py-20 text-slate-500">
            Загрузка…
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[280px_1fr]">
            <div className="overflow-y-auto border-b border-slate-200 md:border-b-0 md:border-r">
              {stages.map((stage) => (
                <div key={stage}>
                  <p className="sticky top-0 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {stage}
                  </p>
                  {prompts
                    .filter((p) => p.stage === stage)
                    .map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedId(p.id)}
                        className={`block w-full border-l-4 px-4 py-3 text-left text-sm transition ${
                          selectedId === p.id
                            ? "border-indigo-600 bg-indigo-50 text-indigo-900"
                            : "border-transparent text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span className="font-medium">{p.label}</span>
                        {p.isCustomized ? (
                          <span className="mt-1 block text-xs text-indigo-600">
                            изменён
                          </span>
                        ) : null}
                      </button>
                    ))}
                </div>
              ))}
            </div>

            <div className="flex min-h-0 flex-col p-6">
              {selected ? (
                <>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {selected.label}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {selected.description}
                  </p>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="mt-4 min-h-[320px] flex-1 resize-y rounded-xl border border-slate-200 px-4 py-3 font-mono text-sm leading-relaxed text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    spellCheck={false}
                  />
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={saveCurrent}
                      className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                    >
                      {saving ? "Сохранение…" : "Сохранить"}
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={resetCurrent}
                      className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm text-slate-700 disabled:opacity-50"
                    >
                      Сбросить
                    </button>
                    {message ? (
                      <span className="text-sm text-green-700">{message}</span>
                    ) : null}
                    {error ? (
                      <span className="text-sm text-red-600">{error}</span>
                    ) : null}
                  </div>
                </>
              ) : (
                <p className="text-slate-500">Выберите промт слева</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  REEL_TYPES,
  HIGHLIGHT_CHIPS,
  CTA_TYPES,
  type ProductCard,
  type WizardForm,
} from "@reels-factory/shared";
import { PhonePreview } from "./PhonePreview";

const STEPS = [
  "Какой товар рекламируем?",
  "Какой тип ролика?",
  "Что подсвечиваем?",
  "Куда ведём клиента?",
];

type Props = {
  skipPayment?: boolean;
};

export function CreateWizard({ skipPayment = false }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [productUrl, setProductUrl] = useState("");
  const [product, setProduct] = useState<ProductCard | null>(null);
  const [reelType, setReelType] = useState<WizardForm["reelType"]>("promo");
  const [highlights, setHighlights] = useState<string[]>([]);
  const [customHighlight, setCustomHighlight] = useState("");
  const [ctaType, setCtaType] = useState<WizardForm["ctaType"]>("website");
  const [ctaValue, setCtaValue] = useState("");
  const [parsedUrl, setParsedUrl] = useState<string | null>(null);

  async function parseProduct(url: string): Promise<ProductCard> {
    const res = await fetch("/api/products/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Ошибка парсинга");
    return data.product as ProductCard;
  }

  async function goNext() {
    if (step === 0) {
      const url = productUrl.trim();
      if (!url) return;

      setLoading(true);
      setError(null);
      try {
        if (!product || parsedUrl !== url) {
          const parsed = await parseProduct(url);
          setProduct(parsed);
          setParsedUrl(url);
        }
        setStep(1);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка");
      } finally {
        setLoading(false);
      }
      return;
    }

    setStep((s) => s + 1);
  }

  function toggleHighlight(chip: string) {
    setHighlights((prev) =>
      prev.includes(chip) ? prev.filter((h) => h !== chip) : [...prev, chip]
    );
  }

  async function submit() {
    if (!product) return;
    setLoading(true);
    setError(null);
    try {
      const allHighlights = [
        ...highlights,
        ...(customHighlight ? [customHighlight] : []),
      ];
      const res = await fetch("/api/pipeline/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productUrl,
          product,
          reelType,
          highlights: allHighlights.length ? allHighlights : ["качество"],
          customHighlight: customHighlight || undefined,
          ctaType,
          ctaValue: ctaValue || undefined,
          tier: "basic",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.details
          ? `${data.error}: ${data.details}`
          : (data.error ?? "Ошибка");
        throw new Error(msg);
      }

      if (data.skipPayment) {
        router.push(`/create/result/${data.jobId}`);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  function canNext() {
    if (step === 0) return Boolean(productUrl.trim());
    if (step === 1) return Boolean(reelType);
    if (step === 2)
      return highlights.length > 0 || customHighlight.trim().length > 0;
    if (step === 3) return Boolean(ctaType);
    return false;
  }

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <div>
        <div className="mb-6 flex gap-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full ${
                i <= step ? "bg-indigo-600" : "bg-slate-200"
              }`}
            />
          ))}
        </div>
        <p className="text-sm font-medium text-indigo-600">
          Шаг {step + 1} из 4
        </p>
        <h2 className="mt-2 text-2xl font-bold text-slate-900">{STEPS[step]}</h2>

        {step === 0 && (
          <div className="mt-6 space-y-4">
            <input
              type="url"
              placeholder="https://магазин.ru/product/..."
              value={productUrl}
              onChange={(e) => {
                const next = e.target.value;
                setProductUrl(next);
                if (parsedUrl && next.trim() !== parsedUrl) {
                  setProduct(null);
                  setParsedUrl(null);
                }
              }}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <p className="text-xs text-slate-500">
              Лучше работает с товарами, у которых есть отзывы в интернете
            </p>
          </div>
        )}

        {step === 1 && (
          <div className="mt-6 space-y-2">
            <label htmlFor="reel-type" className="text-sm font-medium text-slate-700">
              Тип ролика
            </label>
            <select
              id="reel-type"
              value={reelType}
              onChange={(e) =>
                setReelType(e.target.value as WizardForm["reelType"])
              }
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white bg-[length:1.25rem] bg-[right_1rem_center] bg-no-repeat px-4 py-3 pr-10 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
              }}
            >
              {REEL_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500">
              От типа зависит тон сценария и стиль AI-картинок
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="mt-6 space-y-4">
            <div className="flex flex-wrap gap-2">
              {HIGHLIGHT_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => toggleHighlight(chip)}
                  className={`rounded-full px-4 py-2 text-sm capitalize ${
                    highlights.includes(chip)
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Свой акцент…"
              value={customHighlight}
              onChange={(e) => setCustomHighlight(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3"
            />
          </div>
        )}

        {step === 3 && (
          <div className="mt-6 space-y-4">
            {CTA_TYPES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCtaType(c.id)}
                className={`block w-full rounded-xl border px-4 py-3 text-left ${
                  ctaType === c.id
                    ? "border-indigo-600 bg-indigo-50"
                    : "border-slate-200"
                }`}
              >
                {c.label}
              </button>
            ))}
            <input
              type="text"
              placeholder="Ссылка, телефон или адрес"
              value={ctaValue}
              onChange={(e) => setCtaValue(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3"
            />
          </div>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-600">{error}</p>
        )}

        <div className="mt-8 flex gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="rounded-xl border border-slate-200 px-6 py-3"
            >
              Назад
            </button>
          )}
          {step < 3 ? (
            <button
              type="button"
              disabled={!canNext() || loading}
              onClick={goNext}
              className="rounded-xl bg-indigo-600 px-6 py-3 font-medium text-white disabled:opacity-50"
            >
              {loading && step === 0 ? "Загрузка…" : "Далее"}
            </button>
          ) : (
            <button
              type="button"
              disabled={!canNext() || loading}
              onClick={submit}
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 font-medium text-white disabled:opacity-50"
            >
              {loading
                ? skipPayment
                  ? "Генерируем…"
                  : "Переход к оплате…"
                : skipPayment
                  ? "Сгенерировать"
                  : "Сгенерировать и оплатить"}
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center">
        <PhonePreview product={product ?? undefined} />
      </div>
    </div>
  );
}

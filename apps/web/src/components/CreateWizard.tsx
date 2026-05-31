"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  REEL_TYPES,
  HIGHLIGHT_CHIPS,
  CTA_TYPES,
  PRICING,
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

export function CreateWizard() {
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
  const [tier, setTier] = useState<"basic" | "premium">("basic");

  async function parseProduct() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/products/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: productUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ошибка парсинга");
      setProduct(data.product);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(false);
    }
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
          tier,
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
        router.push(`/create/result/${data.jobId}?started=1`);
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
    if (step === 0) return Boolean(product);
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
              onChange={(e) => setProductUrl(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <button
              type="button"
              onClick={parseProduct}
              disabled={loading || !productUrl}
              className="rounded-xl bg-indigo-600 px-6 py-3 font-medium text-white disabled:opacity-50"
            >
              {loading ? "Загрузка…" : "Подтянуть товар"}
            </button>
            {product && (
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
                <p className="font-semibold">{product.title}</p>
                {product.price != null && (
                  <p className="text-indigo-600 font-bold">
                    {product.price} {product.currency}
                  </p>
                )}
                {product.brand && (
                  <p className="text-sm text-slate-600">Бренд: {product.brand}</p>
                )}
                {product.specs && product.specs.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      Характеристики ({product.specs.length})
                    </p>
                    <ul className="mt-1 max-h-32 overflow-y-auto text-sm text-slate-700">
                      {product.specs.slice(0, 6).map((s) => (
                        <li key={`${s.name}-${s.value}`}>
                          {s.name}: {s.value}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {product.reviews && product.reviews.length > 0 && (
                  <p className="text-sm text-emerald-700">
                    Отзывы на странице: {product.reviews.length}
                    {product.aggregateRating &&
                      ` · ★ ${product.aggregateRating.value}`}
                  </p>
                )}
                {product.prosFromPage && product.prosFromPage.length > 0 && (
                  <p className="text-xs text-slate-500">
                    Преимущества: {product.prosFromPage.slice(0, 2).join(" · ")}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="mt-6 grid gap-2">
            {REEL_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setReelType(t.id)}
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  reelType === t.id
                    ? "border-indigo-600 bg-indigo-50 font-medium text-indigo-900"
                    : "border-slate-200 hover:border-indigo-300"
                }`}
              >
                {t.label}
              </button>
            ))}
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
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-600">Тариф</p>
              <div className="mt-2 flex gap-2">
                {(["basic", "premium"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTier(t)}
                    className={`flex-1 rounded-lg border py-2 text-sm font-medium ${
                      tier === t
                        ? "border-indigo-600 bg-indigo-50"
                        : "border-slate-200"
                    }`}
                  >
                    {PRICING[t].display}
                  </button>
                ))}
              </div>
            </div>
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
              disabled={!canNext()}
              onClick={() => setStep((s) => s + 1)}
              className="rounded-xl bg-indigo-600 px-6 py-3 font-medium text-white disabled:opacity-50"
            >
              Далее
            </button>
          ) : (
            <button
              type="button"
              disabled={!canNext() || loading}
              onClick={submit}
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 font-medium text-white disabled:opacity-50"
            >
              {loading ? "Сценарий и заказ…" : "Создать видео"}
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

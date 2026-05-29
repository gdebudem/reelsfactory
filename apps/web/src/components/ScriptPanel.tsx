import type { ReelScript } from "@reels-factory/shared";

const SCENE_STYLE_LABEL: Record<string, string> = {
  headline: "Заголовок",
  subheadline: "Подзаголовок",
  bullet: "Преимущество",
  review: "Отзыв",
  cta: "Призыв",
};

export function ScriptPanel({ script }: { script: ReelScript }) {
  return (
    <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
        Сценарий ролика
      </h3>

      <div className="mt-4 space-y-3">
        <div>
          <p className="text-xs text-slate-500">Заголовок</p>
          <p className="text-lg font-bold text-slate-900">{script.headline}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Подзаголовок</p>
          <p className="text-slate-800">{script.subheadline}</p>
        </div>
        {script.priceLabel && (
          <div>
            <p className="text-xs text-slate-500">Цена на экране</p>
            <p className="font-semibold text-amber-700">{script.priceLabel}</p>
          </div>
        )}
        {script.reviewQuote && (
          <div>
            <p className="text-xs text-slate-500">Цитата из отзыва</p>
            <p className="italic text-amber-800">{script.reviewQuote}</p>
          </div>
        )}
        {script.bullets && script.bullets.length > 0 && (
          <div>
            <p className="text-xs text-slate-500">Акценты</p>
            <ul className="mt-1 list-inside list-disc text-slate-800">
              {script.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        )}
        <div>
          <p className="text-xs text-slate-500">Кнопка в ролике</p>
          <p className="font-medium text-indigo-700">{script.ctaText}</p>
        </div>
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <p className="text-xs font-medium text-slate-500">Сцены по секундам</p>
        <ol className="mt-2 space-y-2">
          {script.scenes.map((scene, i) => (
            <li
              key={`${scene.startSec}-${i}`}
              className="rounded-lg bg-slate-50 px-3 py-2 text-sm"
            >
              <span className="font-mono text-xs text-slate-500">
                {scene.startSec}–{scene.endSec} с
              </span>
              {scene.style && (
                <span className="ml-2 text-xs text-indigo-600">
                  {SCENE_STYLE_LABEL[scene.style] ?? scene.style}
                </span>
              )}
              <p className="mt-1 text-slate-800">{scene.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

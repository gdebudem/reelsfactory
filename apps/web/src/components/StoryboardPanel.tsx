import type { ProductCard, ReelScript } from "@reels-factory/shared";

const SCENE_STYLE_LABEL: Record<string, string> = {
  hook: "Hook — зацепить",
  pain: "Боль",
  proof: "Доказательство",
  cta: "Призыв",
  headline: "Заголовок",
  subheadline: "Подзаголовок",
  bullet: "Преимущество",
  review: "Отзыв",
};

type Props = {
  product: ProductCard;
  script: ReelScript;
};

export function StoryboardPanel({ product, script }: Props) {
  return (
    <div className="rounded-2xl border border-violet-200 bg-gradient-to-b from-violet-50 to-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-violet-700">
            Раскадровка
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Проверьте текст и сцены перед генерацией видео
          </p>
        </div>
        {script.musicMood && (
          <span className="shrink-0 rounded-full bg-violet-100 px-3 py-1 text-xs font-medium capitalize text-violet-800">
            🎵 {script.musicMood}
          </span>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {script.scenes.map((scene, i) => {
          const imageIdx = scene.imageIndex ?? i % Math.max(product.images.length, 1);
          const imageUrl = product.images[imageIdx] ?? product.images[0];

          return (
            <div
              key={`${scene.startSec}-${i}`}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white"
            >
              <div className="relative aspect-[9/16] max-h-48 bg-gradient-to-b from-slate-900 via-indigo-950 to-violet-950">
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt={`Сцена ${i + 1}`}
                    className="absolute inset-0 m-auto max-h-[55%] max-w-[70%] object-contain opacity-90"
                  />
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8">
                  <p className="line-clamp-3 text-sm font-bold leading-tight text-white">
                    {scene.text}
                  </p>
                </div>
                <span className="absolute left-2 top-2 rounded-md bg-black/50 px-2 py-0.5 text-xs font-mono text-white">
                  {scene.startSec}–{scene.endSec} с
                </span>
              </div>
              <div className="p-3">
                <p className="text-xs font-medium text-violet-600">
                  Сцена {i + 1}
                  {scene.style && (
                    <span className="ml-2 text-slate-500">
                      · {SCENE_STYLE_LABEL[scene.style] ?? scene.style}
                    </span>
                  )}
                </p>
                <p className="mt-1 text-sm text-slate-800">{scene.text}</p>
                {scene.emphasis && (
                  <p className="mt-1 text-xs text-amber-700">
                    Акцент: {scene.emphasis}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid gap-2 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm sm:grid-cols-2">
        <div>
          <p className="text-xs text-slate-500">Заголовок</p>
          <p className="font-bold text-slate-900">{script.headline}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Подзаголовок</p>
          <p className="text-slate-800">{script.subheadline}</p>
        </div>
        {script.priceLabel && (
          <div>
            <p className="text-xs text-slate-500">Цена</p>
            <p className="font-semibold text-amber-700">{script.priceLabel}</p>
          </div>
        )}
        <div>
          <p className="text-xs text-slate-500">Кнопка</p>
          <p className="font-medium text-indigo-700">{script.ctaText}</p>
        </div>
      </div>
    </div>
  );
}

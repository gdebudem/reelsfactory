import Link from "next/link";
import { PRICING } from "@reels-factory/shared";

export function Pricing() {
  return (
    <section id="pricing" className="px-4 py-20">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="text-3xl font-bold text-slate-900">Прозрачные цены</h2>
        <p className="mt-3 text-slate-600">
          Себестоимость от $0.30 — вы платите только за готовый ролик
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border-2 border-indigo-100 bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
              Базовый
            </p>
            <p className="mt-4 text-5xl font-extrabold text-slate-900">
              {PRICING.basic.display}
            </p>
            <p className="mt-2 text-slate-600">за ролик</p>
            <ul className="mt-6 space-y-2 text-left text-sm text-slate-600">
              <li>• Вертикальное видео 9:16</li>
              <li>• AI-сценарий и оверлеи</li>
              <li>• Скачивание MP4</li>
            </ul>
          </div>

          <div className="relative rounded-2xl border-2 border-violet-400 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-8 shadow-lg shadow-violet-500/10">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-violet-600 px-3 py-0.5 text-xs font-semibold text-white">
              Популярный
            </span>
            <p className="text-sm font-semibold uppercase tracking-wide text-violet-600">
              Premium
            </p>
            <p className="mt-4 text-5xl font-extrabold text-slate-900">
              {PRICING.premium.display}
            </p>
            <p className="mt-2 text-slate-600">экспертный промо-ролик</p>
            <ul className="mt-6 space-y-2 text-left text-sm text-slate-600">
              <li>• Всё из базового</li>
              <li>• Улучшенный шаблон и тон</li>
              <li>• Приоритет рендера</li>
            </ul>
          </div>
        </div>

        <Link
          href="/create"
          className="mt-10 inline-flex rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-10 py-4 text-lg font-semibold text-white shadow-lg hover:opacity-90"
        >
          Попробовать бесплатно
        </Link>
      </div>
    </section>
  );
}

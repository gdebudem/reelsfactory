import Link from "next/link";

export function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-slate-50">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-0 h-[480px] w-[480px] -translate-x-1/3 rounded-full bg-white/80 shadow-[0_0_80px_rgba(148,163,184,0.15)]" />
        <div className="absolute bottom-0 right-0 h-[360px] w-[360px] translate-x-1/4 rounded-3xl bg-white/60 shadow-[0_0_60px_rgba(148,163,184,0.12)]" />
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center px-4 lg:grid-cols-2">
        <div className="py-16 lg:py-24">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Reels Factory
          </h1>
          <p className="mt-4 text-xl font-semibold text-indigo-600 sm:text-2xl">
            4 вопроса — и видео готово
          </p>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-500">
            Из карточки товара в цепляющий вертикальный ролик за минуты. Для
            торговых сетей, DIY, локального ритейла и HoReCa.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/create"
              className="rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:opacity-95"
            >
              Создать ролик
            </Link>
            <Link
              href="#how"
              className="rounded-full border border-slate-200 bg-white px-8 py-4 text-lg font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
            >
              Как это работает
            </Link>
          </div>
        </div>

        <div className="hidden lg:block" aria-hidden />
      </div>
    </section>
  );
}

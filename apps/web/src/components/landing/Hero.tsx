import Link from "next/link";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-24 pt-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-20 h-96 w-96 rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="absolute -right-32 top-40 h-96 w-96 rounded-full bg-violet-500/20 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/80 px-4 py-1.5 text-sm font-medium text-indigo-700 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              AI-сервис · B2B
            </p>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Reels Factory
            </h1>
            <p className="mt-2 text-xl font-semibold text-indigo-600 sm:text-2xl">
              4 вопроса — и видео готово
            </p>
            <p className="mt-6 text-lg leading-relaxed text-slate-600">
              Из карточки товара в цепляющий вертикальный ролик за минуты.
              Для торговых сетей, DIY, локального ритейла и HoReCa.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/create"
                className="rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:scale-[1.02] hover:shadow-xl"
              >
                Создать ролик
              </Link>
              <Link
                href="#how"
                className="rounded-full border border-slate-200 bg-white px-8 py-4 text-lg font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Как это работает
              </Link>
            </div>
            <p className="mt-6 text-sm text-slate-500">
              от <span className="font-semibold text-slate-700">$0.99</span> за
              ролик · готово за ~2 минуты
            </p>
          </div>

          <div className="relative flex justify-center lg:justify-end">
            <PhoneMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

function PhoneMockup() {
  return (
    <div className="relative w-[280px] sm:w-[300px]">
      <div className="absolute -inset-4 rounded-[3rem] bg-gradient-to-br from-indigo-500/30 to-violet-600/30 blur-2xl" />
      <div className="relative rounded-[2.5rem] border-[10px] border-slate-900 bg-slate-900 p-2 shadow-2xl">
        <div className="aspect-[9/16] overflow-hidden rounded-[1.75rem] bg-gradient-to-b from-slate-900 via-indigo-950 to-violet-950">
          <div className="p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-violet-300">
              Суперцена
            </p>
            <p className="mt-2 text-lg font-extrabold leading-tight text-white">
              МОЩНЫЙ. НАДЁЖНЫЙ. ВАШ.
            </p>
          </div>
          <div className="flex flex-1 items-center justify-center px-6 py-4">
            <div className="h-36 w-full rounded-xl bg-white/10 backdrop-blur-sm" />
          </div>
          <div className="absolute bottom-20 left-4 rounded-lg bg-gradient-to-r from-amber-500 to-red-500 px-3 py-1.5 text-sm font-bold text-white">
            9 990 ₽
          </div>
          <div className="absolute inset-x-4 bottom-10 rounded-full bg-white py-2.5 text-center text-sm font-bold text-indigo-900">
            Купить сейчас
          </div>
        </div>
      </div>
    </div>
  );
}

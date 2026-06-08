export function Pipeline() {
  const steps = [
    {
      label: "Товар",
      icon: "🛒",
      desc: "Ссылка → название, фото, цена",
    },
    {
      label: "Маркетплейсы",
      icon: "🔍",
      desc: "Ozon, Wildberries, отзывы и выгоды",
    },
    {
      label: "4 картинки",
      icon: "🖼️",
      desc: "AI-кадры с продающим текстом",
    },
    {
      label: "Reels",
      icon: "🎬",
      desc: "Склейка в вертикальное видео 9:16",
    },
  ];

  return (
    <section className="border-y border-indigo-100/80 bg-white/60 px-4 py-20 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-3xl font-bold text-slate-900">
          От ссылки до Reels
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
          Маркетплейсы → сценарий → 4 AI-картинки → готовый ролик для соцсетей
        </p>

        <div className="mt-14 flex flex-col items-center gap-6 md:flex-row md:flex-wrap md:justify-center md:gap-3 lg:flex-nowrap lg:gap-2">
          {steps.map((step, i) => (
            <div key={step.label} className="flex items-center gap-3 md:gap-2">
              <div className="flex w-52 flex-col items-center rounded-2xl border border-indigo-100 bg-gradient-to-b from-white to-indigo-50/50 p-5 text-center shadow-sm">
                <span className="text-3xl">{step.icon}</span>
                <h3 className="mt-2 text-base font-bold text-indigo-900">
                  {step.label}
                </h3>
                <p className="mt-1.5 text-xs leading-snug text-slate-600">
                  {step.desc}
                </p>
              </div>
              {i < steps.length - 1 && (
                <span className="text-xl text-indigo-300 md:rotate-0">→</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

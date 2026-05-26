export function Pipeline() {
  const steps = [
    {
      label: "Каталог",
      icon: "🛒",
      desc: "Ссылка на товар → название, фото, цена",
    },
    {
      label: "AI",
      icon: "✨",
      desc: "Сценарий, слоган и акценты под тип ролика",
    },
    {
      label: "Reel",
      icon: "🎬",
      desc: "Вертикальное видео 9:16 для соцсетей",
    },
  ];

  return (
    <section className="border-y border-indigo-100/80 bg-white/60 px-4 py-20 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-3xl font-bold text-slate-900">
          Товары → AI → Reel
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">
          Платформа для массового, недорогого и цепляющего контента
        </p>

        <div className="mt-14 flex flex-col items-center gap-8 md:flex-row md:justify-center md:gap-4">
          {steps.map((step, i) => (
            <div key={step.label} className="flex items-center gap-4 md:gap-4">
              <div className="flex w-56 flex-col items-center rounded-2xl border border-indigo-100 bg-gradient-to-b from-white to-indigo-50/50 p-6 text-center shadow-sm md:w-52">
                <span className="text-4xl">{step.icon}</span>
                <h3 className="mt-3 text-lg font-bold text-indigo-900">
                  {step.label}
                </h3>
                <p className="mt-2 text-sm text-slate-600">{step.desc}</p>
              </div>
              {i < steps.length - 1 && (
                <span className="hidden text-2xl text-indigo-300 md:block">→</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

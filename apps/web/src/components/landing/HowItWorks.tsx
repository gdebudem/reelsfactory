export function HowItWorks() {
  const steps = [
    { n: 1, q: "Какой товар рекламируем?", a: "Вставьте ссылку — подтянем фото и цену" },
    { n: 2, q: "Какой тип ролика?", a: "Акция, новинка, преимущества и др." },
    { n: 3, q: "Что подсвечиваем?", a: "Суперцена, надёжность или свой акцент" },
    { n: 4, q: "Куда ведём клиента?", a: "Сайт, WhatsApp или магазин" },
  ];

  return (
    <section id="how" className="px-4 py-20">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-3xl font-bold text-slate-900">
          Четыре вопроса — готовый ролик
        </h2>
        <p className="mt-3 text-center text-slate-600">
          Затем сервис делает видео — вы публикуете во все соцсети
        </p>
        <ol className="mt-12 space-y-4">
          {steps.map((s) => (
            <li
              key={s.n}
              className="flex gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-lg font-bold text-white">
                {s.n}
              </span>
              <div>
                <p className="font-semibold text-slate-900">{s.q}</p>
                <p className="mt-1 text-slate-600">{s.a}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

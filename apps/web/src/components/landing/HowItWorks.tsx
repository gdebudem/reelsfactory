export function HowItWorks() {
  const wizardSteps = [
    {
      n: 1,
      q: "Какой товар рекламируем?",
      a: "Вставьте ссылку — подтянем фото и цену",
    },
    {
      n: 2,
      q: "Какой тип ролика?",
      a: "Акция, новинка, преимущества — выберите из списка",
    },
    {
      n: 3,
      q: "Что подсвечиваем?",
      a: "Суперцена, надёжность или свой акцент",
    },
    {
      n: 4,
      q: "Куда ведём клиента?",
      a: "Сайт, WhatsApp или магазин",
    },
  ];

  const pipelineSteps = [
    "Ищем товар на Ozon, Wildberries и М.Видео",
    "Пишем сценарий из 4 сцен",
    "Генерируем 4 AI-картинки — вы проверяете",
    "Собираем видео и отдаём MP4",
  ];

  return (
    <section id="how" className="px-4 py-20">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-3xl font-bold text-slate-900">
          Четыре вопроса — готовый ролик
        </h2>
        <p className="mt-3 text-center text-slate-600">
          Отвечаете в визарде — дальше ИИ делает всё сам, с прогрессом по шагам
        </p>

        <ol className="mt-12 space-y-4">
          {wizardSteps.map((s) => (
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

        <div className="mt-10 rounded-2xl border border-violet-200 bg-gradient-to-b from-violet-50 to-white p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-violet-700">
            После оплаты
          </p>
          <ol className="mt-4 space-y-3">
            {pipelineSteps.map((step, i) => (
              <li key={step} className="flex items-start gap-3 text-slate-700">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

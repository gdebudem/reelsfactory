export function Audience() {
  const clients = [
    { title: "Торговые сети", icon: "🏪" },
    { title: "DIY и бытовая техника", icon: "🔧" },
    { title: "Локальные магазины", icon: "🛍️" },
    { title: "Рестораны и кафе", icon: "☕" },
  ];

  const benefits = [
    "Экономия времени маркетолога",
    "Доступно без отдела маркетинга",
    "Больше контента — те же усилия",
    "Единый стиль бренда в роликах",
  ];

  return (
    <section id="audience" className="bg-gradient-to-b from-white to-slate-50 px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-3xl font-bold text-slate-900">Для кого и зачем</h2>
        <p className="mt-2 max-w-2xl text-slate-600">
          Быстро и дёшево выпускать короткий рекламный контент для социальных сетей
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {clients.map((c) => (
            <div
              key={c.title}
              className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
            >
              <span className="text-2xl">{c.icon}</span>
              <p className="mt-3 font-semibold text-slate-800">{c.title}</p>
            </div>
          ))}
        </div>

        <ul className="mt-12 grid gap-3 sm:grid-cols-2">
          {benefits.map((b) => (
            <li
              key={b}
              className="flex items-center gap-3 rounded-xl bg-indigo-50/80 px-4 py-3 text-slate-800"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs text-white">
                ✓
              </span>
              {b}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

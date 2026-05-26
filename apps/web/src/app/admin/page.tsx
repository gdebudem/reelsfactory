import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [jobs, stats] = await Promise.all([
    prisma.reelJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.reelJob.groupBy({
      by: ["status"],
      _count: true,
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold">Админка</h1>
      <div className="mt-6 flex flex-wrap gap-4">
        {stats.map((s) => (
          <div
            key={s.status}
            className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium"
          >
            {s.status}: {s._count}
          </div>
        ))}
      </div>
      <div className="mt-8 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-2 pr-4">ID</th>
              <th className="py-2 pr-4">Статус</th>
              <th className="py-2 pr-4">Тип</th>
              <th className="py-2 pr-4">Ошибка</th>
              <th className="py-2">Дата</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id} className="border-b border-slate-100">
                <td className="py-2 pr-4 font-mono text-xs">{j.id.slice(0, 8)}…</td>
                <td className="py-2 pr-4">{j.status}</td>
                <td className="py-2 pr-4">{j.reelType}</td>
                <td className="py-2 pr-4 text-red-600 max-w-xs truncate">
                  {j.errorMessage ?? "—"}
                </td>
                <td className="py-2">
                  {new Date(j.createdAt).toLocaleString("ru-RU")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

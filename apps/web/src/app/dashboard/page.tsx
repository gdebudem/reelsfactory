import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { ProductCard } from "@reels-factory/shared";
import { hasDatabaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  if (!hasDatabaseConfigured()) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-3xl font-bold">Мои ролики</h1>
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <div className="font-medium">Этап 2 ещё не подключён</div>
          <div className="mt-1 text-sm">
            Добавьте <code className="rounded bg-white/60 px-1">DATABASE_URL</code>{" "}
            (Neon) в Vercel → Environment Variables, чтобы сохранить и показать
            ваши ролики.
          </div>
        </div>
        <div className="mt-6">
          <Link
            href="/create"
            className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
          >
            Создать ролик
          </Link>
        </div>
      </div>
    );
  }

  const jobs = await prisma.reelJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Мои ролики</h1>
        <Link
          href="/create"
          className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
        >
          + Новый
        </Link>
      </div>
      <ul className="mt-8 space-y-4">
        {jobs.length === 0 && (
          <li className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-500">
            Пока нет роликов.{" "}
            <Link href="/create" className="text-indigo-600 underline">
              Создать первый
            </Link>
          </li>
        )}
        {jobs.map((job) => {
          const product = job.productJson as ProductCard;
          return (
            <li
              key={job.id}
              className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
            >
              <div>
                <p className="font-medium">{product.title}</p>
                <p className="text-sm text-slate-500">
                  {job.reelType} · {job.status} ·{" "}
                  {new Date(job.createdAt).toLocaleDateString("ru-RU")}
                </p>
              </div>
              <div className="flex gap-2">
                {job.videoUrl && (
                  <a
                    href={job.videoUrl}
                    className="text-sm text-indigo-600 underline"
                    download
                  >
                    MP4
                  </a>
                )}
                <Link
                  href={`/create/result/${job.id}`}
                  className="text-sm text-slate-600 underline"
                >
                  Открыть
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

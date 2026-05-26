import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-900 px-4 py-12 text-slate-400">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
        <div className="flex items-center gap-2 text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm">
            🎬
          </span>
          <span className="font-bold">Reels Factory</span>
        </div>
        <nav className="flex flex-wrap justify-center gap-6 text-sm">
          <Link href="/create" className="hover:text-white">
            Создать ролик
          </Link>
          <Link href="#how" className="hover:text-white">
            Как работает
          </Link>
          <Link href="#pricing" className="hover:text-white">
            Цены
          </Link>
        </nav>
        <p className="text-sm">
          © {new Date().getFullYear()} Reels Factory
        </p>
      </div>
    </footer>
  );
}

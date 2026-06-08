"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Header() {
  const pathname = usePathname();

  if (pathname === "/") {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-indigo-100/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-indigo-900"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-lg text-white shadow-md">
            🎬
          </span>
          <span className="hidden sm:inline">Reels Factory</span>
        </Link>
        <nav className="flex items-center gap-2 text-sm font-medium text-slate-600 sm:gap-4">
          <Link href="/#how" className="hidden hover:text-indigo-600 sm:inline">
            Как работает
          </Link>
          <Link href="/#audience" className="hidden hover:text-indigo-600 md:inline">
            Для кого
          </Link>
          <Link href="/#pricing" className="hover:text-indigo-600">
            Цены
          </Link>
          <Link
            href="/create"
            className="rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-white shadow-md hover:opacity-90"
          >
            Создать ролик
          </Link>
        </nav>
      </div>
    </header>
  );
}

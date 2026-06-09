"use client";

import Link from "next/link";
import { useState } from "react";
import { PromptsSettingsModal } from "./PromptsSettingsModal";

export function Header() {
  const [promptsOpen, setPromptsOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-indigo-100/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 font-bold text-indigo-900"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-lg text-white shadow-md">
              🎬
            </span>
            <span className="hidden sm:inline">Reels Factory</span>
          </Link>

          <button
            type="button"
            onClick={() => setPromptsOpen(true)}
            className="hidden rounded-lg border-2 border-slate-900 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-900 transition hover:bg-slate-50 sm:inline-block"
          >
            Настроить промты
          </button>

          <nav className="flex items-center gap-2 text-sm font-medium text-slate-600 sm:gap-4">
            <button
              type="button"
              onClick={() => setPromptsOpen(true)}
              className="rounded-lg border-2 border-slate-900 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-900 sm:hidden"
            >
              Промты
            </button>
            <Link href="/#how" className="hidden hover:text-indigo-600 sm:inline">
              Как работает
            </Link>
            <Link
              href="/#audience"
              className="hidden hover:text-indigo-600 md:inline"
            >
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

      <PromptsSettingsModal
        open={promptsOpen}
        onClose={() => setPromptsOpen(false)}
      />
    </>
  );
}

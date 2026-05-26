"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await signIn("email", { email, callbackUrl: "/dashboard" });
    setSent(true);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <h1 className="text-2xl font-bold">Вход</h1>
      {sent ? (
        <p className="mt-4 text-slate-600">
          Проверьте почту — мы отправили ссылку для входа.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="email"
            required
            placeholder="email@company.ru"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border px-4 py-3"
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-indigo-600 py-3 font-medium text-white"
          >
            Получить ссылку
          </button>
        </form>
      )}
    </div>
  );
}

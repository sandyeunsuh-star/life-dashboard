"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { signInWithEmail } from "@/lib/supabase/auth";
import { createBrowserClientInstance } from "@/lib/supabase/client";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { formInputMdClass, formLabelClass } from "@/lib/ui/form-styles";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createBrowserClientInstance();
    const { error: signInError } = await signInWithEmail(
      supabase,
      email.trim(),
      password,
    );

    setLoading(false);

    if (signInError) {
      setError(formatSupabaseError(signInError));
      return;
    }

    router.push("/");
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className={formLabelClass}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={formInputMdClass}
          placeholder="you@example.com"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className={formLabelClass}>
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={formInputMdClass}
          placeholder="••••••••"
        />
      </div>

      {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 whitespace-pre-wrap break-words">
              {error}
            </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="mt-1 h-11 rounded-lg bg-zinc-900 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
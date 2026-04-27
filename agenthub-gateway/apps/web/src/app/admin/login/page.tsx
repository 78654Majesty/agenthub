"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { adminLogin } from "@/lib/api/admin";

export default function Page() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await adminLogin(username, password);
      router.push("/admin/dashboard");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="h-[56px] border-b border-[#E2E8F0] bg-white">
        <div className="mx-auto flex h-full max-w-[1440px] items-center px-6">
          <div className="flex items-center gap-4">
            <span className="text-[18px] font-bold tracking-[0.12em] text-[#0F172A]" style={{ fontFamily: "var(--font-heading)" }}>
              AGENTHUB
            </span>
            <div className="h-6 w-px bg-[#E2E8F0]" />
            <span className="rounded-full bg-gradient-to-b from-indigo-500 to-purple-500 px-2.5 py-1 text-[12px] font-semibold text-white">
              Admin Console
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1440px] justify-center px-4 py-16 sm:py-24">
        <section className="w-full max-w-[400px] rounded-2xl border border-[#E2E8F0] bg-white p-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EEF2FF] text-[#6366F1]">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="mt-5 text-center text-[28px] font-bold leading-tight text-[#0F172A]">Admin Sign In</h1>
          <p className="mt-2 text-center text-[14px] text-[#64748B]">
            Enter your credentials to access the admin panel
          </p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <label className="block text-[14px] font-medium text-[#64748B]">
              Username
              <input
                className="mt-2 h-10 w-full rounded-lg border border-[#E2E8F0] px-3 text-[14px] text-[#334155] outline-none transition focus:border-[#6366F1]"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </label>
            <label className="block text-[14px] font-medium text-[#64748B]">
              Password
              <input
                type="password"
                className="mt-2 h-10 w-full rounded-lg border border-[#E2E8F0] px-3 text-[14px] text-[#334155] outline-none transition focus:border-[#6366F1]"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <button
              className="mt-1 h-10 w-full rounded-lg bg-[#6366F1] text-[14px] font-semibold text-white transition hover:opacity-90 disabled:opacity-70"
              disabled={loading}
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
            {error ? <p className="text-center text-[14px] text-[#DC2626]">{error}</p> : null}
          </form>

          <p className="mt-6 text-center text-[12px] text-[#94A3B8]">Protected by session-based authentication</p>
        </section>
      </main>
    </div>
  );
}

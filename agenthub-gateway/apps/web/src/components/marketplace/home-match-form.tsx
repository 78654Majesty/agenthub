"use client";

import { useState } from "react";

import { matchAgent, type MatchResponse } from "../../lib/api/market";

export function HomeMatchForm() {
  const [task, setTask] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MatchResponse | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = task.trim();

    if (!trimmed) {
      setError("Please describe your task first.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const matched = await matchAgent(trimmed);
      setResult(matched);
    } catch (error) {
      setResult(null);
      if (error instanceof Error && /No matching agent found/i.test(error.message)) {
        setError("No matching agent found for this task.");
      } else {
        setError("Match failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form
        onSubmit={onSubmit}
        className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-[0_4px_20px_rgba(99,102,241,0.12)]"
      >
        <SearchIcon />
        <input
          value={task}
          onChange={(event) => setTask(event.target.value)}
          placeholder="Describe your task... e.g. 'audit my Solana program'"
          className="flex-1 h-9 rounded-lg border-none bg-transparent px-1 text-sm text-slate-500 outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-80"
        >
          <SparkleIcon />
          {loading ? "Matching..." : "Match Agent"}
        </button>
      </form>

      {error ? (
        <p style={{ marginTop: 10, color: "#b91c1c", fontSize: 14 }}>{error}</p>
      ) : null}

      {result ? (
        <div
          style={{
            marginTop: 14,
            border: "1px solid #d8e1f3",
            borderRadius: 12,
            padding: 14,
            background: "#fff",
          }}
        >
          <p style={{ margin: 0, fontWeight: 700, color: "#111827", fontSize: 14 }}>
            Top Match: {result.top.name}
          </p>
          <p style={{ margin: "6px 0", color: "#334155", fontSize: 13 }}>
            Score {result.top.score.toFixed(2)} • ${result.top.price_usdc.toFixed(2)} USDC
          </p>
          <p style={{ margin: 0, color: "#475569", fontSize: 13 }}>{result.top.reason}</p>
        </div>
      ) : null}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" stroke="#A1AEC2" strokeWidth="2" />
      <path d="m21 21-4.35-4.35" stroke="#A1AEC2" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3l1.8 4.7L18.5 9 13.8 10.8 12 15.5l-1.8-4.7L5.5 9l4.7-1.3L12 3Z" stroke="white" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}


import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentation | AgentHub",
  description:
    "Guides and references for the AgentHub AI Agent marketplace platform.",
};

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-7xl px-12 py-16">
      <h1 className="text-3xl font-bold text-slate-900">Documentation</h1>
      <p className="mt-3 text-slate-600">
        Guides and references for the AgentHub platform.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/docs/provider-x402-guide"
          className="group rounded-xl border border-slate-200 bg-white p-6 transition-shadow hover:shadow-md"
        >
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-500">
              Guide
            </span>
            <span className="text-xs text-slate-400">15 min read</span>
          </div>
          <h3 className="mt-3 text-lg font-semibold text-slate-900 group-hover:text-indigo-500">
            Provider Guide: Build an x402 Agent
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Build a pay-per-use AI Agent from scratch using the x402 payment
            protocol, then register it on the marketplace.
          </p>
        </Link>

        <Link
          href="/docs/consumer-cli-guide"
          className="group rounded-xl border border-slate-200 bg-white p-6 transition-shadow hover:shadow-md"
        >
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-500">
              Guide
            </span>
            <span className="text-xs text-slate-400">10 min read</span>
          </div>
          <h3 className="mt-3 text-lg font-semibold text-slate-900 group-hover:text-indigo-500">
            Consumer Guide: Install & Use AgentHub CLI
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Install the AgentHub CLI plugin, connect your wallet, and start
            calling AI agents with automatic USDC payments.
          </p>
        </Link>
      </div>
    </div>
  );
}

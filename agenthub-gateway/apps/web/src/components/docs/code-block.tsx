"use client";

import { useState } from "react";

export function CodeBlock({
  language,
  filename,
  children,
}: {
  language: string;
  filename?: string;
  children: string;
}) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800">
      <div className="flex items-center justify-between bg-slate-800 px-4 py-2.5">
        <span className="font-mono text-[11px] font-medium text-slate-400">
          {filename || language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] font-medium text-slate-500 transition-colors hover:text-slate-300"
        >
          {copied ? (
            <>
              <CheckIcon />
              Copied!
            </>
          ) : (
            <>
              <CopyIcon />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto bg-slate-950 p-5">
        <code className="text-[13px] leading-[1.8] text-slate-200">
          {children}
        </code>
      </pre>
    </div>
  );
}

function CopyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

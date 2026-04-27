"use client";

import { useEffect, useState } from "react";

export interface TocItem {
  id: string;
  title: string;
  level: 1 | 2;
}

export interface TocReference {
  label: string;
  href: string;
}

export function TocSidebar({
  sections,
  references = [],
}: {
  sections: TocItem[];
  references?: TocReference[];
}) {
  const [active, setActive] = useState("");

  useEffect(() => {
    const headings = sections
      .map((s) => document.getElementById(s.id))
      .filter(Boolean) as HTMLElement[];

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        }
      },
      { rootMargin: "0px 0px -70% 0px", threshold: 0 },
    );

    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [sections]);

  return (
    <aside className="sticky top-20 hidden w-[260px] shrink-0 self-start lg:block">
      <div className="space-y-1.5 border-r border-slate-200 pr-6">
        <h3
          className="mb-3 text-[13px] font-bold tracking-wider text-slate-900"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          TABLE OF CONTENTS
        </h3>
        {sections.map((s, i) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] transition-colors ${
              active === s.id
                ? "bg-indigo-50 font-semibold text-indigo-500"
                : "font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            } ${s.level === 2 ? "ml-4" : ""}`}
          >
            {s.level === 1 && (
              <span
                className={`font-mono text-xs ${
                  active === s.id ? "text-indigo-500" : "text-slate-400"
                }`}
              >
                {i + 1}
              </span>
            )}
            {s.title}
          </a>
        ))}

        {references.length > 0 && (
          <>
            <hr className="!my-4 border-slate-200" />
            <h3 className="text-xs font-semibold tracking-wider text-slate-400">
              REFERENCES
            </h3>
            {references.map((ref) => (
              <a
                key={ref.href}
                href={ref.href}
                target={ref.href.startsWith("/") ? undefined : "_blank"}
                className="block text-xs font-medium text-indigo-500 hover:underline"
              >
                {ref.label}
              </a>
            ))}
          </>
        )}
      </div>
    </aside>
  );
}

export function StepFlow({
  steps,
}: {
  steps: { title: string; description: string; done?: boolean }[];
}) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {steps.map((step, i) => (
        <div
          key={i}
          className="flex flex-col items-center gap-2.5 rounded-xl bg-slate-50 p-5 text-center"
        >
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white ${
              step.done ? "bg-emerald-500" : "bg-indigo-500"
            }`}
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {step.done ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            ) : (
              i + 1
            )}
          </span>
          <h4 className="text-sm font-semibold text-slate-900">{step.title}</h4>
          <p className="text-xs leading-relaxed text-slate-600">
            {step.description}
          </p>
        </div>
      ))}
    </div>
  );
}

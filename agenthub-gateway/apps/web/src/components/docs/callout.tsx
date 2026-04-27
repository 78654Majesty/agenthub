const STYLES = {
  tip: {
    bg: "bg-emerald-50",
    border: "border-emerald-300",
    icon: "💡",
    text: "text-emerald-800",
  },
  warning: {
    bg: "bg-amber-50",
    border: "border-amber-300",
    icon: "⚠️",
    text: "text-amber-800",
  },
  info: {
    bg: "bg-blue-50",
    border: "border-blue-300",
    icon: "ℹ️",
    text: "text-blue-800",
  },
} as const;

export function Callout({
  type = "tip",
  children,
}: {
  type?: keyof typeof STYLES;
  children: React.ReactNode;
}) {
  const s = STYLES[type];
  return (
    <div
      className={`flex gap-3 rounded-xl border ${s.border} ${s.bg} px-5 py-4`}
    >
      <span className="shrink-0 text-lg">{s.icon}</span>
      <div className={`text-[13px] font-medium leading-relaxed ${s.text}`}>
        {children}
      </div>
    </div>
  );
}

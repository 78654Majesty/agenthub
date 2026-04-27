export function ChecklistCard({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div className="space-y-3.5 rounded-xl border border-slate-200 bg-white p-6">
      <h4 className="text-[15px] font-semibold text-slate-900">{title}</h4>
      {items.map((item) => (
        <div key={item} className="flex items-center gap-2.5">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border-[1.5px] border-emerald-500 bg-emerald-50">
            <CheckIcon />
          </span>
          <span className="text-sm text-slate-600">{item}</span>
        </div>
      ))}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

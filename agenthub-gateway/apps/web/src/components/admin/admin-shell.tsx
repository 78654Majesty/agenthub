import Link from "next/link";

type NavKey = "dashboard" | "agents" | "users" | "receipts";

const navItems: Array<{
  key: NavKey;
  label: string;
  href: string;
}> = [
  { key: "dashboard", label: "Dashboard", href: "/admin/dashboard" },
  { key: "agents", label: "Agent Review", href: "/admin/agents" },
  { key: "users", label: "Users", href: "/admin/users" },
  { key: "receipts", label: "Failed Receipts", href: "/admin/receipts" },
];

export function AdminShell({
  active,
  children,
  reviewBadge = 0,
  receiptBadge = 0,
  username = "admin",
}: {
  active: NavKey;
  children: React.ReactNode;
  reviewBadge?: number;
  receiptBadge?: number;
  username?: string;
}) {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="h-[56px] border-b border-[#E2E8F0] bg-white">
        <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <span className="text-[18px] font-bold tracking-[0.12em] text-[#0F172A]" style={{ fontFamily: "var(--font-heading)" }}>
              AGENTHUB
            </span>
            <div className="h-6 w-px bg-[#E2E8F0]" />
            <span className="rounded-full bg-gradient-to-b from-indigo-500 to-purple-500 px-2.5 py-1 text-[12px] font-semibold text-white">
              Admin Console
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="h-[30px] w-[30px] rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 grid place-items-center text-[12px] font-semibold text-white">
              A
            </span>
            <span className="text-[14px] font-medium text-[#64748B]">{username}</span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1440px] grid-cols-[240px_minmax(0,1fr)]">
        <aside className="min-h-[calc(100vh-56px)] border-r border-[#E2E8F0] bg-white py-6">
          <div className="mb-2 px-5">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#94A3B8]">PLATFORM</span>
          </div>
          <div className="h-2" />
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = item.key === active;
              const badge =
                item.key === "agents"
                  ? reviewBadge
                  : item.key === "receipts"
                    ? receiptBadge
                    : 0;

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`flex items-center justify-between px-5 py-2.5 text-[14px] font-medium transition ${
                    isActive
                      ? "bg-[#EEF2FF] text-[#6366F1]"
                      : "text-[#475569] hover:bg-slate-50"
                  }`}
                >
                  <span>{item.label}</span>
                  {badge > 0 ? (
                    <span className="rounded-full bg-[#FEE2E2] px-2 py-0.5 text-[12px] font-semibold text-[#DC2626]">
                      {badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="min-h-[calc(100vh-56px)] px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
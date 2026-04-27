"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getWalletPubkey, logout } from "@/lib/auth";

type NavItem = {
  label: string;
  href: string;
  section: "account" | "provider";
};

const NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/dashboard", section: "account" },
  { label: "Orders", href: "/dashboard/orders", section: "account" },
  { label: "My Agents", href: "/dashboard/agents", section: "provider" },
  { label: "New Agent", href: "/dashboard/agents/new", section: "provider" },
  { label: "Ratings", href: "/dashboard/ratings", section: "provider" },
];

function getProfileMenuIcon(label: string) {
  if (label === "Dashboard") return <OverviewIcon />;
  if (label === "Orders") return <OrdersIcon />;
  if (label === "My Agents") return <AgentIcon />;
  return <StarIcon />;
}

const PROFILE_MENU_LINKS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Orders", href: "/dashboard/orders" },
  { label: "My Agents", href: "/dashboard/agents" },
  { label: "Ratings", href: "/dashboard/ratings" },
];

export function ProviderDashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [walletPubkey, setWalletPubkey] = useState<string | null>(null);

  useEffect(() => {
    setWalletPubkey(getWalletPubkey());
  }, []);

  function handleDisconnect() {
    logout();
    setWalletPubkey(null);
    router.push("/marketplace");
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="h-[56px] border-b border-[#E2E8F0] bg-white">
        <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-[18px] font-bold tracking-[0.12em] text-[#0F172A]" style={{ fontFamily: "var(--font-heading)" }}>
              AGENTHUB
            </Link>
            <div className="h-6 w-px bg-[#E2E8F0]" />
            <Link href="/marketplace" className="inline-flex items-center gap-1 text-[14px] font-semibold text-[#6875F7]">
              <ArrowLeftIcon />
              Back to Marketplace
            </Link>
          </div>
          <div className="group relative text-[14px] font-medium text-[#2F405B]">
            <div className="flex items-center gap-2.5">
              <span className="h-[30px] w-[30px] rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500" />
              <div className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-slate-50 px-3 text-[12px] font-medium text-[#0F172A]" style={{ fontFamily: "var(--font-mono)" }}>
                <span>{formatTriggerWallet(walletPubkey ?? "0x7F...3e2d")}</span>
                <ChevronDownIcon />
              </div>
            </div>
            <div className="pointer-events-none absolute right-0 top-full z-50 w-[240px] pt-2 opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
              <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-[0_8px_30px_rgba(28,38,76,0.06)]">
                <div className="flex items-center gap-3 border-b border-[#E2E8F0] px-4 py-3">
                  <span className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500" />
                  <div>
                    <p className="text-[14px] font-semibold leading-none text-[#0F172A]">
                      {formatDetailWallet(walletPubkey ?? "0x7F2a...3e2d")}
                    </p>
                    <p className="mt-1.5 text-[12px] leading-none text-[#94A3B8]">Solana Devnet</p>
                  </div>
                </div>

                <div className="px-2 py-2">
                  {PROFILE_MENU_LINKS.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-semibold text-[#0F172A] hover:bg-[#F7FAFF]"
                    >
                      <span className="text-[#94A3B8]">{getProfileMenuIcon(item.label)}</span>
                      {item.label}
                    </Link>
                  ))}
                </div>

                <div className="border-t border-[#E2E8F0] px-2 py-2">
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-semibold text-[#B42318] hover:bg-[#FEF2F2]"
                  >
                    <span className="text-[#B42318]"><DisconnectIcon /></span>
                    Disconnect
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1440px] grid-cols-[240px_minmax(0,1fr)]">
        <aside className="min-h-[calc(100vh-56px)] border-r border-[#E2E8F0] bg-white py-6">
          <div className="space-y-1">
            <div className="mb-2 px-5">
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#94A3B8]">MY ACCOUNT</span>
            </div>
            <div className="h-2" />
            {NAV_ITEMS.filter((item) => item.section === "account").map((item) => (
              <SideNavItem key={item.href} item={item} active={isActive(pathname, item.href)} />
            ))}
          </div>

          <div className="my-4 mx-5 border-t border-[#E2E8F0]" />

          <div className="space-y-1">
            <div className="mb-2 px-5">
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#94A3B8]">PROVIDER</span>
            </div>
            <div className="h-2" />
            {NAV_ITEMS.filter((item) => item.section === "provider").map((item) => (
              <SideNavItem key={item.href} item={item} active={isActive(pathname, item.href)} />
            ))}
          </div>
        </aside>

        <div className="min-h-[calc(100vh-56px)] px-8 py-8">{children}</div>
      </div>
    </div>
  );
}

function formatTriggerWallet(wallet: string): string {
  if (wallet.length <= 10) {
    return wallet;
  }

  return `${wallet.slice(0, 4)} ... ${wallet.slice(-4)}`;
}

function formatDetailWallet(wallet: string): string {
  if (wallet.length <= 12) {
    return wallet;
  }

  return `${wallet.slice(0, 6)} ... ${wallet.slice(-4)}`;
}

function ChevronDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="m7 10 5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function DisconnectIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M11 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M13 8l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SideNavItem({ item, active }: { item: NavItem; active: boolean }) {
  const icon = item.label === "Overview"
    ? <OverviewIcon />
    : item.label === "Orders"
      ? <OrdersIcon />
      : item.label === "My Agents"
          ? <AgentIcon />
          : item.label === "New Agent"
            ? <PlusIcon />
            : <StarIcon />;

  return (
    <Link
      href={item.href}
      className={`flex items-center gap-[10px] px-5 py-2.5 text-[14px] font-medium transition ${
        active ? "bg-[#EEF2FF] text-[#6368F6]" : "text-[#475569] hover:bg-slate-50"
      }`}
    >
      <span className="text-current">{icon}</span>
      {item.label}
    </Link>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function ArrowLeftIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M16 10H5" stroke="currentColor" strokeWidth="1.8" />
      <path d="m9 6-4 4 4 4" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function OverviewIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="4" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="14" y="4" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="4" y="14" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="14" y="14" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function OrdersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 3h10v18H7z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9.5 8h5M9.5 12h5M9.5 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function AgentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="7" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 12h6M12 9v6M8 7V5M16 7V5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="m12 3 2.5 5.2L20 9l-4 3.8.9 5.5L12 16l-4.9 2.3.9-5.5L4 9l5.5-.8L12 3Z" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}


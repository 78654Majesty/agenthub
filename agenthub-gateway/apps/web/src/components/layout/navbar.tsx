"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { WalletLoginPanel } from "@/components/auth/wallet-login-panel";
import { getWalletPubkey, logout } from "@/lib/auth";

const NAV_LINKS = [
  { label: "Marketplace", href: "/marketplace" },
  { label: "Docs", href: "/docs" },
];

const PROFILE_MENU_LINKS = [
  { label: "Dashboard", href: "/dashboard", icon: <DashboardIcon /> },
  { label: "My Agents", href: "/dashboard/agents", icon: <AgentIcon /> },
  { label: "Orders", href: "/dashboard/orders", icon: <OrdersIcon /> },
  { label: "Ratings", href: "/dashboard/ratings", icon: <RatingsIcon /> },
];

export function Navbar({ activeLink }: { activeLink?: string }) {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [walletPubkey, setWalletPubkey] = useState<string | null>(null);

  useEffect(() => {
    setWalletPubkey(getWalletPubkey());
  }, []);

  useEffect(() => {
    if (!isLoginOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isLoginOpen]);

  function handleDisconnect() {
    logout();
    setWalletPubkey(null);
  }

  useEffect(() => {
    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsLoginOpen(false);
      }
    }

    if (isLoginOpen) {
      window.addEventListener("keydown", onEscape);
    }

    return () => {
      window.removeEventListener("keydown", onEscape);
    };
  }, [isLoginOpen]);

  return (
    <>
      <nav className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-12">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="text-xl font-bold tracking-[0.15em] text-slate-900"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            AGENTHUB
          </Link>
          <div className="flex items-center gap-7">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  activeLink === link.label
                    ? "font-semibold text-indigo-500"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {walletPubkey ? (
            <div className="group relative">
              <div className="flex items-center gap-2.5">
                <span className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500 to-pink-500" />
                <div className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#DCE4F2] bg-[#F7FAFF] px-3 text-[13px] font-semibold text-[#151E3A]">
                  <span>{formatTriggerWallet(walletPubkey)}</span>
                  <ChevronDownIcon />
                </div>
              </div>

              <div className="pointer-events-none absolute right-0 top-full z-50 w-[240px] pt-2 opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
                <div className="overflow-hidden rounded-xl border border-[#DCE4F2] bg-white shadow-[0_8px_30px_rgba(28,38,76,0.06)]">
                  <div className="flex items-center gap-3 border-b border-[#DCE4F2] px-4 py-3">
                    <span className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-500 to-pink-500" />
                    <div>
                      <p className="text-[14px] font-semibold leading-none text-[#151E3A]">
                        {formatDetailWallet(walletPubkey)}
                      </p>
                      <p className="mt-1.5 text-[12px] leading-none text-[#8D9AB2]">Solana Devnet</p>
                    </div>
                  </div>

                  <div className="px-2 py-2">
                    {PROFILE_MENU_LINKS.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-semibold text-[#151E3A] hover:bg-[#F7FAFF]"
                      >
                        <span className="text-[#8D9AB2]">{item.icon}</span>
                        {item.label}
                      </Link>
                    ))}
                  </div>

                  <div className="border-t border-[#DCE4F2] px-2 py-2">
                    <button
                      type="button"
                      onClick={handleDisconnect}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-semibold text-[#B42318] hover:bg-[#FEF2F2]"
                    >
                      <span className="text-[#B42318]">{<DisconnectIcon />}</span>
                      Disconnect
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsLoginOpen(true)}
              className="flex h-8 items-center gap-1.5 rounded-lg border-2 border-indigo-500 px-4 text-[13px] font-semibold text-indigo-500 transition-colors hover:bg-indigo-50"
            >
              <WalletIcon />
              Connect Wallet
            </button>
          )}
        </div>
      </nav>

      {isLoginOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Connect wallet"
          onClick={() => setIsLoginOpen(false)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-[2px]"
        >
          <div onClick={(event) => event.stopPropagation()}>
            <WalletLoginPanel onClose={() => setIsLoginOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
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
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="m7 10 5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function AgentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="7" width="16" height="11" rx="2.4" stroke="currentColor" strokeWidth="2" />
      <path d="M9 12h6M12 10v4M8 7V5M16 7V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function OrdersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 3h10v18H7z" stroke="currentColor" strokeWidth="2" />
      <path d="M9.5 8h5M9.5 12h5M9.5 16h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function RatingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="m12 3.5 2.5 5.2 5.5.8-4 3.8.9 5.5L12 16.4l-4.9 2.4.9-5.5-4-3.8 5.5-.8L12 3.5Z" stroke="currentColor" strokeWidth="2" />
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

function WalletIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
    </svg>
  );
}

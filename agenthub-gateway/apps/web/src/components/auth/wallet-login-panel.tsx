"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  createWalletChallenge,
  isAuthenticated,
  login,
  verifyWalletLogin,
} from "@/lib/auth";
import {
  connectWallet,
  detectWallets,
  signLoginMessage,
  type DetectedWalletOption,
  type WalletId,
} from "@/lib/wallet";

type LoginState = "idle" | "connecting" | "signing" | "verifying" | "success";

type WalletLoginPanelProps = {
  onClose?: () => void;
  afterLoginPath?: string;
};

const WALLET_LOGO_FILE_BY_ID: Record<WalletId, string> = {
  phantom: "phantom.png",
  solflare: "Solflare.png",
  backpack: "Backpack.png",
};

export function WalletLoginPanel({ onClose, afterLoginPath = "/dashboard" }: WalletLoginPanelProps) {
  const router = useRouter();
  const [wallets, setWallets] = useState<DetectedWalletOption[]>(() => detectWallets());
  const [activeWallet, setActiveWallet] = useState<WalletId | null>(null);
  const [state, setState] = useState<LoginState>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setWallets(detectWallets());
  }, []);

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace(afterLoginPath);
    }
  }, [afterLoginPath, router]);

  const stateLabel = useMemo(() => {
    switch (state) {
      case "connecting":
        return "Connecting wallet...";
      case "signing":
        return "Awaiting wallet signature...";
      case "verifying":
        return "Verifying signature...";
      case "success":
        return "Connected. Redirecting...";
      default:
        return null;
    }
  }, [state]);

  async function handleWalletLogin(walletId: WalletId) {
    setActiveWallet(walletId);
    setError(null);

    try {
      setState("connecting");
      const { provider, walletAddress } = await connectWallet(walletId);

      setState("signing");
      const challenge = await createWalletChallenge(walletAddress);
      const signature = await signLoginMessage(provider, challenge.challenge);

      setState("verifying");
      const result = await verifyWalletLogin(walletAddress, signature);

      login(result.token, result.wallet_pubkey);
      setState("success");
      router.push(afterLoginPath);
    } catch (caught) {
      setState("idle");
      setActiveWallet(null);
      setError(caught instanceof Error ? caught.message : "Wallet login failed. Please try again.");
    }
  }

  return (
    <section className="w-full max-w-[420px] rounded-2xl border border-[#DCE4F2] bg-white shadow-[0_8px_30px_rgba(28,38,76,0.06)] px-5 py-5">
      <div className="flex items-center justify-between">
        <h1 className="text-[18px] font-bold text-[#151E3A]" style={{ fontFamily: "var(--font-heading)" }}>
          Connect Wallet
        </h1>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close wallet connect"
            className="h-7 w-7 inline-flex items-center justify-center rounded-lg border-none bg-[#F1F4F8] text-[#78849A] text-sm leading-none cursor-pointer hover:bg-[#E8ECF2] transition-colors"
          >
            ×
          </button>
        ) : null}
      </div>

      <p className="mt-3 text-[13px] text-[#8D9AB2] leading-relaxed">
        Choose your preferred Solana wallet to sign in.
      </p>

      <div className="mt-4 grid gap-2.5">
        {wallets.map((wallet) => {
          const isBusy = activeWallet === wallet.id && state !== "idle";
          const disabled = Boolean(activeWallet && activeWallet !== wallet.id) || isBusy;

          return (
            <button
              key={wallet.id}
              type="button"
              disabled={disabled}
              onClick={() => handleWalletLogin(wallet.id)}
              className="w-full flex items-center justify-between gap-3 rounded-xl border border-[#DCE4F2] bg-white px-3.5 py-3 text-left cursor-pointer hover:border-[#C5D0E0] hover:bg-[#F7FAFF] transition-colors disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:border-[#DCE4F2] disabled:hover:bg-white"
            >
              <span className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[#f8f9fa] flex items-center justify-center overflow-hidden">
                  <img
                    src={`/wallet-images/${WALLET_LOGO_FILE_BY_ID[wallet.id]}`}
                    alt={`${wallet.name} logo`}
                    className="w-full h-full object-contain p-1"
                  />
                </div>
                <span>
                  <span className="block text-[14px] font-semibold text-[#151E3A]">
                    {wallet.name}
                  </span>
                  <span className="block mt-0.5 text-[13px] text-[#8D9AB2]">
                    {wallet.description}
                  </span>
                </span>
              </span>
              <span
                className={`text-[13px] font-semibold whitespace-nowrap ${
                  wallet.installed
                    ? isBusy
                      ? "text-[#6366F1]"
                      : "text-[#1B9D57]"
                    : "text-[#9AA6B8]"
                }`}
              >
                {wallet.installed ? (isBusy ? "Working..." : "Detected") : "Not installed"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 h-px bg-[#E3EAF3]" />

      <div className="mt-3 flex flex-col items-center gap-2 text-center">
        <div className="flex items-center gap-1.5 text-[13px] text-[#8D9AB2]">
          <ShieldIcon />
          <span>Secure connection via wallet signature</span>
        </div>
        <p className="text-[12px] text-[#93A1B8]">
          By connecting, you agree to our Terms of Service.
        </p>
        <p className="text-[12px] text-[#93A1B8]">
          No private keys are shared with AgentHub.
        </p>
        {stateLabel ? (
          <p className="text-[13px] font-medium text-[#334155]">{stateLabel}</p>
        ) : null}
        {error ? (
          <p className="text-[13px] text-[#B42318] max-w-[300px]">{error}</p>
        ) : null}
      </div>
    </section>
  );
}

function ShieldIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3.75L18 6V11.25C18 15.015 15.457 18.511 12 19.5C8.543 18.511 6 15.015 6 11.25V6L12 3.75Z"
        stroke="#1B9D57"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.75 11.75L11.25 13.25L14.5 10"
        stroke="#1B9D57"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

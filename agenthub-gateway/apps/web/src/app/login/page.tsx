"use client";

import { useRouter } from "next/navigation";

import { WalletLoginPanel } from "@/components/auth/wallet-login-panel";

export default function LoginPage() {
  const router = useRouter();

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
        background: "#121A33",
        backgroundImage:
          "radial-gradient(circle at 20% 20%, rgba(118, 103, 244, 0.14), transparent 35%), radial-gradient(circle at 80% 10%, rgba(8, 184, 122, 0.12), transparent 28%)",
      }}
    >
      <WalletLoginPanel onClose={() => router.push("/")} />
    </main>
  );
}

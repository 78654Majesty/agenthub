import "@/app/globals.css";
import { geist, inter, ibmPlexMono } from "@/lib/fonts";

export const metadata = {
  title: "AgentHub",
  description: "AI Agent Marketplace on Solana",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${inter.variable} ${ibmPlexMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}

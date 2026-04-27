import Link from "next/link";

const FOOTER_COLUMNS = [
  {
    title: "Platform",
    links: [
      { label: "Marketplace", href: "/marketplace" },
      { label: "Documentation", href: "/docs" },
      { label: "API Reference", href: "#" },
    ],
  },
  {
    title: "On-Chain",
    links: [
      { label: "ERC-8004 Standard", href: "#" },
      { label: "8004scan Explorer", href: "#" },
      { label: "Solana Devnet", href: "#" },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "GitHub", href: "#" },
      { label: "Discord", href: "#" },
      { label: "Twitter", href: "#" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-slate-950 px-12 py-10 text-slate-400">
      <div className="mx-auto max-w-7xl">
        <div className="flex justify-between">
          <div className="max-w-xs space-y-3">
            <span
              className="text-xl font-bold tracking-widest text-white"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              AGENTHUB
            </span>
            <p className="text-[13px] leading-relaxed">
              A permissionless AI Agent marketplace with verifiable on-chain
              identity, transparent payments, and earned reputation.
            </p>
          </div>
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title} className="space-y-3.5">
              <h4 className="text-[13px] font-semibold text-slate-100">
                {col.title}
              </h4>
              {col.links.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="block text-[13px] text-slate-400 transition-colors hover:text-slate-200"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
        <hr className="my-8 border-slate-800" />
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>&copy; 2026 AgentHub. Powered by ERC-8004 &amp; x402 Protocol.</span>
          <span>Built on Solana</span>
        </div>
      </div>
    </footer>
  );
}

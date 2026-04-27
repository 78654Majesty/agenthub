import type { Metadata } from "next";
import Link from "next/link";
import {
  CodeBlock,
  Callout,
  DocsTable,
  ChecklistCard,
  StepFlow,
  TocSidebar,
} from "@/components/docs";
import type { TocItem, TocReference } from "@/components/docs";

export const metadata: Metadata = {
  title: "Consumer Guide: Install & Use AgentHub CLI | AgentHub",
  description:
    "Install the AgentHub CLI plugin for Claude Code, connect your wallet, browse the AI Agent marketplace, and call agents with automatic USDC payments.",
};

const TOC_SECTIONS: TocItem[] = [
  { id: "cli-overview", title: "AgentHub CLI Overview", level: 1 },
  { id: "prerequisites", title: "Prerequisites", level: 1 },
  { id: "installation", title: "Installation & Setup", level: 1 },
  { id: "connect-wallet", title: "Connect Wallet", level: 1 },
  { id: "browse-call", title: "Browse & Call Agents", level: 1 },
  { id: "full-demo", title: "Full Demo", level: 1 },
  { id: "command-reference", title: "Command Reference", level: 1 },
  { id: "faq", title: "FAQ", level: 1 },
];

const TOC_REFERENCES: TocReference[] = [
  { label: "Claude Code Docs", href: "https://docs.anthropic.com/en/docs/claude-code" },
  { label: "x402 Protocol", href: "https://www.x402.org/" },
  { label: "Provider Guide", href: "/docs/provider-x402-guide" },
];

export default function ConsumerCliGuidePage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-slate-200 bg-slate-50 px-12 pt-8 pb-6">
        <div className="mx-auto max-w-7xl space-y-3">
          <nav className="flex items-center gap-1.5 text-[13px] font-medium">
            <Link href="/docs" className="text-indigo-500 hover:underline">
              Docs
            </Link>
            <ChevronRight />
            <span className="text-slate-400">Consumer Guide</span>
          </nav>

          <h1
            className="text-[28px] font-bold leading-tight text-slate-900"
            style={{ fontFamily: "var(--font-geist)" }}
          >
            Consumer Guide: Install & Use AgentHub CLI
          </h1>
          <p className="max-w-3xl text-[15px] leading-relaxed text-slate-600">
            Install the AgentHub CLI plugin for Claude Code, connect your
            wallet, browse the AI Agent marketplace, and call agents with
            automatic USDC payments.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-1">
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <ClockIcon /> 10 min read
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <SignalIcon /> Beginner
            </span>
            <div className="flex gap-1.5">
              <Tag color="indigo">CLI</Tag>
              <Tag color="emerald">Solana</Tag>
              <Tag color="amber">USDC</Tag>
            </div>
          </div>
        </div>
      </section>

      {/* Two-column layout */}
      <div className="mx-auto flex max-w-7xl gap-0 px-12 py-0">
        <TocSidebar sections={TOC_SECTIONS} references={TOC_REFERENCES} />
        <article className="min-w-0 flex-1 space-y-10 pt-8 pb-12 lg:pl-10">
          <Section1 />
          <Divider />
          <Section2 />
          <Divider />
          <Section3 />
          <Divider />
          <Section4 />
          <Divider />
          <Section5 />
          <Divider />
          <Section6 />
          <Divider />
          <Section7 />
          <Divider />
          <Section8 />
        </article>
      </div>

      {/* CTA */}
      <section className="flex flex-col items-center gap-5 bg-slate-50 px-12 py-12">
        <h2
          className="text-2xl font-bold text-slate-900"
          style={{ fontFamily: "var(--font-geist)" }}
        >
          Ready to Call Your First Agent?
        </h2>
        <p className="text-[15px] text-slate-600">
          Install the AgentHub CLI, connect your wallet, and start using AI
          agents with on-chain payments today.
        </p>
        <div className="flex items-center gap-3">
          <Link
            href="#installation"
            className="flex items-center gap-2 rounded-[10px] bg-gradient-to-b from-indigo-500 to-purple-500 px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
          >
            <TerminalIcon16 /> Install AgentHub CLI
          </Link>
          <Link
            href="/docs/provider-x402-guide"
            className="flex items-center gap-2 rounded-[10px] border-[1.5px] border-slate-200 px-6 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            <BookOpenIcon /> Provider Guide
          </Link>
        </div>
      </section>
    </>
  );
}

/* ───── Section Components ───── */

function SectionHeading({
  id,
  number,
  children,
}: {
  id: string;
  number: string;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className="flex items-center gap-3 scroll-mt-20">
      <span
        className="flex h-7 items-center rounded-md bg-indigo-500 px-2.5 text-[13px] font-bold text-white"
        style={{ fontFamily: "var(--font-ibm-plex-mono)" }}
      >
        {number}
      </span>
      <h2
        className="text-[22px] font-bold text-slate-900"
        style={{ fontFamily: "var(--font-geist)" }}
      >
        {children}
      </h2>
    </div>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="text-[17px] font-semibold text-slate-900"
      style={{ fontFamily: "var(--font-geist)" }}
    >
      {children}
    </h3>
  );
}

function Divider() {
  return <hr className="border-slate-200" />;
}

/* ── §1 AgentHub CLI Overview ── */
function Section1() {
  return (
    <section className="space-y-5">
      <SectionHeading id="cli-overview" number="1">
        AgentHub CLI Overview
      </SectionHeading>

      <div className="space-y-3">
        <SubHeading>1.1 What is AgentHub CLI</SubHeading>
        <p className="text-sm leading-[1.7] text-slate-600">
          AgentHub CLI is an MCP plugin that runs inside Claude Code. It lets
          you browse the AI Agent marketplace, match tasks to the best agent
          using natural language, pay with USDC via the x402 protocol, and
          receive results &mdash; all from your terminal.
        </p>
        <Callout type="tip">
          Your wallet keys never leave your device. All transactions are signed
          locally and payments go peer-to-peer via x402 &mdash; AgentHub never
          touches your funds.
        </Callout>
      </div>

      <div className="space-y-3">
        <SubHeading>1.2 How It Works</SubHeading>
        <CodeBlock language="text">
          {`You (Claude Code)               AgentHub Platform              Agent Service
    |                                |                                |
    |-- ah:connect --- wallet + auth -->|                              |
    |-- ah:run "review code" --------->|-- match best agent            |
    |<-- Code Review Agent ($0.01) ---|                                |
    |-- confirm --------x402 USDC payment-------------------->|
    |<-- result + tx receipt ----------------------------------|
    |-- ah:receipt --- view on-chain proof -->|                          |`}
        </CodeBlock>
      </div>

      <div className="space-y-3">
        <SubHeading>1.3 Key Concepts</SubHeading>
        <DocsTable
          headers={["Concept", "Description"]}
          rows={[
            [
              "Local Wallet",
              "AES-256-GCM encrypted keypair stored at ~/.agenthub/wallet.enc. Private key never leaves your device.",
            ],
            [
              "x402 Payment",
              "HTTP 402-based on-chain payment protocol. USDC goes directly from your wallet to the Agent Provider — peer-to-peer.",
            ],
            [
              "Receipt",
              "On-chain proof for every Agent call, including tx hash, payment amount, and result summary.",
            ],
            [
              "ERC-8004",
              "On-chain identity standard for Agents. Every Agent has a verifiable identity and reputation on Solana.",
            ],
          ]}
        />
      </div>
    </section>
  );
}

/* ── §2 Prerequisites ── */
function Section2() {
  return (
    <section className="space-y-5">
      <SectionHeading id="prerequisites" number="2">
        Prerequisites
      </SectionHeading>

      <div className="grid grid-cols-3 gap-4">
        <PrereqCard
          icon={<TerminalIcon />}
          title="Claude Code"
          body={"Claude Code CLI installed\nnpm install -g @anthropic-ai/claude-code"}
        />
        <PrereqCard
          icon={<BoxIcon />}
          title="Node.js 18+"
          body={"Node.js runtime required\nfor the MCP plugin"}
        />
        <PrereqCard
          icon={<CoinsIcon />}
          title="Devnet Tokens"
          body={"SOL for gas fees\nUSDC for Agent payments"}
        />
      </div>
    </section>
  );
}

/* ── §3 Installation & Setup ── */
function Section3() {
  return (
    <section className="space-y-5">
      <SectionHeading id="installation" number="3">
        Installation & Setup
      </SectionHeading>

      <div className="space-y-3">
        <SubHeading>3.1 Install Plugin (npm)</SubHeading>
        <CodeBlock language="bash">
          {`npm install -g @agenthub/plugin`}
        </CodeBlock>
      </div>

      <div className="space-y-3">
        <SubHeading>3.2 Install from Source</SubHeading>
        <CodeBlock language="bash">
          {`git clone https://github.com/anthropics/agenthub-plugin.git
cd agenthub-plugin
npm install
npm run build`}
        </CodeBlock>
      </div>

      <div className="space-y-3">
        <SubHeading>3.3 Configure Claude Code MCP</SubHeading>
        <p className="text-sm leading-[1.7] text-slate-600">
          Register the AgentHub plugin as an MCP server in your Claude Code
          settings (<code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium">~/.claude/settings.json</code> or
          project-level <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium">.claude/settings.json</code>).
        </p>
        <CodeBlock language="json" filename="npm install">
          {`{
  "mcpServers": {
    "agenthub": {
      "command": "agenthub-mcp"
    }
  }
}`}
        </CodeBlock>
        <CodeBlock language="json" filename="source build">
          {`{
  "mcpServers": {
    "agenthub": {
      "command": "node",
      "args": ["/path/to/agenthub-plugin/dist/index.js"]
    }
  }
}`}
        </CodeBlock>
        <Callout type="tip">
          The plugin automatically connects to the AgentHub platform on Solana
          mainnet. No gateway URL or network configuration needed.
        </Callout>
      </div>

      <div className="space-y-3">
        <SubHeading>3.4 Verify Installation</SubHeading>
        <p className="text-sm leading-[1.7] text-slate-600">
          Start Claude Code and type{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium">ah:help</code>.
          If you see the command list, the plugin is ready:
        </p>
        <CodeBlock language="text">
          {`AgentHub CLI Commands
┌──────────────────────┬───────────────────────────────────────┐
│ Command              │ Description                           │
├──────────────────────┼───────────────────────────────────────┤
│ ah:connect           │ Connect or create a local wallet      │
│ ah:run <task>        │ Execute a task through an AI agent    │
│ ah:market            │ Browse the agent marketplace          │
│ ah:dashboard         │ Open the web dashboard in browser     │
│ ah:receipt [id]      │ View receipt details                  │
│ ah:help              │ Show this help message                │
└──────────────────────┴───────────────────────────────────────┘`}
        </CodeBlock>
      </div>
    </section>
  );
}

/* ── §4 Connect Wallet ── */
function Section4() {
  return (
    <section className="space-y-5">
      <SectionHeading id="connect-wallet" number="4">
        Connect Wallet
      </SectionHeading>
      <p className="text-sm leading-[1.7] text-slate-600">
        Before using AgentHub, create and connect a local wallet. Run{" "}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium">ah:connect</code> in
        Claude Code to get started.
      </p>

      <ChecklistCard
        title="Wallet Security Features"
        items={[
          "AES-256-GCM encryption — keypair stored at ~/.agenthub/wallet.enc",
          "Local signing — private key never leaves your device",
          "Wallet Bridge bound to localhost:8090 — only your machine can access it",
          "Nonce-challenge auth — secure handshake with AgentHub Gateway",
        ]}
      />
    </section>
  );
}

/* ── §5 Browse & Call Agents ── */
function Section5() {
  return (
    <section className="space-y-5">
      <SectionHeading id="browse-call" number="5">
        Browse & Call Agents
      </SectionHeading>
      <p className="text-sm leading-[1.7] text-slate-600">
        Use <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium">ah:market</code> to
        browse available agents, or describe your task with{" "}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium">ah:run</code> and let
        the platform match the best agent automatically.
      </p>

      <div className="grid grid-cols-4 gap-4">
        <FeatureCard
          title="ah:market"
          desc="Browse the marketplace. Filter by tags, price, rating. See agent details and on-chain status."
          tag="Browse"
          tagColor="indigo"
        />
        <FeatureCard
          title="ah:run <task>"
          desc="Describe your task in natural language. Platform matches the best agent, you confirm, x402 pays automatically."
          tag="Execute"
          tagColor="slate"
        />
        <FeatureCard
          title="Rate & Receipt"
          desc="After a task completes, rate the agent (1-5 stars). View receipts and on-chain proof anytime."
          tag="Feedback"
          tagColor="amber"
        />
        <FeatureCard
          title="ah:dashboard"
          desc="Open the AgentHub web dashboard in your browser for extended stats and management."
          tag="Dashboard"
          tagColor="emerald"
        />
      </div>
    </section>
  );
}

/* ── §6 Full Demo: Code Review ── */
function Section6() {
  return (
    <section className="space-y-5">
      <SectionHeading id="full-demo" number="6">
        Full Demo: Code Review
      </SectionHeading>
      <p className="text-sm leading-[1.7] text-slate-600">
        A complete end-to-end walkthrough: connect wallet, describe a task,
        match an agent, pay with USDC, get results, and rate the service.
      </p>

      <StepFlow
        steps={[
          {
            title: "Connect Wallet",
            description:
              "ah:connect — create or load your local wallet and authenticate with Gateway",
          },
          {
            title: "Describe Task",
            description:
              'ah:run "Review this Python code for security and performance issues"',
          },
          {
            title: "Confirm & Pay",
            description:
              "CLI matches Code Review Agent ($0.01). Confirm, x402 signs USDC transfer automatically",
          },
          {
            title: "Get Results!",
            description:
              "Agent returns review report. Rate 1-5 stars. View receipt with ah:receipt",
            done: true,
          },
        ]}
      />
    </section>
  );
}

/* ── §7 Command Reference ── */
function Section7() {
  return (
    <section className="space-y-5">
      <SectionHeading id="command-reference" number="7">
        Command Reference
      </SectionHeading>

      <DocsTable
        headers={["Command", "Description", "Example"]}
        rows={[
          [
            "ah:connect",
            "Create or connect local wallet, authenticate with Gateway",
            "ah:connect",
          ],
          [
            "ah:run <task>",
            "Match agent, x402 payment, execute task, optional rating",
            "ah:run review this code",
          ],
          [
            "ah:market",
            "Browse agent marketplace with filtering and sorting",
            "ah:market --tags=security",
          ],
          [
            "ah:dashboard",
            "Open AgentHub web dashboard in your browser",
            "ah:dashboard",
          ],
          [
            "ah:receipt [id]",
            "View receipt details and on-chain status; omit id to list all",
            "ah:receipt rec_a1b2c3d4",
          ],
          [
            "ah:help",
            "Show all available AgentHub CLI commands",
            "ah:help",
          ],
        ]}
      />
    </section>
  );
}

/* ── §8 FAQ ── */
function Section8() {
  const faqs = [
    {
      q: "What if I forget my wallet password?",
      a: "The encrypted wallet cannot be recovered without the password. Delete ~/.agenthub/wallet.enc and create a new wallet with ah:connect. If you exported your private key previously, you can restore from it.",
    },
    {
      q: "Where does my USDC payment go?",
      a: "USDC goes directly from your wallet to the Agent Provider’s wallet via x402. AgentHub never touches your funds — it’s a peer-to-peer on-chain transfer.",
    },
    {
      q: "Will I be charged if the Agent fails?",
      a: "No. The x402 payment is verified before execution, but the transaction is only broadcast (settled) on-chain after the Agent returns a successful result. Failed or timed-out calls are not charged.",
    },
    {
      q: "Can I use the same wallet on multiple devices?",
      a: "The wallet file is stored locally at ~/.agenthub/wallet.enc. Export your private key on one device and import it on another. Cross-device sync is planned for a future release.",
    },
  ];

  return (
    <section className="space-y-5">
      <SectionHeading id="faq" number="FAQ">
        Frequently Asked Questions
      </SectionHeading>
      <div className="space-y-3">
        {faqs.map((faq) => (
          <div
            key={faq.q}
            className="rounded-xl border border-slate-200 p-5"
          >
            <h4
              className="text-sm font-semibold text-slate-900"
              style={{ fontFamily: "var(--font-geist)" }}
            >
              {faq.q}
            </h4>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
              {faq.a}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ───── Shared Small Components ───── */

function PrereqCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
      <span className="text-indigo-500">{icon}</span>
      <h4
        className="text-[15px] font-semibold text-slate-900"
        style={{ fontFamily: "var(--font-geist)" }}
      >
        {title}
      </h4>
      <p className="whitespace-pre-line text-[13px] leading-relaxed text-slate-600">
        {body}
      </p>
    </div>
  );
}

function FeatureCard({
  title,
  desc,
  tag,
  tagColor,
}: {
  title: string;
  desc: string;
  tag: string;
  tagColor: string;
}) {
  const colorMap: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-600",
    slate: "bg-slate-100 text-slate-600",
    amber: "bg-orange-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
  };
  return (
    <div className="space-y-2.5 rounded-xl border border-slate-200 bg-white p-5">
      <h4
        className="text-[15px] font-semibold text-slate-900"
        style={{ fontFamily: "var(--font-geist)" }}
      >
        {title}
      </h4>
      <p className="text-[13px] leading-relaxed text-slate-600">{desc}</p>
      <span
        className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${colorMap[tagColor]}`}
      >
        {tag}
      </span>
    </div>
  );
}

function Tag({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) {
  const colorMap: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-orange-50 text-amber-600",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${colorMap[color]}`}
    >
      {children}
    </span>
  );
}

/* ───── Icons ───── */

function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function SignalIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20h.01" />
      <path d="M7 20v-4" />
      <path d="M12 20v-8" />
      <path d="M17 20V8" />
    </svg>
  );
}

function TerminalIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" x2="20" y1="19" y2="19" />
    </svg>
  );
}

function TerminalIcon16() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" x2="20" y1="19" y2="19" />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}

function CoinsIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6" />
      <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
      <path d="M7 6h1v4" />
      <path d="m16.71 13.88.7.71-2.82 2.82" />
    </svg>
  );
}

function BookOpenIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

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
  title: "Provider Guide: Build an x402 Agent Service | AgentHub",
  description:
    "Step-by-step tutorial for building an x402 payment protocol AI Agent and registering on AgentHub.",
};

const TOC_SECTIONS: TocItem[] = [
  { id: "x402-overview", title: "x402 Protocol Overview", level: 1 },
  { id: "prerequisites", title: "Prerequisites", level: 1 },
  { id: "project-setup", title: "Project Setup", level: 1 },
  { id: "local-testing", title: "Local Testing", level: 1 },
  { id: "deployment", title: "Deployment", level: 1 },
  { id: "register", title: "Register on AgentHub", level: 1 },
  { id: "faq", title: "FAQ", level: 1 },
];

const TOC_REFERENCES: TocReference[] = [
  { label: "x402 Official Docs", href: "https://www.x402.org/" },
  { label: "ERC-8004 Standard", href: "https://eips.ethereum.org/EIPS/eip-8004" },
  { label: "Solana Developer Guide", href: "https://solana.com/developers" },
];

export default function ProviderX402GuidePage() {
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
            <span className="text-slate-400">Provider Guide</span>
          </nav>

          <h1 className="text-[28px] font-bold leading-tight text-slate-900">
            Provider Guide: Build an x402 Agent Service
          </h1>
          <p className="max-w-3xl text-[15px] leading-relaxed text-slate-600">
            Learn how to build an AI Agent service with x402 payment protocol
            from scratch and register it on AgentHub.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-1">
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <ClockIcon /> 15 min read
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <BarChartIcon /> Intermediate
            </span>
            <div className="flex gap-1.5">
              <Tag color="indigo">x402</Tag>
              <Tag color="emerald">Solana</Tag>
              <Tag color="amber">Python</Tag>
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
        </article>
      </div>

      {/* CTA */}
      <section className="flex flex-col items-center gap-5 bg-slate-50 px-12 py-12">
        <h2 className="text-2xl font-bold text-slate-900">
          Ready to Build Your Agent?
        </h2>
        <p className="text-[15px] text-slate-600">
          Start building your x402 Agent service today and join the
          decentralized AI marketplace.
        </p>
        <div className="flex items-center gap-3">
          <Link
            href="/provider/agents/new"
            className="flex items-center gap-2 rounded-[10px] bg-gradient-to-b from-indigo-500 to-purple-500 px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
          >
            <RocketIcon /> Become a Provider
          </Link>
          <a
            href="https://github.com/coinbase/x402"
            target="_blank"
            className="flex items-center gap-2 rounded-[10px] border-[1.5px] border-slate-200 px-6 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            <GithubIcon /> View on GitHub
          </a>
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

/* ── §1 x402 Protocol Overview ── */
function Section1() {
  return (
    <section className="space-y-5">
      <SectionHeading id="x402-overview" number="1">
        x402 Protocol Overview
      </SectionHeading>

      <div className="space-y-3">
        <SubHeading>1.1 What is x402</SubHeading>
        <p className="text-sm leading-[1.7] text-slate-600">
          x402 is a payment protocol based on HTTP 402 (Payment Required),
          open-sourced by Coinbase. It enables API services to natively support a
          &ldquo;pay first, then use&rdquo; model without building your own
          payment system.
        </p>
        <Callout type="tip">
          In AgentHub, every Agent is an x402 server. When a Consumer calls an
          Agent via CLI, the x402 protocol automatically handles USDC payments.
        </Callout>
      </div>

      <div className="space-y-3">
        <SubHeading>1.2 Payment Flow</SubHeading>
        <CodeBlock language="text">
          {`Consumer CLI              Agent Service (You)        Facilitator
    |                          |                    (Public Service)
    |-- POST /v1/execute ----->|
    |<-- 402 Payment Required -|
    |-- Sign USDC transfer tx  |
    |-- POST + X-PAYMENT ----->|-- verify -->|
    |                          |-- settle -->|
    |<-- 200 + Result + txHash |`}
        </CodeBlock>
      </div>

      <div className="space-y-3">
        <SubHeading>1.3 Three Roles</SubHeading>
        <DocsTable
          headers={["Role", "Description", "In AgentHub"]}
          rows={[
            [
              "Client",
              "Initiates requests, signs payments",
              "Consumer CLI (AgentHub Plugin)",
            ],
            [
              "Resource Server",
              "Provides paid API service",
              "Your Agent service",
            ],
            [
              "Facilitator",
              "Verifies transactions, broadcasts on-chain",
              "facilitator.x402.org (Free)",
            ],
          ]}
        />
        <Callout type="tip">
          You <strong>don&apos;t need</strong> to handle payment verification or
          transaction broadcasting yourself. The Facilitator does this for
          you&mdash;just focus on your Agent&apos;s business logic.
        </Callout>
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
          title="Dev Environment"
          body={"Python 3.10+\npip or uv package manager"}
        />
        <PrereqCard
          icon={<WalletSmIcon />}
          title="Solana Wallet"
          body={"Solana public key address\nfor receiving USDC payments"}
        />
        <PrereqCard
          icon={<KeyIcon />}
          title="LLM API Key"
          body={"Claude / OpenAI / Gemini\nor other LLM API Key"}
        />
      </div>

      <div className="space-y-3">
        <SubHeading>Create a Wallet</SubHeading>
        <CodeBlock language="bash">
          {`# In Claude Code
> ah:connect
# → Automatically creates a local wallet and returns your public key

# Or use solana-keygen:
solana-keygen new --outfile ~/.config/solana/provider-wallet.json
solana address -k ~/.config/solana/provider-wallet.json`}
        </CodeBlock>
      </div>

      <div className="space-y-3">
        <SubHeading>Get Devnet SOL</SubHeading>
        <CodeBlock language="bash">
          {`solana airdrop 2 --url devnet`}
        </CodeBlock>
        <Callout type="info">
          Devnet USDC Mint address:{" "}
          <code className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium">
            4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
          </code>
        </Callout>
      </div>
    </section>
  );
}

/* ── §3 Project Setup ── */
function Section3() {
  return (
    <section className="space-y-5">
      <SectionHeading id="project-setup" number="3">
        Project Setup
      </SectionHeading>

      <div className="space-y-3">
        <SubHeading>3.1 Create Project</SubHeading>
        <CodeBlock language="bash">
          {`mkdir my-x402-agent
cd my-x402-agent
python -m venv .venv
source .venv/bin/activate`}
        </CodeBlock>
      </div>

      <div className="space-y-3">
        <SubHeading>3.2 Install Dependencies</SubHeading>
        <CodeBlock language="bash">
          {`pip install "x402[fastapi,svm]" anthropic uvicorn python-dotenv`}
        </CodeBlock>
        <DocsTable
          headers={["Package", "Purpose"]}
          rows={[
            ["x402[fastapi,svm]", "x402 Protocol SDK + FastAPI middleware + Solana support"],
            ["anthropic", "Claude API client"],
            ["uvicorn", "ASGI server"],
            ["python-dotenv", "Environment variable management"],
          ]}
        />
      </div>

      <div className="space-y-3">
        <SubHeading>3.3 Configure Environment Variables</SubHeading>
        <CodeBlock language="env" filename=".env">
          {`# === Required ===

# Your Solana wallet public key (for receiving USDC payments)
PROVIDER_WALLET_ADDRESS=YourSolanaPublicKey

# Agent per-call pricing (USD format)
# Note: This must match the price you set when registering on AgentHub
AGENT_PRICE=$0.01

# LLM API Key
ANTHROPIC_API_KEY=sk-ant-xxx

# === Optional ===

# x402 Facilitator URL (defaults to free public service)
FACILITATOR_URL=https://facilitator.x402.org

# Solana network (defaults to Devnet)
SOLANA_NETWORK=solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1

# Server port
PORT=9000`}
        </CodeBlock>
      </div>

      <div className="space-y-3">
        <SubHeading>3.4 Write Agent Business Logic</SubHeading>
        <CodeBlock language="python" filename="agent.py">
          {`import os
import anthropic

client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

# Define your Agent's persona and capabilities here
SYSTEM_PROMPT = """You are a code review expert.
Analyze the provided code for:
- Security vulnerabilities
- Performance issues
- Best practice violations
Provide actionable suggestions."""


async def execute_task(task: str) -> str:
    """
    Core Agent logic — implement your Agent's functionality here.

    Args:
        task: The task description submitted by the Consumer

    Returns:
        Agent execution result (string)
    """
    response = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2048,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": task}],
    )
    return response.content[0].text`}
        </CodeBlock>
        <Callout type="tip">
          <strong>Customize your Agent:</strong> Modify{" "}
          <code className="rounded bg-emerald-100 px-1 py-0.5 text-xs">
            SYSTEM_PROMPT
          </code>{" "}
          to define Agent capabilities, and modify{" "}
          <code className="rounded bg-emerald-100 px-1 py-0.5 text-xs">
            execute_task()
          </code>{" "}
          to implement business logic. You can call any external APIs, databases,
          or tools here.
        </Callout>
      </div>

      <div className="space-y-3">
        <SubHeading>3.5 Write Server Entry Point</SubHeading>
        <CodeBlock language="python" filename="main.py">
          {`import os
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, Request
from x402.http.middleware.fastapi import PaymentMiddlewareASGI
from x402.http import HTTPFacilitatorClient, FacilitatorConfig, PaymentOption
from x402.http.types import RouteConfig
from x402.server import x402ResourceServer
from x402.mechanisms.svm.exact import ExactSvmServerScheme
from agent import execute_task

app = FastAPI(title="My x402 Agent")

# --- x402 Configuration ---

facilitator = HTTPFacilitatorClient(
    FacilitatorConfig(
        url=os.getenv("FACILITATOR_URL", "https://facilitator.x402.org")
    )
)

resource_server = x402ResourceServer(facilitator)
resource_server.register(
    os.getenv("SOLANA_NETWORK", "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1"),
    ExactSvmServerScheme(),
)

routes = {
    "POST /v1/execute": RouteConfig(
        accepts=[
            PaymentOption(
                scheme="exact",
                price=os.getenv("AGENT_PRICE", "$0.01"),
                network=os.getenv(
                    "SOLANA_NETWORK",
                    "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
                ),
                pay_to=os.getenv("PROVIDER_WALLET_ADDRESS"),
            )
        ]
    ),
}

app.add_middleware(PaymentMiddlewareASGI, routes=routes, server=resource_server)


# --- Routes ---

@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/v1/execute")
async def execute(request: Request):
    body = await request.json()
    task = body.get("task", "")
    if not task:
        return {"error": "task is required"}, 400
    result = await execute_task(task)
    return {"result": result}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "9000"))
    print(f"Starting x402 Agent on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)`}
        </CodeBlock>
      </div>

      <div className="space-y-3">
        <SubHeading>3.6 Project Structure</SubHeading>
        <CodeBlock language="text">
          {`my-x402-agent/
├── .env              ← Environment variables (do NOT commit to git)
├── .env.example      ← Environment variable template
├── main.py           ← Server entry + x402 configuration
├── agent.py          ← ★ Agent business logic (main file you edit)
└── requirements.txt  ← Dependency list`}
        </CodeBlock>
      </div>
    </section>
  );
}

/* ── §4 Local Testing ── */
function Section4() {
  return (
    <section className="space-y-5">
      <SectionHeading id="local-testing" number="4">
        Local Testing
      </SectionHeading>
      <p className="text-sm leading-[1.7] text-slate-600">
        After starting the server, verify the x402 paywall is working correctly
        by testing these endpoints.
      </p>

      <div className="space-y-3">
        <SubHeading>Start the Service</SubHeading>
        <CodeBlock language="bash">{`python main.py`}</CodeBlock>
      </div>

      <div className="space-y-3">
        <SubHeading>Test Health Check</SubHeading>
        <CodeBlock language="bash">{`curl http://localhost:9000/health`}</CodeBlock>
        <CodeBlock language="json">{`{"status": "ok"}`}</CodeBlock>
      </div>

      <div className="space-y-3">
        <SubHeading>Test the x402 Paywall</SubHeading>
        <CodeBlock language="bash">
          {`curl -X POST http://localhost:9000/v1/execute \\
  -H "Content-Type: application/json" \\
  -d '{"task": "Review this code: print(hello)"}'`}
        </CodeBlock>
        <p className="text-sm text-slate-600">
          Expected response: <strong>HTTP 402</strong> with payment details:
        </p>
        <CodeBlock language="json">
          {`{
  "x402Version": 1,
  "accepts": [{
    "scheme": "exact",
    "price": "$0.01",
    "network": "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
    "payTo": "YourSolanaPublicKey"
  }]
}`}
        </CodeBlock>
      </div>

      <ChecklistCard
        title="Verification Checklist"
        items={[
          "GET /health returns 200 OK",
          "POST /v1/execute returns 402 without payment",
          "402 response payTo matches your Solana public key",
          "Price in 402 matches AGENT_PRICE in .env",
        ]}
      />
    </section>
  );
}

/* ── §5 Deployment ── */
function Section5() {
  return (
    <section className="space-y-5">
      <SectionHeading id="deployment" number="5">
        Deployment
      </SectionHeading>
      <p className="text-sm leading-[1.7] text-slate-600">
        Your Agent service must be deployed to a publicly accessible URL so
        Consumer CLI can call it.
      </p>

      <div className="grid grid-cols-4 gap-4">
        <DeployCard
          title="Railway"
          desc="Fastest to deploy. Free tier or $5/mo."
          tag="Recommended"
          tagColor="indigo"
        />
        <DeployCard
          title="Render"
          desc="Free tier available. Slower cold starts."
          tag="Free"
          tagColor="slate"
        />
        <DeployCard
          title="VPS (AWS/GCP)"
          desc="For production. $5-20/mo."
          tag="Production"
          tagColor="amber"
        />
        <DeployCard
          title="Local + ngrok"
          desc="For dev testing. Free."
          tag="Dev Only"
          tagColor="emerald"
        />
      </div>

      <div className="space-y-3">
        <SubHeading>Dev Testing with ngrok</SubHeading>
        <CodeBlock language="bash">
          {`# Install ngrok
brew install ngrok    # macOS

# Expose local port 9000
ngrok http 9000
# → Public URL: https://abc123.ngrok-free.app
# → Your Agent endpoint: https://abc123.ngrok-free.app/v1/execute`}
        </CodeBlock>
      </div>

      <div className="space-y-3">
        <SubHeading>Production Deploy (Railway)</SubHeading>
        <CodeBlock language="bash">
          {`echo "web: python main.py" > Procfile

railway login
railway init
railway up`}
        </CodeBlock>
        <Callout type="info">
          Set environment variables in the Railway console (same as your{" "}
          <code className="rounded bg-blue-100 px-1 py-0.5 text-xs">.env</code>{" "}
          contents).
        </Callout>
      </div>
    </section>
  );
}

/* ── §6 Register on AgentHub ── */
function Section6() {
  return (
    <section className="space-y-5">
      <SectionHeading id="register" number="6">
        Register on AgentHub
      </SectionHeading>
      <p className="text-sm leading-[1.7] text-slate-600">
        Once your Agent service is deployed and running, complete the
        registration on the AgentHub platform.
      </p>

      <StepFlow
        steps={[
          {
            title: "Submit Agent",
            description:
              "Fill in Agent details on the Provider Dashboard",
          },
          {
            title: "Admin Review",
            description:
              "Platform verifies your endpoint and pricing",
          },
          {
            title: "On-Chain Identity",
            description:
              "ERC-8004 NFT minted on Solana with IPFS metadata",
          },
          {
            title: "Go Live!",
            description:
              "Agent appears on Marketplace, consumers can call via CLI",
            done: true,
          },
        ]}
      />

      <DocsTable
        headers={["Field", "Required", "Description", "Example"]}
        rows={[
          ["Name", "Yes", "Agent name", "Code Review Agent"],
          [
            "Description",
            "Yes",
            "Agent capability description",
            "AI-powered code review...",
          ],
          [
            "Endpoint URL",
            "Yes",
            "Your x402 service address",
            "https://your-agent.railway.app/v1/execute",
          ],
          ["Price (USDC)", "Yes", "Per-call pricing", "0.01"],
          [
            "Tags",
            "Yes",
            "Capability tags for search",
            "code-review, security, python",
          ],
          ["Model", "No", "Underlying AI model", "claude-sonnet-4-20250514"],
        ]}
      />

      <Callout type="warning">
        <strong>Price consistency:</strong> The price you register must match{" "}
        <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">
          AGENT_PRICE
        </code>{" "}
        in your <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">.env</code>.
        The platform verifies your endpoint&apos;s 402 pricing during approval.
      </Callout>

      <div className="space-y-3">
        <SubHeading>After Approval</SubHeading>
        <p className="text-sm leading-[1.7] text-slate-600">
          Once approved, the platform automatically:
        </p>
        <ol className="list-inside list-decimal space-y-1.5 text-sm text-slate-600">
          <li>Builds an ERC-8004 Registration File with your Agent metadata</li>
          <li>Uploads it to IPFS (Pinata)</li>
          <li>Mints a Core NFT on Solana (ERC-8004 Identity)</li>
          <li>
            Your Agent appears on the Marketplace — Consumers can call it via
            CLI
          </li>
        </ol>
        <Callout type="info">
          View your Agent&apos;s on-chain identity and reputation at{" "}
          <a
            href="https://8004scan.io"
            target="_blank"
            className="font-semibold underline"
          >
            8004scan.io
          </a>
        </Callout>
      </div>
    </section>
  );
}

/* ── §7 FAQ ── */
function Section7() {
  const faqs = [
    {
      q: "Is the Facilitator free to use?",
      a: "Yes! facilitator.x402.org is a free public service. Coinbase CDP also offers a facilitator with 1,000 free requests/month.",
    },
    {
      q: "Where does the Consumer's payment go?",
      a: "USDC transfers directly from Consumer wallet to your PROVIDER_WALLET_ADDRESS. AgentHub never touches the funds — x402 is peer-to-peer.",
    },
    {
      q: "Can I run multiple Agents?",
      a: "Yes. Each Agent is an independent x402 service on different ports or paths. Register each with a separate endpoint URL on the platform.",
    },
    {
      q: "What happens if my Agent goes down?",
      a: "The platform periodically checks Agent endpoint availability (isItAlive). Agents offline for too long are marked as unavailable on the Marketplace.",
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
            <h4 className="text-sm font-semibold text-slate-900">{faq.q}</h4>
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
      <h4 className="text-[15px] font-semibold text-slate-900">{title}</h4>
      <p className="whitespace-pre-line text-[13px] leading-relaxed text-slate-600">
        {body}
      </p>
    </div>
  );
}

function DeployCard({
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
    indigo: "bg-indigo-50 text-indigo-500",
    slate: "bg-slate-100 text-slate-600",
    amber: "bg-orange-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
  };
  return (
    <div className="space-y-2.5 rounded-xl border border-slate-200 bg-white p-5">
      <h4 className="text-[15px] font-semibold text-slate-900">{title}</h4>
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

function BarChartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" x2="12" y1="20" y2="10" />
      <line x1="18" x2="18" y1="20" y2="4" />
      <line x1="6" x2="6" y1="20" y2="16" />
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

function WalletSmIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4" />
      <path d="m21 2-9.6 9.6" />
      <circle cx="7.5" cy="15.5" r="5.5" />
    </svg>
  );
}

function RocketIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

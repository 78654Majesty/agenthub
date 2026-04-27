"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  createAgent,
  updateAgent,
  type ProviderAgentDetail,
  type UpsertProviderAgentPayload,
} from "@/lib/api/provider";

type AgentFormMode = "create" | "edit";

type AgentFormProps = {
  mode: AgentFormMode;
  initialAgent?: ProviderAgentDetail;
  resubmit?: boolean;
};

function splitCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function microFromUsdc(value: string) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return null;
  }
  return Math.round(numeric * 1_000_000);
}

export function AgentForm({ mode, initialAgent, resubmit = false }: AgentFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialAgent?.name ?? "");
  const [description, setDescription] = useState(initialAgent?.description ?? "");
  const [capabilityTags, setCapabilityTags] = useState((initialAgent?.capability_tags ?? []).join(", "));
  const [endpointUrl, setEndpointUrl] = useState(initialAgent?.endpoint_url ?? "");
  const [priceUsdc, setPriceUsdc] = useState(
    initialAgent ? initialAgent.price_usdc.toFixed(2) : "2.50",
  );
  const [skills, setSkills] = useState((initialAgent?.skills ?? []).join(", "));
  const [domains, setDomains] = useState((initialAgent?.domains ?? []).join(", "));
  const [inputSchema, setInputSchema] = useState(initialAgent?.input_schema ?? "");
  const [outputFormat, setOutputFormat] = useState(initialAgent?.output_format ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitLabel = useMemo(() => {
    if (mode === "create") {
      return "Submit for Review";
    }
    if (resubmit) {
      return "Resubmit Agent";
    }
    return "Save Changes";
  }, [mode, resubmit]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const priceUsdcMicro = microFromUsdc(priceUsdc);
    if (!priceUsdcMicro) {
      setError("Price per call must be a valid USDC amount.");
      return;
    }

    const payload: UpsertProviderAgentPayload = {
      name: name.trim(),
      description: description.trim(),
      capability_tags: splitCsv(capabilityTags),
      endpoint_url: endpointUrl.trim(),
      price_usdc_micro: priceUsdcMicro,
      skills: splitCsv(skills),
      domains: splitCsv(domains),
      input_schema: inputSchema.trim() || null,
      output_format: outputFormat.trim() || null,
      ...(resubmit ? { resubmit: true } : {}),
    };

    if (
      !payload.name ||
      !payload.description ||
      payload.capability_tags.length === 0 ||
      !payload.endpoint_url ||
      payload.skills.length === 0 ||
      payload.domains.length === 0
    ) {
      setError("Please complete all required fields.");
      return;
    }

    setSubmitting(true);

    try {
      const result =
        mode === "create"
          ? await createAgent(payload)
          : await updateAgent(initialAgent!.id, payload);

      router.push(`/dashboard/agents/${result.id}`);
      router.refresh();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error ? submissionError.message : "Unable to save agent.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-5 space-y-6 rounded-xl border border-[#E2E8F0] bg-white p-6">
      <div className="rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] p-4 text-[#1E40AF]">
        <p className="inline-flex items-center gap-2 text-[15px] font-semibold">
          <ShieldIcon />
          x402 Payment Protocol Required
        </p>
        <p className="mt-1 text-[13px]">
          Your Agent endpoint must return HTTP 402 with pricing information when no X-PAYMENT header is
          provided.
        </p>
      </div>

      <SectionTitle>Basic Information</SectionTitle>
      <Field label="Agent Name *">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="h-10 w-full rounded-lg border border-[#E2E8F0] px-3 text-[14px] outline-none"
          placeholder="e.g. Contract Sentinel"
        />
      </Field>
      <Field label="Description *">
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="h-20 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-[14px] outline-none"
          placeholder="Describe what your agent does, its capabilities, and use cases..."
        />
      </Field>
      <Field label="Capability Tags *">
        <input
          value={capabilityTags}
          onChange={(event) => setCapabilityTags(event.target.value)}
          className="h-10 w-full rounded-lg border border-[#E2E8F0] px-3 text-[14px] outline-none"
          placeholder="security, audit, solana"
        />
        <p className="mt-1 text-[12px] text-[#94A3B8]">Comma-separated. Max 5 tags recommended.</p>
      </Field>

      <hr className="border-[#E2E8F0]" />

      <SectionTitle>x402 Endpoint Configuration</SectionTitle>
      <Field label="Endpoint URL *">
        <input
          value={endpointUrl}
          onChange={(event) => setEndpointUrl(event.target.value)}
          className="h-10 w-full rounded-lg border border-[#E2E8F0] px-3 text-[14px] outline-none"
          placeholder="https://your-agent.example.com/execute"
        />
      </Field>
      <Field label="Price per Call (USDC) *">
        <input
          value={priceUsdc}
          onChange={(event) => setPriceUsdc(event.target.value)}
          className="h-10 w-full rounded-lg border border-[#E2E8F0] px-3 text-[14px] outline-none"
          placeholder="2.50"
        />
      </Field>

      <hr className="border-[#E2E8F0]" />

      <SectionTitle>ERC-8004 On-Chain Classification</SectionTitle>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Skills *">
          <input
            value={skills}
            onChange={(event) => setSkills(event.target.value)}
            className="h-10 w-full rounded-lg border border-[#E2E8F0] px-3 text-[14px] outline-none"
            placeholder="nlp/code_review, security/vulnerability_scan"
          />
        </Field>
        <Field label="Domains *">
          <input
            value={domains}
            onChange={(event) => setDomains(event.target.value)}
            className="h-10 w-full rounded-lg border border-[#E2E8F0] px-3 text-[14px] outline-none"
            placeholder="technology/software_engineering, finance/defi"
          />
        </Field>
      </div>

      <hr className="border-[#E2E8F0]" />

      <SectionTitle>API Schema (Optional)</SectionTitle>
      <Field label="Input Schema (JSON)">
        <textarea
          value={inputSchema}
          onChange={(event) => setInputSchema(event.target.value)}
          className="h-16 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 font-mono text-[13px] outline-none"
          placeholder='{ "type": "object", "properties": { ... } }'
        />
      </Field>
      <Field label="Output Format (JSON)">
        <textarea
          value={outputFormat}
          onChange={(event) => setOutputFormat(event.target.value)}
          className="h-16 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 font-mono text-[13px] outline-none"
          placeholder='{ "type": "object", "properties": { ... } }'
        />
      </Field>

      {error ? <p className="text-[13px] text-[#DC2626]">{error}</p> : null}

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.push("/dashboard/agents")}
          className="rounded-lg border border-[#CBD5E1] bg-white px-5 py-2 text-[13px] font-semibold text-[#64748B]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-[#6366F1] px-5 py-2 text-[13px] font-semibold text-white disabled:opacity-70"
        >
          {submitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[22px] font-semibold text-[#0F172A]">{children}</h2>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[13px] font-medium text-[#334155]">{label}</span>
      {children}
    </label>
  );
}

function ShieldIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3.5 5 7v5.5c0 4.2 2.99 6.96 7 8 4.01-1.04 7-3.8 7-8V7l-7-3.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

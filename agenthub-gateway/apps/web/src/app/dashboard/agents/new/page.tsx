import { AgentForm } from "@/components/provider/agent-form";

export default function NewAgentPage() {
  return (
    <section>
      <h1 className="text-[28px] font-bold leading-tight text-[#0F172A]">Submit New Agent</h1>
      <p className="mt-1 text-[14px] text-[#64748B]">
        Fill in the details below. Your agent will be reviewed by an admin before going live.
      </p>

      <AgentForm mode="create" />
    </section>
  );
}

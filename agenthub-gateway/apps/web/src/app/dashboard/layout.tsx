import { ProviderDashboardShell } from "@/components/provider/dashboard-shell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProviderDashboardShell>{children}</ProviderDashboardShell>;
}


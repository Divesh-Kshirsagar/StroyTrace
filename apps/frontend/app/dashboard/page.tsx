import Dashboard from "@/features/dashboard/components/Dashboard";
import ClientErrorBoundary from "@/shared/components/ClientErrorBoundary";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard - Clarity",
};

export default function DashboardPage() {
  return (
    <ClientErrorBoundary>
      <Dashboard />
    </ClientErrorBoundary>
  );
}

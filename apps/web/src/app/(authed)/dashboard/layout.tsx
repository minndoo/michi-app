import { AuthedLayout } from "@/shared/ui/layouts/AuthedLayout";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthedLayout isDashboard>{children}</AuthedLayout>;
}

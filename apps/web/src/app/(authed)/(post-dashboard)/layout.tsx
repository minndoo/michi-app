import { AuthedLayout } from "@/shared/ui/layouts/AuthedLayout";

export default function PostDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthedLayout>{children}</AuthedLayout>;
}

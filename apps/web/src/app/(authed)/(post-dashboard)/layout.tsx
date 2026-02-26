import { AuthedLayout } from "@/shared/ui/layouts/AuthedLayout";

export default function PostDashboardLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <AuthedLayout>
      {modal}
      {children}
    </AuthedLayout>
  );
}

import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth0.getSession();
  const user = session?.user;

  if (!user) {
    // Get the current pathname to redirect back after login
    const headersList = await headers();
    const pathname = headersList.get("x-pathname") || "/dashboard";
    
    // Redirect to login with returnTo parameter
    redirect(`/auth/login?returnTo=${encodeURIComponent(pathname)}`);
  }

  return <div>{children}</div>;
}

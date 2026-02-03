import { auth0 } from "@/lib/auth0";

export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth0.getSession();
  const user = session?.user;

  if (!user) {
    return <div>Unauthorized</div>;
  }

  return <div>{children}</div>;
}

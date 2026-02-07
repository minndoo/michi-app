import { auth0 } from "@/lib/auth0";
import { HomepageScreen } from "@/features/homepage/HomepageScreen";

export default async function Home() {
  const session = await auth0.getSession();
  const user = session?.user;

  return <HomepageScreen />;
}

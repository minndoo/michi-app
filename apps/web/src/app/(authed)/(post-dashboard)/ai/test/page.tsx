import { auth0 } from "@/lib/auth0";
import { AiTestScreen } from "@/features/ai/AiTestScreen";

export default async function AiTestPage() {
  const session = await auth0.getSession();
  const auth0Id = session?.user.sub ?? "unknown-user";

  return <AiTestScreen auth0Id={auth0Id} />;
}

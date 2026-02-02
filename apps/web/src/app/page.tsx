import styles from "./page.module.css";
import { auth0 } from "@/lib/auth0";
import Profile from "@/components/Profile";
import LoginButton from "@/components/LoginButton";
import LogoutButton from "@/components/LogoutButton";

export default async function Home() {
  const session = await auth0.getSession();
  const user = session?.user;

  return (
    <div className={styles.page}>
      {user ? (
        <div>
          <Profile />
          <LogoutButton />
        </div>
      ) : (
        <LoginButton />
      )}
    </div>
  );
}

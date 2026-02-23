import { H2, XStack } from "@repo/ui";
import { ArrowLeft, Bell, Leaf, Menu } from "@repo/ui/icons";
import Link from "next/link";

type AuthedHeaderProps = {
  isDashboard?: boolean;
};

const Logo = () => (
  <XStack items="center" gap="$2">
    <Leaf size={24} color="$color8" />
    <H2 color="$color8" fontWeight="bold">
      Michi
    </H2>
  </XStack>
);

const BackToDashboard = () => (
  <Link href="/dashboard">
    <ArrowLeft size={24} />
  </Link>
);

export const AuthedHeader = ({ isDashboard = false }: AuthedHeaderProps) => {
  const HeaderLeft = isDashboard ? <Logo /> : <BackToDashboard />;
  return (
    <XStack items="flex-start" justify="space-between" py="$4" width="100%">
      {HeaderLeft}
      <XStack items="center" gap="$4">
        <Bell size={24} color="$color10" />
        <Menu size={24} color="$color10" />
      </XStack>
    </XStack>
  );
};

import { H2, XStack } from "@repo/ui";
import { ArrowLeft, Bell, Leaf, Menu } from "@repo/ui/icons";
import Link from "next/link";

type AuthedHeaderProps = {
  isDashboard?: boolean;
};

const Logo = () => (
  <XStack items="center" gap="$2">
    <Leaf size={24} color="$color10" />
    <H2 color="$color10" fontWeight="bold">
      Michi
    </H2>
  </XStack>
);

const BackToDashboard = () => (
  <Link href="/dashboard">
    <ArrowLeft size={24} color="$color12" />
  </Link>
);

export const AuthedHeader = ({ isDashboard = false }: AuthedHeaderProps) => {
  const HeaderLeft = isDashboard ? <Logo /> : <BackToDashboard />;
  return (
    <XStack items="flex-start" justify="space-between" py="$4" width="100%">
      {HeaderLeft}
      <XStack items="center" gap="$4">
        <Bell size={24} color="$color11" />
        <Menu size={24} color="$color11" />
      </XStack>
    </XStack>
  );
};

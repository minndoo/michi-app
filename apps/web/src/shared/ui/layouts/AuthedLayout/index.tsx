"use client";

import { YStack } from "@repo/ui";
import { AuthedHeader } from "./components/AuthedHeader";

type AuthedLayoutProps = {
  children: React.ReactNode;
  isDashboard?: boolean;
};

export const AuthedLayout = ({
  children,
  isDashboard = false,
}: AuthedLayoutProps) => {
  return (
    <YStack maxW="$screen.bigDesktop" px="$4" gap="$4" mx="auto" items="center">
      <AuthedHeader isDashboard={isDashboard} />
      <YStack width="100%" maxW="$screen.xl" mx="auto">
        {children}
      </YStack>
    </YStack>
  );
};

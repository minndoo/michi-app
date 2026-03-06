"use client";
import { YStack } from "@repo/ui";

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  return (
    <YStack minH="100vh" width="100%" bg="$color1">
      {children}
    </YStack>
  );
};

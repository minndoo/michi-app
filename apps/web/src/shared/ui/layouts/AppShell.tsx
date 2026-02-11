import { YStack } from "@repo/ui";

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  return (
    <YStack minH="100vh" bg="$background" items="center">
      {children}
    </YStack>
  );
};

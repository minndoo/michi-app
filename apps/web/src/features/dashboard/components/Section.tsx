import type { ReactNode } from "react";
import { Card, H2, Text, XStack, YStack } from "@repo/ui";

type SectionProps = {
  title: string;
  actionLabel?: string;
  children: ReactNode;
  contentGap?: "$1.5" | "$2" | "$3" | "$4";
};

export const Section = ({
  title,
  actionLabel = "VIEW ALL",
  children,
  contentGap = "$3",
}: SectionProps) => {
  return (
    <Card
      bg="$backgroundStrong"
      p="$5"
      rounded="$radius.6"
      borderWidth={1}
      borderColor="$borderColor"
      gap="$5"
    >
      <Card.Header p="$0">
        <XStack justify="space-between" items="center" minW="100%">
          <H2 color="$color" fontWeight="bold">
            {title}
          </H2>
          <Text color="$outlineColor">{actionLabel}</Text>
        </XStack>
      </Card.Header>
      <YStack gap={contentGap}>{children}</YStack>
    </Card>
  );
};

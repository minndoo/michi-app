import type { ReactNode } from "react";
import { Card, H3, Text, XStack, YStack } from "@repo/ui";
import Link, { type LinkProps } from "next/link";

type SectionProps = {
  title: string;
  viewAllAction: {
    href: LinkProps["href"];
    actionLabel: string;
  };
  children: ReactNode;
  contentGap?: "$1.5" | "$2" | "$3" | "$4";
};

export const Section = ({
  title,
  viewAllAction,
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
          <H3 color="$color" fontWeight="bold">
            {title}
          </H3>
          <Text color="$outlineColor" asChild>
            <Link href={viewAllAction.href}>{viewAllAction.actionLabel}</Link>
          </Text>
        </XStack>
      </Card.Header>
      <YStack gap={contentGap}>{children}</YStack>
    </Card>
  );
};

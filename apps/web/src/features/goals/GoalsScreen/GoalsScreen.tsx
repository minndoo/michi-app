"use client";

import { AppTabs, H1, Text, YStack } from "@repo/ui";
import { LinkButton } from "@/components/LinkButton";
import { GoalsList } from "./components";

const tabs = ["todo", "inProgress", "done"] as const;

export const GoalsScreen = () => {
  const tabsContent = {
    todo: {
      tabTitle: "To Do",
      tabContent: <GoalsList status="TODO" />,
    },
    inProgress: {
      tabTitle: "In Progress",
      tabContent: <GoalsList status="INPROGRESS" />,
    },
    done: {
      tabTitle: "Done",
      tabContent: <GoalsList status="DONE" />,
    },
  };

  return (
    <YStack gap="$4" position="relative" pb="$12">
      <YStack py="$2">
        <H1 color="$color8">My Goals</H1>
      </YStack>

      <AppTabs tabs={tabs} tabsContent={tabsContent} />

      <LinkButton
        href="/goals/create"
        style={{ position: "sticky", bottom: "20px", alignSelf: "center" }}
        buttonProps={{
          variant: "primary",
        }}
      >
        <Text color="inherit">Create a new Goal</Text>
      </LinkButton>
    </YStack>
  );
};

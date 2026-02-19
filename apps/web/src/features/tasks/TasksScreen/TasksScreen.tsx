"use client";

import { AppTabs, H1, Text, YStack } from "@repo/ui";
import { TasksList } from "./components";
import { LinkButton } from "@/components/LinkButton";

const tabs = ["active", "completed"] as const;

export const TasksScreen = () => {
  const tabsContent = {
    active: { tabTitle: "Active", tabContent: <TasksList status="TODO" /> },
    completed: {
      tabTitle: "Completed",
      tabContent: <TasksList status="DONE" />,
    },
  };

  return (
    <YStack gap="$4" position="relative" pb="$12">
      <YStack py="$2">
        <H1 color="$outlineColor">My Tasks</H1>
      </YStack>

      <AppTabs tabs={tabs} tabsContent={tabsContent} />

      <LinkButton
        href="/tasks/create"
        style={{ position: "sticky", bottom: "20px" }}
        buttonProps={{
          variant: "outlined",
        }}
      >
        <Text>Create a new Task</Text>
      </LinkButton>
    </YStack>
  );
};

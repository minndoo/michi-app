"use client";

import { useRouter } from "next/navigation";
import { AppTabs, Button, H1, Text, XStack, YStack } from "@repo/ui";
import { Plus } from "@repo/ui/icons";
import { TasksList } from "./components";

const tabs = ["active", "completed"] as const;

export const TasksScreen = () => {
  const router = useRouter();

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

      {/* TODO: Use LinkButton */}
      <Button
        bg="$backgroundHard"
        rounded="$9"
        gap="$2"
        py="$3"
        px="$4"
        shadowColor="$shadowColor"
        shadowOpacity={0.16}
        shadowRadius={10}
        shadowOffset={{ width: 0, height: 4 }}
        onPress={() => router.push("/tasks/create")}
        position="sticky"
        b="$5"
        t="auto"
        self="center"
        z={10}
      >
        <XStack items="center" gap="$2">
          <Plus color="$backgroundStrong" />
          <Text color="$backgroundStrong">Create new task</Text>
        </XStack>
      </Button>
    </YStack>
  );
};

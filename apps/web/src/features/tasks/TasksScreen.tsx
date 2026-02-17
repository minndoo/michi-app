"use client";

import { useState } from "react";
import { Button, H1, Text, View, XStack, YStack } from "@repo/ui";
import { Plus } from "@repo/ui/icons";
import { TasksList } from "./components";

export const TasksScreen = () => {
  const [tab, setTab] = useState<"active" | "completed">("active");

  return (
    <YStack gap="$4">
      <YStack py="$2">
        <H1 color="$outlineColor">My Tasks</H1>
      </YStack>

      <YStack gap="$3" pb="$2">
        <XStack
          items="center"
          gap="$5"
          borderBottomWidth={1}
          borderColor="$borderColor"
          pb="$1.5"
        >
          <YStack gap="$1">
            <Button
              onPress={() => setTab("active")}
              px="$0"
              py="$0.5"
              bg="$colorTransparent"
            >
              <Text color={tab === "active" ? "$outlineColor" : "$colorMuted"}>
                Active
              </Text>
            </Button>
            <View
              minH={3}
              bg={tab === "active" ? "$outlineColor" : "$colorTransparent"}
              rounded="$2"
            />
          </YStack>
          <YStack gap="$1">
            <Button
              onPress={() => setTab("completed")}
              px="$0"
              py="$0.5"
              bg="transparent"
            >
              <Text
                color={tab === "completed" ? "$outlineColor" : "$colorMuted"}
              >
                Completed
              </Text>
            </Button>
            <View
              minH={3}
              bg={tab === "completed" ? "$outlineColor" : "$colorTransparent"}
              rounded="$2"
            />
          </YStack>
        </XStack>
      </YStack>

      {tab === "active" ? (
        <TasksList status="TODO" />
      ) : (
        <TasksList status="DONE" />
      )}

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
      >
        <XStack items="center" gap="$2">
          <Plus color="$backgroundStrong" />
          <Text color="$backgroundStrong">Create new task</Text>
        </XStack>
      </Button>
    </YStack>
  );
};

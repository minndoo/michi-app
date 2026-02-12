"use client";

import { H1, H2, H3, Text, View, XStack, YStack } from "@repo/ui";
import { BookOpenText, Check, Plus } from "@repo/ui/icons";
import { useGetTasks } from "./hooks/useGetTasks";

export const TasksScreen = () => {
  const { data, isLoading, isError, error } = useGetTasks();
  const tasks = data?.data ?? [];

  return (
    <YStack>
      <YStack gap="$1.5">
        <H1 color="$outlineColor">My Tasks</H1>
      </YStack>

      <YStack gap="$3" pb="$2">
        <XStack
          items="center"
          gap="$4"
          borderBottomWidth={1}
          borderColor="$borderColor"
          pb="$1.5"
        >
          <YStack gap="$1">
            <H2 color="$outlineColor">Active</H2>
            <View minH={4} bg="$outlineColor" rounded={2} />
          </YStack>
          <H2 color="$colorMuted">Completed</H2>
        </XStack>
      </YStack>

      {isLoading ? (
        <View
          bg="$backgroundSoft"
          rounded="$10"
          borderWidth={1}
          borderColor="$borderColor"
          p="$4"
        >
          <Text color="$colorMuted">Loading tasks...</Text>
        </View>
      ) : null}

      {isError ? (
        <View
          bg="$backgroundSoft"
          rounded="$10"
          borderWidth={1}
          borderColor="$borderColor"
          p="$4"
        >
          <Text color="$colorMuted">
            {error instanceof Error ? error.message : "Failed to load tasks"}
          </Text>
        </View>
      ) : null}

      {!isLoading && !isError ? (
        <YStack gap="$3" grow={1}>
          {tasks.length === 0 ? (
            <View
              bg="$backgroundSoft"
              rounded="$10"
              borderWidth={1}
              borderColor="$borderColor"
              p="$4"
            >
              <Text color="$colorMuted">No tasks found.</Text>
            </View>
          ) : null}

          {tasks.map((task) => (
            <YStack
              key={task.id}
              bg="$backgroundSoft"
              rounded="$10"
              borderWidth={1}
              borderColor="$borderColor"
              p="$4"
              gap="$3"
            >
              <XStack justify="space-between" items="flex-start">
                <XStack items="center" gap="$3" flex={1}>
                  <View
                    minW={64}
                    minH={64}
                    rounded={32}
                    bg="$backgroundStrong"
                    items="center"
                    justify="center"
                  >
                    {task.completed ? (
                      <Check color="$outlineColor" size={30} />
                    ) : (
                      <BookOpenText color="$outlineColor" size={30} />
                    )}
                  </View>
                  <YStack gap="$1" flex={1}>
                    <H2 color="$outlineColor">{task.title}</H2>
                    <Text color="$outlineColor">
                      {task.description || "No description"}
                    </Text>
                  </YStack>
                </XStack>
                <View bg="$background" rounded="$7" px="$3" py="$1.5">
                  <H3 color="$colorMuted">
                    {task.completed ? "DONE" : task.goalId ? "GOAL" : "TASK"}
                  </H3>
                </View>
              </XStack>

              <XStack gap="$2">
                <View
                  flex={1}
                  bg="$backgroundStrong"
                  rounded="$6"
                  borderWidth={1}
                  borderColor="$borderColor"
                  items="center"
                  justify="center"
                  py="$2.5"
                >
                  <XStack items="center" gap="$2">
                    <Check color="$outlineColor" />
                    <H3 color="$outlineColor">
                      {task.completed ? "Completed" : "Complete"}
                    </H3>
                  </XStack>
                </View>
                <View
                  flex={1}
                  bg="transparent"
                  rounded="$6"
                  borderWidth={1}
                  borderColor="$borderColor"
                  items="center"
                  justify="center"
                  py="$2.5"
                >
                  <H3 color="$colorMuted">View Details</H3>
                </View>
              </XStack>
            </YStack>
          ))}
        </YStack>
      ) : null}

      <View
        bg="$backgroundHard"
        rounded="$9"
        py="$3"
        px="$4"
        items="center"
        justify="center"
        shadowColor="$shadowColor"
        shadowOpacity={0.16}
        shadowRadius={10}
        shadowOffset={{ width: 0, height: 4 }}
      >
        <XStack items="center" gap="$2">
          <Plus color="$backgroundStrong" />
          <H2 color="$backgroundStrong">Create New Task</H2>
        </XStack>
      </View>
    </YStack>
  );
};

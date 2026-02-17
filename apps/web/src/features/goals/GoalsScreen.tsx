"use client";

import { H1, H2, Text, View, XStack, YStack } from "@repo/ui";
import { Accessibility, BookOpen, Dumbbell, Moon, Plus } from "@repo/ui/icons";
import { useGetGoals } from "./hooks/useGetGoals";
import { useGetTasks } from "@/lib/api/generated/tasks/tasks";

const goalIcons = [Dumbbell, BookOpen, Accessibility];

export const GoalsScreen = () => {
  const {
    data: goalsData,
    isLoading: goalsLoading,
    isError: goalsError,
    error: goalsErrorDetails,
  } = useGetGoals();
  const { data: tasksData } = useGetTasks();

  const goals = goalsData?.data ?? [];
  const tasks = tasksData?.data ?? [];

  const goalProgress = new Map<string, { total: number; completed: number }>();
  for (const task of tasks) {
    if (!task.goalId) {
      continue;
    }

    const existing = goalProgress.get(task.goalId) ?? {
      total: 0,
      completed: 0,
    };
    goalProgress.set(task.goalId, {
      total: existing.total + 1,
      completed: existing.completed + (task.status === "DONE" ? 1 : 0),
    });
  }

  return (
    <YStack>
      <YStack gap="$3" pb="$2">
        <H1 color="$outlineColor">My Goals</H1>
        <XStack
          items="center"
          gap="$4"
          borderBottomWidth={1}
          borderColor="$borderColor"
          pb="$1.5"
        >
          <View bg="$backgroundSoft" px="$4" py="$2" rounded="$6">
            <Text color="$outlineColor">Active</Text>
          </View>
          <Text color="$colorMuted">Completed</Text>
        </XStack>
      </YStack>

      {goalsLoading ? (
        <View
          bg="$backgroundSoft"
          rounded="$11"
          p="$4"
          borderWidth={1}
          borderColor="$borderColor"
        >
          <Text color="$colorMuted">Loading goals...</Text>
        </View>
      ) : null}

      {goalsError ? (
        <View
          bg="$backgroundSoft"
          rounded="$11"
          p="$4"
          borderWidth={1}
          borderColor="$borderColor"
        >
          <Text color="$colorMuted">
            {goalsErrorDetails instanceof Error
              ? goalsErrorDetails.message
              : "Failed to load goals"}
          </Text>
        </View>
      ) : null}

      {!goalsLoading && !goalsError ? (
        <YStack gap="$4" pb="$3">
          {goals.length === 0 ? (
            <YStack
              bg="$backgroundSoft"
              rounded="$11"
              p="$4"
              borderWidth={1}
              borderColor="$borderColor"
            >
              <Text color="$colorMuted">No goals found.</Text>
            </YStack>
          ) : null}

          {goals.map((goal, index) => {
            const Icon = goalIcons[index % goalIcons.length] ?? Dumbbell;
            const progressData = goalProgress.get(goal.id) ?? {
              total: 0,
              completed: 0,
            };
            const progressPercent =
              progressData.total > 0
                ? Math.round(
                    (progressData.completed / progressData.total) * 100,
                  )
                : 0;

            return (
              <YStack
                key={goal.id}
                bg="$backgroundSoft"
                rounded="$11"
                p="$4"
                borderWidth={1}
                borderColor="$borderColor"
                gap="$3"
              >
                <XStack items="center" gap="$3">
                  <View
                    minW={72}
                    minH={72}
                    rounded={36}
                    bg="$background"
                    items="center"
                    justify="center"
                  >
                    <Icon color="$outlineColor" size={30} />
                  </View>
                  <YStack gap="$1">
                    <Text color="$color" fontWeight="bold">
                      {goal.title}
                    </Text>
                    <Text color="$color">
                      {progressData.completed} / {progressData.total} Tasks
                      Completed
                    </Text>
                  </YStack>
                </XStack>

                <View
                  minH={18}
                  rounded="$6"
                  bg="$backgroundStrong"
                  overflow="hidden"
                >
                  <View
                    minH={18}
                    rounded="$6"
                    bg="$backgroundHard"
                    style={{ width: `${progressPercent}%` }}
                  />
                </View>

                <XStack items="center" justify="space-between">
                  <Text color="$colorMuted" fontStyle="italic">
                    {goal.description || "No description"}
                  </Text>
                  <View
                    bg="$backgroundStrong"
                    borderWidth={1}
                    borderColor="$borderColor"
                    rounded="$6"
                    px="$4"
                    py="$2"
                  >
                    <Text color="$color">View Details</Text>
                  </View>
                </XStack>
              </YStack>
            );
          })}
        </YStack>
      ) : null}

      <View
        bg="$backgroundHard"
        rounded="$10"
        py="$3"
        px="$4"
        items="center"
        justify="center"
        shadowColor="$shadowColor"
        shadowOpacity={0.15}
        shadowRadius={10}
        shadowOffset={{ width: 0, height: 4 }}
      >
        <XStack items="center" gap="$2">
          <Plus color="$backgroundStrong" />
          <H2 color="$backgroundStrong">Set New Goal</H2>
        </XStack>
      </View>

      <View
        position="fixed"
        b={24}
        r={24}
        minW={88}
        minH={88}
        rounded={44}
        bg="$color"
        items="center"
        justify="center"
      >
        <Moon color="$backgroundStrong" />
      </View>
    </YStack>
  );
};

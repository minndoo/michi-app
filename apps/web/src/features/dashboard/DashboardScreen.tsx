"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Checkbox, H2, Progress, Text, View, XStack, YStack } from "@repo/ui";
import { Accessibility, BookOpen, ChevronRight } from "@repo/ui/icons";
import {
  getGetTaskByIdQueryKey,
  getGetTasksQueryKey,
  useUpdateTask,
} from "@/lib/api/generated/tasks/tasks";
import {
  getGetGoalsByIdQueryKey,
  getGetGoalsQueryKey,
} from "@/lib/api/generated/goals/goals";
import { useGetGoals } from "./hooks/useGetGoals";
import { useGetTasks } from "./hooks/useGetTasks";
import { Section } from "./components/Section";

const goalIcons = [Accessibility, BookOpen];

export const DashboardScreen = () => {
  const {
    data: tasksData,
    isLoading: tasksLoading,
    isError: tasksError,
    error: tasksErrorDetails,
  } = useGetTasks();
  const {
    data: goalsData,
    isLoading: goalsLoading,
    isError: goalsError,
    error: goalsErrorDetails,
  } = useGetGoals();
  const [savingTaskIds, setSavingTaskIds] = useState<Record<string, true>>({});
  const queryClient = useQueryClient();
  const updateTaskMutation = useUpdateTask();

  const tasks = tasksData?.data ?? [];
  const goals = goalsData?.data ?? [];

  const goalsProgress = goals.map((goal, index) => {
    const Icon = goalIcons[index % goalIcons.length] ?? Accessibility;

    return {
      id: goal.id,
      title: goal.title,
      subtitle: `${goal.completedTasks} / ${goal.totalTasks} tasks completed`,
      progress: goal.progressPercentage,
      icon: Icon,
    };
  });

  const handleToggleTask = (task: {
    id: string;
    status: "TODO" | "DONE";
    goalId: string | null;
  }) => {
    setSavingTaskIds((prev) => ({
      ...prev,
      [task.id]: true,
    }));

    updateTaskMutation.mutate(
      {
        id: task.id,
        data: {
          status: task.status === "DONE" ? "TODO" : "DONE",
        },
      },
      {
        onSuccess: (response) => {
          void queryClient.invalidateQueries({
            queryKey: getGetTasksQueryKey(),
          });
          void queryClient.invalidateQueries({
            queryKey: getGetTaskByIdQueryKey(task.id),
          });

          void queryClient.invalidateQueries({
            queryKey: getGetGoalsQueryKey(),
          });
          if (task.goalId) {
            void queryClient.invalidateQueries({
              queryKey: getGetGoalsByIdQueryKey(task.goalId),
            });
          }
          if (response.data.goalId) {
            void queryClient.invalidateQueries({
              queryKey: getGetGoalsByIdQueryKey(response.data.goalId),
            });
          }
        },
        onSettled: () => {
          setSavingTaskIds((prev) => {
            const next = { ...prev };
            delete next[task.id];
            return next;
          });
        },
      },
    );
  };

  return (
    <YStack gap="$3">
      <YStack gap="$1.5" py="$2">
        <H2 color="$color12" fontWeight="700">
          Good Morning, Sarah
        </H2>
        <Text color="$color11">Here&apos;s to a positive day ahead.</Text>
      </YStack>
      <View
        bg="$color4"
        rounded="$radius.6"
        p="$5"
        borderWidth={1}
        borderColor="$color5"
      >
        <XStack justify="space-between" items="center" mb="$2">
          <Text color="$color10" fontWeight="600" letterSpacing={1}>
            TODAY&apos;S FOCUS
          </Text>
          <ChevronRight size={28} color="$color10" />
        </XStack>
        <YStack gap="$1">
          <H2 color="$color12">Mindful Morning Routine</H2>
          <Text color="$color11">Take 10 minutes for a mindful start.</Text>
        </YStack>
      </View>

      <Section
        title="Today's Tasks"
        viewAllAction={{ href: "/tasks", actionLabel: "View All" }}
        contentGap="$3"
      >
        {tasksLoading ? (
          <Text color="$color11">Loading tasks...</Text>
        ) : tasksError ? (
          <Text color="$color11">
            {tasksErrorDetails instanceof Error
              ? tasksErrorDetails.message
              : "Failed to load tasks"}
          </Text>
        ) : tasks.length === 0 ? (
          <Text color="$color11">No tasks found.</Text>
        ) : (
          <YStack gap="$3">
            {tasks.slice(0, 4).map((task) => {
              const isSaving = Boolean(savingTaskIds[task.id]);
              return (
                <XStack key={task.id} items="center" gap="$3">
                  <Checkbox
                    size="$4"
                    checked={isSaving || task.status === "DONE"}
                    loading={isSaving}
                    disabled={isSaving}
                    onCheckedChange={() => handleToggleTask(task)}
                  />
                  <Text
                    color={task.status === "DONE" ? "$color11" : "$color12"}
                    textDecorationLine={
                      task.status === "DONE" ? "line-through" : "none"
                    }
                  >
                    {task.title}
                  </Text>
                </XStack>
              );
            })}
          </YStack>
        )}
      </Section>

      <Section
        title="Goal Progress"
        contentGap="$4"
        viewAllAction={{ href: "/goals", actionLabel: "View All" }}
      >
        {goalsLoading ? (
          <Text color="$color11">Loading goals...</Text>
        ) : goalsError ? (
          <Text color="$color11">
            {goalsErrorDetails instanceof Error
              ? goalsErrorDetails.message
              : "Failed to load goals"}
          </Text>
        ) : goalsProgress.length === 0 ? (
          <Text color="$color11">No goals found.</Text>
        ) : (
          <YStack gap="$4">
            {goalsProgress.map(
              ({ id, title, subtitle, progress, icon: Icon }) => (
                <YStack key={id} gap="$1.5">
                  <XStack justify="space-between" items="center">
                    <XStack items="center" gap="$2">
                      <Icon size={30} color="$color9" />
                      <Text color="$color12">{title}</Text>
                    </XStack>
                    <Text color="$color11">{progress}%</Text>
                  </XStack>
                  <Progress value={progress} max={100} size="$2" bg="$color5">
                    <Progress.Indicator bg="$color9" />
                  </Progress>
                  <Text color="$color11">{subtitle}</Text>
                </YStack>
              ),
            )}
          </YStack>
        )}
      </Section>
    </YStack>
  );
};

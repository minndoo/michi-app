"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { H2, Text, View, XStack, YStack, Checkbox, Spinner } from "@repo/ui";
import { Accessibility, BookOpen, ChevronRight, Check } from "@repo/ui/icons";
import {
  getGetTasksQueryKey,
  useUpdateTask,
} from "@/lib/api/generated/tasks/tasks";
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
    const tasksForGoal = tasks.filter((task) => task.goalId === goal.id);
    const completedTasks = tasksForGoal.filter(
      (task) => task.status === "DONE",
    ).length;
    const totalTasks = tasksForGoal.length;
    const progress =
      totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
    const Icon = goalIcons[index % goalIcons.length] ?? Accessibility;

    // TODO: Aggregate progress data on backend

    return {
      id: goal.id,
      title: goal.title,
      subtitle: `${completedTasks} / ${totalTasks} tasks completed`,
      progress,
      icon: Icon,
    };
  });

  const handleToggleTask = (taskId: string, status: "TODO" | "DONE") => {
    setSavingTaskIds((prev) => ({
      ...prev,
      [taskId]: true,
    }));
    updateTaskMutation.mutate(
      {
        id: taskId,
        data: {
          status: status === "DONE" ? "TODO" : "DONE",
        },
      },
      {
        onSettled: () => {
          setSavingTaskIds((prev) => {
            const next = { ...prev };
            delete next[taskId];
            return next;
          });
          void queryClient.invalidateQueries({
            queryKey: getGetTasksQueryKey(),
          });
        },
      },
    );
  };

  return (
    <YStack gap="$3">
      <YStack gap="$1.5" py="$2">
        <H2 color="$color" fontWeight="700">
          Good Morning, Sarah
        </H2>
        <Text color="$colorMuted">Here&apos;s to a positive day ahead.</Text>
      </YStack>
      <View
        bg="$backgroundSoft"
        rounded="$radius.6"
        p="$5"
        borderWidth={1}
        borderColor="$borderColor"
      >
        <XStack justify="space-between" items="center" mb="$2">
          <Text color="$outlineColor" fontWeight="600" letterSpacing={1}>
            TODAY&apos;S FOCUS
          </Text>
          <ChevronRight size={28} color="$outlineColor" />
        </XStack>
        <YStack gap="$1">
          <H2 color="$color">Mindful Morning Routine</H2>
          <Text color="$colorMuted">Take 10 minutes for a mindful start.</Text>
        </YStack>
      </View>

      <Section
        title="Today's Tasks"
        viewAllAction={{ href: "/tasks", actionLabel: "View All" }}
        contentGap="$3"
      >
        {tasksLoading ? (
          <Text color="$colorMuted">Loading tasks...</Text>
        ) : tasksError ? (
          <Text color="$colorMuted">
            {tasksErrorDetails instanceof Error
              ? tasksErrorDetails.message
              : "Failed to load tasks"}
          </Text>
        ) : tasks.length === 0 ? (
          <Text color="$colorMuted">No tasks found.</Text>
        ) : (
          <YStack gap="$3">
            {tasks.slice(0, 4).map((task) => {
              const isSaving = Boolean(savingTaskIds[task.id]);
              return (
                <XStack key={task.id} items="center" gap="$3">
                  <Checkbox
                    minW={40}
                    minH={40}
                    rounded="$4"
                    borderWidth={2}
                    borderColor={
                      task.status === "DONE" ? "$outlineColor" : "$borderColor"
                    }
                    bg={
                      task.status === "DONE" ? "$outlineColor" : "transparent"
                    }
                    checked={isSaving || task.status === "DONE"}
                    disabled={isSaving}
                    onCheckedChange={() =>
                      handleToggleTask(task.id, task.status)
                    }
                  >
                    <Checkbox.Indicator>
                      {isSaving ? (
                        <Spinner color="$backgroundStrong" />
                      ) : (
                        <Check size={23} color="$backgroundStrong" />
                      )}
                    </Checkbox.Indicator>
                  </Checkbox>
                  <Text
                    color={task.status === "DONE" ? "$colorMuted" : "$color"}
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
          <Text color="$colorMuted">Loading goals...</Text>
        ) : goalsError ? (
          <Text color="$colorMuted">
            {goalsErrorDetails instanceof Error
              ? goalsErrorDetails.message
              : "Failed to load goals"}
          </Text>
        ) : goalsProgress.length === 0 ? (
          <Text color="$colorMuted">No goals found.</Text>
        ) : (
          <YStack gap="$4">
            {goalsProgress.map(
              ({ id, title, subtitle, progress, icon: Icon }) => (
                <YStack key={id} gap="$1.5">
                  <XStack justify="space-between" items="center">
                    <XStack items="center" gap="$2">
                      <Icon size={30} color="$outlineColor" />
                      <Text color="$color">{title}</Text>
                    </XStack>
                    <Text color="$outlineColor" fontWeight="600">
                      {progress}%
                    </Text>
                  </XStack>
                  <View
                    minH={16}
                    rounded="$6"
                    bg="$backgroundSoft"
                    overflow="hidden"
                  >
                    <View
                      minH={16}
                      bg="$backgroundHard"
                      rounded="$6"
                      style={{ width: `${progress}%` }}
                    />
                  </View>
                  <Text color="$colorMuted">{subtitle}</Text>
                </YStack>
              ),
            )}
          </YStack>
        )}
      </Section>
    </YStack>
  );
};

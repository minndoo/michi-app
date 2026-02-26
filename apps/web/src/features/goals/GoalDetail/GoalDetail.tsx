"use client";

import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Checkbox,
  H1,
  H3,
  Progress,
  Text,
  View,
  XStack,
  YStack,
} from "@repo/ui";
import { Pencil, Plus, Target, Trash2, TrendingUp } from "@repo/ui/icons";
import { LinkButton } from "@/components/LinkButton";
import {
  getGetGoalsByIdQueryKey,
  getGetGoalsQueryKey,
  useGetGoalsById,
} from "@/lib/api/generated/goals/goals";
import {
  getGetTaskByIdQueryKey,
  getGetTasksQueryKey,
  useUpdateTask,
} from "@/lib/api/generated/tasks/tasks";
import { formatDateTimeForDisplay } from "@/helpers/date";

export type GoalDetailProps = {
  goalId: string;
};

const getStatusLabel = (status: "TODO" | "INPROGRESS" | "DONE") => {
  if (status === "INPROGRESS") {
    return "IN PROGRESS";
  }

  return status;
};

export const GoalDetail = ({ goalId }: GoalDetailProps) => {
  const queryClient = useQueryClient();
  const [pendingTaskIds, setPendingTaskIds] = useState<Record<string, true>>(
    {},
  );
  const { data, isLoading, isError, error } = useGetGoalsById(goalId);
  const updateTaskMutation = useUpdateTask();

  if (isLoading) {
    return (
      <YStack>
        <Text color="$color10">Loading goal...</Text>
      </YStack>
    );
  }

  if (isError || !data?.data) {
    return (
      <YStack>
        <Text color="$color10">
          {error instanceof Error ? error.message : "Failed to load goal"}
        </Text>
      </YStack>
    );
  }

  const goal = data.data;
  const linkedTasks = goal.tasks ?? [];

  const onTaskToggle = (
    task: (typeof linkedTasks)[number],
    checked: boolean,
  ) => {
    if (pendingTaskIds[task.id]) {
      return;
    }

    setPendingTaskIds((prev) => ({
      ...prev,
      [task.id]: true,
    }));

    const nextStatus = checked ? "DONE" : "TODO";

    updateTaskMutation.mutate(
      {
        id: task.id,
        data: {
          status: nextStatus,
        },
      },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({
            queryKey: getGetGoalsByIdQueryKey(goalId),
          });
          void queryClient.invalidateQueries({
            queryKey: getGetTasksQueryKey(),
          });
          void queryClient.invalidateQueries({
            queryKey: getGetTaskByIdQueryKey(task.id),
          });
          void queryClient.invalidateQueries({
            queryKey: getGetGoalsQueryKey(),
          });
        },
        onSettled: () => {
          setPendingTaskIds((prev) => {
            const next = { ...prev };
            delete next[task.id];
            return next;
          });
        },
      },
    );
  };

  return (
    <YStack gap="$4" pb="$8">
      <XStack justify="space-between" items="center" gap="$3">
        <LinkButton
          href={`/goals/${goalId}/edit`}
          buttonProps={{
            variant: "secondary",
            icon: <Pencil size={16} />,
          }}
        >
          <Text color="inherit">Edit</Text>
        </LinkButton>
        <Button
          variant="outlined"
          icon={<Trash2 size={16} />}
          onPress={() => undefined}
        >
          <Text color="inherit">Delete</Text>
        </Button>
      </XStack>

      <XStack
        self="flex-start"
        bg="$white2"
        rounded="$10"
        borderWidth={1}
        borderColor="$borderColor"
        px="$4"
        py="$2"
        items="center"
        gap="$2"
      >
        <Target color="$color8" />
        <Text color="$color8">{getStatusLabel(goal.status)}</Text>
      </XStack>

      <YStack gap="$2">
        <H1 color="$color11">{goal.title}</H1>
        <Text color="$color10">{goal.description || "No description"}</Text>
      </YStack>

      <View
        bg="$white0"
        rounded="$10"
        borderWidth={1}
        borderColor="$borderColor"
        p="$4"
        gap="$3"
      >
        <XStack justify="space-between" items="center">
          <YStack>
            <Text color="$color10">Overall Progress</Text>
            <H1 color="$color8">{Math.round(goal.progressPercentage)}%</H1>
          </YStack>
          <View
            minW={56}
            minH={56}
            rounded={28}
            bg="$white3"
            items="center"
            justify="center"
          >
            <TrendingUp color="$color8" size={24} />
          </View>
        </XStack>

        <Progress
          value={goal.progressPercentage}
          max={100}
          size="$2"
          bg="$white4"
        >
          <Progress.Indicator bg="$color9" />
        </Progress>

        <Text color="$color10" text="right">
          {goal.completedTasks} of {goal.totalTasks} tasks completed.
        </Text>
      </View>

      <XStack justify="space-between" items="center">
        <H3 color="$color11">Linked Tasks</H3>
        <Link href={`/tasks/create?goalId=${encodeURIComponent(goalId)}`}>
          <XStack items="center" gap="$2">
            <Plus size={16} color="$color8" />
            <Text color="$color8">Add Task</Text>
          </XStack>
        </Link>
      </XStack>

      <YStack gap="$3">
        {linkedTasks.length === 0 ? (
          <View
            bg="$white0"
            rounded="$10"
            borderWidth={1}
            borderColor="$borderColor"
            px="$4"
            py="$3"
          >
            <Text color="$color10">No linked tasks.</Text>
          </View>
        ) : (
          linkedTasks.map((task) => {
            const isDone = task.status === "DONE";
            const isPending = Boolean(pendingTaskIds[task.id]);

            return (
              <XStack
                key={task.id}
                bg="$white0"
                rounded="$10"
                borderWidth={1}
                borderColor="$borderColor"
                px="$4"
                py="$3"
                gap="$3"
                items="center"
              >
                <Checkbox
                  checked={isDone}
                  loading={isPending}
                  disabled={isPending}
                  onCheckedChange={(checked) =>
                    onTaskToggle(task, Boolean(checked))
                  }
                />
                <YStack gap="$1" flex={1}>
                  <Text
                    color="$color11"
                    textDecorationLine={isDone ? "line-through" : "none"}
                    opacity={isDone ? 0.5 : 1}
                  >
                    {task.title}
                  </Text>
                  <Text color="$color10">
                    {formatDateTimeForDisplay(task.dueAt)}
                  </Text>
                </YStack>
              </XStack>
            );
          })
        )}
      </YStack>
    </YStack>
  );
};

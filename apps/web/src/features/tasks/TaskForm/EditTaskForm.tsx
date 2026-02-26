"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetGoalsByIdQueryKey,
  getGetGoalsQueryKey,
} from "@/lib/api/generated/goals/goals";
import { Text, YStack } from "@repo/ui";
import {
  getGetTaskByIdQueryKey,
  getGetTasksQueryKey,
  useGetTaskById,
  useUpdateTask,
} from "@/lib/api/generated/tasks/tasks";
import { toIsoCurrentUTCStartOfDay } from "@/helpers/date";
import { navigateBackOrPush } from "@/helpers/browser/navigation";
import { TaskForm } from "./TaskForm";
import type { TaskFormValues } from "./schema";

type EditTaskFormProps = {
  taskId: string;
};

export const EditTaskForm = ({ taskId }: EditTaskFormProps) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: taskData, isLoading, isError, error } = useGetTaskById(taskId);

  const updateTaskMutation = useUpdateTask();

  const defaultValues = useMemo<TaskFormValues>(() => {
    const task = taskData?.data;
    if (!task) {
      return {
        title: "",
        description: "",
        dueAt: "",
        goalId: "",
      };
    }

    return {
      title: task.title,
      description: task.description ?? "",
      dueAt: task.dueAt.slice(0, 10),
      goalId: task.goalId ?? "",
    };
  }, [taskData?.data]);

  const handleSubmit = (values: TaskFormValues) => {
    const previousGoalId = taskData?.data?.goalId;

    updateTaskMutation.mutate(
      {
        id: taskId,
        data: {
          title: values.title,
          description: values.description || null,
          goalId: values.goalId || null,
          dueAt: toIsoCurrentUTCStartOfDay(values.dueAt),
        },
      },
      {
        onSuccess: (response) => {
          void queryClient.invalidateQueries({
            queryKey: getGetTasksQueryKey(),
          });
          void queryClient.invalidateQueries({
            queryKey: getGetTaskByIdQueryKey(taskId),
          });
          void queryClient.invalidateQueries({
            queryKey: getGetGoalsQueryKey(),
          });
          if (previousGoalId) {
            void queryClient.invalidateQueries({
              queryKey: getGetGoalsByIdQueryKey(previousGoalId),
            });
          }
          if (response.data.goalId) {
            void queryClient.invalidateQueries({
              queryKey: getGetGoalsByIdQueryKey(response.data.goalId),
            });
          }

          navigateBackOrPush(router, "/tasks");
        },
      },
    );
  };

  if (isLoading) {
    return (
      <YStack>
        <Text color="$color10">Loading task...</Text>
      </YStack>
    );
  }

  if (isError) {
    return (
      <YStack>
        <Text color="$color10">
          {error instanceof Error ? error.message : "Failed to load task"}
        </Text>
      </YStack>
    );
  }

  return (
    <TaskForm
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      isSubmitting={updateTaskMutation.isPending}
      submitLabel="Save task"
    />
  );
};

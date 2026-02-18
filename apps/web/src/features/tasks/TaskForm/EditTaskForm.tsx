"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Text, YStack } from "@repo/ui";
import {
  getGetTaskByIdQueryKey,
  getGetTasksQueryKey,
  useGetTaskById,
  useUpdateTask,
} from "@/lib/api/generated/tasks/tasks";
import { toIsoStartOfDay } from "@/helpers/date";
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

  const updateTaskMutation = useUpdateTask({
    mutation: {
      onSuccess: () => {
        // TODO: Also invalidate goals connected to this query
        void queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() });
        void queryClient.invalidateQueries({
          queryKey: getGetTaskByIdQueryKey(taskId),
        });
        navigateBackOrPush(router, "/tasks");
      },
    },
  });

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
    updateTaskMutation.mutate({
      id: taskId,
      data: {
        title: values.title,
        description: values.description || null,
        goalId: values.goalId || null,
        dueAt: toIsoStartOfDay(values.dueAt),
      },
    });
  };

  if (isLoading) {
    return (
      <YStack>
        <Text color="$colorMuted">Loading task...</Text>
      </YStack>
    );
  }

  if (isError) {
    return (
      <YStack>
        <Text color="$colorMuted">
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

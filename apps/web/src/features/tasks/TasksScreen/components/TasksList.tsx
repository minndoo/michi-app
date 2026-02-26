"use client";

import { useState } from "react";
import { Text, View, YStack } from "@repo/ui";
import type { TaskStatus } from "@/lib/api/generated/model";
import { useGetTasks } from "../hooks/useGetTasks";
import { useUpdateTask } from "../hooks/useUpdateTask";
import { TaskItem } from "./TaskItem";

export interface TasksListProps {
  status: TaskStatus;
}

export const TasksList = ({ status }: TasksListProps) => {
  const [pendingIds, setPendingIds] = useState<Record<string, true>>({});
  const { data, isLoading, isError, error } = useGetTasks(status);
  const tasks = data?.data ?? [];
  const { mutateTaskStatus } = useUpdateTask();

  const onComplete = (taskId: string) => {
    const currentTask = tasks.find((task) => task.id === taskId);

    setPendingIds((prev) => ({
      ...prev,
      [taskId]: true,
    }));

    mutateTaskStatus(
      {
        id: taskId,
        status: "DONE",
        goalId: currentTask?.goalId ?? null,
      },
      {
        onSettled: () => {
          setPendingIds((prev) => {
            const next = { ...prev };
            delete next[taskId];
            return next;
          });
        },
      },
    );
  };

  if (isLoading) {
    return (
      <View
        bg="$white3"
        rounded="$10"
        borderWidth={1}
        borderColor="$borderColor"
        p="$4"
      >
        <Text color="$color8">Loading tasks...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View
        bg="$white3"
        rounded="$10"
        borderWidth={1}
        borderColor="$borderColor"
        p="$4"
      >
        <Text color="$color8">
          {error instanceof Error ? error.message : "Failed to load tasks"}
        </Text>
      </View>
    );
  }

  if (tasks.length === 0) {
    return (
      <View
        bg="$white3"
        rounded="$10"
        borderWidth={1}
        borderColor="$borderColor"
        p="$4"
      >
        <Text color="$color8">No tasks found.</Text>
      </View>
    );
  }

  return (
    <YStack gap="$3" grow={1}>
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          isCompleting={Boolean(pendingIds[task.id])}
          onComplete={onComplete}
        />
      ))}
    </YStack>
  );
};

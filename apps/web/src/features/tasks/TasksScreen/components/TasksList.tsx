"use client";

import { useState } from "react";
import { Select, Text, View, XStack, YStack } from "@repo/ui";
import { ChevronDown } from "@repo/ui/icons";
import {
  TaskOrder,
  type GetTasksParams,
  type TaskStatus,
} from "@/lib/api/generated/model";
import { useGetTasks } from "../hooks/useGetTasks";
import { useUpdateTask } from "../hooks/useUpdateTask";
import { TaskItem } from "./TaskItem";

export interface TasksListProps {
  status: TaskStatus;
}

type TaskListOrder = NonNullable<GetTasksParams["order"]>;

const ORDER_OPTIONS: { label: string; value: TaskListOrder }[] = [
  { label: "Recent", value: TaskOrder.Recent },
  { label: "Relevant", value: TaskOrder.Relevant },
];

export const TasksList = ({ status }: TasksListProps) => {
  const [pendingIds, setPendingIds] = useState<Record<string, true>>({});
  const [order, setOrder] = useState<TaskListOrder>(TaskOrder.Recent);
  const { data, isLoading, isError, error } = useGetTasks(status, order);
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

  const orderSelect = (
    <XStack justify="flex-end">
      <Select
        value={order}
        onValueChange={(nextValue) => setOrder(nextValue as TaskListOrder)}
      >
        <Select.Trigger
          iconAfter={ChevronDown}
          borderRadius={9}
          borderWidth={1}
          borderColor="$color6"
          backgroundColor="$white1"
          minW={120}
        >
          <Select.Value placeholder="Order" />
        </Select.Trigger>
        <Select.Content zIndex={200000}>
          <Select.Viewport
            background="$white1"
            borderWidth={1}
            borderColor="$color6"
            overflow="hidden"
            style={{ borderRadius: 9 }}
          >
            {ORDER_OPTIONS.map((option, index) => (
              <Select.Item
                key={option.value}
                index={index}
                value={option.value}
                borderTopWidth={index === 0 ? 0 : 1}
                borderColor="$color6"
                style={{
                  paddingTop: 10,
                  paddingBottom: 10,
                  paddingLeft: 13,
                  paddingRight: 13,
                }}
              >
                <Select.ItemText>{option.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select>
    </XStack>
  );

  if (isLoading) {
    return (
      <YStack gap="$3" grow={1}>
        {orderSelect}
        <View
          bg="$color4"
          rounded="$10"
          borderWidth={1}
          borderColor="$color5"
          p="$4"
        >
          <Text color="$color11">Loading tasks...</Text>
        </View>
      </YStack>
    );
  }

  if (isError) {
    return (
      <YStack gap="$3" grow={1}>
        {orderSelect}
        <View
          bg="$color4"
          rounded="$10"
          borderWidth={1}
          borderColor="$color5"
          p="$4"
        >
          <Text color="$color11">
            {error instanceof Error ? error.message : "Failed to load tasks"}
          </Text>
        </View>
      </YStack>
    );
  }

  if (tasks.length === 0) {
    return (
      <YStack gap="$3" grow={1}>
        {orderSelect}
        <View
          bg="$color4"
          rounded="$10"
          borderWidth={1}
          borderColor="$color5"
          p="$4"
        >
          <Text color="$color11">No tasks found.</Text>
        </View>
      </YStack>
    );
  }

  return (
    <YStack gap="$3" grow={1}>
      {orderSelect}
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

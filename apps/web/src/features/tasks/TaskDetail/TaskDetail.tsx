"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Button, H1, Spinner, Text, View, XStack, YStack } from "@repo/ui";
import {
  BookOpenText,
  Calendar,
  Check,
  Flag,
  Pencil,
  Trash2,
} from "@repo/ui/icons";
import { LinkButton } from "@/components/LinkButton";
import { formatDateToMonthDay } from "@/helpers/date";
import {
  getGetGoalsByIdQueryKey,
  getGetGoalsQueryKey,
} from "@/lib/api/generated/goals/goals";
import {
  getGetTaskByIdQueryKey,
  getGetTasksQueryKey,
  useGetTaskById,
  useUpdateTask,
} from "@/lib/api/generated/tasks/tasks";

export type TaskDetailProps = {
  taskId: string;
};

export const TaskDetail = ({ taskId }: TaskDetailProps) => {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useGetTaskById(taskId);

  const completeTaskMutation = useUpdateTask();

  if (isLoading) {
    return (
      <YStack>
        <Text color="$color10">Loading task...</Text>
      </YStack>
    );
  }

  if (isError || !data?.data) {
    return (
      <YStack>
        <Text color="$color10">
          {error instanceof Error ? error.message : "Failed to load task"}
        </Text>
      </YStack>
    );
  }

  const task = data.data;

  const onComplete = () => {
    if (task.status === "DONE" || completeTaskMutation.isPending) {
      return;
    }

    completeTaskMutation.mutate(
      {
        id: task.id,
        data: {
          title: task.title,
          description: task.description,
          dueAt: task.dueAt,
          goalId: task.goalId,
          status: "DONE",
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
      },
    );
  };

  return (
    <YStack gap="$4" pb="$8">
      <XStack justify="space-between" items="center" gap="$3">
        <LinkButton
          href={`/tasks/${taskId}/edit`}
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

      <XStack justify="space-between" items="center" gap="$3">
        <H1 color="$color11">{task.title}</H1>
        <View
          minW={56}
          minH={56}
          rounded={28}
          bg="$white2"
          items="center"
          justify="center"
        >
          <BookOpenText color="$color8" size={24} />
        </View>
      </XStack>

      <XStack
        self="flex-start"
        bg="$white0"
        rounded="$10"
        borderWidth={1}
        borderColor="$borderColor"
        px="$4"
        py="$2"
        items="center"
        gap="$2"
      >
        <Flag color="$color8" size={16} />
        <Text color="$color8">
          Linked to: {task.goalId ? "Goal task" : "No linked goal"}
        </Text>
      </XStack>

      <View
        bg="$white0"
        rounded="$10"
        borderWidth={1}
        borderColor="$borderColor"
        p="$4"
      >
        <XStack items="center" gap="$3">
          <View
            minW={56}
            minH={56}
            rounded={28}
            bg="$white0"
            items="center"
            justify="center"
          >
            <Calendar color="$color8" size={24} />
          </View>
          <YStack gap="$1">
            <Text color="$color8" fontWeight="bold" letterSpacing={0.8}>
              DUE DATE
            </Text>
            <Text color="$color11">{formatDateToMonthDay(task.dueAt)}</Text>
          </YStack>
        </XStack>
      </View>

      <YStack gap="$3">
        <View
          bg="$white0"
          rounded="$10"
          borderWidth={1}
          borderColor="$borderColor"
          p="$4"
          gap="$4"
        >
          <Text color="$color10" fontSize="$6" lineHeight="$6">
            {task.description || "No notes for this task yet."}
          </Text>
        </View>
      </YStack>

      {/* <XStack gap="$3"> */}

      {/* TODO: Add duration to tasks */}
      {/* <View
          flex={1}
          bg="$white3"
          rounded="$10"
          borderWidth={1}
          borderColor="$borderColor"
          p="$4"
          gap="$1"
        >
          <Text color="$color8">Duration</Text>
          <H4 color="$color11">30 min</H4>
        </View> */}

      {/* TODO: Add priority to tasks */}
      {/* <View
          flex={1}
          bg="$white3"
          rounded="$10"
          borderWidth={1}
          borderColor="$borderColor"
          p="$4"
          gap="$1"
        >
          <Text color="$color8">Priority</Text>
          <H4 color="$color8">High</H4>
        </View> */}
      {/* </XStack> */}

      {task.status !== "DONE" ? (
        <Button
          variant="primary"
          onPress={onComplete}
          disabled={completeTaskMutation.isPending}
          icon={
            completeTaskMutation.isPending ? (
              <Spinner color="currentColor" />
            ) : (
              // @ts-expect-error currentColor does not exist on color
              <Check color="currentColor" />
            )
          }
        >
          <Text color="inherit">Complete Task</Text>
        </Button>
      ) : null}
    </YStack>
  );
};

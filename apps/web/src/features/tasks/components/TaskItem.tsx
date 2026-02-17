"use client";

import { Button, H5, Spinner, Text, View, XStack, YStack } from "@repo/ui";
import { BookOpenText, Check } from "@repo/ui/icons";
import type { TaskResponse } from "@/lib/api/generated/model";

export interface TaskItemProps {
  task: TaskResponse;
  isCompleting: boolean;
  onComplete: (taskId: string) => void;
  onViewDetails: (taskId: string) => void;
}

export const TaskItem = ({
  task,
  isCompleting,
  onComplete,
  onViewDetails,
}: TaskItemProps) => {
  return (
    <YStack
      bg="$backgroundSoft"
      rounded="$10"
      borderWidth={1}
      borderColor="$borderColor"
      p="$4"
      gap="$6"
    >
      <XStack justify="space-between" items="flex-start">
        <XStack items="center" gap="$3" flex={1}>
          <View
            minW={56}
            minH={56}
            rounded={28}
            bg="$backgroundStrong"
            items="center"
            justify="center"
          >
            {task.status === "DONE" ? (
              <Check color="$outlineColor" size={26} />
            ) : (
              <BookOpenText color="$outlineColor" size={26} />
            )}
          </View>
          <YStack gap="$1" flex={1}>
            <H5 color="$outlineColor" fontWeight="normal">
              {task.title}
            </H5>
            <Text color="$colorMuted" fontSize="$3" lineHeight="$3">
              {task.description || "No description"}
            </Text>
          </YStack>
        </XStack>
        <View bg="$backgroundStrong" rounded="$7" px="$3" py="$1.5">
          <Text
            color="$colorMuted"
            fontSize="$2"
            lineHeight="$2"
            fontWeight="bold"
            letterSpacing={0.6}
          >
            {task.status === "DONE" ? "DONE" : task.goalId ? "GOAL" : "TASK"}
          </Text>
        </View>
      </XStack>
      <XStack gap="$2">
        {task.status !== "DONE" ? (
          <Button
            flex={1}
            variant="outlined"
            bg="$backgroundStrong"
            disabled={isCompleting}
            onPress={() => onComplete(task.id)}
            gap="$2"
          >
            {isCompleting ? (
              <Spinner color="$outlineColor" />
            ) : (
              <Check color="$outlineColor" />
            )}
            <Text color="$outlineColor">Complete</Text>
          </Button>
        ) : null}
        <Button
          flex={1}
          variant="outlined"
          disabled={isCompleting}
          onPress={() => onViewDetails(task.id)}
        >
          <Text color="$colorMuted">View Details</Text>
        </Button>
      </XStack>
    </YStack>
  );
};

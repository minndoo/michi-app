"use client";

import { Button, H5, Spinner, Text, View, XStack, YStack } from "@repo/ui";
import { BookOpenText, Check } from "@repo/ui/icons";
import { LinkButton } from "@/components/LinkButton";
import type { TaskResponse } from "@/lib/api/generated/model";

export interface TaskItemProps {
  task: TaskResponse;
  isCompleting: boolean;
  onComplete: (taskId: string) => void;
}

export const TaskItem = ({ task, isCompleting, onComplete }: TaskItemProps) => {
  return (
    <YStack
      bg="$color4"
      rounded="$10"
      borderWidth={1}
      borderColor="$color5"
      p="$4"
      gap="$6"
    >
      <XStack justify="space-between" items="flex-start">
        <XStack items="center" gap="$3" flex={1}>
          <View
            minW={56}
            minH={56}
            rounded={28}
            bg="$white1"
            items="center"
            justify="center"
          >
            {task.status === "DONE" ? (
              <Check color="$color9" size={26} />
            ) : (
              <BookOpenText color="$color9" size={26} />
            )}
          </View>
          <YStack gap="$1" flex={1}>
            <H5 color="$color12" fontWeight="normal">
              {task.title}
            </H5>
            <Text color="$color11" fontSize="$3" lineHeight="$3">
              {task.description || "No description"}
            </Text>
          </YStack>
        </XStack>
        <View bg="$white1" rounded="$7" px="$3" py="$1.5">
          <Text
            color="$color10"
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
            grow={1}
            variant="outlined"
            disabled={isCompleting}
            onPress={() => onComplete(task.id)}
            gap="$2"
          >
            {isCompleting ? (
              <Spinner color="currentColor" />
            ) : (
              // @ts-expect-error currentColor does not exist on color
              // TODO: Implement a custom icon which can accept this
              <Check color="currentColor" />
            )}
            <Text color="inherit">Complete</Text>
          </Button>
        ) : null}
        <LinkButton
          href={`/tasks/${task.id}`}
          style={{ flexGrow: 1 }}
          buttonProps={{
            variant: "outlined",
            borderColor: "$color6",
            bg: "transparent",
          }}
        >
          <Text color="$color11">View Details</Text>
        </LinkButton>
      </XStack>
    </YStack>
  );
};

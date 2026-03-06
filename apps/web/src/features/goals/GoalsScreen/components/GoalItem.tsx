"use client";

import { H5, Progress, Text, View, XStack, YStack } from "@repo/ui";
import { Check, Dumbbell } from "@repo/ui/icons";
import { LinkButton } from "@/components/LinkButton";
import type { GoalResponse } from "@/lib/api/generated/model";

export interface GoalItemProps {
  goal: GoalResponse;
}

const getStatusLabel = (status: GoalResponse["status"]) => {
  if (status === "INPROGRESS") {
    return "IN PROGRESS";
  }

  return status;
};

export const GoalItem = ({ goal }: GoalItemProps) => {
  return (
    <YStack
      bg="$color4"
      rounded="$10"
      borderWidth={1}
      borderColor="$color5"
      p="$4"
      gap="$4"
    >
      <XStack justify="space-between" items="flex-start" gap="$3">
        <XStack items="center" gap="$3" flex={1}>
          <View
            minW={56}
            minH={56}
            rounded={28}
            bg="$white1"
            items="center"
            justify="center"
          >
            {goal.status === "DONE" ? (
              <Check color="$color9" size={26} />
            ) : (
              <Dumbbell color="$color9" size={26} />
            )}
          </View>
          <YStack gap="$1" flex={1}>
            <H5 color="$color12" fontWeight="normal">
              {goal.title}
            </H5>
            <Text color="$color11" fontSize="$3" lineHeight="$3">
              {goal.completedTasks} / {goal.totalTasks} Tasks Completed
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
            {getStatusLabel(goal.status)}
          </Text>
        </View>
      </XStack>

      <Progress
        value={goal.progressPercentage}
        max={100}
        size="$2"
        bg="$color5"
      >
        <Progress.Indicator bg="$color9" />
      </Progress>

      <XStack items="center" justify="space-between" gap="$3">
        <Text color="$color11" fontSize="$3" lineHeight="$3" flex={1}>
          {goal.description || "No description"}
        </Text>
        <LinkButton
          href={`/goals/${goal.id}`}
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

"use client";

import { useRouter } from "next/navigation";
import { Text, View, YStack } from "@repo/ui";
import type { GoalStatus } from "@/lib/api/generated/model";
import { useGetGoals } from "../../hooks/useGetGoals";
import { GoalItem } from "./GoalItem";

export interface GoalsListProps {
  status: GoalStatus;
}

export const GoalsList = ({ status }: GoalsListProps) => {
  const router = useRouter();
  const { data, isLoading, isError, error } = useGetGoals(status);
  const goals = data?.data ?? [];

  const onViewDetails = (goalId: string) => {
    router.push(`/goals/${goalId}`);
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
        <Text color="$color8">Loading goals...</Text>
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
          {error instanceof Error ? error.message : "Failed to load goals"}
        </Text>
      </View>
    );
  }

  if (goals.length === 0) {
    return (
      <View
        bg="$white3"
        rounded="$10"
        borderWidth={1}
        borderColor="$borderColor"
        p="$4"
      >
        <Text color="$color8">No goals found.</Text>
      </View>
    );
  }

  return (
    <YStack gap="$3" grow={1}>
      {goals.map((goal) => (
        <GoalItem key={goal.id} goal={goal} onViewDetails={onViewDetails} />
      ))}
    </YStack>
  );
};

"use client";

import { useRouter } from "next/navigation";
import { Button, Text, View, YStack } from "@repo/ui";

export type GoalDetailProps = {
  goalId: string;
};

export const GoalDetail = ({ goalId }: GoalDetailProps) => {
  const router = useRouter();

  // TODO: fetch data from getGoal
  return (
    <YStack gap="$4">
      <View
        bg="$white3"
        rounded="$10"
        borderWidth={1}
        borderColor="$borderColor"
        p="$4"
      >
        <Text color="$outlineColor">GoalDetail</Text>
        <Text color="$color8">Goal ID: {goalId}</Text>
      </View>

      <Button
        variant="outlined"
        onPress={() => router.push(`/goals/${goalId}/edit`)}
      >
        <Text color="$outlineColor">Edit Goal</Text>
      </Button>
    </YStack>
  );
};

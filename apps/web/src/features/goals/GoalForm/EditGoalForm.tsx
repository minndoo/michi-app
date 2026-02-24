"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Text, YStack } from "@repo/ui";
import {
  getGetGoalsByIdQueryKey,
  useGetGoalsById,
  useUpdateGoal,
} from "@/lib/api/generated/goals/goals";
import { toIsoStartOfDay } from "@/helpers/date";
import { navigateBackOrPush } from "@/helpers/browser/navigation";
import { GoalForm } from "./GoalForm";
import type { GoalFormValues } from "./schema";

type EditGoalFormProps = {
  goalId: string;
};

export const EditGoalForm = ({ goalId }: EditGoalFormProps) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: goalData, isLoading, isError, error } = useGetGoalsById(goalId);

  const updateGoalMutation = useUpdateGoal({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ["/goals"] });
        void queryClient.invalidateQueries({
          queryKey: getGetGoalsByIdQueryKey(goalId),
        });
        navigateBackOrPush(router, "/goals");
      },
    },
  });

  const defaultValues = useMemo<GoalFormValues>(() => {
    const goal = goalData?.data;
    if (!goal) {
      return {
        title: "",
        description: "",
        dueAt: "",
      };
    }

    return {
      title: goal.title,
      description: goal.description ?? "",
      dueAt: goal.dueAt.slice(0, 10),
    };
  }, [goalData?.data]);

  const handleSubmit = (values: GoalFormValues) => {
    updateGoalMutation.mutate({
      id: goalId,
      data: {
        title: values.title,
        description: values.description || null,
        dueAt: toIsoStartOfDay(values.dueAt),
      },
    });
  };

  if (isLoading) {
    return (
      <YStack>
        <Text color="$color10">Loading goal...</Text>
      </YStack>
    );
  }

  if (isError) {
    return (
      <YStack>
        <Text color="$color10">
          {error instanceof Error ? error.message : "Failed to load goal"}
        </Text>
      </YStack>
    );
  }

  return (
    <GoalForm
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      isSubmitting={updateGoalMutation.isPending}
      submitLabel="Save goal"
    />
  );
};

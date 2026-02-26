"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateGoal } from "@/lib/api/generated/goals/goals";
import { toIsoCurrentUTCStartOfDay } from "@/helpers/date";
import { navigateBackOrPush } from "@/helpers/browser/navigation";
import { GoalForm } from "./GoalForm";
import type { GoalFormValues } from "./schema";

const DEFAULT_VALUES: GoalFormValues = {
  title: "",
  description: "",
  dueAt: "",
};

export const CreateGoalForm = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  const createGoalMutation = useCreateGoal({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ["/goals"] });
        navigateBackOrPush(router, "/goals");
      },
    },
  });

  const handleSubmit = (values: GoalFormValues) => {
    createGoalMutation.mutate({
      data: {
        title: values.title,
        description: values.description || null,
        dueAt: toIsoCurrentUTCStartOfDay(values.dueAt),
      },
    });
  };

  return (
    <GoalForm
      defaultValues={DEFAULT_VALUES}
      onSubmit={handleSubmit}
      isSubmitting={createGoalMutation.isPending}
      submitLabel="Create goal"
    />
  );
};

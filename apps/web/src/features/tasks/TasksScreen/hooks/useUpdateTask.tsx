"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  getGetGoalsByIdQueryKey,
  getGetGoalsQueryKey,
} from "@/lib/api/generated/goals/goals";
import {
  getGetTasksQueryKey,
  useUpdateTask as useUpdateTaskBase,
} from "@/lib/api/generated/tasks/tasks";
import type { TaskStatus } from "@/lib/api/generated/model";

interface MutateTaskStatusInput {
  id: string;
  status: TaskStatus;
  goalId?: string | null;
}

interface MutateTaskStatusOptions {
  onSettled?: () => void;
}

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  const mutation = useUpdateTaskBase({
    mutation: {
      onSettled: () => {
        void queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() });
      },
    },
  });

  const mutateTaskStatus = (
    { id, status, goalId }: MutateTaskStatusInput,
    options?: MutateTaskStatusOptions,
  ) => {
    mutation.mutate(
      {
        id,
        data: { status },
      },
      {
        onSuccess: (response) => {
          void queryClient.invalidateQueries({
            queryKey: getGetGoalsQueryKey(),
          });
          if (goalId) {
            void queryClient.invalidateQueries({
              queryKey: getGetGoalsByIdQueryKey(goalId),
            });
          }
          if (response.data.goalId) {
            void queryClient.invalidateQueries({
              queryKey: getGetGoalsByIdQueryKey(response.data.goalId),
            });
          }
        },
        onSettled: () => {
          options?.onSettled?.();
        },
      },
    );
  };

  return {
    mutateTaskStatus,
  };
};

"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  getGetTasksQueryKey,
  useUpdateTask as useUpdateTaskBase,
} from "@/lib/api/generated/tasks/tasks";
import type { TaskStatus } from "@/lib/api/generated/model";

interface MutateTaskStatusInput {
  id: string;
  status: TaskStatus;
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
    { id, status }: MutateTaskStatusInput,
    options?: MutateTaskStatusOptions,
  ) => {
    mutation.mutate(
      {
        id,
        data: { status },
      },
      {
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

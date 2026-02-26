"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetGoalsByIdQueryKey,
  getGetGoalsQueryKey,
} from "@/lib/api/generated/goals/goals";
import {
  getGetTasksQueryKey,
  useCreateTask,
} from "@/lib/api/generated/tasks/tasks";
import { toIsoCurrentUTCStartOfDay } from "@/helpers/date";
import { navigateBackOrPush } from "@/helpers/browser/navigation";
import { TaskForm } from "./TaskForm";
import type { TaskFormValues } from "./schema";

const DEFAULT_VALUES: TaskFormValues = {
  title: "",
  description: "",
  dueAt: "",
  goalId: "",
};

type CreateTaskFormProps = {
  defaultGoalId?: string;
};

export const CreateTaskForm = ({ defaultGoalId }: CreateTaskFormProps) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const defaultValues: TaskFormValues = {
    ...DEFAULT_VALUES,
    goalId: defaultGoalId ?? "",
  };

  const createTaskMutation = useCreateTask({
    mutation: {
      onSuccess: (response) => {
        void queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() });
        void queryClient.invalidateQueries({ queryKey: getGetGoalsQueryKey() });
        if (response.data.goalId) {
          void queryClient.invalidateQueries({
            queryKey: getGetGoalsByIdQueryKey(response.data.goalId),
          });
        }

        navigateBackOrPush(router, "/tasks");
      },
    },
  });

  const handleSubmit = (values: TaskFormValues) => {
    createTaskMutation.mutate({
      data: {
        title: values.title,
        description: values.description || null,
        goalId: values.goalId || null,
        dueAt: toIsoCurrentUTCStartOfDay(values.dueAt),
      },
    });
  };

  return (
    <TaskForm
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      isSubmitting={createTaskMutation.isPending}
      submitLabel="Create task"
    />
  );
};

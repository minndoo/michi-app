"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetTasksQueryKey,
  useCreateTask,
} from "@/lib/api/generated/tasks/tasks";
import { toIsoStartOfDay } from "@/helpers/date";
import { navigateBackOrPush } from "@/helpers/browser/navigation";
import { TaskForm } from "./TaskForm";
import type { TaskFormValues } from "./schema";

const DEFAULT_VALUES: TaskFormValues = {
  title: "",
  description: "",
  dueAt: "",
  goalId: "",
};

export const CreateTaskForm = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  const createTaskMutation = useCreateTask({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() });
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
        dueAt: toIsoStartOfDay(values.dueAt),
      },
    });
  };

  return (
    <TaskForm
      defaultValues={DEFAULT_VALUES}
      onSubmit={handleSubmit}
      isSubmitting={createTaskMutation.isPending}
      submitLabel="Create task"
    />
  );
};

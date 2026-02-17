import type { TaskStatus } from "@/lib/api/generated/model";
import { useGetTasks as useGetTasksBase } from "@/lib/api/generated/tasks/tasks";

// TODO: Add filtering for today's tasks

export const useGetTasks = (status?: TaskStatus) =>
  useGetTasksBase({
    status,
  });

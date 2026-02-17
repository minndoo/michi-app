import { useGetTasks as useGetTasksBase } from "@/lib/api/generated/tasks/tasks";
import type { TaskStatus } from "@/lib/api/generated/model";

export const useGetTasks = (status?: TaskStatus) =>
  useGetTasksBase({
    status,
  });

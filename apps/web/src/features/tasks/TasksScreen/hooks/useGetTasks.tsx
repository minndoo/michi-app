import { useGetTasks as useGetTasksBase } from "@/lib/api/generated/tasks/tasks";
import type { GetTasksParams, TaskStatus } from "@/lib/api/generated/model";

export const useGetTasks = (
  status?: TaskStatus,
  order?: GetTasksParams["order"],
) =>
  useGetTasksBase({
    status,
    order,
  });

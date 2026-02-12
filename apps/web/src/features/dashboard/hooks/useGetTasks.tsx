import { useGetTasks as useGetTasksBase } from "@/lib/api/generated/tasks/tasks";

// TODO: Add filtering for today's tasks

export const useGetTasks = () => useGetTasksBase();

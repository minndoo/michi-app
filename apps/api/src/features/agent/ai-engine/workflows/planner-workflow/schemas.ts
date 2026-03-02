import { z } from "zod";

export const plannedGoalSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  dueAt: z.string().optional(),
});

export const plannedTaskSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  dueAt: z.string().optional(),
});

export const plannedGoalWithTasksSchema = z.object({
  goal: plannedGoalSchema,
  tasks: z.array(plannedTaskSchema).min(1).max(10),
});

import { z } from "zod";

const optionalTextSchema = z.string().trim().min(1).nullable().optional();
const optionalDueAtSchema = z.string().trim().min(1).nullable().optional();

export const plannedGoalSchema = z.object({
  title: z.string().trim().min(1),
  description: optionalTextSchema,
  dueAt: optionalDueAtSchema,
});

export const plannedTaskSchema = z.object({
  title: z.string().trim().min(1),
  description: optionalTextSchema,
  dueAt: optionalDueAtSchema,
});

export const plannedGoalWithTasksSchema = z.object({
  goal: plannedGoalSchema,
  tasks: z.array(plannedTaskSchema).min(1).max(10),
});

export type PlannedGoal = z.infer<typeof plannedGoalSchema>;
export type PlannedTask = z.infer<typeof plannedTaskSchema>;
export type PlannedGoalWithTasks = z.infer<typeof plannedGoalWithTasksSchema>;

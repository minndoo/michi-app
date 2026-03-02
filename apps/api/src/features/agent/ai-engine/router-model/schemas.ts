import { z } from "zod";

const optionalTextSchema = z.string().trim().min(1).nullable().optional();

export const routerIntentSchema = z.object({
  intent: z.enum([
    "plan_goal",
    "show_tasks",
    "show_goals",
    "show_tasks_today",
    "refuse",
  ]),
});

export const routerPlanGoalExtractionSchema = z.object({
  goal: optionalTextSchema,
  dueDate: optionalTextSchema,
  baseline: optionalTextSchema,
  startDate: optionalTextSchema,
});

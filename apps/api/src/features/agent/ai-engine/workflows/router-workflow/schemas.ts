import { z } from "zod";

export const routerIntentSchema = z.object({
  intent: z.enum([
    "plan_goal",
    "show_tasks",
    "show_goals",
    "show_tasks_today",
    "refuse",
  ]),
});

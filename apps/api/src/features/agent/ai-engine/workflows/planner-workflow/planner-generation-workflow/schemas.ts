import { z } from "zod";
import { plannedGoalSchema, plannedTaskSchema } from "../schemas.js";

export const generationIntentSchema = z.discriminatedUnion("intent", [
  z.object({
    intent: z.literal("create_plan"),
    goal: plannedGoalSchema,
    tasks: z.array(plannedTaskSchema).min(1).max(10),
  }),
  z.object({
    intent: z.literal("refuse_plan"),
    reason: z.string(),
    proposals: z.array(z.string()).min(1),
  }),
]);

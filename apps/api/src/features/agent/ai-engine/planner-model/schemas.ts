import { z } from "zod";
import { plannedGoalSchema, plannedTaskSchema } from "../agent.schemas.js";

export const plannerModelOutputSchema = z.discriminatedUnion("intent", [
  z.object({
    intent: z.literal("create_plan"),
    goal: plannedGoalSchema,
    tasks: z.array(plannedTaskSchema),
  }),
  z.object({
    intent: z.literal("refuse_plan"),
    reason: z.string().trim().min(1),
    proposals: z.array(z.string().trim().min(1)).min(1),
  }),
]);

export type PlannerModelOutput = z.infer<typeof plannerModelOutputSchema>;

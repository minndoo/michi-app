import { z } from "zod";
import {
  plannerFieldKeyValues,
  planPlannerQuestionInputHintValues,
} from "../../../../agent.types.js";

export const preparationAcceptedSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("accepted"),
    goal: z.string(),
    baseline: z.string(),
    startDate: z.string(),
    dueDate: z.string(),
    daysWeeklyFrequency: z.number().int().min(1).max(7),
    goalDerivedValue: z.number().min(1).max(100),
    baselineDerivedValue: z.number().min(1).max(100),
    goalBaselineGap: z.number().min(0).max(100),
  }),
  z.object({
    status: z.literal("waiting"),
    question: z.object({
      field: z.enum(plannerFieldKeyValues),
      question: z.string(),
    }),
    placeholder: z.string(),
    inputHint: z.enum(planPlannerQuestionInputHintValues),
  }),
]);

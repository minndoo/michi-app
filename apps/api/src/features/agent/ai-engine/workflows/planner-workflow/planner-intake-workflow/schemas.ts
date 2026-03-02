import { z } from "zod";

export const intakeAcceptedSchema = z.object({
  goal: z.string().optional(),
  baseline: z.string().optional(),
  startDate: z.string().optional(),
  relativeStartDate: z.string().optional(),
  dueDate: z.string().optional(),
  relativeDueDate: z.string().optional(),
  daysWeeklyFrequency: z.number().int().min(1).max(7).optional(),
});

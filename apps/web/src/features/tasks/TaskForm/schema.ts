import { z } from "zod";

const dueDatePattern = /^\d{4}-\d{2}-\d{2}$/;

const isValidDueDate = (value: string) => {
  if (!dueDatePattern.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return false;
  }

  const normalizedDate = new Date(Date.UTC(year, month - 1, day));
  return (
    normalizedDate.getUTCFullYear() === year &&
    normalizedDate.getUTCMonth() === month - 1 &&
    normalizedDate.getUTCDate() === day
  );
};

export const taskFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().optional(),
  dueDate: z
    .string()
    .trim()
    .min(1, "Date is required")
    .refine((value) => !value || isValidDueDate(value), {
      message: "Due date must be in YYYY-MM-DD format",
    }),
  goalId: z.string().optional(),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;

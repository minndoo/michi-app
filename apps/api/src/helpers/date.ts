import { createHttpError } from "./http.js";

export const parseDueAt = (dueAt: string): Date => {
  const parsedDueAt = new Date(dueAt);
  if (Number.isNaN(parsedDueAt.getTime())) {
    throw createHttpError(400, "Invalid dueAt");
  }

  return parsedDueAt;
};

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const toIsoStartOfDay = (dateOnly: string): string => {
  if (!DATE_ONLY_PATTERN.test(dateOnly)) {
    throw new Error("Invalid date format");
  }

  const [year, month, day] = dateOnly.split("-").map(Number);
  if (!year || !month || !day) {
    throw new Error("Invalid date value");
  }

  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error("Invalid date value");
  }

  return date.toISOString();
};

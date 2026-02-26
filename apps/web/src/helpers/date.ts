const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type DateFormatOptions = {
  timeZone?: string;
};

const parseDateOnlyAsLocalDate = (value: string): Date | null => {
  if (!DATE_ONLY_PATTERN.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }

  const date = new Date(year, month - 1, day, 0, 0, 0, 0);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
};

const parseDateValue = (value: string): Date | null => {
  const dateOnly = parseDateOnlyAsLocalDate(value);
  if (dateOnly) {
    return dateOnly;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

export const formatDateToMonthDay = (
  value: string,
  options?: DateFormatOptions,
): string => {
  const date = parseDateValue(value);
  if (!date) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(options?.timeZone ? { timeZone: options.timeZone } : {}),
  });
};

export const formatDateTimeForDisplay = (
  value: string,
  options?: DateFormatOptions,
): string => {
  const date = parseDateValue(value);
  if (!date) {
    return value;
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...(options?.timeZone ? { timeZone: options.timeZone } : {}),
  });
};

export const toIsoCurrentUTCStartOfDay = (dateOnly: string): string => {
  if (!DATE_ONLY_PATTERN.test(dateOnly)) {
    throw new Error("Invalid date format");
  }

  const [year, month, day] = dateOnly.split("-").map(Number);
  if (!year || !month || !day) {
    throw new Error("Invalid date value");
  }

  const date = new Date(year, month - 1, day, 0, 0, 0, 0);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new Error("Invalid date value");
  }

  return date.toISOString();
};

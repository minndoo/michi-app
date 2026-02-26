import { describe, expect, it } from "vitest";
import {
  formatDateTimeForDisplay,
  formatDateToMonthDay,
  toIsoCurrentUTCStartOfDay,
} from "../date";

describe("toIsoCurrentUTCStartOfDay", () => {
  it("returns local start-of-day serialized as UTC ISO for valid date", () => {
    const expected = new Date(2026, 1, 18, 0, 0, 0, 0).toISOString();
    expect(toIsoCurrentUTCStartOfDay("2026-02-18")).toBe(expected);
  });

  it("supports leap day", () => {
    const expected = new Date(2024, 1, 29, 0, 0, 0, 0).toISOString();
    expect(toIsoCurrentUTCStartOfDay("2024-02-29")).toBe(expected);
  });

  it("throws for invalid calendar date", () => {
    expect(() => toIsoCurrentUTCStartOfDay("2026-02-30")).toThrow(
      "Invalid date value",
    );
  });

  it("throws for malformed format", () => {
    expect(() => toIsoCurrentUTCStartOfDay("2026/02/18")).toThrow(
      "Invalid date format",
    );
  });
});

describe("formatDateToMonthDay", () => {
  it("returns month/day for valid ISO datetime", () => {
    expect(formatDateToMonthDay("2026-02-18T17:00:00.000Z")).toBe("Feb 18");
  });

  it("returns month/day for valid date-only", () => {
    expect(formatDateToMonthDay("2026-12-03")).toBe("Dec 3");
  });

  it("returns input for invalid date", () => {
    expect(formatDateToMonthDay("not-a-date")).toBe("not-a-date");
  });

  it("formats by timezone for the same instant", () => {
    const value = "2026-02-18T00:30:00.000Z";
    expect(
      formatDateToMonthDay(value, { timeZone: "America/Los_Angeles" }),
    ).toBe("Feb 17");
    expect(formatDateToMonthDay(value, { timeZone: "Europe/Warsaw" })).toBe(
      "Feb 18",
    );
  });
});

describe("formatDateTimeForDisplay", () => {
  it("returns input for invalid date", () => {
    expect(formatDateTimeForDisplay("not-a-date")).toBe("not-a-date");
  });

  it("formats by timezone for the same instant", () => {
    const value = "2026-02-18T00:30:00.000Z";
    expect(
      formatDateTimeForDisplay(value, { timeZone: "America/Los_Angeles" }),
    ).toContain("Feb 17");
    expect(
      formatDateTimeForDisplay(value, { timeZone: "Europe/Warsaw" }),
    ).toContain("Feb 18");
  });
});

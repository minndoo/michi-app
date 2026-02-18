import { describe, expect, it } from "vitest";
import { toIsoStartOfDay } from "../date";

describe("toIsoStartOfDay", () => {
  it("returns UTC start-of-day ISO for valid date", () => {
    expect(toIsoStartOfDay("2026-02-18")).toBe("2026-02-18T00:00:00.000Z");
  });

  it("supports leap day", () => {
    expect(toIsoStartOfDay("2024-02-29")).toBe("2024-02-29T00:00:00.000Z");
  });

  it("throws for invalid calendar date", () => {
    expect(() => toIsoStartOfDay("2026-02-30")).toThrow("Invalid date value");
  });

  it("throws for malformed format", () => {
    expect(() => toIsoStartOfDay("2026/02/18")).toThrow("Invalid date format");
  });
});

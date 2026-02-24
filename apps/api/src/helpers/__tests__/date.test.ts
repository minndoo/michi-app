import { describe, expect, it } from "vitest";
import { parseDueAt } from "../date.js";

describe("parseDueAt", () => {
  it("parses a valid ISO datetime", () => {
    const isoDate = "2026-02-23T00:00:00.000Z";

    const parsedDate = parseDueAt(isoDate);

    expect(parsedDate).toBeInstanceOf(Date);
    expect(parsedDate.toISOString()).toBe(isoDate);
  });

  it("throws HttpError for invalid date input", () => {
    expect.assertions(2);

    try {
      parseDueAt("invalid-date");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect(error).toMatchObject({
        message: "Invalid dueAt",
        status: 400,
      });
    }
  });

  it("parses edge-valid ISO datetime", () => {
    const isoDate = "2026-12-31T23:59:59.999Z";

    const parsedDate = parseDueAt(isoDate);

    expect(parsedDate.toISOString()).toBe(isoDate);
  });
});

import { describe, expect, it } from "vitest";
import { createHttpError } from "../http.js";

describe("createHttpError", () => {
  it("returns an Error instance", () => {
    const error = createHttpError(400, "Bad request");

    expect(error).toBeInstanceOf(Error);
  });

  it("sets message and status", () => {
    const error = createHttpError(401, "Unauthorized");

    expect(error.message).toBe("Unauthorized");
    expect(error.status).toBe(401);
  });
});

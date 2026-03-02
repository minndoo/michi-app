import { describe, expect, it } from "vitest";
import { plannedGoalWithTasksSchema } from "../workflows/planner-workflow/schemas.js";

describe("plannedGoalWithTasksSchema", () => {
  it("accepts a valid goal with tasks payload", () => {
    const result = plannedGoalWithTasksSchema.safeParse({
      goal: {
        title: "Run a 10k",
        description: "Build up mileage gradually.",
        dueAt: "2026-04-01T00:00:00.000Z",
      },
      tasks: [
        {
          title: "Run 3 times this week",
          description: "Keep each run easy.",
          dueAt: "2026-03-03T00:00:00.000Z",
        },
      ],
    });

    expect(result.success).toBe(true);
  });
});

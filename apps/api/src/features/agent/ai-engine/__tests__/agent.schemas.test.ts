import { describe, expect, it } from "vitest";
import { plannedGoalWithTasksSchema } from "../agent.schemas.js";

describe("plannedGoalWithTasksSchema", () => {
  it("accepts a plan with optional dueAt fields", () => {
    const result = plannedGoalWithTasksSchema.parse({
      goal: {
        title: "Train for a 10k",
        description: "Build a steady running habit.",
      },
      tasks: [
        {
          title: "Run three times this week",
        },
      ],
    });

    expect(result).toEqual({
      goal: {
        title: "Train for a 10k",
        description: "Build a steady running habit.",
      },
      tasks: [
        {
          title: "Run three times this week",
        },
      ],
    });
  });
});

import { describe, expect, it, vi } from "vitest";
import { createPlannerIntakeWorkflow } from "../planner-intake-workflow.js";

const createState = () => ({
  threadId: "thread-1",
  userId: "user-1",
  referenceDate: "2026-03-02T00:00:00.000Z",
  timezone: "Europe/Warsaw",
  input: "Plan my running goal",
  accepted: null,
  denied: null,
});

describe("createPlannerIntakeWorkflow", () => {
  it("asks for cadence when daysWeeklyFrequency is missing", async () => {
    const workflow = createPlannerIntakeWorkflow({
      model: {
        withStructuredOutput: vi.fn().mockReturnValue({
          invoke: vi.fn().mockResolvedValue({
            goal: "Run a 10k",
            baseline: "Can run 3km",
            relativeStartDate: "tomorrow",
            relativeDueDate: "in a month",
          }),
        }),
      } as never,
    });

    const result = await workflow.invoke(createState());

    expect(result.accepted).toBeNull();
    expect(result.denied).toEqual({
      reason: "Missing required planning fields.",
      missingFields: ["daysWeeklyFrequency"],
    });
  });
});

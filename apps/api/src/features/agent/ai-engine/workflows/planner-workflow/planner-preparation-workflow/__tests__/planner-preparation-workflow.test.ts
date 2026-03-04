import { describe, expect, it, vi } from "vitest";
import { createPlannerPreparationWorkflow } from "../planner-preparation-workflow.js";

const createState = (overrides = {}) => ({
  threadId: "thread-1",
  userId: "user-1",
  referenceDate: "2026-03-02T00:00:00.000Z",
  timezone: "Europe/Warsaw",
  input: "Plan my running goal",
  intakeAccepted: {
    goal: "Run a 10k",
    baseline: "Can run 3km",
    relativeStartDate: "tomorrow",
    relativeDueDate: "in a month",
    daysWeeklyFrequency: 3,
  },
  accepted: null,
  waiting: null,
  ...overrides,
});

describe("createPlannerPreparationWorkflow", () => {
  it("returns waiting with the shared planner question shape", async () => {
    const workflow = createPlannerPreparationWorkflow({
      model: {
        withStructuredOutput: vi.fn().mockReturnValue({
          invoke: vi.fn().mockResolvedValue({
            status: "waiting",
            question: {
              field: "baseline",
              question: "Can you be more specific about your baseline?",
            },
            placeholder: "Example: I can run 3 km without stopping",
            inputHint: "free_text",
          }),
        }),
      } as never,
    });

    const result = await workflow.invoke(createState());

    expect(result.accepted).toBeNull();
    expect(result.waiting).toEqual({
      question: {
        stage: "preparation",
        question: {
          field: "baseline",
          question: "Can you be more specific about your baseline?",
        },
        placeholder: "Example: I can run 3 km without stopping",
        inputHint: "free_text",
      },
    });
  });

  it("adds clarifications to the prompt when a follow-up answer targets a planner field", async () => {
    const invoke = vi.fn().mockResolvedValue({
      status: "accepted",
      goal: "Run a 10k",
      baseline: "Can run 3km",
      startDate: "2026-03-03T00:00:00.000Z",
      dueDate: "2026-04-03T00:00:00.000Z",
      daysWeeklyFrequency: 3,
      goalDerivedValue: 70,
      baselineDerivedValue: 30,
      goalBaselineGap: 40,
    });
    const workflow = createPlannerPreparationWorkflow({
      model: {
        withStructuredOutput: vi.fn().mockReturnValue({
          invoke,
        }),
      } as never,
    });

    await workflow.invoke(
      createState({
        input: "I can run 3km without stopping",
        questionAnswer: {
          field: "baseline",
          answer: "I can run 3km without stopping",
        },
      }),
    );

    expect(invoke).toHaveBeenCalledWith(
      expect.stringContaining(
        "Clarifications:\nbaseline: I can run 3km without stopping",
      ),
    );
  });
});

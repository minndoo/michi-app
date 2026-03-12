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
    startDate: "tomorrow",
    dueDate: "in a month",
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
            questions: [
              {
                question: {
                  field: "baseline",
                  question: "Can you be more specific about your baseline?",
                },
                placeholder: "Example: I can run 3 km without stopping",
                inputHint: "free_text",
              },
              {
                question: {
                  field: "goal",
                  question: "What specific goal do you want to reach?",
                },
                placeholder: "Example: Run a 10k race",
                inputHint: "free_text",
              },
            ],
          }),
        }),
      } as never,
    });

    const result = await workflow.invoke(createState());

    expect(result.accepted).toBeNull();
    expect(result.waiting).toEqual({
      questions: [
        {
          stage: "preparation",
          question: {
            field: "baseline",
            question: "Can you be more specific about your baseline?",
          },
          placeholder: "Example: I can run 3 km without stopping",
          inputHint: "free_text",
        },
        {
          stage: "preparation",
          question: {
            field: "goal",
            question: "What specific goal do you want to reach?",
          },
          placeholder: "Example: Run a 10k race",
          inputHint: "free_text",
        },
      ],
    });
  });

  it("calls model when a follow-up answer targets a planner field", async () => {
    const invoke = vi.fn().mockResolvedValue({
      status: "accepted",
      goal: "Run a 10k",
      baseline: "Can run 3km",
      startDate: "2026-03-03T00:00:00.000Z",
      dueDate: "2026-04-03T00:00:00.000Z",
      daysWeeklyFrequency: 3,
      goalAssumedValue: 70,
      baselineAssumedValue: 30,
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
        questionAnswers: [
          {
            field: "baseline",
            answer: "I can run 3km without stopping",
          },
        ],
      }),
    );

    expect(invoke).toHaveBeenCalledOnce();
  });

  it("computes deterministic preparation metrics from accepted values", async () => {
    const workflow = createPlannerPreparationWorkflow({
      model: {
        withStructuredOutput: vi.fn().mockReturnValue({
          invoke: vi.fn().mockResolvedValue({
            status: "accepted",
            goal: "Run a 10k",
            baseline: "Can run 3km",
            startDate: "2026-03-03T00:00:00.000Z",
            dueDate: "2026-04-03T00:00:00.000Z",
            daysWeeklyFrequency: 3,
            goalAssumedValue: 80,
            baselineAssumedValue: 20,
          }),
        }),
      } as never,
    });

    const result = await workflow.invoke(createState());

    expect(result.accepted).toEqual({
      goal: "Run a 10k",
      baseline: "Can run 3km",
      startDate: "2026-03-03T00:00:00.000Z",
      dueDate: "2026-04-03T00:00:00.000Z",
      daysWeeklyFrequency: 3,
      goalAssumedValue: 80,
      baselineAssumedValue: 20,
      gap: 60,
      timeFrame: 31,
      availableDays: 13,
      gapClosingFrequency: 4,
    });
    expect(result.waiting).toBeNull();
  });

  it("returns waiting when available days are zero or negative", async () => {
    const workflow = createPlannerPreparationWorkflow({
      model: {
        withStructuredOutput: vi.fn().mockReturnValue({
          invoke: vi.fn().mockResolvedValue({
            status: "accepted",
            goal: "Run a 10k",
            baseline: "Can run 3km",
            startDate: "2026-03-03T00:00:00.000Z",
            dueDate: "2026-03-03T00:00:00.000Z",
            daysWeeklyFrequency: 3,
            goalAssumedValue: 80,
            baselineAssumedValue: 20,
          }),
        }),
      } as never,
    });

    const result = await workflow.invoke(createState());

    expect(result.accepted).toBeNull();
    expect(result.waiting).toEqual({
      questions: [
        {
          stage: "preparation",
          question: {
            field: "dueDate",
            question:
              "Your current timeframe does not include any available working days. Please adjust due date and/or days per week.",
          },
          placeholder: "Example: due in 8 weeks and 3 days per week",
          inputHint: "free_text",
        },
      ],
    });
  });

  it("uses deterministic fallback dates when intake dates are not parseable", async () => {
    const workflow = createPlannerPreparationWorkflow({
      model: {
        withStructuredOutput: vi.fn().mockReturnValue({
          invoke: vi.fn().mockRejectedValue(new Error("model unavailable")),
        }),
      } as never,
    });

    const result = await workflow.invoke(
      createState({
        intakeAccepted: {
          goal: "Run a 10k",
          baseline: "Can run 3km",
          startDate: "tomorrow",
          dueDate: "in a month",
          daysWeeklyFrequency: 3,
        },
      }),
    );

    expect(result.waiting).toBeNull();
    expect(result.accepted).toEqual({
      goal: "Run a 10k",
      baseline: "Can run 3km",
      startDate: "2026-03-02T00:00:00.000Z",
      dueDate: "2026-04-01T00:00:00.000Z",
      daysWeeklyFrequency: 3,
      goalAssumedValue: 70,
      baselineAssumedValue: 30,
      gap: 40,
      timeFrame: 30,
      availableDays: 12,
      gapClosingFrequency: 3,
    });
  });
});

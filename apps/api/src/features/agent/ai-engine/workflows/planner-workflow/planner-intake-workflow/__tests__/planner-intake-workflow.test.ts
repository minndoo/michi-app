import { describe, expect, it, vi } from "vitest";
import { createPlannerIntakeWorkflow } from "../planner-intake-workflow.js";

const createState = (overrides = {}) => ({
  threadId: "thread-1",
  userId: "user-1",
  referenceDate: "2026-03-02T00:00:00.000Z",
  timezone: "Europe/Warsaw",
  input: "Plan my running goal",
  accepted: null,
  waiting: null,
  ...overrides,
});

describe("createPlannerIntakeWorkflow", () => {
  it("returns a deterministic question when cadence is missing", async () => {
    const workflow = createPlannerIntakeWorkflow({
      model: {
        withStructuredOutput: vi.fn().mockReturnValue({
          invoke: vi.fn().mockResolvedValue({
            extracted: {
              goal: "Run a 10k",
              baseline: "Can run 3km",
              relativeStartDate: "tomorrow",
              relativeDueDate: "in a month",
            },
          }),
        }),
      } as never,
    });

    const result = await workflow.invoke(createState());

    expect(result.accepted).toEqual({
      goal: "Run a 10k",
      baseline: "Can run 3km",
      relativeStartDate: "tomorrow",
      relativeDueDate: "in a month",
    });
    expect(result.waiting).toEqual({
      reason: "Missing required planning fields.",
      missingFields: ["daysWeeklyFrequency"],
      questions: [
        {
          stage: "intake",
          question: {
            field: "daysWeeklyFrequency",
            question: "How many days per week can you work on this?",
          },
          placeholder: "Example: 3 days per week",
          inputHint: "days_per_week",
        },
      ],
    });
  });

  it("fills a missing field while preserving previously accepted values", async () => {
    const workflow = createPlannerIntakeWorkflow({
      model: {
        withStructuredOutput: vi.fn().mockReturnValue({
          invoke: vi.fn().mockResolvedValue({
            extracted: {
              daysWeeklyFrequency: 3,
            },
          }),
        }),
      } as never,
    });

    const result = await workflow.invoke(
      createState({
        input: "Three days per week.",
        accepted: {
          goal: "Run a 10k",
          baseline: "Can run 3km",
          relativeStartDate: "tomorrow",
          relativeDueDate: "in a month",
        },
      }),
    );

    expect(result.waiting).toBeNull();
    expect(result.accepted).toEqual({
      goal: "Run a 10k",
      baseline: "Can run 3km",
      relativeStartDate: "tomorrow",
      relativeDueDate: "in a month",
      daysWeeklyFrequency: 3,
    });
  });

  it("does not overwrite an existing field when the model emits a value for it", async () => {
    const workflow = createPlannerIntakeWorkflow({
      model: {
        withStructuredOutput: vi.fn().mockReturnValue({
          invoke: vi.fn().mockResolvedValue({
            extracted: {
              baseline: "Can barely run 1km",
            },
          }),
        }),
      } as never,
    });

    const result = await workflow.invoke(
      createState({
        input: "Actually I can barely run 1km",
        accepted: {
          goal: "Run a 10k",
          baseline: "Can run 3km",
          relativeStartDate: "tomorrow",
          relativeDueDate: "in a month",
          daysWeeklyFrequency: 3,
        },
      }),
    );

    expect(result.waiting).toBeNull();
    expect(result.accepted).toMatchObject({
      baseline: "Can run 3km",
    });
  });

  it("returns no extraction when the latest answer is ambiguous", async () => {
    const workflow = createPlannerIntakeWorkflow({
      model: {
        withStructuredOutput: vi.fn().mockReturnValue({
          invoke: vi.fn().mockResolvedValue({
            extracted: {},
          }),
        }),
      } as never,
    });

    const result = await workflow.invoke(
      createState({
        input: "Not sure yet",
        accepted: {
          goal: "Run a 10k",
          relativeStartDate: "tomorrow",
          relativeDueDate: "in a month",
          daysWeeklyFrequency: 3,
        },
      }),
    );

    expect(result.accepted).toEqual({
      goal: "Run a 10k",
      relativeStartDate: "tomorrow",
      relativeDueDate: "in a month",
      daysWeeklyFrequency: 3,
    });
    expect(result.waiting).toEqual({
      reason: "Missing required planning fields.",
      missingFields: ["baseline"],
      questions: [
        {
          stage: "intake",
          question: {
            field: "baseline",
            question: "What is your current starting point?",
          },
          placeholder: "Example: I can currently run 3 km without stopping",
          inputHint: "free_text",
        },
      ],
    });
  });

  it("does not replace an already accepted date variant", async () => {
    const workflow = createPlannerIntakeWorkflow({
      model: {
        withStructuredOutput: vi.fn().mockReturnValue({
          invoke: vi.fn().mockResolvedValue({
            extracted: {
              startDate: "2026-03-05",
            },
          }),
        }),
      } as never,
    });

    const result = await workflow.invoke(
      createState({
        input: "Start on 2026-03-05",
        accepted: {
          goal: "Run a 10k",
          baseline: "Can run 3km",
          relativeStartDate: "tomorrow",
          relativeDueDate: "in a month",
          daysWeeklyFrequency: 3,
        },
      }),
    );

    expect(result.waiting).toBeNull();
    expect(result.accepted).toEqual({
      goal: "Run a 10k",
      baseline: "Can run 3km",
      relativeStartDate: "tomorrow",
      relativeDueDate: "in a month",
      daysWeeklyFrequency: 3,
    });
  });

  it("builds prompt with alreadyAcceptedFields and mapped userDefinedFields", async () => {
    const invoke = vi.fn().mockResolvedValue({
      extracted: {
        baseline: "Can run 3km",
      },
    });
    const workflow = createPlannerIntakeWorkflow({
      model: {
        withStructuredOutput: vi.fn().mockReturnValue({
          invoke,
        }),
      } as never,
    });

    await workflow.invoke(
      createState({
        input: "I can run 3km",
        accepted: {
          goal: "Run a 10k",
          relativeStartDate: "tomorrow",
          relativeDueDate: "in a month",
        },
        questionAnswers: [
          {
            field: "baseline",
            answer: "  I can currently run 3km without stopping  ",
          },
          {
            field: "daysWeeklyFrequency",
            answer: "",
          },
          {
            field: "baseline",
            answer: "Can run 3km",
          },
        ],
      }),
    );

    expect(invoke).toHaveBeenCalledOnce();
    expect(invoke).toHaveBeenCalledWith(
      expect.stringContaining(
        'alreadyAcceptedFields:\n{\n  "goal": "Run a 10k",',
      ),
    );
    expect(invoke).toHaveBeenCalledWith(
      expect.stringContaining(
        'userDefinedFields:\n{\n  "baseline": "Can run 3km"\n}',
      ),
    );
    expect(invoke).toHaveBeenCalledWith(
      expect.stringContaining("latestUserInput:\nI can run 3km"),
    );
    expect(invoke).toHaveBeenCalledWith(
      expect.stringContaining(
        "Extract zero to many fields independently in one turn.",
      ),
    );
    expect(invoke).toHaveBeenCalledWith(
      expect.stringContaining(
        'Relative phrases like "today", "tomorrow", "next week", "in 6 weeks", and "in 10 days" may map to relativeStartDate/relativeDueDate.',
      ),
    );
    expect(invoke).toHaveBeenCalledWith(
      expect.stringContaining(
        'Explicit calendar dates like "2026-03-12" or "2026-04-20" may map to startDate/dueDate.',
      ),
    );
    expect(invoke).toHaveBeenCalledWith(
      expect.stringContaining(
        '- userDefinedFields: { "startDate": "next week" }\n- latestUserInput: "next week"\n- Output: { "extracted": { "relativeStartDate": "next week" } }',
      ),
    );
    expect(invoke).toHaveBeenCalledWith(
      expect.stringContaining(
        '- userDefinedFields: { "startDate": "2026-03-12" }\n- latestUserInput: "2026-03-12"\n- Output: { "extracted": { "startDate": "2026-03-12" } }',
      ),
    );
    expect(invoke).toHaveBeenCalledWith(
      expect.stringContaining(
        '- userDefinedFields: { "startDate": "sometime soon" }\n- latestUserInput: "sometime soon"\n- Output: { "extracted": {} }',
      ),
    );
  });

  it("calls model for multi-field clarification turns and keeps unresolved fields waiting", async () => {
    const invoke = vi.fn().mockResolvedValue({
      extracted: {
        baseline: "Can run 3km",
      },
    });
    const workflow = createPlannerIntakeWorkflow({
      model: {
        withStructuredOutput: vi.fn().mockReturnValue({
          invoke,
        }),
      } as never,
    });

    const result = await workflow.invoke(
      createState({
        input: "Can run 3km",
        accepted: {
          goal: "Run a 10k",
          relativeStartDate: "tomorrow",
          relativeDueDate: "in 6 weeks",
        },
        questionAnswers: [
          {
            field: "baseline",
            answer: "Can run 3km",
          },
          {
            field: "daysWeeklyFrequency",
            answer: "three-ish",
          },
        ],
      }),
    );

    expect(invoke).toHaveBeenCalledOnce();
    expect(result.accepted).toEqual({
      goal: "Run a 10k",
      baseline: "Can run 3km",
      relativeStartDate: "tomorrow",
      relativeDueDate: "in 6 weeks",
    });
    expect(result.waiting).toEqual({
      reason: "Missing required planning fields.",
      missingFields: ["daysWeeklyFrequency"],
      questions: [
        {
          stage: "intake",
          question: {
            field: "daysWeeklyFrequency",
            question: "How many days per week can you work on this?",
          },
          placeholder: "Example: 3 days per week",
          inputHint: "days_per_week",
        },
      ],
    });
  });

  it("merges relative date extraction into intake accepted", async () => {
    const workflow = createPlannerIntakeWorkflow({
      model: {
        withStructuredOutput: vi.fn().mockReturnValue({
          invoke: vi.fn().mockResolvedValue({
            extracted: {
              relativeStartDate: "next week",
              relativeDueDate: "in 6 weeks",
            },
          }),
        }),
      } as never,
    });

    const result = await workflow.invoke(
      createState({
        input: "Start next week and finish in 6 weeks",
        accepted: {
          goal: "Run a 10k",
          baseline: "Can run 3km",
          daysWeeklyFrequency: 3,
        },
      }),
    );

    expect(result.waiting).toBeNull();
    expect(result.accepted).toEqual({
      goal: "Run a 10k",
      baseline: "Can run 3km",
      relativeStartDate: "next week",
      relativeDueDate: "in 6 weeks",
      daysWeeklyFrequency: 3,
    });
  });

  it("merges exact date extraction into intake accepted", async () => {
    const workflow = createPlannerIntakeWorkflow({
      model: {
        withStructuredOutput: vi.fn().mockReturnValue({
          invoke: vi.fn().mockResolvedValue({
            extracted: {
              startDate: "2026-03-12",
              dueDate: "2026-04-20",
            },
          }),
        }),
      } as never,
    });

    const result = await workflow.invoke(
      createState({
        input: "Start on 2026-03-12 and finish by 2026-04-20",
        accepted: {
          goal: "Run a 10k",
          baseline: "Can run 3km",
          daysWeeklyFrequency: 3,
        },
      }),
    );

    expect(result.waiting).toBeNull();
    expect(result.accepted).toEqual({
      goal: "Run a 10k",
      baseline: "Can run 3km",
      startDate: "2026-03-12",
      dueDate: "2026-04-20",
      daysWeeklyFrequency: 3,
    });
  });
});

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
      question: {
        stage: "intake",
        question: {
          field: "daysWeeklyFrequency",
          question: "How many days per week can you work on this?",
        },
        placeholder: "Example: 3 days per week",
        inputHint: "days_per_week",
      },
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
      question: {
        stage: "intake",
        question: {
          field: "baseline",
          question: "What is your current starting point?",
        },
        placeholder: "Example: I can currently run 3 km without stopping",
        inputHint: "free_text",
      },
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

  it("adds clarifications to the prompt when the answer targets a known field", async () => {
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
        input: "I can currently run 3km without stopping",
        accepted: {
          goal: "Run a 10k",
          relativeStartDate: "tomorrow",
          relativeDueDate: "in a month",
          daysWeeklyFrequency: 3,
        },
        questionAnswer: {
          field: "baseline",
          answer: "I can currently run 3km without stopping",
        },
      }),
    );

    expect(invoke).toHaveBeenCalledWith(
      expect.stringContaining(
        "Clarifications:\nbaseline: I can currently run 3km without stopping",
      ),
    );
    expect(invoke).toHaveBeenCalledWith(
      expect.stringContaining(
        "This turn is one of two modes:\n1. an initial planning request containing multiple fields\n2. a follow-up answer to one planner question about one missing field",
      ),
    );
    expect(invoke).toHaveBeenCalledWith(
      expect.stringContaining(
        'Already accepted fields:\n{\n  "goal": "Run a 10k"',
      ),
    );
    expect(invoke).toHaveBeenCalledWith(
      expect.not.stringContaining("Already extracted fields:"),
    );
    expect(invoke).toHaveBeenCalledWith(
      expect.not.stringContaining("corrections:"),
    );
    expect(invoke).toHaveBeenCalledWith(
      expect.stringContaining("How to use context:"),
    );
    expect(invoke).toHaveBeenCalledWith(
      expect.stringContaining("Decision rules and precedence:"),
    );
    expect(invoke).toHaveBeenCalledWith(
      expect.stringContaining("Short-answer rules:"),
    );
    expect(invoke).toHaveBeenCalledWith(
      expect.stringContaining(
        'If Clarifications says baseline and the user says "run 1km", interpret it as baseline if that is a reasonable fit.',
      ),
    );
    expect(invoke).toHaveBeenCalledWith(
      expect.stringContaining(
        "If no clarification exists and a short fragment could fit multiple supported fields, extract nothing.",
      ),
    );
    expect(invoke).toHaveBeenCalledWith(
      expect.stringContaining("Negative examples:"),
    );
    expect(invoke).toHaveBeenCalledWith(
      expect.stringContaining(
        'Latest user input: "run 1km"\n- Output: { "extracted": {} }',
      ),
    );
    expect(invoke).toHaveBeenCalledWith(
      expect.stringContaining("Positive examples:"),
    );
    expect(invoke).toHaveBeenCalledWith(
      expect.stringContaining(
        '- Output: { "extracted": { "relativeStartDate": "tomorrow" } }',
      ),
    );
    expect(invoke).toHaveBeenCalledWith(
      expect.stringContaining(
        '- Output: { "extracted": { "relativeDueDate": "in 6 weeks" } }',
      ),
    );
    expect(invoke).toHaveBeenCalledWith(
      expect.stringContaining(
        '- Output: { "extracted": { "daysWeeklyFrequency": 3 } }',
      ),
    );
    expect(invoke).toHaveBeenCalledWith(
      expect.stringContaining(
        "If the latest user input does not clearly answer a single supported field, return extracted: {}",
      ),
    );
  });
});

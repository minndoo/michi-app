import { describe, expect, it, vi } from "vitest";
import { createPlannerWorkflow } from "../planner-workflow.js";

const createDeferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return { promise, reject, resolve };
};

const createPlannerInput = () => ({
  threadId: "thread-1",
  userId: "user-1",
  referenceDate: "2026-03-02T00:00:00.000Z",
  timezone: "Europe/Warsaw",
  input: "Plan my running goal",
  routedIntent: "plan_goal" as const,
});

describe("createPlannerWorkflow", () => {
  it("returns waiting response when intake denies", async () => {
    const workflow = createPlannerWorkflow({
      intakeWorkflow: {
        invoke: vi.fn().mockResolvedValue({
          accepted: {
            goal: "Run a 10k",
          },
          waiting: {
            reason: "Missing required planning fields.",
            missingFields: ["baseline", "dueDate"],
            questions: [
              {
                stage: "intake",
                question: {
                  field: "baseline",
                  question: "What is your current starting point?",
                },
                placeholder:
                  "Example: I can currently run 3 km without stopping",
                inputHint: "free_text",
              },
              {
                stage: "intake",
                question: {
                  field: "dueDate",
                  question:
                    'When should this be completed? You can answer with a date or something like "in 6 weeks".',
                },
                placeholder: "Example: in 6 weeks",
                inputHint: "date_or_relative",
              },
            ],
          },
        }),
      } as never,
      preparationWorkflow: {
        invoke: vi.fn(),
      } as never,
      generationWorkflow: {
        invoke: vi.fn(),
      } as never,
    });

    const result = await workflow.invoke(createPlannerInput());

    expect(result.planningStage).toBe("intake");
    expect(result.response).toBe(
      'Please answer the following:\n1. What is your current starting point?\n2. When should this be completed? You can answer with a date or something like "in 6 weeks".',
    );
    expect(result.plannerQuestions).toEqual([
      {
        stage: "intake",
        question: {
          field: "baseline",
          question: "What is your current starting point?",
        },
        placeholder: "Example: I can currently run 3 km without stopping",
        inputHint: "free_text",
      },
      {
        stage: "intake",
        question: {
          field: "dueDate",
          question:
            'When should this be completed? You can answer with a date or something like "in 6 weeks".',
        },
        placeholder: "Example: in 6 weeks",
        inputHint: "date_or_relative",
      },
    ]);
  });

  it("defaults fresh invocations to intake", async () => {
    const mockedIntakeInvoke = vi.fn().mockResolvedValue({
      accepted: null,
      waiting: {
        reason: "Missing required planning fields.",
        missingFields: ["goal"],
        questions: [
          {
            stage: "intake",
            question: {
              field: "goal",
              question: "What exactly do you want to achieve?",
            },
            placeholder: "Example: Run a 10k race",
            inputHint: "free_text",
          },
        ],
      },
    });
    const workflow = createPlannerWorkflow({
      intakeWorkflow: {
        invoke: mockedIntakeInvoke,
      } as never,
      preparationWorkflow: {
        invoke: vi.fn(),
      } as never,
      generationWorkflow: {
        invoke: vi.fn(),
      } as never,
    });

    await workflow.invoke(createPlannerInput());

    expect(mockedIntakeInvoke).toHaveBeenCalledWith(
      expect.objectContaining({
        accepted: null,
      }),
    );
  });

  it("advances through preparation and generation", async () => {
    const mockedPreparationInvoke = vi.fn().mockResolvedValue({
      accepted: {
        goal: "Run a 10k",
        baseline: "Can run 3km",
        startDate: "2026-03-03T00:00:00.000Z",
        dueDate: "2026-04-03T00:00:00.000Z",
        daysWeeklyFrequency: 3,
        goalAssumedValue: 70,
        baselineAssumedValue: 30,
        gap: 40,
        timeFrame: 31,
        availableDays: 13,
        gapClosingFrequency: 3,
      },
      waiting: null,
    });
    const mockedGenerationInvoke = vi.fn().mockResolvedValue({
      plannerAction: "create_plan",
      plan: {
        goal: { title: "Run a 10k" },
        tasks: [{ title: "Run this week" }],
      },
      refusal: null,
    });
    const workflow = createPlannerWorkflow({
      intakeWorkflow: {
        invoke: vi.fn().mockResolvedValue({
          accepted: {
            goal: "Run a 10k",
            baseline: "Can run 3km",
            startDate: "tomorrow",
            dueDate: "in a month",
            daysWeeklyFrequency: 3,
          },
          waiting: null,
        }),
      } as never,
      preparationWorkflow: {
        invoke: mockedPreparationInvoke,
      } as never,
      generationWorkflow: {
        invoke: mockedGenerationInvoke,
      } as never,
    });

    const result = await workflow.invoke(createPlannerInput());

    expect(result.plannerAction).toBe("create_plan");
    expect(result.plan).toEqual({
      goal: { title: "Run a 10k" },
      tasks: [{ title: "Run this week" }],
    });
    expect(mockedPreparationInvoke).toHaveBeenCalledTimes(1);
    expect(mockedGenerationInvoke).toHaveBeenCalledTimes(1);
  });

  it("returns waiting response when preparation asks for clarification", async () => {
    const workflow = createPlannerWorkflow({
      intakeWorkflow: {
        invoke: vi.fn().mockResolvedValue({
          accepted: {
            goal: "Run a 10k",
            baseline: "Can run 3km",
            startDate: "tomorrow",
            dueDate: "in a month",
            daysWeeklyFrequency: 3,
          },
          waiting: null,
        }),
      } as never,
      preparationWorkflow: {
        invoke: vi.fn().mockResolvedValue({
          accepted: null,
          waiting: {
            questions: [
              {
                stage: "preparation",
                question: {
                  field: "daysWeeklyFrequency",
                  question: "How many days each week can you train?",
                },
                placeholder: "Example: 3 days per week",
                inputHint: "days_per_week",
              },
            ],
          },
        }),
      } as never,
      generationWorkflow: {
        invoke: vi.fn(),
      } as never,
    });

    const result = await workflow.invoke(createPlannerInput());

    expect(result.planningStage).toBe("preparation");
    expect(result.response).toBe("How many days each week can you train?");
    expect(result.plannerQuestions).toEqual([
      {
        stage: "preparation",
        question: {
          field: "daysWeeklyFrequency",
          question: "How many days each week can you train?",
        },
        placeholder: "Example: 3 days per week",
        inputHint: "days_per_week",
      },
    ]);
  });

  it("returns refusal from generation", async () => {
    const workflow = createPlannerWorkflow({
      intakeWorkflow: {
        invoke: vi.fn().mockResolvedValue({
          accepted: {
            goal: "Run a marathon",
            baseline: "Never ran before",
            startDate: "tomorrow",
            dueDate: "in one week",
            daysWeeklyFrequency: 7,
          },
          waiting: null,
        }),
      } as never,
      preparationWorkflow: {
        invoke: vi.fn().mockResolvedValue({
          accepted: {
            goal: "Run a marathon",
            baseline: "Never ran before",
            startDate: "2026-03-03T00:00:00.000Z",
            dueDate: "2026-03-10T00:00:00.000Z",
            daysWeeklyFrequency: 7,
            goalAssumedValue: 95,
            baselineAssumedValue: 5,
            gap: 90,
            timeFrame: 7,
            availableDays: 7,
            gapClosingFrequency: 12,
          },
          waiting: null,
        }),
      } as never,
      generationWorkflow: {
        invoke: vi.fn().mockResolvedValue({
          plannerAction: "refuse_plan",
          plan: null,
          refusal: {
            reason: "The timeline is too aggressive.",
            proposals: ["Extend the due date.", "Reduce the target."],
          },
        }),
      } as never,
    });

    const result = await workflow.invoke(createPlannerInput());

    expect(result.plannerAction).toBe("refuse_plan");
    expect(result.refusal).toEqual({
      reason: "The timeline is too aggressive.",
      proposals: ["Extend the due date.", "Reduce the target."],
    });
  });

  it("refuses resumed preparation when intakeAccepted is missing", async () => {
    const mockedIntakeInvoke = vi.fn();
    const mockedPreparationInvoke = vi.fn();
    const mockedGenerationInvoke = vi.fn();
    const workflow = createPlannerWorkflow({
      intakeWorkflow: {
        invoke: mockedIntakeInvoke,
      } as never,
      preparationWorkflow: {
        invoke: mockedPreparationInvoke,
      } as never,
      generationWorkflow: {
        invoke: mockedGenerationInvoke,
      } as never,
    });

    const result = await workflow.invoke({
      ...createPlannerInput(),
      planningStage: "preparation",
      intakeAccepted: null,
    });

    expect(result.plannerAction).toBe("refuse_plan");
    expect(result.refusal).toEqual({
      reason: "The planning session is missing required intake details.",
      proposals: [
        "Start a new planning request from /message.",
        "Continue with a thread that has complete intake details.",
      ],
    });
    expect(mockedIntakeInvoke).not.toHaveBeenCalled();
    expect(mockedPreparationInvoke).not.toHaveBeenCalled();
    expect(mockedGenerationInvoke).not.toHaveBeenCalled();
  });

  it("continues resumed preparation when intakeAccepted is complete", async () => {
    const mockedIntakeInvoke = vi.fn();
    const mockedPreparationInvoke = vi.fn().mockResolvedValue({
      accepted: {
        goal: "Run a 10k",
        baseline: "Can run 3km",
        startDate: "2026-03-03T00:00:00.000Z",
        dueDate: "2026-04-03T00:00:00.000Z",
        daysWeeklyFrequency: 3,
        goalAssumedValue: 70,
        baselineAssumedValue: 30,
        gap: 40,
        timeFrame: 31,
        availableDays: 13,
        gapClosingFrequency: 3,
      },
      waiting: null,
    });
    const mockedGenerationInvoke = vi.fn().mockResolvedValue({
      plannerAction: "create_plan",
      plan: {
        goal: { title: "Run a 10k" },
        tasks: [{ title: "Run this week" }],
      },
      refusal: null,
    });
    const workflow = createPlannerWorkflow({
      intakeWorkflow: {
        invoke: mockedIntakeInvoke,
      } as never,
      preparationWorkflow: {
        invoke: mockedPreparationInvoke,
      } as never,
      generationWorkflow: {
        invoke: mockedGenerationInvoke,
      } as never,
    });

    const result = await workflow.invoke({
      ...createPlannerInput(),
      planningStage: "preparation",
      intakeAccepted: {
        goal: "Run a 10k",
        baseline: "Can run 3km",
        startDate: "tomorrow",
        dueDate: "in a month",
        daysWeeklyFrequency: 3,
      },
    });

    expect(result.plannerAction).toBe("create_plan");
    expect(mockedIntakeInvoke).not.toHaveBeenCalled();
    expect(mockedPreparationInvoke).toHaveBeenCalledTimes(1);
    expect(mockedGenerationInvoke).toHaveBeenCalledTimes(1);
  });

  it("refuses resumed generation when preparationAccepted is missing", async () => {
    const mockedIntakeInvoke = vi.fn();
    const mockedPreparationInvoke = vi.fn();
    const mockedGenerationInvoke = vi.fn();
    const workflow = createPlannerWorkflow({
      intakeWorkflow: {
        invoke: mockedIntakeInvoke,
      } as never,
      preparationWorkflow: {
        invoke: mockedPreparationInvoke,
      } as never,
      generationWorkflow: {
        invoke: mockedGenerationInvoke,
      } as never,
    });

    const result = await workflow.invoke({
      ...createPlannerInput(),
      planningStage: "generation",
      preparationAccepted: null,
    });

    expect(result.plannerAction).toBe("refuse_plan");
    expect(result.refusal).toEqual({
      reason: "The planning session is missing required preparation details.",
      proposals: [
        "Start a new planning request from /message.",
        "Continue with a thread that has complete preparation details.",
      ],
    });
    expect(mockedIntakeInvoke).not.toHaveBeenCalled();
    expect(mockedPreparationInvoke).not.toHaveBeenCalled();
    expect(mockedGenerationInvoke).not.toHaveBeenCalled();
  });

  it("continues resumed generation when preparationAccepted is complete", async () => {
    const mockedIntakeInvoke = vi.fn();
    const mockedPreparationInvoke = vi.fn();
    const mockedGenerationInvoke = vi.fn().mockResolvedValue({
      plannerAction: "create_plan",
      plan: {
        goal: { title: "Run a 10k" },
        tasks: [{ title: "Run this week" }],
      },
      refusal: null,
    });
    const workflow = createPlannerWorkflow({
      intakeWorkflow: {
        invoke: mockedIntakeInvoke,
      } as never,
      preparationWorkflow: {
        invoke: mockedPreparationInvoke,
      } as never,
      generationWorkflow: {
        invoke: mockedGenerationInvoke,
      } as never,
    });

    const result = await workflow.invoke({
      ...createPlannerInput(),
      planningStage: "generation",
      preparationAccepted: {
        goal: "Run a 10k",
        baseline: "Can run 3km",
        startDate: "2026-03-03T00:00:00.000Z",
        dueDate: "2026-04-03T00:00:00.000Z",
        daysWeeklyFrequency: 3,
        goalAssumedValue: 70,
        baselineAssumedValue: 30,
        gap: 40,
        timeFrame: 31,
        availableDays: 13,
        gapClosingFrequency: 3,
      },
    });

    expect(result.plannerAction).toBe("create_plan");
    expect(mockedIntakeInvoke).not.toHaveBeenCalled();
    expect(mockedPreparationInvoke).not.toHaveBeenCalled();
    expect(mockedGenerationInvoke).toHaveBeenCalledTimes(1);
  });
});

describe("getOrInitPlannerWorkflow", () => {
  it("caches a successful initialization", async () => {
    vi.resetModules();

    const mockedCreateFastModel = vi.fn().mockReturnValue({});
    const mockedCreateReasoningModel = vi.fn().mockReturnValue({});
    const mockedGetOrInitCheckpointer = vi.fn().mockResolvedValue({});
    const mockedGetOrInitStore = vi.fn().mockResolvedValue({});

    vi.doMock("../../../models/fast-model.js", () => ({
      createFastModel: mockedCreateFastModel,
    }));
    vi.doMock("../../../models/reasoning-model.js", () => ({
      createReasoningModel: mockedCreateReasoningModel,
    }));
    vi.doMock("../../../persistence/checkpointer.js", () => ({
      getOrInitCheckpointer: mockedGetOrInitCheckpointer,
    }));
    vi.doMock("../../../persistence/store.js", () => ({
      getOrInitStore: mockedGetOrInitStore,
    }));

    const { getOrInitPlannerWorkflow } = await import("../planner-workflow.js");

    const first = await getOrInitPlannerWorkflow();
    const second = await getOrInitPlannerWorkflow();

    expect(first).toBe(second);
    expect(mockedCreateFastModel).toHaveBeenCalledTimes(1);
    expect(mockedCreateReasoningModel).toHaveBeenCalledTimes(1);
    expect(mockedGetOrInitCheckpointer).toHaveBeenCalledTimes(1);
    expect(mockedGetOrInitStore).toHaveBeenCalledTimes(1);
  });

  it("shares one in-flight initialization", async () => {
    vi.resetModules();

    const gate = createDeferred<object>();
    const mockedCreateFastModel = vi.fn().mockReturnValue({});
    const mockedCreateReasoningModel = vi.fn().mockReturnValue({});
    const mockedGetOrInitCheckpointer = vi
      .fn()
      .mockImplementation(() => gate.promise);
    const mockedGetOrInitStore = vi.fn().mockResolvedValue({});

    vi.doMock("../../../models/fast-model.js", () => ({
      createFastModel: mockedCreateFastModel,
    }));
    vi.doMock("../../../models/reasoning-model.js", () => ({
      createReasoningModel: mockedCreateReasoningModel,
    }));
    vi.doMock("../../../persistence/checkpointer.js", () => ({
      getOrInitCheckpointer: mockedGetOrInitCheckpointer,
    }));
    vi.doMock("../../../persistence/store.js", () => ({
      getOrInitStore: mockedGetOrInitStore,
    }));

    const { getOrInitPlannerWorkflow } = await import("../planner-workflow.js");

    const first = getOrInitPlannerWorkflow();
    const second = getOrInitPlannerWorkflow();

    expect(mockedGetOrInitCheckpointer).toHaveBeenCalledTimes(1);

    gate.resolve({});

    await expect(first).resolves.toBe(await second);
    expect(mockedCreateFastModel).toHaveBeenCalledTimes(1);
    expect(mockedCreateReasoningModel).toHaveBeenCalledTimes(1);
  });

  it("retries after a failed initialization", async () => {
    vi.resetModules();

    const mockedCreateFastModel = vi.fn().mockReturnValue({});
    const mockedCreateReasoningModel = vi.fn().mockReturnValue({});
    const mockedGetOrInitCheckpointer = vi
      .fn()
      .mockRejectedValueOnce(new Error("redis offline"))
      .mockResolvedValue({});
    const mockedGetOrInitStore = vi.fn().mockResolvedValue({});

    vi.doMock("../../../models/fast-model.js", () => ({
      createFastModel: mockedCreateFastModel,
    }));
    vi.doMock("../../../models/reasoning-model.js", () => ({
      createReasoningModel: mockedCreateReasoningModel,
    }));
    vi.doMock("../../../persistence/checkpointer.js", () => ({
      getOrInitCheckpointer: mockedGetOrInitCheckpointer,
    }));
    vi.doMock("../../../persistence/store.js", () => ({
      getOrInitStore: mockedGetOrInitStore,
    }));

    const { getOrInitPlannerWorkflow } = await import("../planner-workflow.js");

    await expect(getOrInitPlannerWorkflow()).rejects.toThrow("redis offline");
    await expect(getOrInitPlannerWorkflow()).resolves.toBeDefined();
    expect(mockedGetOrInitCheckpointer).toHaveBeenCalledTimes(2);
  });
});

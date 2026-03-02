import { beforeEach, describe, expect, it, vi } from "vitest";
import { AiEngine, AiEngineUnavailableError } from "../ai-engine.js";
import type {
  PlannerWorkflow,
  PlannerWorkflowState,
} from "../workflows/planner-workflow/planner-workflow.js";
import type {
  RouterWorkflow,
  RouterWorkflowState,
} from "../workflows/router-workflow/router-workflow.js";

const createRouterState = (
  overrides: Partial<RouterWorkflowState> = {},
): RouterWorkflowState => ({
  threadId: "thread-1",
  userId: "user-1",
  referenceDate: "2026-03-02T00:00:00.000Z",
  input: "Plan my fitness goal",
  timezone: "Europe/Warsaw",
  intent: "refuse",
  ...overrides,
});

const createPlannerState = (
  overrides: Partial<PlannerWorkflowState> = {},
): PlannerWorkflowState => ({
  threadId: "thread-1",
  userId: "user-1",
  referenceDate: "2026-03-02T00:00:00.000Z",
  input: "Plan my fitness goal",
  timezone: "Europe/Warsaw",
  routedIntent: "plan_goal",
  planningStage: "generation",
  response: "",
  plannerAction: null,
  plan: null,
  refusal: null,
  intakeAccepted: null,
  preparationAccepted: null,
  ...overrides,
});

const createPlannerWorkflowDouble = (
  overrides: Partial<PlannerWorkflow> = {},
): PlannerWorkflow =>
  ({
    getState: vi.fn().mockResolvedValue({
      createdAt: "2026-03-02T00:00:00.000Z",
      values: {},
    }),
    invoke: vi.fn().mockResolvedValue(createPlannerState()),
    ...overrides,
  }) as never;

const createDeferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return { promise, reject, resolve };
};

const createCachedFactory = <T>(promise: Promise<T>) => {
  let inFlight: Promise<T> | null = null;

  return vi.fn(() => {
    if (!inFlight) {
      inFlight = promise;
    }

    return inFlight;
  });
};

describe("AiEngine", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("can be instantiated with injected workflows", async () => {
    const mockedRouterWorkflow: RouterWorkflow = {
      invoke: vi.fn().mockResolvedValue(
        createRouterState({
          intent: "show_tasks",
        }),
      ),
    };
    const mockedPlannerWorkflow = createPlannerWorkflowDouble({
      invoke: vi.fn(),
    });

    const engine = new AiEngine({
      routerWorkflow: mockedRouterWorkflow,
      plannerWorkflow: mockedPlannerWorkflow,
    });

    const result = await engine.invokeRouter({
      input: "show tasks",
      threadId: "user-1",
      userId: "user-1",
      timezone: "Europe/Warsaw",
    });

    expect(result).toEqual({
      routedIntent: "show_tasks",
      response: "show_tasks",
    });
    expect(mockedRouterWorkflow.invoke).toHaveBeenCalledWith(
      expect.objectContaining({
        threadId: "user-1",
        input: "show tasks",
        timezone: "Europe/Warsaw",
      }),
      {
        configurable: {
          checkpoint_ns: "user-1",
          thread_id: "user-1",
        },
      },
    );
    expect(mockedPlannerWorkflow.invoke).not.toHaveBeenCalled();
  });

  it("invokes planner workflow when router classifies plan_goal", async () => {
    const mockedRouterWorkflow: RouterWorkflow = {
      invoke: vi.fn().mockResolvedValue(
        createRouterState({
          intent: "plan_goal",
        }),
      ),
    };
    const mockedPlannerWorkflow = createPlannerWorkflowDouble({
      invoke: vi.fn().mockResolvedValue(
        createPlannerState({
          response: "Created a plan with 2 tasks.",
          plannerAction: "create_plan",
          plan: {
            goal: {
              title: "Run a 10k",
            },
            tasks: [
              { title: "Run three times this week" },
              { title: "Add one long run on Saturday" },
            ],
          },
        }),
      ),
    });
    const mockedConsoleLogSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => {});

    const engine = new AiEngine({
      routerWorkflow: mockedRouterWorkflow,
      plannerWorkflow: mockedPlannerWorkflow,
    });

    const result = await engine.invokeRouter({
      input: "Plan my 10k training",
      threadId: "user-1",
      userId: "user-1",
      timezone: "Europe/Warsaw",
    });

    expect(result).toEqual({
      routedIntent: "plan_goal",
      response: "Created a plan with 2 tasks.",
      plannerAction: "create_plan",
      plan: {
        goal: {
          title: "Run a 10k",
        },
        tasks: [
          { title: "Run three times this week" },
          { title: "Add one long run on Saturday" },
        ],
      },
    });
    expect(mockedPlannerWorkflow.invoke).toHaveBeenCalledWith(
      expect.objectContaining({
        threadId: "user-1",
        userId: "user-1",
        input: "Plan my 10k training",
        timezone: "Europe/Warsaw",
        routedIntent: "plan_goal",
      }),
      {
        configurable: {
          checkpoint_ns: "user-1",
          thread_id: "user-1",
        },
      },
    );
    expect(mockedConsoleLogSpy).toHaveBeenCalledWith(
      "AI engine plan_goal success",
      expect.objectContaining({
        threadId: "user-1",
        userId: "user-1",
      }),
    );
  });

  it("invokes planner directly without routing", async () => {
    const mockedRouterWorkflow: RouterWorkflow = {
      invoke: vi.fn(),
    } as never;
    const mockedPlannerWorkflow = createPlannerWorkflowDouble({
      invoke: vi.fn().mockResolvedValue(
        createPlannerState({
          response: "Created a plan with 2 tasks.",
          plannerAction: "create_plan",
          plan: {
            goal: {
              title: "Run a 10k",
            },
            tasks: [
              { title: "Run three times this week" },
              { title: "Add one long run on Saturday" },
            ],
          },
        }),
      ),
    });

    const engine = new AiEngine({
      routerWorkflow: mockedRouterWorkflow,
      plannerWorkflow: mockedPlannerWorkflow,
    });

    const result = await engine.invokePlanner({
      input: "three days a week",
      threadId: "thread-1",
      userId: "user-1",
      timezone: "Europe/Warsaw",
    });

    expect(result).toEqual({
      routedIntent: "plan_goal",
      response: "Created a plan with 2 tasks.",
      plannerAction: "create_plan",
      plan: {
        goal: {
          title: "Run a 10k",
        },
        tasks: [
          { title: "Run three times this week" },
          { title: "Add one long run on Saturday" },
        ],
      },
    });
    expect(mockedRouterWorkflow.invoke).not.toHaveBeenCalled();
    expect(mockedPlannerWorkflow.invoke).toHaveBeenCalledWith(
      expect.objectContaining({
        threadId: "thread-1",
        userId: "user-1",
        input: "three days a week",
        timezone: "Europe/Warsaw",
        routedIntent: "plan_goal",
      }),
      {
        configurable: {
          checkpoint_ns: "user-1",
          thread_id: "thread-1",
        },
      },
    );
  });

  it("logs refusal output on refused plan_goal results", async () => {
    const mockedRouterWorkflow: RouterWorkflow = {
      invoke: vi.fn().mockResolvedValue(
        createRouterState({
          intent: "plan_goal",
        }),
      ),
    };
    const mockedPlannerWorkflow = createPlannerWorkflowDouble({
      invoke: vi.fn().mockResolvedValue(
        createPlannerState({
          response: "The plan is not feasible.",
          plannerAction: "refuse_plan",
          refusal: {
            reason: "The timeline is too aggressive for the current baseline.",
            proposals: ["Extend the due date.", "Reduce the target distance."],
          },
        }),
      ),
    });
    const mockedConsoleLogSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => {});

    const engine = new AiEngine({
      routerWorkflow: mockedRouterWorkflow,
      plannerWorkflow: mockedPlannerWorkflow,
    });

    const result = await engine.invokeRouter({
      input: "Do something vague",
      threadId: "user-1",
      userId: "user-1",
      timezone: "Europe/Warsaw",
    });

    expect(result).toEqual({
      routedIntent: "plan_goal",
      response: "The plan is not feasible.",
      plannerAction: "refuse_plan",
      refusal: {
        reason: "The timeline is too aggressive for the current baseline.",
        proposals: ["Extend the due date.", "Reduce the target distance."],
      },
    });
    expect(mockedConsoleLogSpy).toHaveBeenCalledWith(
      "AI engine plan_goal refusal",
      expect.objectContaining({
        threadId: "user-1",
        userId: "user-1",
      }),
    );
  });

  it("shares one in-flight router initialization", async () => {
    const mockedRouterWorkflow: RouterWorkflow = {
      invoke: vi.fn().mockResolvedValue(
        createRouterState({
          intent: "show_tasks",
        }),
      ),
    };
    const mockedRouterDeferred = createDeferred<RouterWorkflow>();
    const mockedGetOrInitRouterWorkflow = createCachedFactory(
      mockedRouterDeferred.promise,
    );

    const mockedGetOrInitPlannerWorkflow = vi.fn();

    const engine = new AiEngine({
      factories: {
        getOrInitRouterWorkflow: mockedGetOrInitRouterWorkflow,
        getOrInitPlannerWorkflow: mockedGetOrInitPlannerWorkflow,
      },
    });

    const first = engine.invokeRouter({
      input: "show tasks",
      threadId: "thread-1",
      userId: "user-1",
      timezone: "Europe/Warsaw",
    });
    const second = engine.invokeRouter({
      input: "show tasks",
      threadId: "thread-1",
      userId: "user-1",
      timezone: "Europe/Warsaw",
    });

    expect(mockedGetOrInitRouterWorkflow).toHaveBeenCalledTimes(2);
    expect(mockedGetOrInitPlannerWorkflow).not.toHaveBeenCalled();

    mockedRouterDeferred.resolve(mockedRouterWorkflow);

    await expect(first).resolves.toEqual({
      routedIntent: "show_tasks",
      response: "show_tasks",
    });
    await expect(second).resolves.toEqual({
      routedIntent: "show_tasks",
      response: "show_tasks",
    });
  });

  it("does not fail router requests when planner initialization would fail", async () => {
    const mockedRouterWorkflow: RouterWorkflow = {
      invoke: vi.fn().mockResolvedValue(
        createRouterState({
          intent: "show_tasks",
        }),
      ),
    };

    const engine = new AiEngine({
      factories: {
        getOrInitRouterWorkflow: vi
          .fn()
          .mockResolvedValue(mockedRouterWorkflow),
        getOrInitPlannerWorkflow: vi
          .fn()
          .mockRejectedValue(new Error("postgres offline")),
      },
    });

    await expect(
      engine.invokeRouter({
        input: "show tasks",
        threadId: "thread-1",
        userId: "user-1",
        timezone: "Europe/Warsaw",
      }),
    ).resolves.toEqual({
      routedIntent: "show_tasks",
      response: "show_tasks",
    });
  });

  it("wraps router initialization failures", async () => {
    const error = new Error("redis offline");
    const mockedConsoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const engine = new AiEngine({
      factories: {
        getOrInitRouterWorkflow: vi.fn().mockRejectedValue(error),
        getOrInitPlannerWorkflow: vi.fn(),
      },
    });

    await expect(
      engine.invokeRouter({
        input: "show tasks",
        threadId: "thread-1",
        userId: "user-1",
        timezone: "Europe/Warsaw",
      }),
    ).rejects.toBeInstanceOf(AiEngineUnavailableError);
    expect(mockedConsoleErrorSpy).toHaveBeenCalledWith(
      "AI engine router initialization failed",
      expect.objectContaining({
        error: "redis offline",
        threadId: "thread-1",
        userId: "user-1",
      }),
    );
  });

  it("retries initialization after a failure", async () => {
    const mockedRouterWorkflow: RouterWorkflow = {
      invoke: vi.fn().mockResolvedValue(
        createRouterState({
          intent: "show_tasks",
        }),
      ),
    };
    const error = new Error("redis offline");
    const mockedGetOrInitRouterWorkflow = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValue(mockedRouterWorkflow);

    const engine = new AiEngine({
      factories: {
        getOrInitRouterWorkflow: mockedGetOrInitRouterWorkflow,
        getOrInitPlannerWorkflow: vi.fn(),
      },
    });

    await expect(
      engine.invokeRouter({
        input: "show tasks",
        threadId: "thread-1",
        userId: "user-1",
        timezone: "Europe/Warsaw",
      }),
    ).rejects.toBeInstanceOf(AiEngineUnavailableError);

    await expect(
      engine.invokeRouter({
        input: "show tasks",
        threadId: "thread-1",
        userId: "user-1",
        timezone: "Europe/Warsaw",
      }),
    ).resolves.toEqual({
      routedIntent: "show_tasks",
      response: "show_tasks",
    });

    expect(mockedGetOrInitRouterWorkflow).toHaveBeenCalledTimes(2);
  });

  it("shares one in-flight planner initialization", async () => {
    const mockedPlannerWorkflow = createPlannerWorkflowDouble({
      invoke: vi.fn().mockResolvedValue(
        createPlannerState({
          response: "Created a plan with 2 tasks.",
          plannerAction: "create_plan",
        }),
      ),
    });
    const mockedPlannerDeferred = createDeferred<PlannerWorkflow>();
    const mockedGetOrInitPlannerWorkflow = createCachedFactory(
      mockedPlannerDeferred.promise,
    );

    const engine = new AiEngine({
      factories: {
        getOrInitPlannerWorkflow: mockedGetOrInitPlannerWorkflow,
        getOrInitRouterWorkflow: vi.fn(),
      },
    });

    const first = engine.invokePlanner({
      input: "three days a week",
      requireCheckpoint: true,
      threadId: "thread-1",
      userId: "user-1",
      timezone: "Europe/Warsaw",
    });
    const second = engine.invokePlanner({
      input: "three days a week",
      requireCheckpoint: true,
      threadId: "thread-1",
      userId: "user-1",
      timezone: "Europe/Warsaw",
    });

    expect(mockedGetOrInitPlannerWorkflow).toHaveBeenCalledTimes(2);

    mockedPlannerDeferred.resolve(mockedPlannerWorkflow);

    await expect(first).resolves.toMatchObject({
      routedIntent: "plan_goal",
      plannerAction: "create_plan",
    });
    await expect(second).resolves.toMatchObject({
      routedIntent: "plan_goal",
      plannerAction: "create_plan",
    });
  });

  it("returns a refusal when continuing without a checkpoint", async () => {
    const mockedPlannerWorkflow = createPlannerWorkflowDouble({
      getState: vi.fn().mockResolvedValue({
        values: {},
      }),
      invoke: vi.fn(),
    });

    const engine = new AiEngine({
      plannerWorkflow: mockedPlannerWorkflow,
      routerWorkflow: {
        invoke: vi.fn(),
      } as never,
    });

    await expect(
      engine.invokePlanner({
        input: "three days a week",
        requireCheckpoint: true,
        threadId: "thread-1",
        userId: "user-1",
        timezone: "Europe/Warsaw",
      }),
    ).resolves.toEqual({
      routedIntent: "plan_goal",
      plannerAction: "refuse_plan",
      response: "No saved planning session exists for this thread.",
      refusal: {
        reason: "No saved planning session exists for this thread.",
        proposals: [
          "Start a new planning request from /message.",
          "Continue with a thread that already has planner state.",
        ],
      },
    });
    expect(mockedPlannerWorkflow.invoke).not.toHaveBeenCalled();
  });
});

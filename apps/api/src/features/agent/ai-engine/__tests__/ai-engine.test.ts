import { beforeEach, describe, expect, it, vi } from "vitest";
import { AiEngine, AiEngineUnavailableError } from "../ai-engine.js";
import type {
  RouterWorkflow,
  RouterWorkflowState,
} from "../router-model/router-workflow.js";

const createRouterState = (
  overrides: Partial<RouterWorkflowState> = {},
): RouterWorkflowState => ({
  threadId: "thread-1",
  userId: "user-1",
  input: "Plan my fitness goal",
  timezone: "Europe/Warsaw",
  userGoalPlanInput: null,
  intent: "refuse",
  response: "refuse",
  plannerAction: null,
  plan: null,
  refusal: null,
  missingPlanFields: [],
  waitingForPlanInput: false,
  ...overrides,
});

const createDeferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return { promise, reject, resolve };
};

const createLazyInitDeps = (
  mockedRouterWorkflow: RouterWorkflow,
  overrides: {
    mockedGetOrInitRouterWorkflow?: () => Promise<RouterWorkflow>;
  } = {},
) => ({
  factories: {
    getOrInitRouterWorkflow:
      overrides.mockedGetOrInitRouterWorkflow ??
      vi.fn().mockResolvedValue(mockedRouterWorkflow),
  },
});

describe("AiEngine", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("can be instantiated with injected workflows", async () => {
    const mockedRouterWorkflow: RouterWorkflow = {
      invoke: vi.fn().mockResolvedValue(
        createRouterState({
          intent: "show_tasks",
          response: "show_tasks",
        }),
      ),
    };

    const engine = new AiEngine({
      routerWorkflow: mockedRouterWorkflow,
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
    expect(mockedRouterWorkflow.invoke).toHaveBeenCalledTimes(1);
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
  });

  it("logs validated plan output on successful plan_goal", async () => {
    const mockedRouterWorkflow: RouterWorkflow = {
      invoke: vi.fn().mockResolvedValue(
        createRouterState({
          intent: "plan_goal",
          response: 'Created a plan for "Run a 10k" with 2 tasks.',
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
    };
    const mockedConsoleLogSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => {});

    const engine = new AiEngine({
      routerWorkflow: mockedRouterWorkflow,
    });

    const result = await engine.invokeRouter({
      input: "Plan my 10k training",
      threadId: "user-1",
      userId: "user-1",
      timezone: "Europe/Warsaw",
    });

    expect(result).toEqual({
      routedIntent: "plan_goal",
      response: 'Created a plan for "Run a 10k" with 2 tasks.',
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
    expect(mockedConsoleLogSpy).toHaveBeenCalledWith(
      "AI engine plan_goal success",
      expect.objectContaining({
        plan: JSON.stringify(
          {
            goal: {
              title: "Run a 10k",
            },
            tasks: [
              { title: "Run three times this week" },
              { title: "Add one long run on Saturday" },
            ],
          },
          null,
          2,
        ),
        threadId: "user-1",
        userId: "user-1",
      }),
    );
  });

  it("returns structured plans from planGoal", async () => {
    const mockedRouterWorkflow: RouterWorkflow = {
      invoke: vi.fn().mockResolvedValue(
        createRouterState({
          intent: "plan_goal",
          response: 'Created a plan for "Run a 10k" with 2 tasks.',
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
    };

    const engine = new AiEngine({
      routerWorkflow: mockedRouterWorkflow,
    });

    const result = await engine.planGoal({
      threadId: null,
      timezone: "Europe/Warsaw",
      userId: "user-1",
      userGoalPlanInput: {
        goal: "Run a 10k",
        dueDate: "2026-03-15T00:00:00.000Z",
        baseline: "I can run 3km right now.",
        startDate: "2026-01-01T00:00:00.000Z",
      },
    });

    expect(result).toEqual({
      routedIntent: "plan_goal",
      response: 'Created a plan for "Run a 10k" with 2 tasks.',
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
    expect(mockedRouterWorkflow.invoke).toHaveBeenCalledWith(
      expect.objectContaining({
        threadId: "user-1",
        input: "Run a 10k",
        userGoalPlanInput: {
          goal: "Run a 10k",
          dueDate: "2026-03-15T00:00:00.000Z",
          baseline: "I can run 3km right now.",
          startDate: "2026-01-01T00:00:00.000Z",
        },
        timezone: "Europe/Warsaw",
      }),
      {
        configurable: {
          checkpoint_ns: "user-1",
          thread_id: "user-1",
        },
      },
    );
  });

  it("omits plan data from refused planGoal responses", async () => {
    const mockedRouterWorkflow: RouterWorkflow = {
      invoke: vi.fn().mockResolvedValue(
        createRouterState({
          intent: "plan_goal",
          response: "I couldn't create a plan from that request.",
          plannerAction: "refuse_plan",
          plan: null,
          refusal: {
            reason: "The timeline is too aggressive for the current baseline.",
            proposals: ["Extend the due date.", "Reduce the target distance."],
          },
        }),
      ),
    };

    const engine = new AiEngine({
      routerWorkflow: mockedRouterWorkflow,
    });

    const result = await engine.planGoal({
      threadId: null,
      timezone: "Europe/Warsaw",
      userId: "user-1",
      userGoalPlanInput: {
        goal: "Run a 10k",
        dueDate: "2026-03-15T00:00:00.000Z",
        baseline: "I can run 3km right now.",
        startDate: "2026-01-01T00:00:00.000Z",
      },
    });

    expect(result).toEqual({
      routedIntent: "plan_goal",
      response: "I couldn't create a plan from that request.",
      plannerAction: "refuse_plan",
      refusal: {
        reason: "The timeline is too aggressive for the current baseline.",
        proposals: ["Extend the due date.", "Reduce the target distance."],
      },
    });
  });

  it("logs refusal output on refused plan_goal results", async () => {
    const mockedRouterWorkflow: RouterWorkflow = {
      invoke: vi.fn().mockResolvedValue(
        createRouterState({
          intent: "plan_goal",
          response: "I couldn't create a plan from that request.",
          plannerAction: "refuse_plan",
          refusal: {
            reason: "The timeline is too aggressive for the current baseline.",
            proposals: ["Extend the due date.", "Reduce the target distance."],
          },
        }),
      ),
    };
    const mockedConsoleLogSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => {});

    const engine = new AiEngine({
      routerWorkflow: mockedRouterWorkflow,
    });

    const result = await engine.invokeRouter({
      input: "Do something vague",
      threadId: "user-1",
      userId: "user-1",
      timezone: "Europe/Warsaw",
    });

    expect(result).toEqual({
      routedIntent: "plan_goal",
      response: "I couldn't create a plan from that request.",
      plannerAction: "refuse_plan",
      refusal: {
        reason: "The timeline is too aggressive for the current baseline.",
        proposals: ["Extend the due date.", "Reduce the target distance."],
      },
    });
    expect(mockedConsoleLogSpy).toHaveBeenCalledWith(
      "AI engine plan_goal refusal",
      expect.objectContaining({
        plannerAction: "refuse_plan",
        response: "I couldn't create a plan from that request.",
        reason: "The timeline is too aggressive for the current baseline.",
        proposals: ["Extend the due date.", "Reduce the target distance."],
        threadId: "user-1",
        userId: "user-1",
      }),
    );
  });

  it("initializes lazily once for concurrent requests", async () => {
    const initGate = createDeferred<RouterWorkflow>();
    const mockedRouterWorkflow: RouterWorkflow = {
      invoke: vi.fn().mockResolvedValue(
        createRouterState({
          intent: "show_tasks",
          response: "show_tasks",
        }),
      ),
    };

    const deps = createLazyInitDeps(mockedRouterWorkflow, {
      mockedGetOrInitRouterWorkflow: vi
        .fn()
        .mockImplementation(() => initGate.promise),
    });
    const engine = new AiEngine(deps);

    const firstRequest = engine.invokeRouter({
      input: "show tasks",
      threadId: "user-1",
      userId: "user-1",
      timezone: "Europe/Warsaw",
    });
    const secondRequest = engine.invokeRouter({
      input: "show tasks",
      threadId: "user-2",
      userId: "user-2",
      timezone: "Europe/Warsaw",
    });

    expect(deps.factories.getOrInitRouterWorkflow).toHaveBeenCalledTimes(1);

    initGate.resolve(mockedRouterWorkflow);

    await expect(firstRequest).resolves.toEqual({
      routedIntent: "show_tasks",
      response: "show_tasks",
    });
    await expect(secondRequest).resolves.toEqual({
      routedIntent: "show_tasks",
      response: "show_tasks",
    });
    expect(mockedRouterWorkflow.invoke).toHaveBeenCalledTimes(2);
  });

  it("retries initialization after a failure", async () => {
    const mockedRouterWorkflow: RouterWorkflow = {
      invoke: vi.fn().mockResolvedValue(
        createRouterState({
          intent: "show_tasks",
          response: "show_tasks",
        }),
      ),
    };
    const mockedGetOrInitRouterWorkflow = vi
      .fn()
      .mockRejectedValueOnce(new Error("redis offline"))
      .mockResolvedValue(mockedRouterWorkflow);
    const mockedConsoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const engine = new AiEngine(
      createLazyInitDeps(mockedRouterWorkflow, {
        mockedGetOrInitRouterWorkflow,
      }),
    );

    await expect(
      engine.invokeRouter({
        input: "show tasks",
        threadId: "user-1",
        userId: "user-1",
        timezone: "Europe/Warsaw",
      }),
    ).rejects.toBeInstanceOf(AiEngineUnavailableError);

    await expect(
      engine.invokeRouter({
        input: "show tasks",
        threadId: "user-1",
        userId: "user-1",
        timezone: "Europe/Warsaw",
      }),
    ).resolves.toEqual({
      routedIntent: "show_tasks",
      response: "show_tasks",
    });

    expect(mockedGetOrInitRouterWorkflow).toHaveBeenCalledTimes(2);
    expect(mockedRouterWorkflow.invoke).toHaveBeenCalledTimes(1);
    expect(mockedConsoleErrorSpy).toHaveBeenCalledWith(
      "AI engine initialization failed",
      expect.objectContaining({
        error: "redis offline",
        threadId: "user-1",
        userId: "user-1",
      }),
    );
  });
});

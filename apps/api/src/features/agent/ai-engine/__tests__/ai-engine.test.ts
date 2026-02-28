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
  intent: "refuse",
  response: "refuse",
  plannerAction: null,
  plan: null,
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
  routerWorkflow: RouterWorkflow,
  overrides: {
    getOrInitRouterWorkflow?: () => Promise<RouterWorkflow>;
  } = {},
) => ({
  factories: {
    getOrInitRouterWorkflow:
      overrides.getOrInitRouterWorkflow ??
      vi.fn().mockResolvedValue(routerWorkflow),
  },
});

describe("AiEngine", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("can be instantiated with injected workflows", async () => {
    const routerWorkflow: RouterWorkflow = {
      invoke: vi.fn().mockResolvedValue(
        createRouterState({
          intent: "show_tasks",
          response: "show_tasks",
        }),
      ),
    };

    const engine = new AiEngine({
      routerWorkflow,
    });

    const result = await engine.invokeRouter({
      input: "show tasks",
      threadId: "thread-1",
      userId: "user-1",
    });

    expect(result).toEqual({
      routedIntent: "show_tasks",
      response: "show_tasks",
    });
    expect(routerWorkflow.invoke).toHaveBeenCalledTimes(1);
  });

  it("logs validated plan output on successful plan_goal", async () => {
    const routerWorkflow: RouterWorkflow = {
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
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const engine = new AiEngine({
      routerWorkflow,
    });

    const result = await engine.invokeRouter({
      input: "Plan my 10k training",
      threadId: "thread-1",
      userId: "user-1",
    });

    expect(result).toEqual({
      routedIntent: "plan_goal",
      response: 'Created a plan for "Run a 10k" with 2 tasks.',
      plannerAction: "create_plan",
    });
    expect(consoleLogSpy).toHaveBeenCalledWith(
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
        threadId: "thread-1",
        userId: "user-1",
      }),
    );
  });

  it("logs refusal output on refused plan_goal results", async () => {
    const routerWorkflow: RouterWorkflow = {
      invoke: vi.fn().mockResolvedValue(
        createRouterState({
          intent: "plan_goal",
          response: "I couldn't create a plan from that request.",
          plannerAction: "refuse_plan",
        }),
      ),
    };
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const engine = new AiEngine({
      routerWorkflow,
    });

    const result = await engine.invokeRouter({
      input: "Do something vague",
      threadId: "thread-1",
      userId: "user-1",
    });

    expect(result).toEqual({
      routedIntent: "plan_goal",
      response: "I couldn't create a plan from that request.",
      plannerAction: "refuse_plan",
    });
    expect(consoleLogSpy).toHaveBeenCalledWith(
      "AI engine plan_goal refusal",
      expect.objectContaining({
        plannerAction: "refuse_plan",
        response: "I couldn't create a plan from that request.",
        threadId: "thread-1",
        userId: "user-1",
      }),
    );
  });

  it("initializes lazily once for concurrent requests", async () => {
    const initGate = createDeferred<RouterWorkflow>();
    const routerWorkflow: RouterWorkflow = {
      invoke: vi.fn().mockResolvedValue(
        createRouterState({
          intent: "show_tasks",
          response: "show_tasks",
        }),
      ),
    };

    const deps = createLazyInitDeps(routerWorkflow, {
      getOrInitRouterWorkflow: vi
        .fn()
        .mockImplementation(() => initGate.promise),
    });
    const engine = new AiEngine(deps);

    const firstRequest = engine.invokeRouter({
      input: "show tasks",
      threadId: "thread-1",
      userId: "user-1",
    });
    const secondRequest = engine.invokeRouter({
      input: "show tasks",
      threadId: "thread-2",
      userId: "user-2",
    });

    expect(deps.factories.getOrInitRouterWorkflow).toHaveBeenCalledTimes(1);

    initGate.resolve(routerWorkflow);

    await expect(firstRequest).resolves.toEqual({
      routedIntent: "show_tasks",
      response: "show_tasks",
    });
    await expect(secondRequest).resolves.toEqual({
      routedIntent: "show_tasks",
      response: "show_tasks",
    });
    expect(routerWorkflow.invoke).toHaveBeenCalledTimes(2);
  });

  it("retries initialization after a failure", async () => {
    const routerWorkflow: RouterWorkflow = {
      invoke: vi.fn().mockResolvedValue(
        createRouterState({
          intent: "show_tasks",
          response: "show_tasks",
        }),
      ),
    };
    const getOrInitRouterWorkflow = vi
      .fn()
      .mockRejectedValueOnce(new Error("redis offline"))
      .mockResolvedValue(routerWorkflow);
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const engine = new AiEngine(
      createLazyInitDeps(routerWorkflow, {
        getOrInitRouterWorkflow,
      }),
    );

    await expect(
      engine.invokeRouter({
        input: "show tasks",
        threadId: "thread-1",
        userId: "user-1",
      }),
    ).rejects.toBeInstanceOf(AiEngineUnavailableError);

    await expect(
      engine.invokeRouter({
        input: "show tasks",
        threadId: "thread-1",
        userId: "user-1",
      }),
    ).resolves.toEqual({
      routedIntent: "show_tasks",
      response: "show_tasks",
    });

    expect(getOrInitRouterWorkflow).toHaveBeenCalledTimes(2);
    expect(routerWorkflow.invoke).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "AI engine initialization failed",
      expect.objectContaining({
        error: "redis offline",
        threadId: "thread-1",
        userId: "user-1",
      }),
    );
  });
});

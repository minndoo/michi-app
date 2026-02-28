import { describe, expect, it, vi } from "vitest";
import type { PlannerWorkflowState } from "../../planner-model/planner-workflow.js";
import {
  createRouterWorkflow,
  type RouterModel,
  type RouterWorkflowState,
} from "../router-workflow.js";

const createDeferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return { promise, reject, resolve };
};

const createRouterState = (
  overrides: Partial<RouterWorkflowState> = {},
): RouterWorkflowState => ({
  threadId: "thread-1",
  userId: "user-1",
  input: "Help me plan a study goal",
  userGoalPlanInput: null,
  intent: null,
  response: "",
  plannerAction: null,
  plan: null,
  ...overrides,
});

const createPlannerResult = (): PlannerWorkflowState => ({
  threadId: "thread-1",
  userId: "user-1",
  input: "Help me plan a study goal",
  intent: "create_plan",
  response: 'Created a plan for "Study consistently" with 2 tasks.',
  plannerAction: "create_plan",
  plan: {
    goal: {
      title: "Study consistently",
    },
    tasks: [
      {
        title: "Block 30 minutes every weekday",
      },
      {
        title: "Review progress each Sunday",
      },
    ],
  },
});

const createRouterModel = (intent: string): RouterModel => ({
  withStructuredOutput: () => ({
    invoke: vi.fn().mockResolvedValue({ intent }),
  }),
});

describe("createRouterWorkflow", () => {
  it("invokes planner workflow on the plan_goal branch", async () => {
    const plannerWorkflow = {
      invoke: vi.fn().mockResolvedValue(createPlannerResult()),
    };
    const workflow = createRouterWorkflow({
      model: createRouterModel("plan_goal"),
      plannerWorkflow,
    });

    const result = await workflow.invoke(createRouterState());

    expect(plannerWorkflow.invoke).toHaveBeenCalledTimes(1);
    expect(plannerWorkflow.invoke).toHaveBeenCalledWith(
      expect.objectContaining({
        input: "Help me plan a study goal",
      }),
      {
        configurable: {
          checkpoint_ns: "user-1",
          thread_id: "thread-1",
        },
      },
    );
    expect(result.plannerAction).toBe("create_plan");
    expect(result.plan).toEqual(createPlannerResult().plan);
    expect(result.response).toBe(
      'Created a plan for "Study consistently" with 2 tasks.',
    );
  });

  it("formats structured planning input before invoking the planner", async () => {
    const plannerWorkflow = {
      invoke: vi.fn().mockResolvedValue(createPlannerResult()),
    };
    const workflow = createRouterWorkflow({
      model: createRouterModel("plan_goal"),
      plannerWorkflow,
    });

    await workflow.invoke(
      createRouterState({
        input: "Run a 10k",
        userGoalPlanInput: {
          goal: "Run a 10k",
          dueDate: "2026-03-15T00:00:00.000Z",
          startingPoint: "I can run 3km right now.",
        },
      }),
    );

    expect(plannerWorkflow.invoke).toHaveBeenCalledWith(
      expect.objectContaining({
        input: [
          "Goal: Run a 10k",
          "Due date: 2026-03-15T00:00:00.000Z",
          "Starting point: I can run 3km right now.",
        ].join("\n"),
      }),
      {
        configurable: {
          checkpoint_ns: "user-1",
          thread_id: "thread-1",
        },
      },
    );
  });

  it("does not invoke planner workflow for non-planning intents", async () => {
    const plannerWorkflow = {
      invoke: vi.fn(),
    };
    const workflow = createRouterWorkflow({
      model: createRouterModel("show_tasks"),
      plannerWorkflow,
    });

    const result = await workflow.invoke(createRouterState());

    expect(plannerWorkflow.invoke).not.toHaveBeenCalled();
    expect(result.response).toBe("show_tasks");
    expect(result.plan).toBeNull();
  });
});

describe("getOrInitRouterWorkflow", () => {
  it("keeps runtime composition inside the module", async () => {
    vi.resetModules();

    const plannerWorkflow = {
      invoke: vi.fn().mockResolvedValue(createPlannerResult()),
    };
    const getOrInitCheckpointer = vi.fn().mockResolvedValue({});
    const getOrInitPlannerWorkflow = vi.fn().mockResolvedValue(plannerWorkflow);
    const createRouterModelSpy = vi
      .fn()
      .mockReturnValue(createRouterModel("show_tasks"));

    vi.doMock("../../checkpointer.js", () => ({
      getOrInitCheckpointer,
    }));
    vi.doMock("../../planner-model/planner-workflow.js", async () => {
      const actual = await vi.importActual<
        typeof import("../../planner-model/planner-workflow.js")
      >("../../planner-model/planner-workflow.js");

      return {
        ...actual,
        getOrInitPlannerWorkflow,
      };
    });
    vi.doMock("../router-model.js", () => ({
      createRouterModel: createRouterModelSpy,
    }));

    const { getOrInitRouterWorkflow } = await import("../router-workflow.js");

    const first = await getOrInitRouterWorkflow();
    const second = await getOrInitRouterWorkflow();

    expect(first).toBe(second);
    expect(getOrInitCheckpointer).toHaveBeenCalledTimes(1);
    expect(getOrInitPlannerWorkflow).toHaveBeenCalledTimes(1);
    expect(createRouterModelSpy).toHaveBeenCalledTimes(1);
  });

  it("shares one in-flight initialization", async () => {
    vi.resetModules();

    const gate = createDeferred<object>();
    const plannerWorkflow = {
      invoke: vi.fn().mockResolvedValue(createPlannerResult()),
    };
    const getOrInitCheckpointer = vi
      .fn()
      .mockImplementation(() => gate.promise);
    const getOrInitPlannerWorkflow = vi.fn().mockResolvedValue(plannerWorkflow);
    const createRouterModelSpy = vi
      .fn()
      .mockReturnValue(createRouterModel("show_tasks"));

    vi.doMock("../../checkpointer.js", () => ({
      getOrInitCheckpointer,
    }));
    vi.doMock("../../planner-model/planner-workflow.js", async () => {
      const actual = await vi.importActual<
        typeof import("../../planner-model/planner-workflow.js")
      >("../../planner-model/planner-workflow.js");

      return {
        ...actual,
        getOrInitPlannerWorkflow,
      };
    });
    vi.doMock("../router-model.js", () => ({
      createRouterModel: createRouterModelSpy,
    }));

    const { getOrInitRouterWorkflow } = await import("../router-workflow.js");

    const first = getOrInitRouterWorkflow();
    const second = getOrInitRouterWorkflow();

    expect(getOrInitCheckpointer).toHaveBeenCalledTimes(1);

    gate.resolve({});

    await expect(first).resolves.toBe(await second);
    expect(getOrInitPlannerWorkflow).toHaveBeenCalledTimes(1);
    expect(createRouterModelSpy).toHaveBeenCalledTimes(1);
  });

  it("retries after a failed initialization", async () => {
    vi.resetModules();

    const plannerWorkflow = {
      invoke: vi.fn().mockResolvedValue(createPlannerResult()),
    };
    const getOrInitCheckpointer = vi
      .fn()
      .mockRejectedValueOnce(new Error("redis offline"))
      .mockResolvedValue({});
    const getOrInitPlannerWorkflow = vi.fn().mockResolvedValue(plannerWorkflow);
    const createRouterModelSpy = vi
      .fn()
      .mockReturnValue(createRouterModel("show_tasks"));

    vi.doMock("../../checkpointer.js", () => ({
      getOrInitCheckpointer,
    }));
    vi.doMock("../../planner-model/planner-workflow.js", async () => {
      const actual = await vi.importActual<
        typeof import("../../planner-model/planner-workflow.js")
      >("../../planner-model/planner-workflow.js");

      return {
        ...actual,
        getOrInitPlannerWorkflow,
      };
    });
    vi.doMock("../router-model.js", () => ({
      createRouterModel: createRouterModelSpy,
    }));

    const { getOrInitRouterWorkflow } = await import("../router-workflow.js");

    await expect(getOrInitRouterWorkflow()).rejects.toThrow("redis offline");
    await expect(getOrInitRouterWorkflow()).resolves.toBeDefined();
    expect(getOrInitCheckpointer).toHaveBeenCalledTimes(2);
    expect(getOrInitPlannerWorkflow).toHaveBeenCalledTimes(1);
    expect(createRouterModelSpy).toHaveBeenCalledTimes(1);
  });
});

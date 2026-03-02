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
  timezone: "Europe/Warsaw",
  userGoalPlanInput: null,
  intent: null,
  response: "",
  plannerAction: null,
  plan: null,
  refusal: null,
  missingPlanFields: [],
  waitingForPlanInput: false,
  ...overrides,
});

const createPlannerResult = (): PlannerWorkflowState => ({
  threadId: "thread-1",
  userId: "user-1",
  input: [
    "Goal: Study consistently",
    "Baseline: I currently study once a week.",
    "Start date: 2026-01-01T00:00:00.000Z",
    "Due date: 2026-03-01T00:00:00.000Z",
    "Timezone: Europe/Warsaw",
  ].join("\n"),
  userGoalPlanInput: {
    goal: "Study consistently",
    dueDate: "2026-03-01T00:00:00.000Z",
    baseline: "I currently study once a week.",
    startDate: "2026-01-01T00:00:00.000Z",
  },
  timezone: "Europe/Warsaw",
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
  refusal: null,
});

const createRouterModel = ({
  extractedInput = {},
  intent,
}: {
  intent: string;
  extractedInput?: Record<string, string>;
}): RouterModel => ({
  withStructuredOutput: (_schema, options) => ({
    invoke: vi
      .fn()
      .mockResolvedValue(
        options.name === "router_intent" ? { intent } : extractedInput,
      ),
  }),
});

describe("createRouterWorkflow", () => {
  it("invokes planner workflow on the plan_goal branch", async () => {
    const mockedPlannerWorkflow = {
      invoke: vi.fn().mockResolvedValue(createPlannerResult()),
    };
    const workflow = createRouterWorkflow({
      model: createRouterModel({ intent: "plan_goal" }),
      plannerWorkflow: mockedPlannerWorkflow,
    });

    const result = await workflow.invoke(
      createRouterState({
        userGoalPlanInput: {
          goal: "Study consistently",
          dueDate: "2026-03-01T00:00:00.000Z",
          baseline: "I currently study once a week.",
          startDate: "2026-01-01T00:00:00.000Z",
        },
      }),
    );

    expect(mockedPlannerWorkflow.invoke).toHaveBeenCalledTimes(1);
    expect(mockedPlannerWorkflow.invoke).toHaveBeenCalledWith(
      expect.objectContaining({
        input: [
          "Goal: Study consistently",
          "Due date: 2026-03-01T00:00:00.000Z",
          "Baseline: I currently study once a week.",
          "Start date: 2026-01-01T00:00:00.000Z",
          "Timezone: Europe/Warsaw",
        ].join("\n"),
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
    const mockedPlannerWorkflow = {
      invoke: vi.fn().mockResolvedValue(createPlannerResult()),
    };
    const workflow = createRouterWorkflow({
      model: createRouterModel({ intent: "plan_goal" }),
      plannerWorkflow: mockedPlannerWorkflow,
    });

    await workflow.invoke(
      createRouterState({
        input: "Run a 10k",
        userGoalPlanInput: {
          goal: "Run a 10k",
          dueDate: "2026-03-15T00:00:00.000Z",
          baseline: "I can run 3km right now.",
          startDate: "2026-01-01T00:00:00.000Z",
        },
      }),
    );

    expect(mockedPlannerWorkflow.invoke).toHaveBeenCalledWith(
      expect.objectContaining({
        input: [
          "Goal: Run a 10k",
          "Due date: 2026-03-15T00:00:00.000Z",
          "Baseline: I can run 3km right now.",
          "Start date: 2026-01-01T00:00:00.000Z",
          "Timezone: Europe/Warsaw",
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

  it("asks only for missing planning fields on the plain-input path", async () => {
    const mockedPlannerWorkflow = {
      invoke: vi.fn(),
    };
    const workflow = createRouterWorkflow({
      model: createRouterModel({
        intent: "plan_goal",
        extractedInput: {
          goal: "Run a 10k",
        },
      }),
      plannerWorkflow: mockedPlannerWorkflow,
    });

    const result = await workflow.invoke(
      createRouterState({
        input: "Help me plan a 10k",
      }),
    );

    expect(mockedPlannerWorkflow.invoke).not.toHaveBeenCalled();
    expect(result.response).toBe(
      "I can create a plan once I have a few more details. Please provide the due date, baseline, start date.",
    );
    expect(result.missingPlanFields).toEqual([
      "dueDate",
      "baseline",
      "startDate",
    ]);
    expect(result.waitingForPlanInput).toBe(true);
    expect(result.plannerAction).toBeNull();
  });

  it("does not evaluate timezone in router graph decisions", async () => {
    const mockedPlannerWorkflow = {
      invoke: vi.fn().mockResolvedValue(createPlannerResult()),
    };
    const workflow = createRouterWorkflow({
      model: createRouterModel({ intent: "plan_goal" }),
      plannerWorkflow: mockedPlannerWorkflow,
    });

    const result = await workflow.invoke(
      createRouterState({
        timezone: "Europe/Warsaw",
        userGoalPlanInput: {
          goal: "Study consistently",
          dueDate: "2026-03-01T00:00:00.000Z",
          baseline: "I currently study once a week.",
          startDate: "2026-01-01T00:00:00.000Z",
        },
      }),
    );

    expect(mockedPlannerWorkflow.invoke).toHaveBeenCalledTimes(1);
    expect(result.plannerAction).toBe("create_plan");
  });

  it("does not invoke planner workflow for non-planning intents", async () => {
    const mockedPlannerWorkflow = {
      invoke: vi.fn(),
    };
    const workflow = createRouterWorkflow({
      model: createRouterModel({ intent: "show_tasks" }),
      plannerWorkflow: mockedPlannerWorkflow,
    });

    const result = await workflow.invoke(createRouterState());

    expect(mockedPlannerWorkflow.invoke).not.toHaveBeenCalled();
    expect(result.response).toBe("show_tasks");
    expect(result.plan).toBeNull();
  });
});

describe("getOrInitRouterWorkflow", () => {
  it("keeps runtime composition inside the module", async () => {
    vi.resetModules();

    const mockedPlannerWorkflow = {
      invoke: vi.fn().mockResolvedValue(createPlannerResult()),
    };
    const mockedGetOrInitCheckpointer = vi.fn().mockResolvedValue({});
    const mockedGetOrInitPlannerWorkflow = vi
      .fn()
      .mockResolvedValue(mockedPlannerWorkflow);
    const mockedCreateRouterModelSpy = vi
      .fn()
      .mockReturnValue(createRouterModel({ intent: "show_tasks" }));

    vi.doMock("../../checkpointer.js", () => ({
      getOrInitCheckpointer: mockedGetOrInitCheckpointer,
    }));
    vi.doMock("../../planner-model/planner-workflow.js", async () => {
      const actual = await vi.importActual<
        typeof import("../../planner-model/planner-workflow.js")
      >("../../planner-model/planner-workflow.js");

      return {
        ...actual,
        getOrInitPlannerWorkflow: mockedGetOrInitPlannerWorkflow,
      };
    });
    vi.doMock("../router-model.js", () => ({
      createRouterModel: mockedCreateRouterModelSpy,
    }));

    const { getOrInitRouterWorkflow } = await import("../router-workflow.js");

    const first = await getOrInitRouterWorkflow();
    const second = await getOrInitRouterWorkflow();

    expect(first).toBe(second);
    expect(mockedGetOrInitCheckpointer).toHaveBeenCalledTimes(1);
    expect(mockedGetOrInitPlannerWorkflow).toHaveBeenCalledTimes(1);
    expect(mockedCreateRouterModelSpy).toHaveBeenCalledTimes(1);
  });

  it("shares one in-flight initialization", async () => {
    vi.resetModules();

    const gate = createDeferred<object>();
    const mockedPlannerWorkflow = {
      invoke: vi.fn().mockResolvedValue(createPlannerResult()),
    };
    const mockedGetOrInitCheckpointer = vi
      .fn()
      .mockImplementation(() => gate.promise);
    const mockedGetOrInitPlannerWorkflow = vi
      .fn()
      .mockResolvedValue(mockedPlannerWorkflow);
    const mockedCreateRouterModelSpy = vi
      .fn()
      .mockReturnValue(createRouterModel({ intent: "show_tasks" }));

    vi.doMock("../../checkpointer.js", () => ({
      getOrInitCheckpointer: mockedGetOrInitCheckpointer,
    }));
    vi.doMock("../../planner-model/planner-workflow.js", async () => {
      const actual = await vi.importActual<
        typeof import("../../planner-model/planner-workflow.js")
      >("../../planner-model/planner-workflow.js");

      return {
        ...actual,
        getOrInitPlannerWorkflow: mockedGetOrInitPlannerWorkflow,
      };
    });
    vi.doMock("../router-model.js", () => ({
      createRouterModel: mockedCreateRouterModelSpy,
    }));

    const { getOrInitRouterWorkflow } = await import("../router-workflow.js");

    const first = getOrInitRouterWorkflow();
    const second = getOrInitRouterWorkflow();

    expect(mockedGetOrInitCheckpointer).toHaveBeenCalledTimes(1);

    gate.resolve({});

    await expect(first).resolves.toBe(await second);
    expect(mockedGetOrInitPlannerWorkflow).toHaveBeenCalledTimes(1);
    expect(mockedCreateRouterModelSpy).toHaveBeenCalledTimes(1);
  });

  it("retries after a failed initialization", async () => {
    vi.resetModules();

    const mockedPlannerWorkflow = {
      invoke: vi.fn().mockResolvedValue(createPlannerResult()),
    };
    const mockedGetOrInitCheckpointer = vi
      .fn()
      .mockRejectedValueOnce(new Error("redis offline"))
      .mockResolvedValue({});
    const mockedGetOrInitPlannerWorkflow = vi
      .fn()
      .mockResolvedValue(mockedPlannerWorkflow);
    const mockedCreateRouterModelSpy = vi
      .fn()
      .mockReturnValue(createRouterModel({ intent: "show_tasks" }));

    vi.doMock("../../checkpointer.js", () => ({
      getOrInitCheckpointer: mockedGetOrInitCheckpointer,
    }));
    vi.doMock("../../planner-model/planner-workflow.js", async () => {
      const actual = await vi.importActual<
        typeof import("../../planner-model/planner-workflow.js")
      >("../../planner-model/planner-workflow.js");

      return {
        ...actual,
        getOrInitPlannerWorkflow: mockedGetOrInitPlannerWorkflow,
      };
    });
    vi.doMock("../router-model.js", () => ({
      createRouterModel: mockedCreateRouterModelSpy,
    }));

    const { getOrInitRouterWorkflow } = await import("../router-workflow.js");

    await expect(getOrInitRouterWorkflow()).rejects.toThrow("redis offline");
    await expect(getOrInitRouterWorkflow()).resolves.toBeDefined();
    expect(mockedGetOrInitCheckpointer).toHaveBeenCalledTimes(2);
    expect(mockedGetOrInitPlannerWorkflow).toHaveBeenCalledTimes(1);
    expect(mockedCreateRouterModelSpy).toHaveBeenCalledTimes(1);
  });
});

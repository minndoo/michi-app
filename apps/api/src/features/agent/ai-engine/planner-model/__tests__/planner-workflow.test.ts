import { describe, expect, it, vi } from "vitest";
import {
  createPlannerWorkflow,
  type PlannerModel,
  type PlannerWorkflowState,
} from "../planner-workflow.js";

const createDeferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return { promise, reject, resolve };
};

const createPlannerState = (): PlannerWorkflowState => ({
  threadId: "thread-1",
  userId: "user-1",
  input: [
    "Goal: Build a reading habit",
    "Baseline: I read once a week.",
    "Start date: 2026-01-01T00:00:00.000Z",
    "Due date: 2026-03-01T00:00:00.000Z",
    "Timezone: Europe/Warsaw",
  ].join("\n"),
  timezone: "Europe/Warsaw",
  userGoalPlanInput: {
    goal: "Build a reading habit",
    dueDate: "2026-03-01T00:00:00.000Z",
    baseline: "I read once a week.",
    startDate: "2026-01-01T00:00:00.000Z",
  },
  intent: null,
  response: "",
  plannerAction: null,
  plan: null,
  refusal: null,
});

const createPlannerModel = (
  output: unknown,
  mockedInvoke = vi.fn().mockResolvedValue(output),
): PlannerModel => ({
  withStructuredOutput: () => ({
    invoke: mockedInvoke,
  }),
});

describe("createPlannerWorkflow", () => {
  it("returns exactly one goal and caps tasks at 10", async () => {
    const mockedInvoke = vi.fn().mockResolvedValue({
      intent: "create_plan",
      goal: {
        title: "Build a reading habit",
      },
      tasks: Array.from({ length: 12 }, (_, index) => ({
        title: `Task ${index + 1}`,
      })),
    });
    const workflow = createPlannerWorkflow({
      model: createPlannerModel(undefined, mockedInvoke),
    });

    const result = await workflow.invoke(createPlannerState());

    expect(result.plannerAction).toBe("create_plan");
    expect(result.plan).toEqual({
      goal: {
        title: "Build a reading habit",
      },
      tasks: Array.from({ length: 10 }, (_, index) => ({
        title: `Task ${index + 1}`,
      })),
    });
    expect(result.response).toBe(
      'Created a plan for "Build a reading habit" with 10 tasks.',
    );
    expect(mockedInvoke).toHaveBeenCalledWith(
      expect.stringContaining("Timezone: Europe/Warsaw"),
    );
    expect(mockedInvoke).toHaveBeenCalledWith(
      expect.stringContaining("practical roadmap of tasks"),
    );
  });

  it("returns refusal when planner output is invalid", async () => {
    const workflow = createPlannerWorkflow({
      model: createPlannerModel({
        intent: "create_plan",
        goal: {
          title: "Build a reading habit",
        },
        tasks: [],
      }),
    });

    const result = await workflow.invoke(createPlannerState());

    expect(result.plannerAction).toBe("refuse_plan");
    expect(result.plan).toBeNull();
    expect(result.response).toBe(
      "I couldn't create a plan from that request. Please try again with a clearer goal.",
    );
  });

  it("returns refusal when the planner refuses", async () => {
    const workflow = createPlannerWorkflow({
      model: createPlannerModel({
        intent: "refuse_plan",
        reason: "I need a clearer goal before I can plan it.",
        proposals: ["Provide a clearer goal and timeline."],
      }),
    });

    const result = await workflow.invoke(createPlannerState());

    expect(result.plannerAction).toBe("refuse_plan");
    expect(result.plan).toBeNull();
    expect(result.response).toBe("I need a clearer goal before I can plan it.");
    expect(result.refusal).toEqual({
      reason: "I need a clearer goal before I can plan it.",
      proposals: ["Provide a clearer goal and timeline."],
    });
  });

  it("falls back to a safe refusal payload when refusal output is invalid", async () => {
    const workflow = createPlannerWorkflow({
      model: createPlannerModel({
        intent: "refuse_plan",
        reason: "",
        proposals: [],
      }),
    });

    const result = await workflow.invoke(createPlannerState());

    expect(result.plannerAction).toBe("refuse_plan");
    expect(result.response).toBe(
      "I couldn't create a plan from that request. Please try again with a clearer goal.",
    );
    expect(result.refusal).toEqual({
      reason:
        "I couldn't create a plan from that request. Please try again with a clearer goal.",
      proposals: ["Provide a more realistic goal, timeline, or baseline."],
    });
  });
});

describe("getOrInitPlannerWorkflow", () => {
  it("keeps runtime composition inside the module", async () => {
    vi.resetModules();

    const checkpointer = {};
    const store = {};
    const mockedGetOrInitCheckpointer = vi.fn().mockResolvedValue(checkpointer);
    const mockedGetOrInitStore = vi.fn().mockResolvedValue(store);
    const mockedCreatePlannerModelSpy = vi.fn().mockReturnValue(
      createPlannerModel({
        intent: "refuse_plan",
        reason: "I need a clearer goal before I can plan it.",
        proposals: ["Provide a clearer goal and timeline."],
      }),
    );

    vi.doMock("../../checkpointer.js", () => ({
      getOrInitCheckpointer: mockedGetOrInitCheckpointer,
    }));
    vi.doMock("../../store.js", () => ({
      getOrInitStore: mockedGetOrInitStore,
    }));
    vi.doMock("../planner-model.js", () => ({
      createPlannerModel: mockedCreatePlannerModelSpy,
    }));

    const { getOrInitPlannerWorkflow } = await import("../planner-workflow.js");

    const first = await getOrInitPlannerWorkflow();
    const second = await getOrInitPlannerWorkflow();

    expect(first).toBe(second);
    expect(mockedGetOrInitCheckpointer).toHaveBeenCalledTimes(1);
    expect(mockedGetOrInitStore).toHaveBeenCalledTimes(1);
    expect(mockedCreatePlannerModelSpy).toHaveBeenCalledTimes(1);
  });

  it("shares one in-flight initialization", async () => {
    vi.resetModules();

    const gate = createDeferred<object>();
    const mockedGetOrInitCheckpointer = vi
      .fn()
      .mockImplementation(() => gate.promise);
    const mockedGetOrInitStore = vi.fn().mockResolvedValue({});
    const mockedCreatePlannerModelSpy = vi.fn().mockReturnValue(
      createPlannerModel({
        intent: "refuse_plan",
        reason: "I need a clearer goal before I can plan it.",
        proposals: ["Provide a clearer goal and timeline."],
      }),
    );

    vi.doMock("../../checkpointer.js", () => ({
      getOrInitCheckpointer: mockedGetOrInitCheckpointer,
    }));
    vi.doMock("../../store.js", () => ({
      getOrInitStore: mockedGetOrInitStore,
    }));
    vi.doMock("../planner-model.js", () => ({
      createPlannerModel: mockedCreatePlannerModelSpy,
    }));

    const { getOrInitPlannerWorkflow } = await import("../planner-workflow.js");

    const first = getOrInitPlannerWorkflow();
    const second = getOrInitPlannerWorkflow();

    expect(mockedGetOrInitCheckpointer).toHaveBeenCalledTimes(1);

    gate.resolve({});

    await expect(first).resolves.toBe(await second);
    expect(mockedGetOrInitStore).toHaveBeenCalledTimes(1);
    expect(mockedCreatePlannerModelSpy).toHaveBeenCalledTimes(1);
  });

  it("retries after a failed initialization", async () => {
    vi.resetModules();

    const mockedGetOrInitCheckpointer = vi
      .fn()
      .mockRejectedValueOnce(new Error("redis offline"))
      .mockResolvedValue({});
    const mockedGetOrInitStore = vi.fn().mockResolvedValue({});
    const mockedCreatePlannerModelSpy = vi.fn().mockReturnValue(
      createPlannerModel({
        intent: "refuse_plan",
        reason: "I need a clearer goal before I can plan it.",
        proposals: ["Provide a clearer goal and timeline."],
      }),
    );

    vi.doMock("../../checkpointer.js", () => ({
      getOrInitCheckpointer: mockedGetOrInitCheckpointer,
    }));
    vi.doMock("../../store.js", () => ({
      getOrInitStore: mockedGetOrInitStore,
    }));
    vi.doMock("../planner-model.js", () => ({
      createPlannerModel: mockedCreatePlannerModelSpy,
    }));

    const { getOrInitPlannerWorkflow } = await import("../planner-workflow.js");

    await expect(getOrInitPlannerWorkflow()).rejects.toThrow("redis offline");
    await expect(getOrInitPlannerWorkflow()).resolves.toBeDefined();
    expect(mockedGetOrInitCheckpointer).toHaveBeenCalledTimes(2);
    expect(mockedCreatePlannerModelSpy).toHaveBeenCalledTimes(1);
  });
});

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
  input: "Help me plan a reading habit",
  intent: null,
  response: "",
  plannerAction: null,
  plan: null,
});

const createPlannerModel = (output: unknown): PlannerModel => ({
  withStructuredOutput: () => ({
    invoke: vi.fn().mockResolvedValue(output),
  }),
});

describe("createPlannerWorkflow", () => {
  it("returns exactly one goal and caps tasks at 10", async () => {
    const workflow = createPlannerWorkflow({
      model: createPlannerModel({
        intent: "create_plan",
        goal: {
          title: "Build a reading habit",
        },
        tasks: Array.from({ length: 12 }, (_, index) => ({
          title: `Task ${index + 1}`,
        })),
      }),
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
      }),
    });

    const result = await workflow.invoke(createPlannerState());

    expect(result.plannerAction).toBe("refuse_plan");
    expect(result.plan).toBeNull();
    expect(result.response).toBe("I need a clearer goal before I can plan it.");
  });
});

describe("getOrInitPlannerWorkflow", () => {
  it("keeps runtime composition inside the module", async () => {
    vi.resetModules();

    const checkpointer = {};
    const store = {};
    const getOrInitCheckpointer = vi.fn().mockResolvedValue(checkpointer);
    const getOrInitStore = vi.fn().mockResolvedValue(store);
    const createPlannerModelSpy = vi.fn().mockReturnValue(
      createPlannerModel({
        intent: "refuse_plan",
        reason: "I need a clearer goal before I can plan it.",
      }),
    );

    vi.doMock("../../checkpointer.js", () => ({
      getOrInitCheckpointer,
    }));
    vi.doMock("../../store.js", () => ({
      getOrInitStore,
    }));
    vi.doMock("../planner-model.js", () => ({
      createPlannerModel: createPlannerModelSpy,
    }));

    const { getOrInitPlannerWorkflow } = await import("../planner-workflow.js");

    const first = await getOrInitPlannerWorkflow();
    const second = await getOrInitPlannerWorkflow();

    expect(first).toBe(second);
    expect(getOrInitCheckpointer).toHaveBeenCalledTimes(1);
    expect(getOrInitStore).toHaveBeenCalledTimes(1);
    expect(createPlannerModelSpy).toHaveBeenCalledTimes(1);
  });

  it("shares one in-flight initialization", async () => {
    vi.resetModules();

    const gate = createDeferred<object>();
    const getOrInitCheckpointer = vi
      .fn()
      .mockImplementation(() => gate.promise);
    const getOrInitStore = vi.fn().mockResolvedValue({});
    const createPlannerModelSpy = vi.fn().mockReturnValue(
      createPlannerModel({
        intent: "refuse_plan",
        reason: "I need a clearer goal before I can plan it.",
      }),
    );

    vi.doMock("../../checkpointer.js", () => ({
      getOrInitCheckpointer,
    }));
    vi.doMock("../../store.js", () => ({
      getOrInitStore,
    }));
    vi.doMock("../planner-model.js", () => ({
      createPlannerModel: createPlannerModelSpy,
    }));

    const { getOrInitPlannerWorkflow } = await import("../planner-workflow.js");

    const first = getOrInitPlannerWorkflow();
    const second = getOrInitPlannerWorkflow();

    expect(getOrInitCheckpointer).toHaveBeenCalledTimes(1);

    gate.resolve({});

    await expect(first).resolves.toBe(await second);
    expect(getOrInitStore).toHaveBeenCalledTimes(1);
    expect(createPlannerModelSpy).toHaveBeenCalledTimes(1);
  });

  it("retries after a failed initialization", async () => {
    vi.resetModules();

    const getOrInitCheckpointer = vi
      .fn()
      .mockRejectedValueOnce(new Error("redis offline"))
      .mockResolvedValue({});
    const getOrInitStore = vi.fn().mockResolvedValue({});
    const createPlannerModelSpy = vi.fn().mockReturnValue(
      createPlannerModel({
        intent: "refuse_plan",
        reason: "I need a clearer goal before I can plan it.",
      }),
    );

    vi.doMock("../../checkpointer.js", () => ({
      getOrInitCheckpointer,
    }));
    vi.doMock("../../store.js", () => ({
      getOrInitStore,
    }));
    vi.doMock("../planner-model.js", () => ({
      createPlannerModel: createPlannerModelSpy,
    }));

    const { getOrInitPlannerWorkflow } = await import("../planner-workflow.js");

    await expect(getOrInitPlannerWorkflow()).rejects.toThrow("redis offline");
    await expect(getOrInitPlannerWorkflow()).resolves.toBeDefined();
    expect(getOrInitCheckpointer).toHaveBeenCalledTimes(2);
    expect(createPlannerModelSpy).toHaveBeenCalledTimes(1);
  });
});

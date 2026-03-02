import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("../ai-engine/index.js", () => ({
  aiEngine: {
    invokePlanner: vi.fn(),
    invokeRouter: vi.fn(),
  },
}));
import { AgentService } from "../agent.service.js";
import type { AgentEngineResult } from "../agent.types.js";

describe("AgentService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes plan_goal through the engine", async () => {
    const mockedInvokeRouter = vi
      .fn<() => Promise<AgentEngineResult>>()
      .mockResolvedValue({
        routedIntent: "plan_goal",
        plannerAction: "create_plan",
        response: "Plan created.",
      });

    const service = new AgentService({
      engine: {
        invokePlanner: vi.fn() as never,
        invokeRouter: mockedInvokeRouter as never,
      },
    });

    const result = await service.runMessage("user-1", {
      threadId: "thread-1",
      message: "I want to plan my running goal.",
      timezone: "Europe/Warsaw",
    });

    expect(result).toEqual({
      threadId: "thread-1",
      routedIntent: "plan_goal",
      plannerAction: "create_plan",
      response: "Plan created.",
    });
    expect(mockedInvokeRouter).toHaveBeenCalledWith({
      input: "I want to plan my running goal.",
      threadId: "thread-1",
      userId: "user-1",
      timezone: "Europe/Warsaw",
    });
  });

  it("returns non-plan intents unchanged", async () => {
    const mockedInvokeRouter = vi
      .fn<() => Promise<AgentEngineResult>>()
      .mockResolvedValue({
        routedIntent: "show_tasks",
        response: "Here are your tasks.",
      });

    const service = new AgentService({
      engine: {
        invokePlanner: vi.fn() as never,
        invokeRouter: mockedInvokeRouter as never,
      },
    });

    const result = await service.runMessage("user-1", {
      threadId: "thread-1",
      message: "show my tasks",
      timezone: "Europe/Warsaw",
    });

    expect(result).toEqual({
      threadId: "thread-1",
      routedIntent: "show_tasks",
      response: "Here are your tasks.",
    });
  });

  it("returns refuse response when engine routes to refuse", async () => {
    const mockedInvokeRouter = vi
      .fn<() => Promise<AgentEngineResult>>()
      .mockResolvedValue({
        routedIntent: "refuse",
        response: "I can only help with goals and tasks.",
      });

    const service = new AgentService({
      engine: {
        invokePlanner: vi.fn() as never,
        invokeRouter: mockedInvokeRouter as never,
      },
    });

    const result = await service.runMessage("user-1", {
      threadId: "thread-1",
      message: "do something unrelated",
      timezone: "Europe/Warsaw",
    });

    expect(result).toEqual({
      threadId: "thread-1",
      routedIntent: "refuse",
      response: "I can only help with goals and tasks.",
    });
  });

  it("continues planning through the planner workflow", async () => {
    const mockedInvokePlanner = vi
      .fn<() => Promise<AgentEngineResult>>()
      .mockResolvedValue({
        routedIntent: "plan_goal",
        plannerAction: "create_plan",
        response: "Created a plan with 2 tasks.",
        plan: {
          goal: { title: "Run a 10k" },
          tasks: [{ title: "Run this week" }, { title: "Long run Saturday" }],
        },
      });

    const service = new AgentService({
      engine: {
        invokePlanner: mockedInvokePlanner as never,
        invokeRouter: vi.fn() as never,
      },
    });

    const result = await service.continuePlan("user-1", {
      threadId: "thread-1",
      message: "three days a week",
      timezone: "Europe/Warsaw",
    });

    expect(result).toEqual({
      threadId: "thread-1",
      routedIntent: "plan_goal",
      plannerAction: "create_plan",
      response: "Created a plan with 2 tasks.",
      plan: {
        goal: { title: "Run a 10k" },
        tasks: [{ title: "Run this week" }, { title: "Long run Saturday" }],
      },
    });
    expect(mockedInvokePlanner).toHaveBeenCalledWith({
      input: "three days a week",
      requireCheckpoint: true,
      threadId: "thread-1",
      userId: "user-1",
      timezone: "Europe/Warsaw",
    });
  });

  it("returns planner refusals unchanged when continuing a plan", async () => {
    const mockedInvokePlanner = vi
      .fn<() => Promise<AgentEngineResult>>()
      .mockResolvedValue({
        routedIntent: "plan_goal",
        plannerAction: "refuse_plan",
        response: "The plan is not feasible.",
        refusal: {
          reason: "The timeline is too aggressive.",
          proposals: ["Extend the due date."],
        },
      });

    const service = new AgentService({
      engine: {
        invokePlanner: mockedInvokePlanner as never,
        invokeRouter: vi.fn() as never,
      },
    });

    const result = await service.continuePlan("user-1", {
      threadId: "thread-1",
      message: "next week",
      timezone: "Europe/Warsaw",
    });

    expect(result).toEqual({
      threadId: "thread-1",
      routedIntent: "plan_goal",
      plannerAction: "refuse_plan",
      response: "The plan is not feasible.",
      refusal: {
        reason: "The timeline is too aggressive.",
        proposals: ["Extend the due date."],
      },
    });
  });
});

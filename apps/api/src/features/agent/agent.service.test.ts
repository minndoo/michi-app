import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("./ai-engine.js", () => ({
  aiEngine: {
    invokeRouter: vi.fn(),
  },
}));
import { AgentService } from "./agent.service.js";
import type { AgentEngineResult } from "./agent.types.js";

describe("AgentService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes plan_goal to planner", async () => {
    const invokeRouter = vi
      .fn<() => Promise<AgentEngineResult>>()
      .mockResolvedValue({
        routedIntent: "plan_goal",
        plannerAction: "create_plan",
        response: "Plan created.",
      });

    const service = new AgentService({
      engine: {
        invokeRouter: invokeRouter as never,
      },
    });

    const result = await service.runMessage("user-1", {
      threadId: "thread-1",
      message: "I want to plan my running goal.",
    });

    expect(result).toEqual({
      threadId: "thread-1",
      routedIntent: "plan_goal",
      plannerAction: "create_plan",
      response: "Plan created.",
    });
    expect(invokeRouter).toHaveBeenCalledTimes(1);
  });

  it("returns non-plan intents unchanged", async () => {
    const invokeRouter = vi
      .fn<() => Promise<AgentEngineResult>>()
      .mockResolvedValue({
        routedIntent: "show_tasks",
        response: "Here are your tasks.",
      });

    const service = new AgentService({
      engine: {
        invokeRouter: invokeRouter as never,
      },
    });

    const result = await service.runMessage("user-1", {
      threadId: "thread-1",
      message: "show my tasks",
    });

    expect(result).toEqual({
      threadId: "thread-1",
      routedIntent: "show_tasks",
      response: "Here are your tasks.",
    });
    expect(invokeRouter).toHaveBeenCalledTimes(1);
  });

  it("returns refuse response when engine routes to refuse", async () => {
    const invokeRouter = vi
      .fn<() => Promise<AgentEngineResult>>()
      .mockResolvedValue({
        routedIntent: "refuse",
        response: "I can only help with goals and tasks.",
      });

    const service = new AgentService({
      engine: {
        invokeRouter: invokeRouter as never,
      },
    });

    const result = await service.runMessage("user-1", {
      threadId: "thread-1",
      message: "do something unrelated",
    });

    expect(result).toEqual({
      threadId: "thread-1",
      routedIntent: "refuse",
      response: "I can only help with goals and tasks.",
    });
    expect(invokeRouter).toHaveBeenCalledTimes(1);
  });
});

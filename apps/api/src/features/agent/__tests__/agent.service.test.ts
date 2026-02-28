import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("../ai-engine/index.js", () => ({
  aiEngine: {
    invokeRouter: vi.fn(),
    planGoal: vi.fn(),
  },
}));
import { AgentService } from "../agent.service.js";
import type { AgentEngineResult } from "../agent.types.js";

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
        planGoal: vi.fn(),
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
    expect(invokeRouter).toHaveBeenCalledWith({
      input: "I want to plan my running goal.",
      userId: "user-1",
    });
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
        planGoal: vi.fn(),
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
    expect(invokeRouter).toHaveBeenCalledWith({
      input: "show my tasks",
      userId: "user-1",
    });
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
        planGoal: vi.fn(),
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
    expect(invokeRouter).toHaveBeenCalledWith({
      input: "do something unrelated",
      userId: "user-1",
    });
  });

  it("returns structured plan-goal responses", async () => {
    const planGoal = vi
      .fn<() => Promise<AgentEngineResult>>()
      .mockResolvedValue({
        routedIntent: "plan_goal",
        plannerAction: "create_plan",
        response: 'Created a plan for "Run a 10k" with 2 tasks.',
        plan: {
          goal: {
            title: "Run a 10k",
          },
          tasks: [
            { title: "Run three times this week" },
            { title: "Do one long run on Saturday" },
          ],
        },
      });

    const service = new AgentService({
      engine: {
        invokeRouter: vi.fn() as never,
        planGoal: planGoal as never,
      },
    });

    const result = await service.planGoal("user-1", {
      goal: "Run a 10k",
      dueDate: "2026-03-15T00:00:00.000Z",
      startingPoint: "I can run 3km right now.",
    });

    expect(result).toEqual({
      routedIntent: "plan_goal",
      plannerAction: "create_plan",
      response: 'Created a plan for "Run a 10k" with 2 tasks.',
      plan: {
        goal: {
          title: "Run a 10k",
        },
        tasks: [
          { title: "Run three times this week" },
          { title: "Do one long run on Saturday" },
        ],
      },
    });
    expect(planGoal).toHaveBeenCalledTimes(1);
    expect(planGoal).toHaveBeenCalledWith({
      userId: "user-1",
      userGoalPlanInput: {
        goal: "Run a 10k",
        dueDate: "2026-03-15T00:00:00.000Z",
        startingPoint: "I can run 3km right now.",
      },
    });
  });

  it("returns refused plan-goal responses without a plan", async () => {
    const planGoal = vi
      .fn<() => Promise<AgentEngineResult>>()
      .mockResolvedValue({
        routedIntent: "plan_goal",
        plannerAction: "refuse_plan",
        response: "I couldn't create a plan from that request.",
      });

    const service = new AgentService({
      engine: {
        invokeRouter: vi.fn() as never,
        planGoal: planGoal as never,
      },
    });

    const result = await service.planGoal("user-1", {
      goal: "Run a 10k",
      dueDate: "2026-03-15T00:00:00.000Z",
      startingPoint: "I can run 3km right now.",
    });

    expect(result).toEqual({
      routedIntent: "plan_goal",
      plannerAction: "refuse_plan",
      response: "I couldn't create a plan from that request.",
    });
    expect(planGoal).toHaveBeenCalledTimes(1);
    expect(planGoal).toHaveBeenCalledWith({
      userId: "user-1",
      userGoalPlanInput: {
        goal: "Run a 10k",
        dueDate: "2026-03-15T00:00:00.000Z",
        startingPoint: "I can run 3km right now.",
      },
    });
  });
});

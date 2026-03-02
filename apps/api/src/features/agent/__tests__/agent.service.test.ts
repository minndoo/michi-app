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
    const mockedInvokeRouter = vi
      .fn<() => Promise<AgentEngineResult>>()
      .mockResolvedValue({
        routedIntent: "plan_goal",
        plannerAction: "create_plan",
        response: "Plan created.",
      });

    const service = new AgentService({
      engine: {
        invokeRouter: mockedInvokeRouter as never,
        planGoal: vi.fn(),
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
    expect(mockedInvokeRouter).toHaveBeenCalledTimes(1);
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
        invokeRouter: mockedInvokeRouter as never,
        planGoal: vi.fn(),
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
    expect(mockedInvokeRouter).toHaveBeenCalledTimes(1);
    expect(mockedInvokeRouter).toHaveBeenCalledWith({
      input: "show my tasks",
      threadId: "thread-1",
      userId: "user-1",
      timezone: "Europe/Warsaw",
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
        invokeRouter: mockedInvokeRouter as never,
        planGoal: vi.fn(),
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
    expect(mockedInvokeRouter).toHaveBeenCalledTimes(1);
    expect(mockedInvokeRouter).toHaveBeenCalledWith({
      input: "do something unrelated",
      threadId: "thread-1",
      userId: "user-1",
      timezone: "Europe/Warsaw",
    });
  });

  it("returns structured plan-goal responses", async () => {
    const mockedPlanGoal = vi
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
        planGoal: mockedPlanGoal as never,
      },
    });

    const result = await service.planGoal("user-1", {
      timezone: "Europe/Warsaw",
      planGoalInput: {
        goal: "Run a 10k",
        dueDate: "2026-03-15T00:00:00.000Z",
        baseline: "I can run 3km right now.",
        startDate: "2026-01-01T00:00:00.000Z",
      },
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
    expect(mockedPlanGoal).toHaveBeenCalledTimes(1);
    expect(mockedPlanGoal).toHaveBeenCalledWith({
      userId: "user-1",
      threadId: undefined,
      timezone: "Europe/Warsaw",
      userGoalPlanInput: {
        goal: "Run a 10k",
        dueDate: "2026-03-15T00:00:00.000Z",
        baseline: "I can run 3km right now.",
        startDate: "2026-01-01T00:00:00.000Z",
      },
    });
  });

  it("returns refused plan-goal responses without a plan", async () => {
    const mockedPlanGoal = vi
      .fn<() => Promise<AgentEngineResult>>()
      .mockResolvedValue({
        routedIntent: "plan_goal",
        plannerAction: "refuse_plan",
        response: "I couldn't create a plan from that request.",
        refusal: {
          reason: "The timeline is too aggressive for the current baseline.",
          proposals: ["Extend the due date.", "Reduce the target distance."],
        },
      });

    const service = new AgentService({
      engine: {
        invokeRouter: vi.fn() as never,
        planGoal: mockedPlanGoal as never,
      },
    });

    const result = await service.planGoal("user-1", {
      timezone: "Europe/Warsaw",
      planGoalInput: {
        goal: "Run a 10k",
        dueDate: "2026-03-15T00:00:00.000Z",
        baseline: "I can run 3km right now.",
        startDate: "2026-01-01T00:00:00.000Z",
      },
    });

    expect(result).toEqual({
      routedIntent: "plan_goal",
      plannerAction: "refuse_plan",
      response: "I couldn't create a plan from that request.",
      refusal: {
        reason: "The timeline is too aggressive for the current baseline.",
        proposals: ["Extend the due date.", "Reduce the target distance."],
      },
    });
    expect(mockedPlanGoal).toHaveBeenCalledTimes(1);
    expect(mockedPlanGoal).toHaveBeenCalledWith({
      userId: "user-1",
      threadId: undefined,
      timezone: "Europe/Warsaw",
      userGoalPlanInput: {
        goal: "Run a 10k",
        dueDate: "2026-03-15T00:00:00.000Z",
        baseline: "I can run 3km right now.",
        startDate: "2026-01-01T00:00:00.000Z",
      },
    });
  });
});

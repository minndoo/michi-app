// eslint-disable-next-line @typescript-eslint/triple-slash-reference
///  <reference path="../../../types/express.d.ts"/>

import { describe, expect, it, vi } from "vitest";
import type { Request as ExpressRequest } from "express";
import { AiEngineUnavailableError } from "../ai-engine/ai-engine.js";

const { runMessage } = vi.hoisted(() => ({
  runMessage: vi.fn(),
}));
const { planGoal } = vi.hoisted(() => ({
  planGoal: vi.fn(),
}));

vi.mock("../agent.service.js", () => ({
  agentService: {
    runMessage,
    planGoal,
  },
}));

import { AgentController } from "../agent.controller.js";

describe("AgentController", () => {
  it("delegates plan-goal requests to the service", async () => {
    planGoal.mockResolvedValueOnce({
      routedIntent: "plan_goal",
      plannerAction: "create_plan",
      response: 'Created a plan for "Run a 10k" with 2 tasks.',
      plan: {
        goal: { title: "Run a 10k" },
        tasks: [{ title: "Run this week" }, { title: "Long run Saturday" }],
      },
    });

    const controller = new AgentController();

    await expect(
      controller.postAgentPlanGoal(
        {
          user: {
            id: "user-1",
          },
        } as ExpressRequest,
        {
          goal: "Run a 10k",
          dueDate: "2026-03-15T00:00:00.000Z",
          startingPoint: "I can run 3km right now.",
        },
      ),
    ).resolves.toEqual({
      routedIntent: "plan_goal",
      plannerAction: "create_plan",
      response: 'Created a plan for "Run a 10k" with 2 tasks.',
      plan: {
        goal: { title: "Run a 10k" },
        tasks: [{ title: "Run this week" }, { title: "Long run Saturday" }],
      },
    });
  });

  it("maps AI engine initialization failures to 503", async () => {
    runMessage.mockRejectedValueOnce(
      new AiEngineUnavailableError(
        "Agent service temporarily unavailable",
        new Error("redis offline"),
      ),
    );

    const controller = new AgentController();

    await expect(
      controller.postAgentMessage(
        {
          user: {
            id: "user-1",
          },
        } as ExpressRequest,
        {
          threadId: "thread-1",
          message: "show tasks",
        },
      ),
    ).rejects.toMatchObject({
      message: "Agent service temporarily unavailable",
      status: 503,
    });
  });

  it("maps plan-goal AI engine initialization failures to 503", async () => {
    planGoal.mockRejectedValueOnce(
      new AiEngineUnavailableError(
        "Agent service temporarily unavailable",
        new Error("redis offline"),
      ),
    );

    const controller = new AgentController();

    await expect(
      controller.postAgentPlanGoal(
        {
          user: {
            id: "user-1",
          },
        } as ExpressRequest,
        {
          goal: "Run a 10k",
          dueDate: "2026-03-15T00:00:00.000Z",
          startingPoint: "I can run 3km right now.",
        },
      ),
    ).rejects.toMatchObject({
      message: "Agent service temporarily unavailable",
      status: 503,
    });
  });
});

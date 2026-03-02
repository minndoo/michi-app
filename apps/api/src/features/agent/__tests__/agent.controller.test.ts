// eslint-disable-next-line @typescript-eslint/triple-slash-reference
///  <reference path="../../../types/express.d.ts"/>

import { describe, expect, it, vi } from "vitest";
import type { Request as ExpressRequest } from "express";
import { AiEngineUnavailableError } from "../ai-engine/ai-engine.js";

const { runMessage: mockedRunMessage } = vi.hoisted(() => ({
  runMessage: vi.fn(),
}));
const { continuePlan: mockedContinuePlan } = vi.hoisted(() => ({
  continuePlan: vi.fn(),
}));

vi.mock("../agent.service.js", () => ({
  agentService: {
    continuePlan: mockedContinuePlan,
    runMessage: mockedRunMessage,
  },
}));

import { AgentController } from "../agent.controller.js";

describe("AgentController", () => {
  it("delegates message requests to the service", async () => {
    mockedRunMessage.mockResolvedValueOnce({
      threadId: "thread-1",
      routedIntent: "plan_goal",
      plannerAction: "create_plan",
      response: "Created a plan with 2 tasks.",
      plan: {
        goal: { title: "Run a 10k" },
        tasks: [{ title: "Run this week" }, { title: "Long run Saturday" }],
      },
    });

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
          message: "Plan my 10k goal",
          timezone: "Europe/Warsaw",
        },
      ),
    ).resolves.toEqual({
      threadId: "thread-1",
      routedIntent: "plan_goal",
      plannerAction: "create_plan",
      response: "Created a plan with 2 tasks.",
      plan: {
        goal: { title: "Run a 10k" },
        tasks: [{ title: "Run this week" }, { title: "Long run Saturday" }],
      },
    });
  });

  it("maps AI engine initialization failures to 503", async () => {
    mockedRunMessage.mockRejectedValueOnce(
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
          timezone: "Europe/Warsaw",
        },
      ),
    ).rejects.toMatchObject({
      message: "Agent service temporarily unavailable",
      status: 503,
    });
  });

  it("delegates continue-plan requests to the service", async () => {
    mockedContinuePlan.mockResolvedValueOnce({
      threadId: "thread-1",
      routedIntent: "plan_goal",
      plannerAction: "create_plan",
      response: "Created a plan with 2 tasks.",
      plan: {
        goal: { title: "Run a 10k" },
        tasks: [{ title: "Run this week" }, { title: "Long run Saturday" }],
      },
    });

    const controller = new AgentController();

    await expect(
      controller.postAgentContinuePlan(
        {
          user: {
            id: "user-1",
          },
        } as ExpressRequest,
        {
          threadId: "thread-1",
          message: "three days a week",
          timezone: "Europe/Warsaw",
        },
      ),
    ).resolves.toEqual({
      threadId: "thread-1",
      routedIntent: "plan_goal",
      plannerAction: "create_plan",
      response: "Created a plan with 2 tasks.",
      plan: {
        goal: { title: "Run a 10k" },
        tasks: [{ title: "Run this week" }, { title: "Long run Saturday" }],
      },
    });
  });

  it("maps continue-plan AI engine initialization failures to 503", async () => {
    mockedContinuePlan.mockRejectedValueOnce(
      new AiEngineUnavailableError(
        "Agent service temporarily unavailable",
        new Error("redis offline"),
      ),
    );

    const controller = new AgentController();

    await expect(
      controller.postAgentContinuePlan(
        {
          user: {
            id: "user-1",
          },
        } as ExpressRequest,
        {
          threadId: "thread-1",
          message: "three days a week",
          timezone: "Europe/Warsaw",
        },
      ),
    ).rejects.toMatchObject({
      message: "Agent service temporarily unavailable",
      status: 503,
    });
  });
});

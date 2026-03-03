// eslint-disable-next-line @typescript-eslint/triple-slash-reference
///  <reference path="../../../types/express.d.ts"/>

import { describe, expect, it, vi } from "vitest";
import type { Request as ExpressRequest } from "express";
import {
  AgentInfrastructureError,
  AgentJobNotFoundError,
} from "../agent.errors.js";

const { enqueue: mockedEnqueue } = vi.hoisted(() => ({
  enqueue: vi.fn(),
}));
const { getAgentJobStateForUser: mockedGetAgentJobStateForUser } = vi.hoisted(
  () => ({
    getAgentJobStateForUser: vi.fn(),
  }),
);

vi.mock("../agent.queue.js", () => ({
  agentQueueService: {
    enqueue: mockedEnqueue,
  },
}));

vi.mock("../agent.events.js", () => ({
  getAgentJobStateForUser: mockedGetAgentJobStateForUser,
}));

import { AgentController } from "../agent.controller.js";

describe("AgentController", () => {
  it("enqueues message requests", async () => {
    mockedEnqueue.mockResolvedValueOnce({
      threadId: "thread-1",
      jobId: "job-1",
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
      jobId: "job-1",
    });
  });

  it("maps enqueue failures to 503", async () => {
    mockedEnqueue.mockRejectedValueOnce(new AgentInfrastructureError());

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

  it("enqueues plan-goal requests", async () => {
    mockedEnqueue.mockResolvedValueOnce({
      threadId: "thread-1",
      jobId: "job-2",
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
          threadId: "thread-1",
          message: "three days a week",
          timezone: "Europe/Warsaw",
        },
      ),
    ).resolves.toEqual({
      threadId: "thread-1",
      jobId: "job-2",
    });
  });

  it("returns message job status", async () => {
    mockedGetAgentJobStateForUser.mockResolvedValueOnce({
      jobId: "job-1",
      threadId: "thread-1",
      status: "queued",
    });

    const controller = new AgentController();

    await expect(
      controller.getAgentMessageJob(
        {
          user: {
            id: "user-1",
          },
        } as ExpressRequest,
        "job-1",
      ),
    ).resolves.toEqual({
      jobId: "job-1",
      threadId: "thread-1",
      status: "queued",
    });
  });

  it("maps missing job status to 404", async () => {
    mockedGetAgentJobStateForUser.mockRejectedValueOnce(
      new AgentJobNotFoundError(),
    );

    const controller = new AgentController();

    await expect(
      controller.getAgentPlanGoalJob(
        {
          user: {
            id: "user-1",
          },
        } as ExpressRequest,
        "job-2",
      ),
    ).rejects.toMatchObject({
      message: "Agent job was not found",
      status: 404,
    });
  });
});

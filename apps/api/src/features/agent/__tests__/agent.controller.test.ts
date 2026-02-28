import { describe, expect, it, vi } from "vitest";
import type { Request as ExpressRequest } from "express";
import { AiEngineUnavailableError } from "../ai-engine/ai-engine.js";

const { runMessage } = vi.hoisted(() => ({
  runMessage: vi.fn(),
}));

vi.mock("../agent.service.js", () => ({
  agentService: {
    runMessage,
  },
}));

import { AgentController } from "../agent.controller.js";

describe("AgentController", () => {
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
});

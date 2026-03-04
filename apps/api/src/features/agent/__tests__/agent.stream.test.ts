// eslint-disable-next-line @typescript-eslint/triple-slash-reference
///  <reference path="../../../types/express.d.ts"/>

import { describe, expect, it, vi } from "vitest";
import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from "express";
import {
  AgentInfrastructureError,
  AgentJobNotFoundError,
} from "../agent.errors.js";
import { createStreamHandler } from "../agent.stream.js";

const createResponse = () =>
  ({
    status: vi.fn().mockReturnThis(),
    setHeader: vi.fn(),
    flushHeaders: vi.fn(),
    write: vi.fn(),
    end: vi.fn(),
    json: vi.fn(),
  }) as unknown as ExpressResponse;

describe("agent stream", () => {
  it("subscribes to live domain events and closes when done arrives", async () => {
    const response = createResponse();
    let listener: ((event: Record<string, string>) => void) | null = null;
    const unsubscribe = vi.fn().mockResolvedValue(undefined);

    const handler = createStreamHandler("message", {
      getAgentJobStateForUser: vi.fn().mockResolvedValue({
        jobId: "job-1",
        threadId: "thread-1",
        status: "active",
      }) as never,
      subscribeToAgentEvents: vi
        .fn()
        .mockImplementation(async ({ listener: nextListener }) => {
          listener = nextListener as never;
          return unsubscribe;
        }) as never,
    });

    await handler(
      {
        params: { jobId: "job-1" },
        on: vi.fn(),
        user: { id: "user-1" },
      } as unknown as ExpressRequest,
      response,
    );

    listener?.({
      type: "router_started",
      jobId: "job-1",
      jobType: "message",
      threadId: "thread-1",
    });
    listener?.({
      type: "done",
      jobId: "job-1",
      jobType: "message",
      threadId: "thread-1",
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.write).toHaveBeenNthCalledWith(
      1,
      "event: router_started\n",
    );
    expect(response.write).toHaveBeenNthCalledWith(
      2,
      'data: {"type":"router_started","jobId":"job-1","jobType":"message","threadId":"thread-1"}\n\n',
    );
    expect(response.end).toHaveBeenCalled();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it("returns 404 when the job is missing", async () => {
    const response = createResponse();
    const handler = createStreamHandler("plan_goal", {
      getAgentJobStateForUser: vi
        .fn()
        .mockRejectedValue(new AgentJobNotFoundError()) as never,
      subscribeToAgentEvents: vi.fn() as never,
    });

    await handler(
      {
        params: { jobId: "job-1" },
        on: vi.fn(),
        user: { id: "user-1" },
      } as unknown as ExpressRequest,
      response,
    );

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({
      error: "Not Found",
      message: "Agent job was not found",
    });
  });

  it("writes terminal error events when stream setup fails after headers", async () => {
    const response = createResponse();
    const handler = createStreamHandler("message", {
      subscribeToAgentEvents: vi
        .fn()
        .mockRejectedValue(new AgentInfrastructureError()) as never,
      getAgentJobStateForUser: vi.fn().mockResolvedValue({
        jobId: "job-1",
        threadId: "thread-1",
        status: "active",
      }) as never,
    });

    await handler(
      {
        params: { jobId: "job-1" },
        on: vi.fn(),
        user: { id: "user-1" },
      } as unknown as ExpressRequest,
      response,
    );

    expect(response.write).toHaveBeenNthCalledWith(1, "event: error\n");
    expect(response.write).toHaveBeenNthCalledWith(
      2,
      'data: {"type":"error","jobId":"job-1","jobType":"message","threadId":"thread-1","message":"Agent service temporarily unavailable"}\n\n',
    );
    expect(response.end).toHaveBeenCalled();
  });
});

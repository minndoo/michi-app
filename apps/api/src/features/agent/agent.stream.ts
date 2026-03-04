import type {
  Express,
  Request as ExpressRequest,
  Response as ExpressResponse,
} from "express";
import {
  getAgentJobStateForUser,
  isTerminalAgentEvent,
  subscribeToAgentEvents,
} from "./agent.events.js";
import {
  AgentInfrastructureError,
  AgentJobNotFoundError,
} from "./agent.errors.js";
import type { AgentJobType, AgentStreamEvent } from "./agent.types.js";

type StreamHandlerDeps = {
  getAgentJobStateForUser: typeof getAgentJobStateForUser;
  subscribeToAgentEvents: typeof subscribeToAgentEvents;
};

const defaultDeps: StreamHandlerDeps = {
  getAgentJobStateForUser,
  subscribeToAgentEvents,
};

const writeSseEvent = (
  response: ExpressResponse,
  event: AgentStreamEvent,
): void => {
  response.write(`event: ${event.type}\n`);
  response.write(`data: ${JSON.stringify(event)}\n\n`);
};

const startSseResponse = (response: ExpressResponse): void => {
  response.status(200);
  response.setHeader("Content-Type", "text/event-stream");
  response.setHeader("Cache-Control", "no-cache, no-transform");
  response.setHeader("Connection", "keep-alive");
  response.flushHeaders?.();
};

const getUserId = (request: ExpressRequest): string | null =>
  request.user?.id ?? null;

export const createStreamHandler =
  (jobType: AgentJobType, deps: StreamHandlerDeps = defaultDeps) =>
  async (request: ExpressRequest, response: ExpressResponse): Promise<void> => {
    const userId = getUserId(request);

    if (!userId) {
      response.status(401).json({
        error: "Unauthorized",
        message: "Unauthorized",
      });
      return;
    }

    const rawJobId = request.params.jobId;
    const jobId = typeof rawJobId === "string" ? rawJobId : null;

    if (!jobId) {
      response.status(404).json({
        error: "Not Found",
        message: "Agent job was not found",
      });
      return;
    }

    let jobState: Awaited<
      ReturnType<StreamHandlerDeps["getAgentJobStateForUser"]>
    > | null = null;

    try {
      jobState = await deps.getAgentJobStateForUser({
        jobId,
        jobType,
        userId,
      });
    } catch (error) {
      if (error instanceof AgentJobNotFoundError) {
        response.status(404).json({
          error: "Not Found",
          message: "Agent job was not found",
        });
        return;
      }

      response.status(503).json({
        error: "Service Unavailable",
        message:
          error instanceof AgentInfrastructureError
            ? error.message
            : "Agent service temporarily unavailable",
      });
      return;
    }

    startSseResponse(response);

    let unsubscribe: (() => Promise<void>) | null = null;

    const cleanup = async () => {
      if (!unsubscribe) {
        return;
      }

      const nextUnsubscribe = unsubscribe;
      unsubscribe = null;
      await nextUnsubscribe();
    };

    request.on("close", () => {
      void cleanup();
    });

    try {
      unsubscribe = await deps.subscribeToAgentEvents({
        jobId,
        jobType,
        listener: (event: AgentStreamEvent) => {
          writeSseEvent(response, event);

          if (isTerminalAgentEvent(event)) {
            void cleanup().finally(() => {
              response.end();
            });
          }
        },
      });
    } catch (error) {
      writeSseEvent(response, {
        type: "error",
        jobId,
        jobType,
        threadId: jobState?.threadId ?? jobId,
        message:
          error instanceof AgentInfrastructureError
            ? error.message
            : "Agent service temporarily unavailable",
      });
      writeSseEvent(response, {
        type: "done",
        jobId,
        jobType,
        threadId: jobState?.threadId ?? jobId,
      });
      await cleanup();
      response.end();
    }
  };

export const registerAgentStreamRoutes = (
  app: Express,
  deps?: StreamHandlerDeps,
): void => {
  app.get("/agent/message/:jobId/stream", createStreamHandler("message", deps));
  app.get(
    "/agent/plan-goal/:jobId/stream",
    createStreamHandler("plan_goal", deps),
  );
};

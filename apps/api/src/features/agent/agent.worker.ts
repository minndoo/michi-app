import { Worker, type Job } from "bullmq";
import { agentService } from "./agent.service.js";
import { publishAgentEvent, updateAgentJobStatus } from "./agent.events.js";
import { AgentInfrastructureError } from "./agent.errors.js";
import { agentQueueName, type AgentJobPayload } from "./agent.jobs.js";
import { getBullmqConnectionOptions } from "../../lib/redis.js";
import type { AgentJobType } from "./agent.types.js";

type AgentWorkerService = Pick<
  typeof agentService,
  "runMessageStream" | "continuePlanStream"
>;

type ProcessAgentJobDeps = {
  service: AgentWorkerService;
  publishAgentEvent: typeof publishAgentEvent;
  updateAgentJobStatus: typeof updateAgentJobStatus;
};

const defaultDeps: ProcessAgentJobDeps = {
  service: agentService,
  publishAgentEvent,
  updateAgentJobStatus,
};

const getErrorMessage = (error: unknown): string =>
  error instanceof AgentInfrastructureError
    ? error.message
    : error instanceof Error
      ? error.message
      : "Unknown error";

const publishWorkerRunStarted = async (
  deps: ProcessAgentJobDeps,
  jobType: AgentJobType,
  jobId: string,
  threadId: string,
): Promise<void> => {
  await deps.publishAgentEvent({
    type: "run_started",
    jobId,
    jobType,
    threadId,
  });
};

export const processAgentJob = async (
  job: Job<AgentJobPayload, unknown, AgentJobType>,
  deps: ProcessAgentJobDeps = defaultDeps,
): Promise<void> => {
  const jobId = String(job.id);
  const jobType = job.name;

  await deps.updateAgentJobStatus({
    jobId,
    jobType,
    status: "active",
  });

  await publishWorkerRunStarted(deps, jobType, jobId, job.data.threadId);

  try {
    const stream =
      jobType === "message"
        ? deps.service.runMessageStream(job.data.userId, jobId, {
            threadId: job.data.threadId,
            message: job.data.message,
            questionAnswers: job.data.questionAnswers ?? null,
            timezone: job.data.timezone,
          })
        : deps.service.continuePlanStream(job.data.userId, jobId, {
            threadId: job.data.threadId,
            message: job.data.message,
            questionAnswers: job.data.questionAnswers ?? null,
            timezone: job.data.timezone,
          });

    for await (const event of stream) {
      if (event.type === "result") {
        await deps.updateAgentJobStatus({
          jobId,
          jobType,
          status: "completed",
          result: event.response,
        });
      }

      await deps.publishAgentEvent(event);
    }

    await deps.publishAgentEvent({
      type: "done",
      jobId,
      jobType,
      threadId: job.data.threadId,
    });
  } catch (error) {
    const message = getErrorMessage(error);

    await deps.publishAgentEvent({
      type: "error",
      jobId,
      jobType,
      threadId: job.data.threadId,
      message,
    });
    await deps.updateAgentJobStatus({
      jobId,
      jobType,
      status: "failed",
      error: message,
    });
    await deps.publishAgentEvent({
      type: "done",
      jobId,
      jobType,
      threadId: job.data.threadId,
    });
    throw error;
  }
};

let worker: Worker<AgentJobPayload, unknown, AgentJobType> | null = null;
let workerPromise: Promise<
  Worker<AgentJobPayload, unknown, AgentJobType>
> | null = null;

export const startAgentWorker = async (): Promise<
  Worker<AgentJobPayload, unknown, AgentJobType>
> => {
  if (worker) {
    return worker;
  }

  if (!workerPromise) {
    workerPromise = (async () => {
      try {
        const createdWorker = new Worker<
          AgentJobPayload,
          unknown,
          AgentJobType
        >(agentQueueName, async (job) => processAgentJob(job), {
          connection: getBullmqConnectionOptions(),
        });

        await createdWorker.waitUntilReady();
        createdWorker.on("error", (error) => {
          const message =
            error instanceof Error ? error.message : String(error);
          console.error("Agent worker runtime error", { error: message });
        });
        worker = createdWorker;
        return createdWorker;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Agent worker initialization failed", { error: message });
        throw new AgentInfrastructureError();
      }
    })().finally(() => {
      workerPromise = null;
    });
  }

  return workerPromise;
};

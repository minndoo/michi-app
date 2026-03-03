import { Queue } from "bullmq";
import { getBullmqConnectionOptions } from "../../lib/redis.js";
import { AgentInfrastructureError } from "./agent.errors.js";
import { createInitialJobState } from "./agent.events.js";
import { agentQueueName, type AgentJobPayload } from "./agent.jobs.js";
import type {
  AgentEnqueueResponse,
  AgentJobType,
  AgentMessageInput,
} from "./agent.types.js";

type AgentQueueDeps = {
  createInitialJobState: typeof createInitialJobState;
};

let queue: Queue<AgentJobPayload, unknown, AgentJobType> | null = null;
let queuePromise: Promise<
  Queue<AgentJobPayload, unknown, AgentJobType>
> | null = null;

const getOrInitAgentQueue = async (): Promise<
  Queue<AgentJobPayload, unknown, AgentJobType>
> => {
  if (queue) {
    return queue;
  }

  if (!queuePromise) {
    queuePromise = (async () => {
      try {
        const createdQueue = new Queue<AgentJobPayload, unknown, AgentJobType>(
          agentQueueName,
          {
            connection: getBullmqConnectionOptions(),
          },
        );
        await createdQueue.waitUntilReady();
        queue = createdQueue;
        return createdQueue;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Agent queue initialization failed", { error: message });
        throw new AgentInfrastructureError();
      }
    })().finally(() => {
      queuePromise = null;
    });
  }

  return queuePromise;
};

export class AgentQueueService {
  private readonly deps: AgentQueueDeps;

  constructor(deps: AgentQueueDeps = { createInitialJobState }) {
    this.deps = deps;
  }

  async enqueue(
    jobType: AgentJobType,
    userId: string,
    input: AgentMessageInput,
  ): Promise<AgentEnqueueResponse> {
    try {
      const agentQueue = await getOrInitAgentQueue();
      const job = await agentQueue.add(jobType, {
        userId,
        threadId: input.threadId,
        timezone: input.timezone,
        message: input.message,
      });
      const jobId = String(job.id);

      await this.deps.createInitialJobState({
        jobId,
        jobType,
        threadId: input.threadId,
        userId,
      });

      return {
        threadId: input.threadId,
        jobId,
      };
    } catch (error) {
      if (error instanceof AgentInfrastructureError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      console.error("Agent enqueue failed", { error: message, jobType });
      throw new AgentInfrastructureError();
    }
  }
}

export const agentQueueService = new AgentQueueService();

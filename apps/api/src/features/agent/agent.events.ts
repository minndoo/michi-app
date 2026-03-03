import type {
  AgentJobStateResponse,
  AgentJobStatus,
  AgentJobType,
  AgentMessageResponse,
  AgentStreamEvent,
} from "./agent.types.js";
import {
  createRedisSubscriber,
  getOrInitRedisCommandClient,
  getOrInitRedisPublisherClient,
} from "../../lib/redis.js";
import {
  AgentInfrastructureError,
  AgentJobNotFoundError,
} from "./agent.errors.js";

type StoredAgentJobState = AgentJobStateResponse & {
  jobType: AgentJobType;
  userId: string;
};

type CreateInitialJobStateArgs = {
  jobId: string;
  jobType: AgentJobType;
  threadId: string;
  userId: string;
};

const buildAgentStateKey = (jobType: AgentJobType, jobId: string): string =>
  `agent:${jobType}:${jobId}:state`;

const buildAgentChannelKey = (jobType: AgentJobType, jobId: string): string =>
  `agent:${jobType}:${jobId}:events`;

const persistJobState = async (state: StoredAgentJobState): Promise<void> => {
  try {
    const client = await getOrInitRedisCommandClient();
    await client.set(
      buildAgentStateKey(state.jobType, state.jobId),
      JSON.stringify(state),
    );
  } catch {
    throw new AgentInfrastructureError();
  }
};

const readStoredJobState = async (
  jobType: AgentJobType,
  jobId: string,
): Promise<StoredAgentJobState | null> => {
  try {
    const client = await getOrInitRedisCommandClient();
    const payload = await client.get(buildAgentStateKey(jobType, jobId));

    if (!payload) {
      return null;
    }

    return JSON.parse(payload) as StoredAgentJobState;
  } catch {
    throw new AgentInfrastructureError();
  }
};

const toPublicJobState = (
  state: StoredAgentJobState,
): AgentJobStateResponse => ({
  jobId: state.jobId,
  threadId: state.threadId,
  status: state.status,
  ...(state.result ? { result: state.result } : {}),
  ...(state.error ? { error: state.error } : {}),
});

export const createInitialJobState = async ({
  jobId,
  jobType,
  threadId,
  userId,
}: CreateInitialJobStateArgs): Promise<void> => {
  await persistJobState({
    jobId,
    jobType,
    threadId,
    userId,
    status: "queued",
  });
};

export const updateAgentJobStatus = async ({
  jobId,
  jobType,
  status,
  result,
  error,
}: {
  jobId: string;
  jobType: AgentJobType;
  status: AgentJobStatus;
  result?: AgentMessageResponse;
  error?: string;
}): Promise<void> => {
  const currentState = await readStoredJobState(jobType, jobId);

  if (!currentState) {
    throw new AgentJobNotFoundError();
  }

  await persistJobState({
    ...currentState,
    status,
    ...(result ? { result } : {}),
    ...(error ? { error } : {}),
  });
};

export const getAgentJobStateForUser = async ({
  jobId,
  jobType,
  userId,
}: {
  jobId: string;
  jobType: AgentJobType;
  userId: string;
}): Promise<AgentJobStateResponse> => {
  const state = await readStoredJobState(jobType, jobId);

  if (!state || state.userId !== userId || state.jobType !== jobType) {
    throw new AgentJobNotFoundError();
  }

  return toPublicJobState(state);
};

export const publishAgentEvent = async (
  event: AgentStreamEvent,
): Promise<void> => {
  try {
    const publisherClient = await getOrInitRedisPublisherClient();
    const payload = JSON.stringify(event);
    await publisherClient.publish(
      buildAgentChannelKey(event.jobType, event.jobId),
      payload,
    );
  } catch {
    throw new AgentInfrastructureError();
  }
};

export const createAgentEventSubscriber = async () => createRedisSubscriber();

export const getAgentChannelName = (
  jobType: AgentJobType,
  jobId: string,
): string => buildAgentChannelKey(jobType, jobId);

export const isTerminalAgentEvent = (event: AgentStreamEvent): boolean =>
  event.type === "done";

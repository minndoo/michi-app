import { aiEngine } from "./ai-engine/index.js";
import type {
  AgentJobType,
  AgentMessageInput,
  AgentStreamEvent,
} from "./agent.types.js";

type AgentServiceDeps = {
  engine: {
    streamPlanner: (args: {
      jobId: string;
      jobType: AgentJobType;
      input: string;
      questionAnswer?: AgentMessageInput["questionAnswer"];
      requireCheckpoint?: boolean;
      threadId: string;
      userId: string;
      timezone: string;
    }) => AsyncIterable<AgentStreamEvent>;
    streamRouter: (args: {
      jobId: string;
      jobType: AgentJobType;
      input: string;
      questionAnswer?: AgentMessageInput["questionAnswer"];
      threadId: string;
      userId: string;
      timezone: string;
    }) => AsyncIterable<AgentStreamEvent>;
  };
};

class AgentService {
  private readonly deps: AgentServiceDeps;

  constructor(deps: AgentServiceDeps) {
    this.deps = deps;
  }

  runMessageStream(
    userId: string,
    jobId: string,
    input: AgentMessageInput,
  ): AsyncIterable<AgentStreamEvent> {
    return this.deps.engine.streamRouter({
      jobId,
      jobType: "message",
      userId,
      input: input.message,
      questionAnswer: input.questionAnswer,
      threadId: input.threadId,
      timezone: input.timezone,
    });
  }

  continuePlanStream(
    userId: string,
    jobId: string,
    input: AgentMessageInput,
  ): AsyncIterable<AgentStreamEvent> {
    return this.deps.engine.streamPlanner({
      jobId,
      jobType: "plan_goal",
      userId,
      input: input.message,
      questionAnswer: input.questionAnswer,
      requireCheckpoint: true,
      threadId: input.threadId,
      timezone: input.timezone,
    });
  }
}

export const agentService = new AgentService({
  engine: aiEngine,
});

export { AgentService };

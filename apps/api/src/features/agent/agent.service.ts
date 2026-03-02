import { aiEngine } from "./ai-engine/index.js";
import type {
  AgentEngineResult,
  AgentMessageInput,
  AgentMessageResponse,
} from "./agent.types.js";

type AgentServiceDeps = {
  engine: {
    invokePlanner: (args: {
      input: string;
      requireCheckpoint?: boolean;
      threadId: string;
      userId: string;
      timezone: string;
    }) => Promise<AgentEngineResult>;
    invokeRouter: (args: {
      input: string;
      threadId: string;
      userId: string;
      timezone: string;
    }) => Promise<AgentEngineResult>;
  };
};

class AgentService {
  private readonly deps: AgentServiceDeps;

  constructor(deps: AgentServiceDeps) {
    this.deps = deps;
  }

  async runMessage(
    userId: string,
    input: AgentMessageInput,
  ): Promise<AgentMessageResponse> {
    const result = await this.deps.engine.invokeRouter({
      userId,
      input: input.message,
      threadId: input.threadId,
      timezone: input.timezone,
    });

    return {
      threadId: input.threadId,
      routedIntent: result.routedIntent,
      response: result.response,
      ...(result.plannerAction ? { plannerAction: result.plannerAction } : {}),
      ...(result.plan ? { plan: result.plan } : {}),
      ...(result.refusal ? { refusal: result.refusal } : {}),
    };
  }

  async continuePlan(
    userId: string,
    input: AgentMessageInput,
  ): Promise<AgentMessageResponse> {
    const result = await this.deps.engine.invokePlanner({
      userId,
      input: input.message,
      requireCheckpoint: true,
      threadId: input.threadId,
      timezone: input.timezone,
    });

    return {
      threadId: input.threadId,
      routedIntent: result.routedIntent,
      response: result.response,
      ...(result.plannerAction ? { plannerAction: result.plannerAction } : {}),
      ...(result.plan ? { plan: result.plan } : {}),
      ...(result.refusal ? { refusal: result.refusal } : {}),
    };
  }
}

export const agentService = new AgentService({
  engine: aiEngine,
});

export { AgentService };

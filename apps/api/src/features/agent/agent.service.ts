import { aiEngine } from "./ai-engine.js";
import type {
  AgentEngineResult,
  AgentMessageInput,
  AgentMessageResponse,
} from "./agent.types.js";

type AgentServiceDeps = {
  engine: {
    invokeRouter: (args: {
      input: string;
      threadId: string;
      userId: string;
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
      threadId: input.threadId,
      input: input.message,
    });

    return {
      threadId: input.threadId,
      routedIntent: result.routedIntent,
      response: result.response,
      ...(result.plannerAction ? { plannerAction: result.plannerAction } : {}),
    };
  }
}

export const agentService = new AgentService({
  engine: aiEngine,
});

export { AgentService };

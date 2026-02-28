import type { Request as ExpressRequest } from "express";
import { AiEngineUnavailableError } from "./ai-engine/ai-engine.js";
import {
  Body,
  Controller,
  OperationId,
  Post,
  Request,
  Route,
  Tags,
} from "@tsoa/runtime";
import { createHttpError } from "../../helpers/http.js";
import { agentService } from "./agent.service.js";
import type {
  AgentMessageInput,
  AgentMessageResponse,
  AgentPlanGoalInput,
  AgentPlanGoalResponse,
} from "./agent.types.js";

const getUserId = (request: ExpressRequest): string => {
  const userId = request.user?.id;

  if (!userId) {
    throw createHttpError(401, "Unauthorized");
  }

  return userId;
};

@Route("agent")
@Tags("Agent")
export class AgentController extends Controller {
  @Post("message")
  @OperationId("postAgentMessage")
  public async postAgentMessage(
    @Request() request: ExpressRequest,
    @Body() body: AgentMessageInput,
  ): Promise<AgentMessageResponse> {
    const userId = getUserId(request);

    try {
      return await agentService.runMessage(userId, body);
    } catch (error) {
      if (error instanceof AiEngineUnavailableError) {
        throw createHttpError(503, "Agent service temporarily unavailable");
      }

      throw error;
    }
  }

  @Post("plan-goal")
  @OperationId("postAgentPlanGoal")
  public async postAgentPlanGoal(
    @Request() request: ExpressRequest,
    @Body() body: AgentPlanGoalInput,
  ): Promise<AgentPlanGoalResponse> {
    const userId = getUserId(request);

    try {
      return await agentService.planGoal(userId, body);
    } catch (error) {
      if (error instanceof AiEngineUnavailableError) {
        throw createHttpError(503, "Agent service temporarily unavailable");
      }

      throw error;
    }
  }
}

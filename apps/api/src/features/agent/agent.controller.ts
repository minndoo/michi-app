import type { Request as ExpressRequest } from "express";
import { AiEngineUnavailableError } from "./ai-engine/ai-engine.js";
import {
  Body,
  Controller,
  Get,
  OperationId,
  Post,
  Request,
  Path,
  Route,
  Tags,
} from "@tsoa/runtime";
import { createHttpError } from "../../helpers/http.js";
import {
  AgentInfrastructureError,
  AgentJobNotFoundError,
} from "./agent.errors.js";
import { getAgentJobStateForUser } from "./agent.events.js";
import { agentQueueService } from "./agent.queue.js";
import type {
  AgentEnqueueResponse,
  AgentJobStateResponse,
  AgentMessageInput,
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
  private async enqueueJob(
    request: ExpressRequest,
    jobType: "message" | "plan_goal",
    body: AgentMessageInput,
  ): Promise<AgentEnqueueResponse> {
    const userId = getUserId(request);

    try {
      return await agentQueueService.enqueue(jobType, userId, body);
    } catch (error) {
      if (
        error instanceof AiEngineUnavailableError ||
        error instanceof AgentInfrastructureError
      ) {
        throw createHttpError(503, "Agent service temporarily unavailable");
      }

      throw error;
    }
  }

  private async getJobState(
    request: ExpressRequest,
    jobType: "message" | "plan_goal",
    jobId: string,
  ): Promise<AgentJobStateResponse> {
    const userId = getUserId(request);

    try {
      return await getAgentJobStateForUser({
        jobId,
        jobType,
        userId,
      });
    } catch (error) {
      if (error instanceof AgentJobNotFoundError) {
        throw createHttpError(404, "Agent job was not found");
      }

      if (error instanceof AgentInfrastructureError) {
        throw createHttpError(503, "Agent service temporarily unavailable");
      }

      throw error;
    }
  }

  @Post("message")
  @OperationId("postAgentMessage")
  public async postAgentMessage(
    @Request() request: ExpressRequest,
    @Body() body: AgentMessageInput,
  ): Promise<AgentEnqueueResponse> {
    console.log("API message", body);
    return this.enqueueJob(request, "message", body);
  }

  @Get("message/{jobId}")
  @OperationId("getAgentMessageJob")
  public async getAgentMessageJob(
    @Request() request: ExpressRequest,
    @Path() jobId: string,
  ): Promise<AgentJobStateResponse> {
    return this.getJobState(request, "message", jobId);
  }

  @Post("plan-goal")
  @OperationId("postAgentPlanGoal")
  public async postAgentPlanGoal(
    @Request() request: ExpressRequest,
    @Body() body: AgentMessageInput,
  ): Promise<AgentEnqueueResponse> {
    console.log("API plan goal", body);
    return this.enqueueJob(request, "plan_goal", body);
  }

  @Get("plan-goal/{jobId}")
  @OperationId("getAgentPlanGoalJob")
  public async getAgentPlanGoalJob(
    @Request() request: ExpressRequest,
    @Path() jobId: string,
  ): Promise<AgentJobStateResponse> {
    return this.getJobState(request, "plan_goal", jobId);
  }
}

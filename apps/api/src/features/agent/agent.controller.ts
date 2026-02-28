import type { Request as ExpressRequest } from "express";
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
import { agentMessageInputSchema } from "./agent.schemas.js";
import { agentService } from "./agent.service.js";
import type { AgentMessageInput, AgentMessageResponse } from "./agent.types.js";

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
    const parsedBody = agentMessageInputSchema.safeParse(body);

    if (!parsedBody.success) {
      throw createHttpError(422, "Validation Failed");
    }

    const userId = getUserId(request);
    return agentService.runMessage(userId, parsedBody.data);
  }
}

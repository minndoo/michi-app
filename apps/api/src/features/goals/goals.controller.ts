import type { Request as ExpressRequest } from "express";
import {
  Body,
  Controller,
  Get,
  OperationId,
  Patch,
  Path,
  Post,
  Request,
  Route,
  SuccessResponse,
  Tags,
} from "@tsoa/runtime";
import {
  goalsService,
  type CreateGoalInput,
  type GoalResponse,
  type UpdateGoalInput,
} from "./goals.service.js";

type HttpError = Error & { status: number };

const createHttpError = (status: number, message: string): HttpError => {
  const error = new Error(message) as HttpError;
  error.status = status;
  return error;
};

const getUserId = (request: ExpressRequest): string => {
  const userId = request.user?.id;

  if (!userId) {
    throw createHttpError(401, "Unauthorized");
  }

  return userId;
};

@Route("goals")
@Tags("Goals")
export class GoalsController extends Controller {
  @Get()
  @OperationId("getGoals")
  public async getGoals(
    @Request() request: ExpressRequest,
  ): Promise<GoalResponse[]> {
    const userId = getUserId(request);
    return goalsService.getGoals({ userId });
  }

  @Get("{id}")
  @OperationId("getGoalsById")
  public async getGoalsById(
    @Request() request: ExpressRequest,
    @Path() id: string,
  ): Promise<GoalResponse> {
    const userId = getUserId(request);
    return goalsService.getGoalsById({ userId, id });
  }

  @Post()
  @OperationId("createGoal")
  @SuccessResponse("201", "Created")
  public async createGoal(
    @Request() request: ExpressRequest,
    @Body() body: CreateGoalInput,
  ): Promise<GoalResponse> {
    const userId = getUserId(request);
    this.setStatus(201);
    return goalsService.createGoal({ userId, data: body });
  }

  @Patch("{id}")
  @OperationId("updateGoal")
  public async updateGoal(
    @Request() request: ExpressRequest,
    @Path() id: string,
    @Body() body: UpdateGoalInput,
  ): Promise<GoalResponse> {
    const userId = getUserId(request);
    return goalsService.updateGoal({ userId, id, data: body });
  }
}

import type { Request as ExpressRequest } from "express";
import {
  Body,
  Controller,
  Get,
  OperationId,
  Patch,
  Path,
  Post,
  Query,
  Request,
  Route,
  SuccessResponse,
  Tags,
} from "@tsoa/runtime";
import { createHttpError } from "../../helpers/http.js";
import {
  type CreateTaskInput,
  type TaskStatus,
  type TaskResponse,
  type UpdateTaskInput,
} from "./tasks.types.js";
import { tasksService } from "./tasks.service.js";

const getUserId = (request: ExpressRequest): string => {
  const userId = request.user?.id;

  if (!userId) {
    throw createHttpError(401, "Unauthorized");
  }

  return userId;
};

@Route("tasks")
@Tags("Tasks")
export class TasksController extends Controller {
  @Get()
  @OperationId("getTasks")
  public async getTasks(
    @Request() request: ExpressRequest,
    @Query() status?: TaskStatus,
  ): Promise<TaskResponse[]> {
    const userId = getUserId(request);
    return tasksService.getTasks({ userId, status });
  }

  @Get("{id}")
  @OperationId("getTaskById")
  public async getTaskById(
    @Request() request: ExpressRequest,
    @Path() id: string,
  ): Promise<TaskResponse> {
    const userId = getUserId(request);
    return tasksService.getTaskById({ userId, id });
  }

  @Post()
  @OperationId("createTask")
  @SuccessResponse("201", "Created")
  public async createTask(
    @Request() request: ExpressRequest,
    @Body() body: CreateTaskInput,
  ): Promise<TaskResponse> {
    const userId = getUserId(request);
    this.setStatus(201);
    return tasksService.createTask({ userId, data: body });
  }

  @Patch("{id}")
  @OperationId("updateTask")
  public async updateTask(
    @Request() request: ExpressRequest,
    @Path() id: string,
    @Body() body: UpdateTaskInput,
  ): Promise<TaskResponse> {
    const userId = getUserId(request);
    return tasksService.updateTask({ userId, id, data: body });
  }
}

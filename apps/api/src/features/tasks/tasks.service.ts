import { prisma } from "../../lib/prisma.js";
import { parseDueAt } from "../../helpers/date.js";
import { createHttpError } from "../../helpers/http.js";
import { syncGoalsStatus } from "../goals/goals.service.js";
import { TaskStatus } from "./tasks.types.js";
import type {
  CreateTaskParams,
  GetTaskByIdParams,
  GetTasksParams,
  TaskRecord,
  TaskResponse,
  UpdateTaskParams,
} from "./tasks.types.js";

const taskSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
  dueAt: true,
  goalId: true,
} as const;

const toTaskResponse = (task: TaskRecord): TaskResponse => ({
  id: task.id,
  title: task.title,
  description: task.description,
  status: task.status,
  completedAt: task.completedAt ? task.completedAt.toISOString() : null,
  createdAt: task.createdAt.toISOString(),
  updatedAt: task.updatedAt ? task.updatedAt.toISOString() : null,
  dueAt: task.dueAt.toISOString(),
  goalId: task.goalId,
});

class TasksService {
  async getTasks({ userId, status }: GetTasksParams): Promise<TaskResponse[]> {
    const tasks = await prisma.task.findMany({
      where: {
        userId,
        status,
      },
      select: taskSelect,
    });

    return tasks.map(toTaskResponse);
  }

  async getTaskById({ userId, id }: GetTaskByIdParams): Promise<TaskResponse> {
    const task = await prisma.task.findFirst({
      where: { id, userId },
      select: taskSelect,
    });

    if (!task) {
      throw createHttpError(404, "Task not found");
    }

    return toTaskResponse(task);
  }

  async createTask({ userId, data }: CreateTaskParams): Promise<TaskResponse> {
    const parsedDueAt = parseDueAt(data.dueAt);

    return prisma.$transaction(async (tx) => {
      if (data.goalId) {
        const goal = await tx.goal.findFirst({
          where: {
            id: data.goalId,
            userId,
          },
          select: { id: true },
        });

        if (!goal) {
          throw createHttpError(404, "Goal not found");
        }
      }

      const task = await tx.task.create({
        data: {
          title: data.title,
          dueAt: parsedDueAt,
          description: data.description,
          goalId: data.goalId,
          userId,
        },
        select: taskSelect,
      });

      if (task.goalId) {
        await syncGoalsStatus({
          db: tx,
          userId,
          goalIds: [task.goalId],
        });
      }

      return toTaskResponse(task);
    });
  }

  async updateTask({
    userId,
    id,
    data,
  }: UpdateTaskParams): Promise<TaskResponse> {
    return prisma.$transaction(async (tx) => {
      const task = await tx.task.findFirst({
        where: { id, userId },
        select: taskSelect,
      });

      if (!task) {
        throw createHttpError(404, "Task not found");
      }

      const updateData: {
        title?: string;
        dueAt?: Date;
        description?: string | null;
        goalId?: string | null;
        status?: TaskStatus;
        completedAt?: Date | null;
      } = {};

      if (data.title !== undefined) {
        updateData.title = data.title;
      }

      if (data.dueAt !== undefined) {
        updateData.dueAt = parseDueAt(data.dueAt);
      }

      if (data.description !== undefined) {
        updateData.description = data.description;
      }

      const hasGoalChanged =
        data.goalId !== undefined && data.goalId !== task.goalId;

      if (hasGoalChanged) {
        if (data.goalId === null) {
          updateData.goalId = null;
        } else {
          const goal = await tx.goal.findFirst({
            where: {
              id: data.goalId,
              userId,
            },
            select: { id: true },
          });

          if (!goal) {
            throw createHttpError(404, "Goal not found");
          }

          updateData.goalId = data.goalId;
        }
      }

      const hasStatusChanged =
        data.status !== undefined && data.status !== task.status;

      if (hasStatusChanged) {
        updateData.status = data.status;
        if (data.status === TaskStatus.Done) {
          updateData.completedAt = new Date();
        } else {
          updateData.completedAt = null;
        }
      }

      if (Object.keys(updateData).length === 0) {
        return toTaskResponse(task);
      }

      const updateResult = await tx.task.updateMany({
        where: { id, userId },
        data: updateData,
      });

      if (updateResult.count === 0) {
        throw createHttpError(404, "Task not found");
      }

      const updatedTask = await tx.task.findFirst({
        where: { id, userId },
        select: taskSelect,
      });

      if (!updatedTask) {
        throw createHttpError(404, "Task not found");
      }

      if (hasStatusChanged || hasGoalChanged) {
        const affectedGoalIds = new Set<string>();

        if (task.goalId) {
          affectedGoalIds.add(task.goalId);
        }

        if (updatedTask.goalId) {
          affectedGoalIds.add(updatedTask.goalId);
        }

        await syncGoalsStatus({
          db: tx,
          userId,
          goalIds: Array.from(affectedGoalIds),
        });
      }

      return toTaskResponse(updatedTask);
    });
  }
}

export const tasksService = new TasksService();

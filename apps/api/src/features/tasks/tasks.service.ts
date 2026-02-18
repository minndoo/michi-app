import { prisma } from "../../lib/prisma.js";

type HttpError = Error & { status: number };

const createHttpError = (status: number, message: string): HttpError => {
  const error = new Error(message) as HttpError;
  error.status = status;
  return error;
};

export interface CreateTaskInput {
  title: string;
  dueAt: string;
  description?: string | null;
  goalId?: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  dueAt?: string;
  description?: string | null;
  goalId?: string | null;
  status?: TaskStatus;
}

export interface GetTasksParams {
  userId: string;
  status?: TaskStatus;
}

export interface GetTaskByIdParams {
  userId: string;
  id: string;
}

export interface CreateTaskParams {
  userId: string;
  data: CreateTaskInput;
}

export interface UpdateTaskParams {
  userId: string;
  id: string;
  data: UpdateTaskInput;
}

interface TaskRecord {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
  dueAt: Date;
  goalId: string | null;
}

export type TaskStatus = "TODO" | "DONE";

export interface TaskResponse {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  dueAt: string;
  goalId: string | null;
}

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

const parseDueAt = (dueAt: string): Date => {
  const parsedDueAt = new Date(dueAt);
  if (Number.isNaN(parsedDueAt.getTime())) {
    throw createHttpError(400, "Invalid dueAt");
  }

  return parsedDueAt;
};

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

    if (data.goalId) {
      const goal = await prisma.goal.findFirst({
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

    const task = await prisma.task.create({
      data: {
        title: data.title,
        dueAt: parsedDueAt,
        description: data.description,
        goalId: data.goalId,
        userId,
      },
      select: taskSelect,
    });

    return toTaskResponse(task);
  }

  async updateTask({
    userId,
    id,
    data,
  }: UpdateTaskParams): Promise<TaskResponse> {
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

    if (data.goalId !== undefined) {
      if (data.goalId === null) {
        updateData.goalId = null;
      } else {
        const goal = await prisma.goal.findFirst({
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

    if (data.status !== undefined) {
      updateData.status = data.status;
      if (data.status === "DONE") {
        updateData.completedAt = new Date();
      } else {
        updateData.completedAt = null;
      }
    }

    if (Object.keys(updateData).length === 0) {
      const unchangedTask = await prisma.task.findFirst({
        where: { id, userId },
        select: taskSelect,
      });

      if (!unchangedTask) {
        throw createHttpError(404, "Task not found");
      }

      return toTaskResponse(unchangedTask);
    }

    const updateResult = await prisma.task.updateMany({
      where: { id, userId },
      data: updateData,
    });

    if (updateResult.count === 0) {
      throw createHttpError(404, "Task not found");
    }

    const updatedTask = await prisma.task.findFirst({
      where: { id, userId },
      select: taskSelect,
    });

    if (!updatedTask) {
      throw createHttpError(404, "Task not found");
    }

    return toTaskResponse(updatedTask);
  }
}

export const tasksService = new TasksService();

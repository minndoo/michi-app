import { prisma } from "../../lib/prisma.js";

type HttpError = Error & { status: number };

const createHttpError = (status: number, message: string): HttpError => {
  const error = new Error(message) as HttpError;
  error.status = status;
  return error;
};

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  goalId?: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  goalId?: string | null;
}

export interface GetTasksParams {
  userId: string;
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
  completed: boolean;
  createdAt: Date;
  updatedAt: Date | null;
  goalId: string | null;
}

export interface TaskResponse {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  createdAt: string;
  updatedAt: string | null;
  goalId: string | null;
}

const taskSelect = {
  id: true,
  title: true,
  description: true,
  completed: true,
  createdAt: true,
  updatedAt: true,
  goalId: true,
} as const;

const toTaskResponse = (task: TaskRecord): TaskResponse => ({
  id: task.id,
  title: task.title,
  description: task.description,
  completed: task.completed,
  createdAt: task.createdAt.toISOString(),
  updatedAt: task.updatedAt ? task.updatedAt.toISOString() : null,
  goalId: task.goalId,
});

class TasksService {
  async getTasks({ userId }: GetTasksParams): Promise<TaskResponse[]> {
    const tasks = await prisma.task.findMany({
      where: { userId },
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
      description?: string | null;
      goalId?: string | null;
    } = {};

    if (data.title !== undefined) {
      updateData.title = data.title;
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

import { prisma } from "../../lib/prisma.js";

type HttpError = Error & { status: number };

const createHttpError = (status: number, message: string): HttpError => {
  const error = new Error(message) as HttpError;
  error.status = status;
  return error;
};

export interface CreateGoalInput {
  title: string;
  description?: string | null;
}

export interface UpdateGoalInput {
  title?: string;
  description?: string | null;
  tasksIds?: string[];
}

export interface GetGoalsParams {
  userId: string;
}

export interface GetGoalsByIdParams {
  userId: string;
  id: string;
}

export interface CreateGoalParams {
  userId: string;
  data: CreateGoalInput;
}

export interface UpdateGoalParams {
  userId: string;
  id: string;
  data: UpdateGoalInput;
}

interface GoalRecord {
  id: string;
  title: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface GoalResponse {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string | null;
}

const goalSelect = {
  id: true,
  title: true,
  description: true,
  createdAt: true,
  updatedAt: true,
} as const;

const toGoalResponse = (goal: GoalRecord): GoalResponse => ({
  id: goal.id,
  title: goal.title,
  description: goal.description,
  createdAt: goal.createdAt.toISOString(),
  updatedAt: goal.updatedAt ? goal.updatedAt.toISOString() : null,
});

// TODO: Add Tasks into results of getGoalsById and updateGoal

class GoalsService {
  async getGoals({ userId }: GetGoalsParams): Promise<GoalResponse[]> {
    const goals = await prisma.goal.findMany({
      where: { userId },
      select: goalSelect,
    });

    return goals.map(toGoalResponse);
  }

  async getGoalsById({
    userId,
    id,
  }: GetGoalsByIdParams): Promise<GoalResponse> {
    const goal = await prisma.goal.findFirst({
      where: { id, userId },
      select: goalSelect,
    });

    if (!goal) {
      throw createHttpError(404, "Goal not found");
    }

    return toGoalResponse(goal);
  }

  async createGoal({ userId, data }: CreateGoalParams): Promise<GoalResponse> {
    const goal = await prisma.goal.create({
      data: {
        title: data.title,
        description: data.description,
        user: {
          connect: { id: userId },
        },
      },
      select: goalSelect,
    });

    return toGoalResponse(goal);
  }

  async updateGoal({
    userId,
    id,
    data,
  }: UpdateGoalParams): Promise<GoalResponse> {
    const goal = await prisma.goal.findFirst({
      where: { id, userId },
      select: {
        id: true,
        tasks: {
          select: { id: true },
        },
      },
    });

    if (!goal) {
      throw createHttpError(404, "Goal not found");
    }

    const updateData: {
      title?: string;
      description?: string | null;
    } = {};

    if (data.title !== undefined) {
      updateData.title = data.title;
    }

    if (data.description !== undefined) {
      updateData.description = data.description;
    }

    if (data.tasksIds !== undefined) {
      const desiredTaskIds = Array.from(new Set(data.tasksIds));

      const desiredTasks = await prisma.task.findMany({
        where: {
          id: { in: desiredTaskIds },
          userId,
        },
        select: { id: true },
      });

      if (desiredTasks.length !== desiredTaskIds.length) {
        throw createHttpError(404, "One or more tasks not found");
      }

      const currentIds = new Set(
        goal.tasks.map((task: { id: string }) => task.id),
      );
      const desiredIds = new Set(desiredTaskIds);

      const connectTaskIds = desiredTaskIds.filter(
        (taskId) => !currentIds.has(taskId),
      );

      const disconnectTaskIds = goal.tasks
        .map((task: { id: string }) => task.id)
        .filter((taskId: string) => !desiredIds.has(taskId));

      if (connectTaskIds.length > 0) {
        const connectResult = await prisma.task.updateMany({
          where: {
            id: { in: connectTaskIds },
            userId,
          },
          data: {
            goalId: id,
          },
        });

        if (connectResult.count !== connectTaskIds.length) {
          throw createHttpError(404, "Goal not found");
        }
      }

      if (disconnectTaskIds.length > 0) {
        const disconnectResult = await prisma.task.updateMany({
          where: {
            id: { in: disconnectTaskIds },
            userId,
            goalId: id,
          },
          data: {
            goalId: null,
          },
        });

        if (disconnectResult.count !== disconnectTaskIds.length) {
          throw createHttpError(404, "Goal not found");
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      const unchangedGoal = await prisma.goal.findFirst({
        where: { id, userId },
        select: goalSelect,
      });

      if (!unchangedGoal) {
        throw createHttpError(404, "Goal not found");
      }

      return toGoalResponse(unchangedGoal);
    }

    if (Object.keys(updateData).length > 0) {
      const updateResult = await prisma.goal.updateMany({
        where: { id, userId },
        data: updateData,
      });

      if (updateResult.count === 0) {
        throw createHttpError(404, "Goal not found");
      }
    }

    const updatedGoal = await prisma.goal.findFirst({
      where: { id, userId },
      select: goalSelect,
    });

    if (!updatedGoal) {
      throw createHttpError(404, "Goal not found");
    }

    return toGoalResponse(updatedGoal);
  }
}

export const goalsService = new GoalsService();

import { prisma } from "../../lib/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { parseDueAt } from "../../helpers/date.js";
import { createHttpError } from "../../helpers/http.js";
import { GoalStatus } from "./goals.types.js";
import type {
  CreateGoalParams,
  GoalDetailResponse,
  GoalLinkedTaskResponse,
  GetGoalsByIdParams,
  GetGoalsParams,
  GetGoalsProgressByIdsParams,
  GoalProgress,
  GoalRecord,
  GoalResponse,
  SyncGoalsStatusParams,
  UpdateGoalParams,
} from "./goals.types.js";

// TODO: change the service to build up data from one shot queries for now
// in order to reduce maintenance hell in the beginning

const uniqueGoalIds = (goalIds: string[]): string[] =>
  Array.from(new Set(goalIds.filter(Boolean)));

export const deriveGoalStatus = (
  totalTasks: number,
  completedTasks: number,
): GoalStatus => {
  if (totalTasks === 0) {
    return GoalStatus.Todo;
  }

  if (completedTasks === totalTasks) {
    return GoalStatus.Done;
  }

  return GoalStatus.InProgress;
};

export const getProgressPercentage = (
  completedTasks: number,
  totalTasks: number,
): number => {
  if (totalTasks === 0) {
    return 0;
  }

  return Math.ceil((completedTasks / totalTasks) * 100);
};

export const getGoalsProgressByIds = async ({
  db,
  userId,
  goalIds,
}: GetGoalsProgressByIdsParams): Promise<Map<string, GoalProgress>> => {
  // TODO: change the getGoals query to include all tasks properly with {select} object and aggregate the data there
  // This is to reduce multiple db round trips
  const ids = uniqueGoalIds(goalIds);
  const progressMap = new Map<string, GoalProgress>();

  if (ids.length === 0) {
    return progressMap;
  }

  const groupedTaskCounts = await db.task.groupBy({
    by: ["goalId", "status"],
    where: {
      userId,
      goalId: {
        in: ids,
      },
    },
    _count: {
      _all: true,
    },
  });

  const countsByGoalId = new Map<
    string,
    { totalTasks: number; completedTasks: number }
  >();

  for (const goalId of ids) {
    countsByGoalId.set(goalId, {
      totalTasks: 0,
      completedTasks: 0,
    });
  }

  for (const groupedTaskCount of groupedTaskCounts) {
    if (!groupedTaskCount.goalId) {
      continue;
    }

    const currentCounts = countsByGoalId.get(groupedTaskCount.goalId);
    if (!currentCounts) {
      continue;
    }

    currentCounts.totalTasks += groupedTaskCount._count._all;

    if (groupedTaskCount.status === GoalStatus.Done) {
      currentCounts.completedTasks += groupedTaskCount._count._all;
    }
  }

  for (const [goalId, counts] of countsByGoalId.entries()) {
    progressMap.set(goalId, {
      status: deriveGoalStatus(counts.totalTasks, counts.completedTasks),
      totalTasks: counts.totalTasks,
      completedTasks: counts.completedTasks,
      progressPercentage: getProgressPercentage(
        counts.completedTasks,
        counts.totalTasks,
      ),
    });
  }

  return progressMap;
};

export const syncGoalsStatus = async ({
  db,
  userId,
  goalIds,
}: SyncGoalsStatusParams): Promise<void> => {
  const goalsProgress = await getGoalsProgressByIds({
    db,
    userId,
    goalIds,
  });

  const goalIdsByStatus: Record<GoalStatus, string[]> = {
    [GoalStatus.Todo]: [],
    [GoalStatus.InProgress]: [],
    [GoalStatus.Done]: [],
  };

  for (const [goalId, goalProgress] of goalsProgress.entries()) {
    goalIdsByStatus[goalProgress.status].push(goalId);
  }

  const now = new Date();
  const updatePromises: Promise<unknown>[] = [];

  if (goalIdsByStatus[GoalStatus.Todo].length > 0) {
    updatePromises.push(
      db.goal.updateMany({
        where: {
          userId,
          id: {
            in: goalIdsByStatus[GoalStatus.Todo],
          },
          OR: [
            { status: { not: GoalStatus.Todo } },
            { completedAt: { not: null } },
          ],
        },
        data: {
          status: GoalStatus.Todo,
          completedAt: null,
        },
      }),
    );
  }

  if (goalIdsByStatus[GoalStatus.InProgress].length > 0) {
    updatePromises.push(
      db.goal.updateMany({
        where: {
          userId,
          id: {
            in: goalIdsByStatus[GoalStatus.InProgress],
          },
          OR: [
            { status: { not: GoalStatus.InProgress } },
            { completedAt: { not: null } },
          ],
        },
        data: {
          status: GoalStatus.InProgress,
          completedAt: null,
        },
      }),
    );
  }

  if (goalIdsByStatus[GoalStatus.Done].length > 0) {
    updatePromises.push(
      db.goal.updateMany({
        where: {
          userId,
          id: {
            in: goalIdsByStatus[GoalStatus.Done],
          },
          OR: [{ status: { not: GoalStatus.Done } }, { completedAt: null }],
        },
        data: {
          status: GoalStatus.Done,
          completedAt: now,
        },
      }),
    );
  }

  await Promise.all(updatePromises);
};

const goalSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  completedAt: true,
  dueAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

type GoalLinkedTaskRecord = {
  id: string;
  title: string;
  description: string | null;
  status: "TODO" | "DONE";
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
  dueAt: Date;
  goalId: string | null;
};

const goalLinkedTaskSelect = {
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

type GoalDetailRecord = GoalRecord & {
  tasks: GoalLinkedTaskRecord[];
};

const goalDetailSelect = {
  ...goalSelect,
  tasks: {
    select: goalLinkedTaskSelect,
    orderBy: [
      { status: "asc" },
      { dueAt: "asc" },
      { createdAt: "asc" },
      { id: "asc" },
    ],
  },
} satisfies Prisma.GoalSelect;

const toGoalResponse = (
  goal: GoalRecord,
  goalProgress?: GoalProgress,
): GoalResponse => ({
  id: goal.id,
  title: goal.title,
  description: goal.description,
  status: goal.status,
  completedTasks: goalProgress?.completedTasks ?? 0,
  totalTasks: goalProgress?.totalTasks ?? 0,
  progressPercentage: goalProgress?.progressPercentage ?? 0,
  completedAt: goal.completedAt ? goal.completedAt.toISOString() : null,
  dueAt: goal.dueAt.toISOString(),
  createdAt: goal.createdAt.toISOString(),
  updatedAt: goal.updatedAt ? goal.updatedAt.toISOString() : null,
});

const toGoalLinkedTaskResponse = (
  task: GoalLinkedTaskRecord,
): GoalLinkedTaskResponse => ({
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

class GoalsService {
  async getGoals({ userId, status }: GetGoalsParams): Promise<GoalResponse[]> {
    const goals = await prisma.goal.findMany({
      where: { userId, status },
      select: goalSelect,
    });

    const goalsProgress = await getGoalsProgressByIds({
      db: prisma,
      userId,
      goalIds: goals.map((goal) => goal.id),
    });

    return goals.map((goal) =>
      toGoalResponse(goal, goalsProgress.get(goal.id)),
    );
  }

  async getGoalsById({
    userId,
    id,
  }: GetGoalsByIdParams): Promise<GoalDetailResponse> {
    const goal = await prisma.goal.findFirst({
      where: { id, userId },
      select: goalDetailSelect,
    });

    if (!goal) {
      throw createHttpError(404, "Goal not found");
    }

    const goalDetail = goal as GoalDetailRecord;
    const totalTasks = goalDetail.tasks.length;
    const completedTasks = goalDetail.tasks.filter(
      (task) => task.status === GoalStatus.Done,
    ).length;
    const progressPercentage = getProgressPercentage(
      completedTasks,
      totalTasks,
    );

    return {
      id: goalDetail.id,
      title: goalDetail.title,
      description: goalDetail.description,
      status: goalDetail.status,
      completedTasks,
      totalTasks,
      progressPercentage,
      completedAt: goalDetail.completedAt
        ? goalDetail.completedAt.toISOString()
        : null,
      dueAt: goalDetail.dueAt.toISOString(),
      createdAt: goalDetail.createdAt.toISOString(),
      updatedAt: goalDetail.updatedAt
        ? goalDetail.updatedAt.toISOString()
        : null,
      tasks: goalDetail.tasks.map(toGoalLinkedTaskResponse),
    };
  }

  async createGoal({ userId, data }: CreateGoalParams): Promise<GoalResponse> {
    const parsedDueAt = parseDueAt(data.dueAt);

    const goal = await prisma.goal.create({
      data: {
        title: data.title,
        dueAt: parsedDueAt,
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
    return prisma.$transaction(async (tx) => {
      const goal = await tx.goal.findFirst({
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
        dueAt?: Date;
        description?: string | null;
      } = {};

      if (data.title !== undefined) {
        updateData.title = data.title;
      }

      if (data.description !== undefined) {
        updateData.description = data.description;
      }

      if (data.dueAt !== undefined) {
        updateData.dueAt = parseDueAt(data.dueAt);
      }

      if (data.tasksIds !== undefined) {
        const desiredTaskIds = Array.from(new Set(data.tasksIds));
        const affectedGoalIds = new Set<string>([id]);

        const desiredTasks = await tx.task.findMany({
          where: {
            id: { in: desiredTaskIds },
            userId,
          },
          select: { id: true, goalId: true },
        });

        if (desiredTasks.length !== desiredTaskIds.length) {
          throw createHttpError(404, "One or more tasks not found");
        }

        for (const desiredTask of desiredTasks) {
          if (desiredTask.goalId && desiredTask.goalId !== id) {
            affectedGoalIds.add(desiredTask.goalId);
          }
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
          const connectResult = await tx.task.updateMany({
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
          const disconnectResult = await tx.task.updateMany({
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

        await syncGoalsStatus({
          db: tx,
          userId,
          goalIds: Array.from(affectedGoalIds),
        });
      }

      if (Object.keys(updateData).length > 0) {
        const updateResult = await tx.goal.updateMany({
          where: { id, userId },
          data: updateData,
        });

        if (updateResult.count === 0) {
          throw createHttpError(404, "Goal not found");
        }
      }

      const updatedGoal = await tx.goal.findFirst({
        where: { id, userId },
        select: goalSelect,
      });

      if (!updatedGoal) {
        throw createHttpError(404, "Goal not found");
      }

      const goalsProgress = await getGoalsProgressByIds({
        db: tx,
        userId,
        goalIds: [updatedGoal.id],
      });

      return toGoalResponse(updatedGoal, goalsProgress.get(updatedGoal.id));
    });
  }
}

export const goalsService = new GoalsService();

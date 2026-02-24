import type { Prisma, PrismaClient } from "../../generated/prisma/client.js";

export const GoalStatus = {
  Todo: "TODO",
  InProgress: "INPROGRESS",
  Done: "DONE",
} as const;

export type GoalStatus = (typeof GoalStatus)[keyof typeof GoalStatus];

export interface GoalProgress {
  status: GoalStatus;
  totalTasks: number;
  completedTasks: number;
  progressPercentage: number;
}

export interface GetGoalsProgressByIdsParams {
  db: PrismaClient | Prisma.TransactionClient;
  userId: string;
  goalIds: string[];
}

export interface SyncGoalsStatusParams {
  db: PrismaClient | Prisma.TransactionClient;
  userId: string;
  goalIds: string[];
}

export interface CreateGoalInput {
  title: string;
  dueAt: string;
  description?: string | null;
}

export interface UpdateGoalInput {
  title?: string;
  dueAt?: string;
  description?: string | null;
  tasksIds?: string[];
}

export interface GetGoalsParams {
  userId: string;
  status?: GoalStatus;
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

export interface GoalRecord {
  id: string;
  title: string;
  description: string | null;
  status: GoalStatus;
  completedAt: Date | null;
  dueAt: Date;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface GoalResponse {
  id: string;
  title: string;
  description: string | null;
  status: GoalStatus;
  completedTasks: number;
  totalTasks: number;
  progressPercentage: number;
  completedAt: string | null;
  dueAt: string;
  createdAt: string;
  updatedAt: string | null;
}

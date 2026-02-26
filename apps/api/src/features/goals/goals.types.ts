import type { Prisma, PrismaClient } from "../../generated/prisma/client.js";
import type { GoalStatus as PrismaGoalStatus } from "../../generated/prisma/client.js";
import type { TaskStatus } from "../tasks/tasks.types.js";

/** Goal lifecycle status. */
export enum GoalStatus {
  Todo = "TODO",
  InProgress = "INPROGRESS",
  Done = "DONE",
}

/** Goal ordering strategy for list endpoints. */
export enum GoalOrder {
  Recent = "Recent",
  Relevant = "Relevant",
}

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
  order?: GoalOrder;
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
  status: PrismaGoalStatus;
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

export interface GoalLinkedTaskResponse {
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

export interface GoalDetailResponse extends GoalResponse {
  tasks: GoalLinkedTaskResponse[];
}

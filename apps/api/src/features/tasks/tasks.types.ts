import type { TaskStatus as PrismaTaskStatus } from "../../generated/prisma/client.js";

/** Task lifecycle status. */
export enum TaskStatus {
  Todo = "TODO",
  Done = "DONE",
}

/** Task ordering strategy for list endpoints. */
export enum TaskOrder {
  Recent = "Recent",
  Relevant = "Relevant",
}

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
  order?: TaskOrder;
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

export interface TaskRecord {
  id: string;
  title: string;
  description: string | null;
  status: PrismaTaskStatus;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
  dueAt: Date;
  goalId: string | null;
}

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

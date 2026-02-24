export const TaskStatus = {
  Todo: "TODO",
  Done: "DONE",
} as const;

export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

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

export interface TaskRecord {
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

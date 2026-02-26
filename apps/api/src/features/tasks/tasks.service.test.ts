import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../../lib/prisma.js";
import { tasksService } from "./tasks.service.js";
import { TaskOrder, TaskStatus } from "./tasks.types.js";

describe("tasksService.getTasks ordering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses Recent ordering by default", async () => {
    const findManyTaskSpy = vi
      .spyOn(prisma.task, "findMany")
      .mockResolvedValue([]);

    await tasksService.getTasks({
      userId: "user-1",
      status: TaskStatus.Todo,
    });

    expect(findManyTaskSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1", status: TaskStatus.Todo },
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      }),
    );
  });

  it("uses Relevant ordering when requested", async () => {
    const findManyTaskSpy = vi
      .spyOn(prisma.task, "findMany")
      .mockResolvedValue([]);

    await tasksService.getTasks({
      userId: "user-1",
      status: TaskStatus.Todo,
      order: TaskOrder.Relevant,
    });

    expect(findManyTaskSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1", status: TaskStatus.Todo },
        orderBy: [{ dueAt: "asc" }, { id: "asc" }],
      }),
    );
  });
});

describe("tasksService.getTasks status filtering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("applies status filter when status is provided", async () => {
    const findManyTaskSpy = vi
      .spyOn(prisma.task, "findMany")
      .mockResolvedValue([]);

    await tasksService.getTasks({
      userId: "user-1",
      status: TaskStatus.Todo,
    });

    expect(findManyTaskSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1", status: TaskStatus.Todo },
      }),
    );
  });

  it("does not force a specific status when status is omitted", async () => {
    const findManyTaskSpy = vi
      .spyOn(prisma.task, "findMany")
      .mockResolvedValue([]);

    await tasksService.getTasks({
      userId: "user-1",
    });

    expect(findManyTaskSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1", status: undefined },
      }),
    );
  });
});

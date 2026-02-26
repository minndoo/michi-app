import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../../../lib/prisma.js";
import { goalsService, syncGoalsStatus } from "../goals.service.js";
import { GoalStatus } from "../goals.types.js";

type GroupedTaskCount = {
  goalId: string | null;
  status: (typeof GoalStatus)[keyof typeof GoalStatus];
  _count: {
    _all: number;
  };
};

const createDb = (groupedTaskCounts: GroupedTaskCount[]) => {
  const groupBy = vi.fn().mockResolvedValue(groupedTaskCounts);
  const updateMany = vi.fn().mockResolvedValue({ count: 1 });

  return {
    db: {
      task: { groupBy },
      goal: { updateMany },
    },
    groupBy,
    updateMany,
  };
};

describe("syncGoalsStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets completedAt when goal transitions to DONE", async () => {
    const { db, updateMany } = createDb([
      { goalId: "goal-1", status: GoalStatus.Done, _count: { _all: 2 } },
    ]);

    await syncGoalsStatus({
      db: db as never,
      userId: "user-1",
      goalIds: ["goal-1"],
    });

    expect(updateMany).toHaveBeenCalledTimes(1);
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        id: { in: ["goal-1"] },
        OR: [{ status: { not: GoalStatus.Done } }, { completedAt: null }],
      },
      data: {
        status: GoalStatus.Done,
        completedAt: expect.any(Date),
      },
    });
  });

  it("clears completedAt when goal transitions out of DONE", async () => {
    const { db, updateMany } = createDb([
      { goalId: "goal-1", status: GoalStatus.Done, _count: { _all: 1 } },
      { goalId: "goal-1", status: GoalStatus.Todo, _count: { _all: 1 } },
    ]);

    await syncGoalsStatus({
      db: db as never,
      userId: "user-1",
      goalIds: ["goal-1"],
    });

    expect(updateMany).toHaveBeenCalledTimes(1);
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        id: { in: ["goal-1"] },
        OR: [
          { status: { not: GoalStatus.InProgress } },
          { completedAt: { not: null } },
        ],
      },
      data: {
        status: GoalStatus.InProgress,
        completedAt: null,
      },
    });
  });

  it("clears completedAt for goals with no tasks (TODO)", async () => {
    const { db, updateMany } = createDb([]);

    await syncGoalsStatus({
      db: db as never,
      userId: "user-1",
      goalIds: ["goal-1"],
    });

    expect(updateMany).toHaveBeenCalledTimes(1);
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        id: { in: ["goal-1"] },
        OR: [
          { status: { not: GoalStatus.Todo } },
          { completedAt: { not: null } },
        ],
      },
      data: {
        status: GoalStatus.Todo,
        completedAt: null,
      },
    });
  });

  it("updates all status groups in one sync", async () => {
    const { db, updateMany } = createDb([
      { goalId: "goal-done", status: GoalStatus.Done, _count: { _all: 2 } },
      { goalId: "goal-progress", status: GoalStatus.Done, _count: { _all: 1 } },
      { goalId: "goal-progress", status: GoalStatus.Todo, _count: { _all: 1 } },
    ]);

    await syncGoalsStatus({
      db: db as never,
      userId: "user-1",
      goalIds: ["goal-done", "goal-progress", "goal-todo"],
    });

    expect(updateMany).toHaveBeenCalledTimes(3);

    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { in: ["goal-todo"] },
        }),
        data: {
          status: GoalStatus.Todo,
          completedAt: null,
        },
      }),
    );

    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { in: ["goal-progress"] },
        }),
        data: {
          status: GoalStatus.InProgress,
          completedAt: null,
        },
      }),
    );

    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { in: ["goal-done"] },
        }),
        data: {
          status: GoalStatus.Done,
          completedAt: expect.any(Date),
        },
      }),
    );
  });

  it("skips updates when no goal IDs are provided", async () => {
    const { db, groupBy, updateMany } = createDb([
      { goalId: "goal-1", status: GoalStatus.Done, _count: { _all: 1 } },
    ]);

    await syncGoalsStatus({
      db: db as never,
      userId: "user-1",
      goalIds: [],
    });

    expect(groupBy).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
  });
});

describe("goalsService.getGoalsById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns goal detail from a single goal query and computes progress from linked tasks", async () => {
    const findFirstGoalSpy = vi
      .spyOn(prisma.goal, "findFirst")
      .mockResolvedValue({
        id: "goal-1",
        title: "Weekly Cardio",
        description: "Cardio work",
        status: GoalStatus.InProgress,
        completedAt: null,
        dueAt: new Date("2026-02-20T00:00:00.000Z"),
        createdAt: new Date("2026-02-01T00:00:00.000Z"),
        updatedAt: new Date("2026-02-10T00:00:00.000Z"),
        tasks: [
          {
            id: "task-2",
            title: "Morning Run",
            description: null,
            status: "TODO",
            completedAt: null,
            createdAt: new Date("2026-02-01T00:00:00.000Z"),
            updatedAt: null,
            dueAt: new Date("2026-02-18T00:00:00.000Z"),
            goalId: "goal-1",
          },
          {
            id: "task-1",
            title: "HIIT Session",
            description: null,
            status: "DONE",
            completedAt: new Date("2026-02-15T00:00:00.000Z"),
            createdAt: new Date("2026-02-02T00:00:00.000Z"),
            updatedAt: null,
            dueAt: new Date("2026-02-16T00:00:00.000Z"),
            goalId: "goal-1",
          },
        ],
      } as never);

    const groupBySpy = vi.spyOn(prisma.task, "groupBy");
    const findManyTaskSpy = vi.spyOn(prisma.task, "findMany");

    const result = await goalsService.getGoalsById({
      userId: "user-1",
      id: "goal-1",
    });

    expect(findFirstGoalSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "goal-1", userId: "user-1" },
      }),
    );
    expect(groupBySpy).not.toHaveBeenCalled();
    expect(findManyTaskSpy).not.toHaveBeenCalled();

    expect(result.completedTasks).toBe(1);
    expect(result.totalTasks).toBe(2);
    expect(result.progressPercentage).toBe(50);
    expect(result.tasks).toHaveLength(2);
    expect(result.tasks[0]?.id).toBe("task-2");
    expect(result.tasks[1]?.id).toBe("task-1");
  });

  it("throws 404 when goal does not exist", async () => {
    vi.spyOn(prisma.goal, "findFirst").mockResolvedValue(null);

    await expect(
      goalsService.getGoalsById({
        userId: "user-1",
        id: "missing-goal",
      }),
    ).rejects.toThrow("Goal not found");
  });
});

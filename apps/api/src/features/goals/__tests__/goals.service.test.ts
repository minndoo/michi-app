import { beforeEach, describe, expect, it, vi } from "vitest";
import { syncGoalsStatus } from "../goals.service.js";
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

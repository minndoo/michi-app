import { prisma } from "./lib/prisma.js";

const GOAL_WORDS = [
  "Fitness",
  "Reading",
  "Meditation",
  "Career",
  "Learning",
  "Budget",
  "Nutrition",
  "Sleep",
  "Coding",
  "Language",
  "Focus",
  "Wellness",
  "Planning",
  "Project",
  "Growth",
];

const TASK_WORDS = [
  "Review",
  "Plan",
  "Practice",
  "Complete",
  "Organize",
  "Write",
  "Build",
  "Refine",
  "Study",
  "Track",
  "Prepare",
  "Update",
  "Document",
  "Improve",
  "Execute",
];

const DESCRIPTION_WORDS = [
  "daily",
  "weekly",
  "priority",
  "milestone",
  "progress",
  "routine",
  "session",
  "target",
  "checklist",
  "momentum",
  "quality",
  "focus",
  "delivery",
  "result",
  "consistency",
];

const randomItem = <T>(items: T[]): T =>
  items[Math.floor(Math.random() * items.length)] as T;

const randomDescription = (): string => {
  const words = [
    randomItem(DESCRIPTION_WORDS),
    randomItem(DESCRIPTION_WORDS),
    randomItem(DESCRIPTION_WORDS),
  ];

  return `A ${words[0]} ${words[1]} ${words[2]} step.`;
};

const randomGoalTitle = (index: number): string =>
  `${randomItem(GOAL_WORDS)} Goal ${index + 1}`;

const randomTaskTitle = (index: number): string =>
  `${randomItem(TASK_WORDS)} Task ${index + 1}`;

const maybeGoalId = (goalIds: string[]): string | null => {
  if (goalIds.length === 0) {
    return null;
  }

  return Math.random() < 0.7 ? randomItem(goalIds) : null;
};

const seed = async () => {
  const users = await prisma.user.findMany({
    select: { id: true },
  });

  if (users.length === 0) {
    console.log("No users found. Nothing to seed.");
    return;
  }

  for (const user of users) {
    const goalIds: string[] = [];

    for (let i = 0; i < 20; i += 1) {
      const goal = await prisma.goal.create({
        data: {
          userId: user.id,
          title: randomGoalTitle(i),
          description: randomDescription(),
        },
        select: { id: true },
      });

      goalIds.push(goal.id);
    }

    const tasksData = Array.from({ length: 20 }, (_, index) => ({
      userId: user.id,
      title: randomTaskTitle(index),
      description: randomDescription(),
      completed: Math.random() < 0.3,
      goalId: maybeGoalId(goalIds),
    }));

    await prisma.task.createMany({
      data: tasksData,
    });
  }

  console.log(`Seeded 20 goals and 20 tasks for ${users.length} user(s).`);
};

seed()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

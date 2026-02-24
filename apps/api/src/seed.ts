import { prisma } from "./lib/prisma.js";
import type { TaskStatus } from "./generated/prisma/client.js";
import { syncGoalsStatus } from "./features/goals/goals.service.js";

const GOALS_PER_USER = 10;
const MAX_TASKS_PER_GOAL = 10;

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

const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

interface SeedUser {
  id: string;
}

interface SeedTaskInput {
  userId: string;
  goalId: string;
  title: string;
  description: string;
  status: TaskStatus;
  completedAt: Date | null;
}

interface SyncedUserInput {
  auth0Id: string;
  name: string;
  email: string | null;
}

interface Auth0User {
  user_id?: unknown;
  name?: unknown;
  nickname?: unknown;
  email?: unknown;
}

type Auth0UsersResponse =
  | Auth0User[]
  | {
      users?: unknown;
    };

const getNonEmptyEnv = (name: string): string | null => {
  const value = process.env[name];
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const getAuth0ManagementToken = async (
  domain: string,
): Promise<string | null> => {
  const staticToken = getNonEmptyEnv("AUTH0_MANAGEMENT_API_TOKEN");
  if (staticToken) {
    return staticToken;
  }

  const clientId = getNonEmptyEnv("AUTH0_M2M_CLIENT_ID");
  const clientSecret = getNonEmptyEnv("AUTH0_M2M_CLIENT_SECRET");
  const audience =
    getNonEmptyEnv("AUTH0_MANAGEMENT_API_AUDIENCE") ??
    `https://${domain}/api/v2/`;

  if (!clientId && !clientSecret) {
    return null;
  }

  if (!clientId || !clientSecret) {
    throw new Error(
      "Both AUTH0_M2M_CLIENT_ID and AUTH0_M2M_CLIENT_SECRET are required",
    );
  }

  const tokenResponse = await fetch(`https://${domain}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      audience,
    }),
  });

  if (!tokenResponse.ok) {
    const responseText = await tokenResponse.text();
    throw new Error(
      `Failed to obtain Auth0 management token (${tokenResponse.status}): ${responseText}`,
    );
  }

  const tokenPayload = (await tokenResponse.json()) as {
    access_token?: unknown;
  };

  if (typeof tokenPayload.access_token !== "string") {
    throw new Error("Auth0 token response is missing access_token");
  }

  return tokenPayload.access_token;
};

const getAuth0Users = async (
  domain: string,
  token: string,
): Promise<Auth0User[]> => {
  const perPage = 50;
  let page = 0;
  const users: Auth0User[] = [];

  while (true) {
    const usersUrl = new URL(`https://${domain}/api/v2/users`);
    usersUrl.searchParams.set("page", String(page));
    usersUrl.searchParams.set("per_page", String(perPage));
    usersUrl.searchParams.set("include_totals", "true");
    usersUrl.searchParams.set("fields", "user_id,name,nickname,email");

    const response = await fetch(usersUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(
        `Failed to fetch Auth0 users (${response.status}): ${responseText}`,
      );
    }

    const payload = (await response.json()) as Auth0UsersResponse;
    const pageUsers = Array.isArray(payload)
      ? payload
      : Array.isArray(payload.users)
        ? (payload.users as Auth0User[])
        : [];

    users.push(...pageUsers);

    if (pageUsers.length < perPage) {
      break;
    }

    page += 1;
  }

  return users;
};

const toSyncedUserInput = (user: Auth0User): SyncedUserInput | null => {
  const auth0Id = typeof user.user_id === "string" ? user.user_id.trim() : "";
  if (auth0Id.length === 0) {
    return null;
  }

  const name =
    (typeof user.name === "string" ? user.name.trim() : "") ||
    (typeof user.nickname === "string" ? user.nickname.trim() : "") ||
    "Unknown User";

  const email =
    typeof user.email === "string" && user.email.trim().length > 0
      ? user.email.trim()
      : null;

  return {
    auth0Id,
    name,
    email,
  };
};

const getSeedUsers = async (): Promise<SeedUser[]> => {
  const domain = getNonEmptyEnv("AUTH0_DOMAIN");
  if (!domain) {
    return prisma.user.findMany({
      select: { id: true },
    });
  }

  const managementToken = await getAuth0ManagementToken(domain);
  if (!managementToken) {
    return prisma.user.findMany({
      select: { id: true },
    });
  }

  const auth0Users = await getAuth0Users(domain, managementToken);
  const upsertedUsers: SeedUser[] = [];

  for (const auth0User of auth0Users) {
    const syncedUser = toSyncedUserInput(auth0User);
    if (!syncedUser) {
      continue;
    }

    const user = await prisma.user.upsert({
      where: { auth0Id: syncedUser.auth0Id },
      create: {
        auth0Id: syncedUser.auth0Id,
        name: syncedUser.name,
        email: syncedUser.email,
      },
      update: {
        name: syncedUser.name,
        email: syncedUser.email,
      },
      select: { id: true },
    });

    upsertedUsers.push(user);
  }

  return upsertedUsers;
};

const seed = async () => {
  const users = await getSeedUsers();

  if (users.length === 0) {
    console.log("No users found. Nothing to seed.");
    return;
  }

  let totalGoals = 0;
  let totalTasks = 0;

  for (const user of users) {
    const goalIdsWithSeededTasks = new Set<string>();

    for (let i = 0; i < GOALS_PER_USER; i += 1) {
      const goal = await prisma.goal.create({
        data: {
          userId: user.id,
          title: randomGoalTitle(i),
          description: randomDescription(),
        },
        select: { id: true },
      });
      totalGoals += 1;

      const tasksCount = randomInt(0, MAX_TASKS_PER_GOAL);
      if (tasksCount === 0) {
        continue;
      }

      const tasksData: SeedTaskInput[] = Array.from(
        { length: tasksCount },
        (_, taskIndex) => {
          const status: TaskStatus = Math.random() < 0.3 ? "DONE" : "TODO";
          return {
            userId: user.id,
            goalId: goal.id,
            title: randomTaskTitle(taskIndex),
            description: randomDescription(),
            status,
            completedAt: status === "DONE" ? new Date() : null,
          };
        },
      );

      await prisma.task.createMany({
        data: tasksData,
      });

      goalIdsWithSeededTasks.add(goal.id);
      totalTasks += tasksData.length;
    }

    await syncGoalsStatus({
      db: prisma,
      userId: user.id,
      goalIds: Array.from(goalIdsWithSeededTasks),
    });
  }

  console.log(
    `Seeded ${totalGoals} goals and ${totalTasks} tasks for ${users.length} user(s).`,
  );
};

seed()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

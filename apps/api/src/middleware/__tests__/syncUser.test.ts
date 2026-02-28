import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { prisma } from "../../lib/prisma.js";
import { ensureUserExists } from "../syncUser.js";

const mockedFindUnique = vi.mocked(prisma.user.findUnique);
const mockedCreate = vi.mocked(prisma.user.create);

const createReq = (payload?: Record<string, unknown>) =>
  ({
    auth: payload ? { payload } : undefined,
  }) as unknown as Request;

const createRes = () => ({}) as Response;

describe("ensureUserExists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips sync when sub is missing", async () => {
    const req = createReq({});
    const next = vi.fn();

    await ensureUserExists(req, createRes(), next);

    expect(mockedFindUnique).not.toHaveBeenCalled();
    expect(mockedCreate).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith();
  });

  it("attaches existing user and does not create new one", async () => {
    const req = createReq({
      sub: "auth0|123",
      name: "Standard Name",
      email: "user@example.com",
    });
    const next = vi.fn();
    const existingUser = {
      id: "u1",
      auth0Id: "auth0|123",
      name: "Existing Name",
      email: "existing@example.com",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockedFindUnique.mockResolvedValueOnce(existingUser);

    await ensureUserExists(req, createRes(), next);

    expect(mockedFindUnique).toHaveBeenCalledWith({
      where: { auth0Id: "auth0|123" },
    });
    expect(mockedCreate).not.toHaveBeenCalled();
    expect((req as Request & { user?: unknown }).user).toEqual(existingUser);
    expect(next).toHaveBeenCalledWith();
  });

  it("creates missing user with name and email from claims", async () => {
    const req = createReq({
      sub: "auth0|123",
      name: "Standard Name",
      email: "user@example.com",
    });
    const next = vi.fn();
    const createdUser = {
      id: "u1",
      auth0Id: "auth0|123",
      name: "Standard Name",
      email: "user@example.com",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockedFindUnique.mockResolvedValueOnce(null);
    mockedCreate.mockResolvedValueOnce(createdUser);

    await ensureUserExists(req, createRes(), next);

    expect(mockedCreate).toHaveBeenCalledWith({
      data: {
        auth0Id: "auth0|123",
        name: "Standard Name",
        email: "user@example.com",
      },
    });
    expect((req as Request & { user?: unknown }).user).toEqual(createdUser);
    expect(next).toHaveBeenCalledWith();
  });

  it("prefers namespaced name and falls back to nickname; normalizes empty email on create", async () => {
    const req = createReq({
      sub: "auth0|456",
      "https://michiapp.com/name": "Scoped Name",
      nickname: "Nick",
      email: "   ",
    });
    const next = vi.fn();

    mockedFindUnique.mockResolvedValueOnce(null);
    mockedCreate.mockResolvedValueOnce({
      id: "u2",
      auth0Id: "auth0|456",
      name: "Scoped Name",
      email: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await ensureUserExists(req, createRes(), next);

    expect(mockedCreate).toHaveBeenCalledWith({
      data: {
        auth0Id: "auth0|456",
        name: "Scoped Name",
        email: null,
      },
    });
    expect(next).toHaveBeenCalledWith();
  });

  it("uses nickname when standard names are missing", async () => {
    const req = createReq({
      sub: "auth0|789",
      nickname: "Nick Only",
    });
    const next = vi.fn();

    mockedFindUnique.mockResolvedValueOnce(null);
    mockedCreate.mockResolvedValueOnce({
      id: "u3",
      auth0Id: "auth0|789",
      name: "Nick Only",
      email: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await ensureUserExists(req, createRes(), next);

    expect(mockedCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Nick Only",
        }),
      }),
    );
  });

  it("passes errors to next", async () => {
    const req = createReq({ sub: "auth0|err" });
    const next = vi.fn();
    const error = new Error("db fail");

    mockedFindUnique.mockRejectedValueOnce(error);

    await ensureUserExists(req, createRes(), next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

import type { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma.js";

const USERNAME_CLAIM_NAMESPACE = "https://michiapp.com/name";

type Auth0Payload = Record<string, unknown>;

const getClaimString = (
  payload: Auth0Payload,
  claim: string,
): string | null => {
  const value = payload[claim];
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const getSyncedProfile = (payload: Auth0Payload) => {
  const auth0Id = getClaimString(payload, "sub");
  if (!auth0Id) {
    return null;
  }

  const name =
    getClaimString(payload, USERNAME_CLAIM_NAMESPACE) ??
    getClaimString(payload, "name") ??
    getClaimString(payload, "nickname") ??
    "Unknown User";

  const email = getClaimString(payload, "email");

  return {
    auth0Id,
    name,
    email,
  };
};

/**
 * Middleware to ensure authenticated users exist in the database
 * Creates users from Auth0 JWT payload only when missing
 */
export const ensureUserExists = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    // Auth0 JWT payload is attached by express-oauth2-jwt-bearer
    const auth0User = req.auth?.payload as Auth0Payload | undefined;

    if (!auth0User) {
      return next();
    }

    const syncedProfile = getSyncedProfile(auth0User);
    if (!syncedProfile) {
      return next();
    }

    const existingUser = await prisma.user.findUnique({
      where: { auth0Id: syncedProfile.auth0Id },
    });

    const user =
      existingUser ??
      (await prisma.user.create({
        data: {
          auth0Id: syncedProfile.auth0Id,
          name: syncedProfile.name,
          email: syncedProfile.email,
        },
      }));

    // Attach database user to request for downstream use
    (req as Request & { user: typeof user }).user = user;

    next();
  } catch (error) {
    console.error("Error syncing user:", error);
    next(error);
  }
};

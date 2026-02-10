import type { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma.js";

const USERNAME_CLAIM_NAMESPACE = "https://michiapp.com/name";

/**
 * Middleware to sync authenticated users from Auth0 to the database
 * Creates user if they don't exist, using Auth0 JWT payload
 */
export const syncUser = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    // Auth0 JWT payload is attached by express-oauth2-jwt-bearer
    const auth0User = req.auth?.payload;

    if (!auth0User?.sub) {
      return next();
    }

    // Extract user info from Auth0 token
    const auth0Id = auth0User.sub;
    const name =
      (auth0User[USERNAME_CLAIM_NAMESPACE] as string | undefined) ||
      "Unknown User";

    // Check if user exists, create if not
    let user = await prisma.user.findUnique({
      where: { auth0Id },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          auth0Id,
          name,
        },
      });
    }

    // Attach database user to request for downstream use
    (req as Request & { user: typeof user }).user = user;

    next();
  } catch (error) {
    console.error("Error syncing user:", error);
    next(error);
  }
};

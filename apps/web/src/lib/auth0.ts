import { Auth0Client } from "@auth0/nextjs-auth0/server";

if (!process.env.AUTH0_AUDIENCE) {
  throw new Error("AUTH0_AUDIENCE environment variable is required");
}

export const auth0 = new Auth0Client({
  authorizationParameters: {
    audience: process.env.AUTH0_AUDIENCE,
    scope: "openid profile email offline_access",
  },
});

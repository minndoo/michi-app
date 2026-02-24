# API

<!-- TODO: adapt this readme to actual project setup -->

Express + TypeScript API server with Auth0 authentication for the Michi App monorepo.

## Getting Started

1. Install dependencies from the root:

```bash
bun install
```

2. Copy the environment file:

```bash
cp .env.example .env
```

3. Configure Auth0:

- Update `AUTH0_DOMAIN` with your Auth0 tenant domain
- Update `AUTH0_AUDIENCE` with your API identifier
- Create an API in Auth0 Dashboard with the matching identifier

4. Run the development server:

```bash
bun dev
```

The server will start on `http://localhost:3001` by default.

OpenAPI spec endpoints:

- `http://localhost:3001/swagger.json` (raw JSON for codegen)
- `http://localhost:3001/docs` (Swagger UI)

## Available Scripts

- `bun dev` - Start development server with hot reload
- `bun build` - Build for production
- `bun start` - Start production server
- `bun lint` - Run ESLint
- `bun check-types` - Run TypeScript type checking

## Seeding

- `bun run db:seed` seeds goals/tasks for users.
- If Auth0 seed credentials are configured, it imports users from Auth0 Management API and upserts them in the local DB before seeding goals/tasks.
- If Auth0 seed credentials are not configured, it seeds only for users already in the local DB.

### Auth0-Backed Seed Setup

Provide `AUTH0_DOMAIN` and one authentication method:

- Static token:
  - `AUTH0_MANAGEMENT_API_TOKEN`
- M2M client credentials:
  - `AUTH0_M2M_CLIENT_ID`
  - `AUTH0_M2M_CLIENT_SECRET`
  - Optional override: `AUTH0_MANAGEMENT_API_AUDIENCE` (defaults to `https://<AUTH0_DOMAIN>/api/v2/`)

Required Auth0 permission:

- Auth0 Management API scope `read:users`

Seed behavior with Auth0 mode:

- Fetches users from `/api/v2/users` with pagination
- Upserts users into DB using Auth0 `user_id` as `auth0Id`
- Then creates seed goals/tasks for synced users

## Authentication

This API uses Auth0 JWT Bearer tokens for authentication. **All routes except `/health` require a valid access token** in the Authorization header:

```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" http://localhost:3001/profile
```

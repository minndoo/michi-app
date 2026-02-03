# API

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

## Available Scripts

- `bun dev` - Start development server with hot reload
- `bun build` - Build for production
- `bun start` - Start production server
- `bun lint` - Run ESLint
- `bun check-types` - Run TypeScript type checking

## Authentication

This API uses Auth0 JWT Bearer tokens for authentication. **All routes except `/health` require a valid access token** in the Authorization header:

```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" http://localhost:3001/profile
```

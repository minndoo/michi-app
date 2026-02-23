# API Rules

## Migrations - Prisma

**IMPORTANT: For work with Prisma schema**

## Migration safety rules

- When working with Prisma migrations, always take the safest path to end with a single correct migration file for the current change.
- Do not rewrite or duplicate already applied migrations in a way that forces a reset by default.
- Prefer generating one new migration and verifying it matches `schema.prisma` and existing DB state.
- If migration steps cannot be executed safely in the environment, stop and ask the user to run the required DB/migration command(s) manually.

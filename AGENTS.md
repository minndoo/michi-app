# Project

## Overview

This repository is a Turborepo monorepo using Bun as the package manager.

## Stack

- **Package Manager**: Bun
- **Monorepo Tooling**: Turborepo
- **Frontend**: Next.js (App Router) + Tamagui
- **Backend**: Node.js + Express + Prisma + PostgreSQL + tsoa
- **UI Library**: Tamagui (shared package)
- **Language**: Typescript

## Repository Structure

```
apps/
  web/                # Next.js app (Tamagui enabled)
  api/                # Express API (Prisma + PostgreSQL + tsoa)

packages/
  ui/                 # @repo/ui - shared Tamagui components
  eslint-config/      # @repo/eslint-config - shared ESLint config
  typescript-config/  # @repo/typescript-config - shared TS config
```

## Core rules
- Always use Bun for:

* Installing dependencies
* Running scripts
* Executing commands

Examples:
```bash
bun install
bun run check-types --filter=web
```

## Validation matrix
- apps/web
  - `bun run check-types --filter=web`
  - `bun run test --filter=web`
- apps/api
  - `bun run check-types --filter=api`
  - `bun run test --filter=api`
- packages/ui
  - `bun run check-types --filter=@repo/ui`
- packages/form
  - `bun run check-types --filter=@repo/form`

Never run unfiltered monorepo checks unless user explicitly asks for monorepo-wide validation.

Linting - run lint only on changed files.

## Scope gate
- Only read/edit files in the touched workspace.
- Do not inspect unrelated workspaces unless required by imports/types.
- Keep context local-first and minimal.

## Stop-early policy
- Stop immediately once requested change is implemented and required scoped checks pass.
- Do not run extra verification commands unless explicitly requested.

## Build and infra policy
- Do not run `bun run build` unless the user explicitly requests it.
- If user explicitly requests build:
  - Run as quietly as possible.
  - Only surface detailed logs on failure.
- If failure is clearly external/infra-related (network/font/registry transient):
  - Report once and stop retries unless user asks to retry.

## Domain rules
- UI rules: `docs/agents/ui.md`
- API rules: `docs/agents/api.md`

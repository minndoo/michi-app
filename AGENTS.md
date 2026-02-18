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
bun run dev
bun run build
bun run check-types
```

**IMPORTANT: After every code change, validate the build and dev env succeeds.**

```bash
# Typecheck
bun run check-types
```

```bash
# Tests
bun run test
```

```bash
# Build script
bun run build
```

```bash
# Development start
bun run dev
```

## Migration safety rules

- When working with Prisma migrations, always take the safest path to end with a single correct migration file for the current change.
- Do not rewrite or duplicate already applied migrations in a way that forces a reset by default.
- Prefer generating one new migration and verifying it matches `schema.prisma` and existing DB state.
- If migration steps cannot be executed safely in the environment, stop and ask the user to run the required DB/migration command(s) manually.


**IMPORTANT: For styling and UI work always check this document.**

For UI work, always read ai/tamagui.prompt.md.
Treat it as authoritative. Never restate it.
If this file conflicts with ai/tamagui.prompt.md, ai/tamagui.prompt.md is canonical.

## Styling rules (Tamagui)

- Never hardcode hex colors in components.
- Always use semantic theme tokens: $background, $backgroundStrong, $color, $colorMuted, $borderColor, $outlineColor, $shadowColor.
Examples:
✅ <YStack bg="$background" />
✅ <Text color="$colorMuted" />
❌ <YStack bg="#F6F8F7" />
❌ <YStack bg="$color3" />

- There could be tokens with duplicate hex code like $backgroundHard and $outlineColor where both have the value #6FA58C. Always try to use relevant token name to it's function used
Examples:
✅ <View bg="$backgroundHard" />
✅ <View outline="2px solid $outlineColor" />
❌ <View bg="$outlineColor" />
❌ <YStack outline="2px solid $backgroundColor" />

## Tokens rules

- Use numeric token shorthand values only (for example: `$1`, `$2.5`, `$10`).
- Do not use prefixed token namespaces like `$space.1`, `$size.1`, `$radius.1`, `$zIndex.1`.
Examples:
✅ <View rounded="$1" />
✅ <View z="$1" />
✅ <View px="$1" mx="$1" />
✅ <Text fontSize="$1" />

❌ <View rounded="$radius.1" />
❌ <View z="$zIndex.1" />
❌ <View px="$space.1" mx="$space.1" />
❌ <Text fontSize="$size.1" />

## Component rules

- When looking up components. Always try to locate components folder within the project. In apps/web the components folder is aliased under @/components. If you can't find relevant components, only then lookup the @repo/ui package
- Check ai/tamagui.prompt.md for available components
- Do NOT implement UI controls using Stack/View if Tamagui has a component.
- Use:
  - Checkbox (+ Checkbox.IndicatorFrame) for checkboxes
  - Progress (+ Progress.IndicatorFrame + Progress.Indicator) for progress bars
  - Switch for toggles
  - RadioGroup for radios
  - Select (or your select wrapper) for selects
  - Button for buttons (no pressable Views)
  - Input / TextArea for inputs
- Only use Stack/XStack/YStack for layout and spacing.
- If unsure whether a component exists, assume it does and search for it in the existing codebase imports.

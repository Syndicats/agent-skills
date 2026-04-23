---
name: typescript-guard
description: Enforce TypeScript type checking after every code change in this project. Triggers automatically whenever TypeScript files (.ts, .tsx) are created or modified. Run `tsc --noEmit` to validate, then ask the user whether to build with `npx tsc`.
---

# TypeScript Guard

## After every code change

1. Run `tsc --noEmit` to type-check without emitting files
2. If type errors are found, fix them before proceeding
3. Once type checking passes, ask the user: "Type check passed. Build the project with `npx tsc`?"
4. If the user confirms, run `npx tsc` to compile

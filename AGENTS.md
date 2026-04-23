# AGENTS.md

This file provides guidance to AI code agents when working with code in this repository.

## Build & Development Commands

```bash
npm run build          # TypeScript compilation (tsc) to dist/
npm run build:fast     # Fast build via tsup (ESM + DTS)
npm run dev            # Watch mode (tsc --watch)
npm run test           # Run tests with vitest
npm run start          # Run CLI from dist/
node dist/cli/index.js # Run CLI directly (useful for testing after build)
```

## Project Skills

Project-specific skills live in **`.skills/`** at the repository root. Each skill is a subdirectory containing a `SKILL.md` file with YAML frontmatter and markdown instructions.

Current skills:
- **`.skills/typescript-guard/`** - Enforces TypeScript type checking after code changes
- **`.skills/doc-sync/`** - Synchronizes CLI documentation with source code definitions
- **`.skills/npm-publish/`** - Publish @syndicats/agent-skills to npm (version bump, checks, publish)

These are the canonical skill definitions for this project. They can be exported to agent-specific directories (`.claude/skills/`, `.cursor/skills/`, etc.) via `skills export`.

## Architecture

This is a **universal CLI tool** (`skills` / `agent-skills`) for managing AI agent skills across 45+ platforms (Cursor, Claude Code, Copilot, etc.). Published as `@syndicats/agent-skills`. Written in TypeScript (ES2022, NodeNext modules).

This is a fork of [agent-skills-cli](https://github.com/Karanjot786/agent-skills-cli) with all external marketplace and telemetry dependencies removed. Skills are installed exclusively from Git repositories, npm packages, and local directories.

### Source Layout

- **`src/cli/`** - CLI layer built on `commander`. Entry point is `index.ts`, which registers commands from `commands/*.ts`. Agent platform definitions live in `agents.ts` (maps agent names to their project/global skill directories).
- **`src/core/`** - Business logic. Key modules:
  - `loader.ts` - Discovers and loads `SKILL.md` files from disk
  - `installer.ts` - Symlink-based skill installation to agent directories
  - `skill-lock.ts` - Lock file tracking (`~/.skills/skills.lock`)
  - `git-auth.ts` - Git authentication (SSH, tokens, credential helpers)
  - `source-parser.ts` - Parses skill sources (GitHub, GitLab, Bitbucket, SSH, npm, local paths)
  - `validator.ts` - SKILL.md frontmatter and body validation
  - `injector.ts` - Generates XML/prompt context from skills
  - `quality.ts` - 4-dimension skill quality scoring
  - `conflict-detector.ts`, `context-budget.ts`, `differ.ts`, `composer.ts`, `splitter.ts`, `skill-tester.ts` - Power tool engines
- **`src/adapters/`** - Agent platform adapters. `adapter.ts` defines the `AgentAdapter` interface; `universal.ts` provides a base implementation. Platform-specific adapters (e.g., `cursor.ts`, `claude.ts`, `copilot.ts`) extend it.
- **`src/types/`** - Shared TypeScript interfaces (`Skill`, `SkillMetadata`, `ValidationResult`, marketplace types).
- **`.skills/`** - Project-specific skills (tracked in git, not compiled).

### Key Patterns

- **Command registration**: Each command module exports a `register*Command(program)` function that adds subcommands to the commander program.
- **Agent config**: The `AGENTS` record in `cli/agents.ts` maps agent keys to `{ projectDir, globalDir }` paths. This is the central registry for where skills get installed per platform.
- **Skill format**: Skills are `SKILL.md` files with YAML frontmatter (`name`, `description`) and markdown body content, parsed via `gray-matter`.
- **Git-based sources**: Skills are installed from Git repositories (GitHub, GitLab, Bitbucket, SSH), npm packages, or local directories. No external marketplace API is used.
- **ESM-only**: The project uses ES modules throughout (`.js` extensions in imports required).

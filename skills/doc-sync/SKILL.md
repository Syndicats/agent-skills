---
name: doc-sync
description: Synchronize CLI documentation (README.md, CONTRIBUTING.md, CHANGELOG.md) with actual source code definitions. Use when documentation may be out of date with the codebase, after adding/removing commands or options, after changing agent configurations, or when the user asks to audit, sync, or verify documentation accuracy against the source.
---

# Doc-Sync Workflow

Verify and fix documentation drift against the agent-skills-cli source code. Follow these steps in order.

## Step 1: Extract Source-of-Truth Data

### 1a. Agent Registry

Read `src/cli/agents.ts` and extract every key from the `AGENTS` record. For each agent, capture:
- Key name, `displayName`, `projectDir`, `globalDir`

Count total agents. This is the authoritative agent count.

### 1b. Command Definitions

Read every file matching `src/cli/commands/*.ts`. For each `registerXCommand` function, extract:
- `.command('name')` — the command name and any positional arguments
- `.alias('x')` — all aliases
- `.description('...')` — the description string
- `.option(...)` / `.requiredOption(...)` — every flag with its short form, long form, description, and default value
- Subcommands (nested `.command()` calls within an action)

Also check `src/cli/index.ts` for:
- Any commands registered inline (not from command files)
- The `program.version()` value — compare to `package.json` version

### 1c. Configuration Schema

Read `src/core/skillsrc.ts` and extract:
- The `SkillsRC` interface and nested interfaces
- The `normalizeConfig` function logic (e.g., `agent` singular to `agents` array coercion)
- Config file search paths from `loadSkillsRC`

### 1d. Environment Variables

Grep for `process.env.` across `src/` to find all referenced environment variables and their purpose.

## Step 2: Compare Against Documentation

Open `README.md` and check each section for these common drift categories:

### Counts
- Agent count in tagline, features list, install examples, and platform table must all match the `AGENTS` record length
- "+N more agents" in the platform table must equal total agents minus the number listed in the table
- The listed agent names after "+N more" must include all agents not in the table

### Command Tables
- Every registered command should appear somewhere in the README
- Command descriptions must match the `.description()` string
- Listed options must match `.option()` / `.requiredOption()` definitions
- Aliases (e.g., `add` for `install`, `i` for `install`) should be mentioned

### Flag Accuracy
- Flags documented must exist in source (e.g., `-t` vs `-a` for agent targeting)
- Flags in source but missing from docs should be added
- Default values should match

### Agent Platform Table
- `displayName`, `projectDir`, `globalDir` for each listed agent must match code
- Verify paths character-by-character (e.g., `~/.config/zed/skills/` vs `~/.zed/skills/`)

### Configuration Section
- `.skillsrc` example JSON must use valid field names matching the `SkillsRC` interface
- Document accepted forms (e.g., singular `agent` string and plural `agents` array)
- Config search order must match the `loadSkillsRC` implementation

### Version Strings
- `program.version()` in `src/cli/index.ts`
- `setVersion()` in telemetry
- `version` in `package.json`
- These should all agree. Flag any mismatches.

## Step 3: Apply Fixes

For each discrepancy found:

1. Fix the documentation to match the source code (source code is authoritative)
2. Use targeted edits — do not rewrite entire sections unnecessarily
3. Preserve the existing documentation style and structure
4. When adding newly documented commands, group them logically with existing categories

Common fixes:
- Wrong agent count: search-and-replace all instances across the file
- Missing flags: add to the relevant command's option list or code block
- Wrong paths: correct character-by-character
- Undocumented commands: add a new row to the most relevant table section
- Stale command references: remove or update (e.g., `skills sync` if it no longer exists as standalone)

## Step 4: Validate

After applying fixes:

1. Re-read the updated documentation end-to-end
2. Spot-check 3-5 commands by comparing their README entry against their source file
3. Verify all agent counts are consistent across every mention
4. Confirm no commands reference flags that don't exist in source
5. Ensure the `.skillsrc` example parses correctly against the `SkillsRC` interface

Report a summary of changes made, grouped by category (counts, commands, flags, paths, config).

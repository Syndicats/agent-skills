#!/usr/bin/env node
/**
 * Agent Skills CLI
 * Universal CLI for managing Agent Skills across Cursor, Claude Code, GitHub Copilot, OpenAI Codex
 *
 * This file is the thin orchestrator — all command logic lives in ./commands/*.ts
 * and shared config lives in ./agents.ts.
 */

import { Command } from 'commander';
import { AGENTS } from './agents.js';

// ─── Modular command imports ────────────────────────────────────────────────
import { registerListCommand } from './commands/list.js';
import { registerValidateCommand } from './commands/validate.js';
import { registerShowCommand } from './commands/show.js';
import { registerSearchInstallCommand } from './commands/search.js';
import { registerInstallCommand } from './commands/install.js';
import { registerExportCommand } from './commands/export.js';
import { registerDoctorCommand, registerCheckCommand, registerUpdateCommand, registerExecCommand } from './commands/utils-commands.js';
import { registerInteractiveCommands } from './commands/interactive.js';

// ─── Already-extracted command imports ──────────────────────────────────────
import { registerRemoveCommand } from './commands/remove.js';
import { registerSuggestCommand } from './commands/suggest.js';
import { registerAuditCommand } from './commands/audit.js';
import { registerCraftCommand } from './commands/craft.js';
import { registerBootstrapCommand } from './commands/bootstrap.js';
import { registerConvertCommand } from './commands/convert.js';
import { registerCollabCommand } from './commands/collab.js';
import { registerLockspecCommand } from './commands/lockspec.js';
import { registerForgeCommand } from './commands/forge.js';
import { registerMineCommand } from './commands/mine.js';
import { registerRecallCommand } from './commands/recall.js';
import { registerGridCommand } from './commands/grid.js';
import { registerCaptureCommand } from './commands/capture.js';
import { registerTriggerCommand } from './commands/trigger.js';
import { registerRuleCommand } from './commands/rule.js';
import { registerBlueprintCommand } from './commands/blueprint.js';
import { registerCiCommand } from './commands/ci.js';
import { registerTrackCommand } from './commands/track.js';
import { registerInsightCommand } from './commands/insight.js';
import { registerScoreCommand } from './commands/score.js';
import { registerMethodCommand } from './commands/method.js';

// ─── v1.1.4 Unique Feature Commands ────────────────────────────────────────
import { registerContextCommand } from './commands/context.js';
import { registerDiffCommand } from './commands/diff.js';
import { registerComposeCommand } from './commands/compose.js';
import { registerTestCommand } from './commands/test.js';
import { registerFrozenCommand } from './commands/frozen.js';
import { registerSandboxCommand } from './commands/sandbox.js';
import { registerWatchCommand } from './commands/watch.js';
import { registerSplitCommand } from './commands/split.js';
import { registerBenchCommand } from './commands/bench.js';

// ─── Program setup ─────────────────────────────────────────────────────────

const program = new Command();

// ─── Root command ───────────────────────────────────────────────────────────

program
    .name('skills')
    .description('Agent Skills CLI - Manage skills for Cursor, Claude Code, GitHub Copilot, and 40+ more agents')
    .version('2.0.1');

// ─── Register all command modules ───────────────────────────────────────────

// Group 1: Core commands
registerListCommand(program);
registerValidateCommand(program);
registerShowCommand(program);         // show, prompt, init

// Group 2: Search & install
registerSearchInstallCommand(program); // search
registerInstallCommand(program);       // install

// Group 3: Export
registerExportCommand(program);

// Group 4: Utilities
registerDoctorCommand(program);
registerCheckCommand(program);
registerUpdateCommand(program);
registerExecCommand(program);

// Group 5: Interactive wizards & misc
registerInteractiveCommands(program); // install-wizard, export-interactive, setup, run, context, preview, scripts, completion, info

// Group 6: Modular commands
registerRemoveCommand(program, AGENTS);
registerSuggestCommand(program);
registerAuditCommand(program);
registerCraftCommand(program);
registerBootstrapCommand(program);
registerConvertCommand(program);
registerCollabCommand(program);
registerLockspecCommand(program);
registerForgeCommand(program);
registerMineCommand(program);
registerRecallCommand(program);
registerGridCommand(program);
registerCaptureCommand(program);
registerTriggerCommand(program);
registerRuleCommand(program);
registerBlueprintCommand(program);
registerCiCommand(program);
registerTrackCommand(program);
registerInsightCommand(program);
registerMethodCommand(program);
registerScoreCommand(program);

// v1.1.4 — Unique features
registerContextCommand(program);
registerDiffCommand(program);
registerComposeCommand(program);
registerTestCommand(program);
registerFrozenCommand(program);
registerSandboxCommand(program);
registerWatchCommand(program);
registerSplitCommand(program);
registerBenchCommand(program);

program.parse();

/**
 * Trigger Command
 * Auto-trigger skills on file/event changes
 * (SkillKit calls this "workflow" — we call it "trigger")
 */

import chalk from 'chalk';
import { Command } from 'commander';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, join } from 'path';

interface TriggerConfig {
    version: string;
    triggers: TriggerRule[];
}

interface TriggerRule {
    name: string;
    event: string;
    pattern: string;
    action: string;
    skill?: string;
    enabled: boolean;
}

const TRIGGER_FILE = '.skills-triggers.json';

/**
 * Register the trigger command
 */
export function registerTriggerCommand(program: Command): void {
    const trigger = program
        .command('trigger')
        .alias('tr')
        .description('Auto-trigger skills on events');

    trigger
        .command('add <name>')
        .description('Add a trigger rule')
        .requiredOption('-e, --event <event>', 'Event type: file-change, commit, branch, save')
        .requiredOption('-p, --pattern <pattern>', 'Pattern to match (glob or regex)')
        .requiredOption('-a, --action <action>', 'Action: run-skill, validate, audit, notify')
        .option('-s, --skill <skill>', 'Skill to run (for run-skill action)')
        .action(async (name: string, options: any) => {
            try {
                await triggerAdd(name, options);
            } catch (err: any) {
                console.error(chalk.red('Error:'), err.message);
                process.exit(1);
            }
        });

    trigger
        .command('list')
        .description('List all trigger rules')
        .action(async () => {
            try {
                await triggerList();
            } catch (err: any) {
                console.error(chalk.red('Error:'), err.message);
                process.exit(1);
            }
        });

    trigger
        .command('enable <name>')
        .description('Enable a trigger')
        .action(async (name: string) => {
            try { await triggerToggle(name, true); } catch (err: any) { console.error(chalk.red('Error:'), err.message); process.exit(1); }
        });

    trigger
        .command('disable <name>')
        .description('Disable a trigger')
        .action(async (name: string) => {
            try { await triggerToggle(name, false); } catch (err: any) { console.error(chalk.red('Error:'), err.message); process.exit(1); }
        });

    trigger
        .command('remove <name>')
        .description('Remove a trigger')
        .action(async (name: string) => {
            try { await triggerRemove(name); } catch (err: any) { console.error(chalk.red('Error:'), err.message); process.exit(1); }
        });
}

async function loadTriggers(): Promise<TriggerConfig> {
    const configPath = resolve(TRIGGER_FILE);
    if (!existsSync(configPath)) return { version: '1.0.0', triggers: [] };
    try { return JSON.parse(await readFile(configPath, 'utf-8')); } catch { return { version: '1.0.0', triggers: [] }; }
}

async function saveTriggers(config: TriggerConfig): Promise<void> {
    await writeFile(resolve(TRIGGER_FILE), JSON.stringify(config, null, 2));
}

async function triggerAdd(name: string, options: any): Promise<void> {
    const config = await loadTriggers();

    if (config.triggers.some(t => t.name === name)) {
        console.error(chalk.yellow(`Trigger "${name}" already exists`));
        return;
    }

    config.triggers.push({
        name,
        event: options.event,
        pattern: options.pattern,
        action: options.action,
        skill: options.skill,
        enabled: true,
    });

    await saveTriggers(config);
    console.log(chalk.green(`✓ Added trigger: ${chalk.cyan(name)}`));
    console.log(chalk.dim(`  ${options.event} → ${options.pattern} → ${options.action}`));
}

async function triggerList(): Promise<void> {
    const config = await loadTriggers();

    if (config.triggers.length === 0) {
        console.log(chalk.dim('No triggers configured.'));
        console.log(chalk.dim('  Add one: skills trigger add <name> -e file-change -p "*.ts" -a validate'));
        return;
    }

    console.log('');
    console.log(chalk.bold(`⚡ Triggers (${config.triggers.length})`));
    console.log('');

    for (const t of config.triggers) {
        const status = t.enabled ? chalk.green('●') : chalk.red('○');
        console.log(`  ${status} ${chalk.bold(t.name)}`);
        console.log(`    ${chalk.dim('Event:')}   ${t.event}`);
        console.log(`    ${chalk.dim('Pattern:')} ${t.pattern}`);
        console.log(`    ${chalk.dim('Action:')}  ${t.action}${t.skill ? ` (${t.skill})` : ''}`);
        console.log('');
    }
}

async function triggerToggle(name: string, enabled: boolean): Promise<void> {
    const config = await loadTriggers();
    const trigger = config.triggers.find(t => t.name === name);
    if (!trigger) { console.error(chalk.red(`Trigger "${name}" not found`)); return; }
    trigger.enabled = enabled;
    await saveTriggers(config);
    console.log(chalk.green(`✓ Trigger "${name}" ${enabled ? 'enabled' : 'disabled'}`));
}

async function triggerRemove(name: string): Promise<void> {
    const config = await loadTriggers();
    const idx = config.triggers.findIndex(t => t.name === name);
    if (idx < 0) { console.error(chalk.red(`Trigger "${name}" not found`)); return; }
    config.triggers.splice(idx, 1);
    await saveTriggers(config);
    console.log(chalk.green(`✓ Removed trigger: ${name}`));
}

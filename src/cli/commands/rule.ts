/**
 * Rule Command
 * Always-on coding rules that persist across sessions
 * (SkillKit calls this "rules" — we call it "rule") 
 */

import chalk from 'chalk';
import { Command } from 'commander';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, join } from 'path';
import { homedir } from 'os';

interface CodingRule {
    name: string;
    description: string;
    scope: 'global' | 'project';
    category: string;
    content: string;
    enabled: boolean;
    createdAt: string;
}

interface RulesStore {
    version: string;
    rules: CodingRule[];
}

const GLOBAL_RULES_DIR = join(homedir(), '.agent-skills', 'rules');
const GLOBAL_RULES_FILE = join(GLOBAL_RULES_DIR, 'rules.json');
const PROJECT_RULES_FILE = '.skills-rules.json';

/**
 * Register the rule command
 */
export function registerRuleCommand(program: Command): void {
    const rule = program
        .command('rule')
        .alias('rl')
        .description('Manage always-on coding rules');

    rule
        .command('add <name>')
        .description('Add a coding rule')
        .requiredOption('-d, --description <desc>', 'Rule description')
        .option('-c, --category <cat>', 'Category', 'general')
        .option('-g, --global', 'Apply globally')
        .option('--content <content>', 'Rule content/instructions')
        .action(async (name: string, options: any) => {
            try { await ruleAdd(name, options); } catch (err: any) { console.error(chalk.red('Error:'), err.message); process.exit(1); }
        });

    rule
        .command('list')
        .description('List all coding rules')
        .option('-g, --global', 'Show global rules only')
        .option('-p, --project', 'Show project rules only')
        .action(async (options: any) => {
            try { await ruleList(options); } catch (err: any) { console.error(chalk.red('Error:'), err.message); process.exit(1); }
        });

    rule
        .command('enable <name>')
        .description('Enable a rule')
        .option('-g, --global', 'Target global rules')
        .action(async (name: string, options: any) => {
            try { await ruleToggle(name, true, options.global); } catch (err: any) { console.error(chalk.red('Error:'), err.message); process.exit(1); }
        });

    rule
        .command('disable <name>')
        .description('Disable a rule')
        .option('-g, --global', 'Target global rules')
        .action(async (name: string, options: any) => {
            try { await ruleToggle(name, false, options.global); } catch (err: any) { console.error(chalk.red('Error:'), err.message); process.exit(1); }
        });

    rule
        .command('remove <name>')
        .description('Remove a rule')
        .option('-g, --global', 'Target global rules')
        .action(async (name: string, options: any) => {
            try { await ruleRemove(name, options.global); } catch (err: any) { console.error(chalk.red('Error:'), err.message); process.exit(1); }
        });

    rule
        .command('export')
        .description('Export rules as a skill')
        .option('-o, --output <dir>', 'Output directory', '.')
        .action(async (options: any) => {
            try { await ruleExport(options.output); } catch (err: any) { console.error(chalk.red('Error:'), err.message); process.exit(1); }
        });
}

async function loadRules(global: boolean): Promise<RulesStore> {
    const file = global ? GLOBAL_RULES_FILE : resolve(PROJECT_RULES_FILE);
    if (!existsSync(file)) return { version: '1.0.0', rules: [] };
    try { return JSON.parse(await readFile(file, 'utf-8')); } catch { return { version: '1.0.0', rules: [] }; }
}

async function saveRules(store: RulesStore, global: boolean): Promise<void> {
    if (global) await mkdir(GLOBAL_RULES_DIR, { recursive: true });
    const file = global ? GLOBAL_RULES_FILE : resolve(PROJECT_RULES_FILE);
    await writeFile(file, JSON.stringify(store, null, 2));
}

async function ruleAdd(name: string, options: any): Promise<void> {
    const isGlobal = !!options.global;
    const store = await loadRules(isGlobal);

    if (store.rules.some(r => r.name === name)) {
        console.error(chalk.yellow(`Rule "${name}" already exists`));
        return;
    }

    store.rules.push({
        name,
        description: options.description,
        scope: isGlobal ? 'global' : 'project',
        category: options.category || 'general',
        content: options.content || options.description,
        enabled: true,
        createdAt: new Date().toISOString(),
    });

    await saveRules(store, isGlobal);
    console.log(chalk.green(`✓ Added ${isGlobal ? 'global' : 'project'} rule: ${chalk.cyan(name)}`));
}

async function ruleList(options: any): Promise<void> {
    const showGlobal = !options.project;
    const showProject = !options.global;
    let allRules: CodingRule[] = [];

    if (showGlobal) {
        const global = await loadRules(true);
        allRules.push(...global.rules);
    }
    if (showProject) {
        const project = await loadRules(false);
        allRules.push(...project.rules);
    }

    if (allRules.length === 0) {
        console.log(chalk.dim('No rules configured.'));
        console.log(chalk.dim('  Add one: skills rule add "no-any" -d "Never use TypeScript any type"'));
        return;
    }

    console.log('');
    console.log(chalk.bold(`📏 Coding Rules (${allRules.length})`));
    console.log('');

    const byCategory: Record<string, CodingRule[]> = {};
    for (const r of allRules) {
        if (!byCategory[r.category]) byCategory[r.category] = [];
        byCategory[r.category].push(r);
    }

    for (const [cat, rules] of Object.entries(byCategory)) {
        console.log(`  ${chalk.bold(cat.toUpperCase())}`);
        for (const r of rules) {
            const status = r.enabled ? chalk.green('●') : chalk.red('○');
            const scope = r.scope === 'global' ? chalk.dim(' [global]') : '';
            console.log(`    ${status} ${r.name}${scope} — ${chalk.dim(r.description)}`);
        }
        console.log('');
    }
}

async function ruleToggle(name: string, enabled: boolean, global?: boolean): Promise<void> {
    const scopes: boolean[] = global !== undefined ? [!!global] : [false, true];
    for (const isGlobal of scopes) {
        const store = await loadRules(isGlobal);
        const rule = store.rules.find(r => r.name === name);
        if (rule) { rule.enabled = enabled; await saveRules(store, isGlobal); console.log(chalk.green(`✓ Rule "${name}" ${enabled ? 'enabled' : 'disabled'}`)); return; }
    }
    console.error(chalk.red(`Rule "${name}" not found`));
}

async function ruleRemove(name: string, global?: boolean): Promise<void> {
    const isGlobal = !!global;
    const store = await loadRules(isGlobal);
    const idx = store.rules.findIndex(r => r.name === name);
    if (idx < 0) { console.error(chalk.red(`Rule "${name}" not found`)); return; }
    store.rules.splice(idx, 1);
    await saveRules(store, isGlobal);
    console.log(chalk.green(`✓ Removed rule: ${name}`));
}

async function ruleExport(outputDir: string): Promise<void> {
    const global = await loadRules(true);
    const project = await loadRules(false);
    const allRules = [...global.rules, ...project.rules].filter(r => r.enabled);

    if (allRules.length === 0) {
        console.log(chalk.dim('No enabled rules to export'));
        return;
    }

    const lines: string[] = [];
    lines.push('---');
    lines.push('name: coding-rules');
    lines.push('description: Always-on coding rules');
    lines.push('---');
    lines.push('');
    lines.push('# Coding Rules');
    lines.push('');

    for (const r of allRules) {
        lines.push(`## ${r.name}`);
        lines.push('');
        lines.push(r.content);
        lines.push('');
    }

    const outDir = resolve(outputDir, 'coding-rules');
    await mkdir(outDir, { recursive: true });
    await writeFile(join(outDir, 'SKILL.md'), lines.join('\n'));
    console.log(chalk.green(`✓ Exported ${allRules.length} rules to ${outDir}/SKILL.md`));
}

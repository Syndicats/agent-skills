/**
 * Insight Command
 * Pattern review & clustering — analyze installed skills
 */

import chalk from 'chalk';
import ora from 'ora';
import { Command } from 'commander';
import { listInstalledSkills } from '../../core/skill-lock.js';

export function registerInsightCommand(program: Command): void {
    program
        .command('insight')
        .alias('in')
        .description('Analyze installed skills — patterns, coverage, and gaps')
        .option('-j, --json', 'Output as JSON')
        .option('-v, --verbose', 'Show detailed breakdown')
        .action(async (options: { json?: boolean; verbose?: boolean }) => {
            try {
                await insightCommand(options);
            } catch (err: any) {
                console.error(chalk.red('Error:'), err.message);
                process.exit(1);
            }
        });
}

async function insightCommand(options: { json?: boolean; verbose?: boolean }): Promise<void> {
    const spinner = ora('Analyzing installed skills...').start();
    const installed = await listInstalledSkills();

    if (installed.length === 0) {
        spinner.warn('No skills installed');
        return;
    }

    const byAgent: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    const names = new Set<string>();

    for (const s of installed) {
        names.add(s.name);
        for (const a of s.agents) byAgent[a] = (byAgent[a] || 0) + 1;
        const st = s.sourceType || 'unknown';
        bySource[st] = (bySource[st] || 0) + 1;
    }

    spinner.succeed(`Analyzed ${installed.length} skill(s)`);

    if (options.json) {
        console.log(JSON.stringify({ total: installed.length, unique: names.size, byAgent, bySource }, null, 2));
        return;
    }

    console.log('');
    console.log(chalk.bold('🔍 Skill Insights'));
    console.log('');
    console.log(chalk.bold('Agent Coverage:'));
    for (const [agent, count] of Object.entries(byAgent)) {
        console.log(`  ${agent.padEnd(15)} ${chalk.green('█'.repeat(Math.min(count, 20)))} ${count}`);
    }
    console.log('');
    console.log(chalk.bold('Source Types:'));
    for (const [type, count] of Object.entries(bySource)) {
        console.log(`  ${chalk.cyan('●')} ${type.padEnd(15)} ${count} skill(s)`);
    }
    console.log('');
    console.log(`  ${chalk.dim('Total:')}  ${installed.length}`);
    console.log(`  ${chalk.dim('Unique:')} ${names.size}`);
    console.log('');

    if (options.verbose) {
        console.log(chalk.bold('All Skills:'));
        for (const s of installed) {
            console.log(`  ${chalk.cyan('◆')} ${s.scopedName || s.name} ${chalk.dim(`[${s.agents.join(', ')}]`)}`);
        }
        console.log('');
    }
}

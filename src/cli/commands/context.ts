/**
 * Context Budget Command
 * Select skills that fit within a token budget, ranked by project relevance.
 */
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { AGENTS } from '../agents.js';

export function registerContextCommand(program: Command) {
    program
        .command('budget')
        .description('Smart context budget manager — load only the most relevant skills')
        .requiredOption('-b, --budget <tokens>', 'Token budget (e.g. 8000)', parseInt)
        .option('-f, --format <format>', 'Output format: text, xml, json', 'text')
        .option('--min-relevance <score>', 'Minimum relevance score 0-100 (default: 10)', parseInt)
        .option('-p, --project <dir>', 'Project directory to analyze (default: cwd)')
        .option('--list-only', 'Only list skills with scores, do not output content')
        .action(async (options) => {
            try {
                const { existsSync } = await import('fs');
                const { readdir } = await import('fs/promises');
                const { homedir } = await import('os');
                const { join } = await import('path');
                const { buildContextPlan, formatContextXML, formatContextJSON } = await import('../../core/context-budget.js');

                const home = homedir();
                const skillsDir = join(home, '.antigravity', 'skills');

                // Also check agent skill dirs
                const allSkillDirs: string[] = [];

                // Global skills
                if (existsSync(skillsDir)) {
                    const entries = await readdir(skillsDir, { withFileTypes: true });
                    for (const entry of entries) {
                        if (entry.isDirectory()) {
                            const skillPath = join(skillsDir, entry.name, 'SKILL.md');
                            if (existsSync(skillPath)) {
                                allSkillDirs.push(join(skillsDir, entry.name));
                            }
                        }
                    }
                }

                // Check each agent's project and global dirs
                for (const [, config] of Object.entries(AGENTS)) {
                    for (const dir of [config.projectDir, config.globalDir]) {
                        if (existsSync(dir)) {
                            try {
                                const entries = await readdir(dir, { withFileTypes: true });
                                for (const entry of entries) {
                                    if (entry.isDirectory()) {
                                        const skillPath = join(dir, entry.name, 'SKILL.md');
                                        if (existsSync(skillPath)) {
                                            const fullPath = join(dir, entry.name);
                                            if (!allSkillDirs.includes(fullPath)) {
                                                allSkillDirs.push(fullPath);
                                            }
                                        }
                                    }
                                }
                            } catch { }
                        }
                    }
                }

                if (allSkillDirs.length === 0) {
                    console.log(chalk.yellow('\n  No installed skills found. Install some first with `skills install`.\n'));
                    return;
                }

                const spinner = ora(`Analyzing ${allSkillDirs.length} skills against project...`).start();

                const plan = await buildContextPlan(allSkillDirs, {
                    budget: options.budget,
                    minRelevance: options.minRelevance || 10,
                    projectDir: options.project || process.cwd(),
                    format: options.format,
                });

                spinner.stop();

                if (options.format === 'json') {
                    console.log(formatContextJSON(plan));
                    return;
                }

                if (options.format === 'xml') {
                    console.log(formatContextXML(plan));
                    return;
                }

                // Text output
                console.log(chalk.bold(`\n📊 Context Budget Plan\n`));
                console.log(chalk.gray(`  Budget: ${options.budget} tokens`));
                console.log(chalk.gray(`  Skills found: ${allSkillDirs.length}`));
                console.log('');

                if (plan.loaded.length > 0) {
                    console.log(chalk.green.bold(`  ✅ Loading ${plan.loaded.length} skill(s):`));
                    for (const skill of plan.loaded) {
                        const bar = relevanceBar(skill.relevance);
                        console.log(`    ${bar} ${chalk.bold(skill.name)} ${chalk.gray(`(${skill.tokens} tokens, ${skill.relevance}% relevant)`)}`);
                        console.log(`      ${chalk.gray(skill.reason)}`);
                    }
                    console.log('');
                }

                if (plan.skipped.length > 0) {
                    console.log(chalk.yellow(`  ⏭️  Skipped ${plan.skipped.length} skill(s):`));
                    for (const skill of plan.skipped) {
                        console.log(`    ${chalk.gray(`${skill.name} (${skill.tokens} tokens, ${skill.relevance}% — ${skill.reason})`)}`);
                    }
                    console.log('');
                }

                console.log(chalk.bold('  Summary:'));
                console.log(`    Used: ${chalk.cyan(String(plan.totalTokens))} / ${options.budget} tokens`);
                console.log(`    Remaining: ${chalk.green(String(plan.budgetRemaining))} tokens`);
                console.log('');

                if (!options.listOnly && plan.loaded.length > 0) {
                    console.log(chalk.gray('  Tip: Use --format xml to get agent-ready output.\n'));
                }
            } catch (error: any) {
                console.error(chalk.red('Error:'), error.message || error);
                process.exit(1);
            }
        });
}

function relevanceBar(score: number): string {
    const filled = Math.round(score / 5);
    const empty = 20 - filled;
    const color = score >= 70 ? chalk.green : score >= 40 ? chalk.yellow : chalk.red;
    return color('█'.repeat(filled) + '░'.repeat(empty));
}

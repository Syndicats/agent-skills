/**
 * `skills export` command — Export skills to different AI agent formats
 *
 * Follows the Agent Skills spec: .agentname/skills/skillname/SKILL.md
 * Supports all 42+ agents defined in agents.ts
 */
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { discoverSkills, loadSkill } from '../../core/index.js';
import { AGENTS } from '../agents.js';

export function registerExportCommand(program: Command) {
    // Build the list of valid agent names from AGENTS config
    const agentNames = Object.keys(AGENTS);

    program
        .command('export')
        .description('Export skills to different AI agent formats')
        .option(
            '-t, --target <agent>',
            `Target agent: ${agentNames.slice(0, 5).join(', ')}, ... or 'all' (default: all)`,
            'all'
        )
        .option('-d, --directory <dir>', 'Project directory', '.')
        .option('-n, --name <name>', 'Export specific skill only')
        .option('--list-agents', 'List all available agent targets')
        .action(async (options) => {
            try {
                const { mkdir, writeFile, cp } = await import('fs/promises');
                const { join } = await import('path');
                const { existsSync } = await import('fs');

                // --list-agents: show all available targets
                if (options.listAgents) {
                    console.log(chalk.bold('\n🤖 Available agent targets:\n'));
                    for (const [key, config] of Object.entries(AGENTS)) {
                        console.log(`  ${chalk.cyan(key.padEnd(20))} ${chalk.gray(config.displayName)} → ${chalk.dim(config.projectDir)}`);
                    }
                    console.log(chalk.dim(`\n  Total: ${agentNames.length} agents`));
                    console.log(chalk.dim(`  Use: skills export -t <agent-name>\n`));
                    return;
                }

                // Discover skills
                let skills = await discoverSkills();

                if (skills.length === 0) {
                    console.log(chalk.yellow('No skills found to export.'));
                    return;
                }

                // Filter if specific skill requested
                if (options.name) {
                    skills = skills.filter(s => s.name === options.name);
                    if (skills.length === 0) {
                        console.error(chalk.red(`Skill not found: ${options.name}`));
                        process.exit(1);
                    }
                }

                // Determine targets
                let targets: string[];
                if (options.target === 'all') {
                    targets = agentNames;
                } else {
                    // Support comma-separated: -t cursor,claude,copilot
                    targets = options.target.split(',').map((t: string) => t.trim());
                    for (const t of targets) {
                        if (!AGENTS[t]) {
                            console.error(chalk.red(`Unknown agent: ${t}`));
                            console.log(chalk.dim(`Run 'skills export --list-agents' to see all available agents`));
                            process.exit(1);
                        }
                    }
                }

                console.log(chalk.bold(`\nExporting ${skills.length} skill(s) to ${targets.length} agent(s)...\n`));

                let successCount = 0;

                for (const target of targets) {
                    const spinner = ora(`Exporting for ${target}...`).start();

                    try {
                        const config = AGENTS[target];
                        const skillsDir = join(options.directory, config.projectDir);

                        // Export each skill to: .agentname/skills/skillname/SKILL.md
                        for (const skillRef of skills) {
                            const skill = await loadSkill(skillRef.path);
                            if (!skill) continue;

                            const skillDir = join(skillsDir, skillRef.name);
                            await mkdir(skillDir, { recursive: true });

                            // Write SKILL.md with frontmatter
                            const content = `---\nname: ${skill.metadata.name}\ndescription: ${skill.metadata.description}\n---\n\n${skill.body}\n`;
                            await writeFile(join(skillDir, 'SKILL.md'), content);

                            // Copy optional directories (scripts/, references/, assets/) if they exist
                            const optionalDirs = ['scripts', 'references', 'assets'];
                            for (const dir of optionalDirs) {
                                const sourcePath = join(skillRef.path, dir);
                                if (existsSync(sourcePath)) {
                                    const destPath = join(skillDir, dir);
                                    await mkdir(destPath, { recursive: true });
                                    await cp(sourcePath, destPath, { recursive: true });
                                }
                            }
                        }

                        spinner.succeed(`${config.displayName}: ${config.projectDir}/<skill>/SKILL.md`);
                        successCount++;
                    } catch (err: any) {
                        spinner.fail(`${target}: ${err.message}`);
                    }
                }

                console.log(chalk.bold.green(`\n✨ Export complete! (${successCount}/${targets.length} agents)\n`));
            } catch (error) {
                console.error(chalk.red('Error exporting skills:'), error);
                process.exit(1);
            }
        });
}

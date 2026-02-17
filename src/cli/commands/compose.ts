/**
 * Compose Command
 * Merge multiple skills into a single super-skill.
 */
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';

export function registerComposeCommand(program: Command) {
    program
        .command('compose <skills...>')
        .description('Compose multiple skills into a single super-skill')
        .requiredOption('-o, --output <name>', 'Output skill name')
        .option('-s, --strategy <strategy>', 'Merge strategy: merge, chain, conditional', 'merge')
        .option('--no-dedup', 'Disable deduplication of similar bullets')
        .option('--save <dir>', 'Save composed skill to directory')
        .action(async (skills: string[], options: any) => {
            try {
                const { existsSync } = await import('fs');
                const { writeFile, mkdir } = await import('fs/promises');
                const { homedir } = await import('os');
                const { join } = await import('path');
                const { composeSkills } = await import('../../core/composer.js');

                const home = homedir();
                const skillsDir = join(home, '.antigravity', 'skills');

                // Resolve skill names to paths
                const resolvedPaths: string[] = [];
                for (const skill of skills) {
                    // Try global dir
                    const globalPath = join(skillsDir, skill);
                    if (existsSync(join(globalPath, 'SKILL.md'))) {
                        resolvedPaths.push(globalPath);
                        continue;
                    }
                    // Try project dir
                    const projectPath = join(process.cwd(), '.claude', 'skills', skill);
                    if (existsSync(join(projectPath, 'SKILL.md'))) {
                        resolvedPaths.push(projectPath);
                        continue;
                    }
                    // Try as direct path
                    if (existsSync(skill) || existsSync(join(skill, 'SKILL.md'))) {
                        resolvedPaths.push(skill);
                        continue;
                    }
                    console.error(chalk.red(`  ✗ Skill not found: ${skill}`));
                    return;
                }

                const spinner = ora(`Composing ${resolvedPaths.length} skills...`).start();

                const result = await composeSkills({
                    skills: resolvedPaths,
                    output: options.output,
                    strategy: options.strategy,
                    dedup: options.dedup !== false,
                });

                spinner.succeed(`Composed "${chalk.bold(result.name)}"`);
                console.log('');
                console.log(`  Source skills: ${result.sourceSkills.map(s => chalk.cyan(s)).join(', ')}`);
                console.log(`  Strategy:      ${chalk.bold(options.strategy)}`);
                console.log(`  Token count:   ${chalk.yellow(String(result.tokenCount))}`);
                if (result.deduplicatedCount > 0) {
                    console.log(`  Deduplicated:  ${chalk.green(String(result.deduplicatedCount))} redundant lines removed`);
                }

                // Save if --save specified
                const saveDir = options.save || join(skillsDir, result.name);
                await mkdir(saveDir, { recursive: true });
                await writeFile(join(saveDir, 'SKILL.md'), result.fullContent);
                console.log(`  Saved to:      ${chalk.gray(join(saveDir, 'SKILL.md'))}`);
                console.log('');
            } catch (error: any) {
                console.error(chalk.red('Error:'), error.message || error);
                process.exit(1);
            }
        });
}

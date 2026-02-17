/**
 * Skill Diff Command
 * Compare two skills side-by-side.
 */
import { Command } from 'commander';
import chalk from 'chalk';

export function registerDiffCommand(program: Command) {
    program
        .command('diff <skillA> <skillB>')
        .description('Compare two skills side-by-side (installed or paths)')
        .option('--json', 'Output as JSON')
        .action(async (skillA: string, skillB: string, options: any) => {
            try {
                const { existsSync } = await import('fs');
                const { readdir } = await import('fs/promises');
                const { homedir } = await import('os');
                const { join } = await import('path');
                const { diffSkills } = await import('../../core/differ.js');

                const home = homedir();
                const skillsDir = join(home, '.antigravity', 'skills');

                // Resolve skill paths (could be names or paths)
                const resolveSkill = async (input: string): Promise<string> => {
                    // If it's a path that exists, use directly
                    if (existsSync(input)) return input;
                    if (existsSync(join(input, 'SKILL.md'))) return input;

                    // Try to find in global skills dir
                    const globalPath = join(skillsDir, input);
                    if (existsSync(join(globalPath, 'SKILL.md'))) return globalPath;

                    // Try project-level
                    const projectPath = join(process.cwd(), '.claude', 'skills', input);
                    if (existsSync(join(projectPath, 'SKILL.md'))) return projectPath;

                    throw new Error(`Skill "${input}" not found. Provide a name or path.`);
                };

                const pathA = await resolveSkill(skillA);
                const pathB = await resolveSkill(skillB);

                const result = await diffSkills(pathA, pathB);

                if (options.json) {
                    console.log(JSON.stringify(result, null, 2));
                    return;
                }

                console.log(chalk.bold(`\n📊 Skill Diff: ${chalk.cyan(result.skillA)} vs ${chalk.cyan(result.skillB)}\n`));

                // Size comparison
                console.log(chalk.gray(`  ${result.skillA}: ${result.linesA} lines`));
                console.log(chalk.gray(`  ${result.skillB}: ${result.linesB} lines`));
                const tokenSign = result.tokenDelta >= 0 ? '+' : '';
                console.log(chalk.gray(`  Token delta: ${tokenSign}${result.tokenDelta}`));
                console.log('');

                // Added sections
                if (result.added.length > 0) {
                    console.log(chalk.green(`  ➕ Added (only in ${result.skillB}):`));
                    for (const h of result.added) {
                        console.log(chalk.green(`    + ${h}`));
                    }
                    console.log('');
                }

                // Removed sections
                if (result.removed.length > 0) {
                    console.log(chalk.red(`  ➖ Removed (only in ${result.skillA}):`));
                    for (const h of result.removed) {
                        console.log(chalk.red(`    - ${h}`));
                    }
                    console.log('');
                }

                // Changed sections
                if (result.changed.length > 0) {
                    console.log(chalk.yellow(`  ✏️  Changed (${result.changed.length}):`));
                    for (const diff of result.changed) {
                        console.log(`    ${chalk.bold(diff.heading)} ${chalk.gray(`(+${diff.linesAdded}/-${diff.linesRemoved} lines)`)}`);
                        if (diff.preview) {
                            for (const line of diff.preview.split('\n').slice(0, 4)) {
                                if (line.startsWith('+')) {
                                    console.log(`      ${chalk.green(line)}`);
                                } else if (line.startsWith('-')) {
                                    console.log(`      ${chalk.red(line)}`);
                                }
                            }
                        }
                    }
                    console.log('');
                }

                // Unchanged sections
                if (result.unchanged.length > 0) {
                    console.log(chalk.gray(`  ✓ Unchanged: ${result.unchanged.join(', ')}`));
                    console.log('');
                }

                // Summary
                const totalChanges = result.added.length + result.removed.length + result.changed.length;
                if (totalChanges === 0) {
                    console.log(chalk.green('  Skills are identical.\n'));
                } else {
                    console.log(chalk.gray(`  Total: ${totalChanges} differences found.\n`));
                }
            } catch (error: any) {
                console.error(chalk.red('Error:'), error.message || error);
                process.exit(1);
            }
        });
}

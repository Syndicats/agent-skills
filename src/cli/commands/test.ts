/**
 * Test Command
 * Run assertions and quality checks against installed skills.
 */
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';

export function registerTestCommand(program: Command) {
    program
        .command('test [skills...]')
        .description('Run quality tests and assertions against skills')
        .option('-a, --all', 'Test all installed skills')
        .option('--json', 'Output results as JSON')
        .option('-v, --verbose', 'Show all assertions (not just failures)')
        .action(async (skills: string[], options: any) => {
            try {
                const { existsSync } = await import('fs');
                const { readdir } = await import('fs/promises');
                const { homedir } = await import('os');
                const { join } = await import('path');
                const { testSkill, testSkills } = await import('../../core/skill-tester.js');

                const home = homedir();
                const skillsDir = join(home, '.antigravity', 'skills');

                let skillPaths: string[] = [];

                if (options.all) {
                    // Test all installed skills
                    if (existsSync(skillsDir)) {
                        const entries = await readdir(skillsDir, { withFileTypes: true });
                        for (const entry of entries) {
                            if (entry.isDirectory()) {
                                skillPaths.push(join(skillsDir, entry.name));
                            }
                        }
                    }
                } else if (skills.length > 0) {
                    for (const skill of skills) {
                        // Try as path
                        if (existsSync(skill)) {
                            skillPaths.push(skill);
                            continue;
                        }
                        // Try as name in global
                        const globalPath = join(skillsDir, skill);
                        if (existsSync(globalPath)) {
                            skillPaths.push(globalPath);
                            continue;
                        }
                        // Try project dir
                        const projectPath = join(process.cwd(), '.claude', 'skills', skill);
                        if (existsSync(projectPath)) {
                            skillPaths.push(projectPath);
                            continue;
                        }
                        console.error(chalk.red(`  ✗ Skill not found: ${skill}`));
                    }
                } else {
                    // Try project-level skills
                    const projectSkills = join(process.cwd(), '.claude', 'skills');
                    if (existsSync(projectSkills)) {
                        const entries = await readdir(projectSkills, { withFileTypes: true });
                        for (const entry of entries) {
                            if (entry.isDirectory()) {
                                skillPaths.push(join(projectSkills, entry.name));
                            }
                        }
                    }
                    if (skillPaths.length === 0) {
                        console.log(chalk.yellow('\n  No skills specified. Use --all or provide skill names.\n'));
                        return;
                    }
                }

                if (skillPaths.length === 0) {
                    console.log(chalk.yellow('\n  No skills found to test.\n'));
                    return;
                }

                const spinner = ora(`Testing ${skillPaths.length} skill(s)...`).start();
                const results = await testSkills(skillPaths);
                spinner.stop();

                if (options.json) {
                    console.log(JSON.stringify(results, null, 2));
                    return;
                }

                console.log(chalk.bold(`\n🧪 Skill Test Results\n`));

                let totalPassed = 0;
                let totalFailed = 0;

                for (const result of results) {
                    const icon = result.passed ? chalk.green('✓') : chalk.red('✗');
                    const rate = result.passRate >= 80
                        ? chalk.green(`${result.passRate}%`)
                        : result.passRate >= 60
                            ? chalk.yellow(`${result.passRate}%`)
                            : chalk.red(`${result.passRate}%`);

                    console.log(`  ${icon} ${chalk.bold(result.skillName)} ${rate} ${chalk.gray(`(${result.duration}ms)`)}`);

                    if (options.verbose || !result.passed) {
                        for (const assertion of result.assertions) {
                            if (options.verbose || !assertion.passed) {
                                const aIcon = assertion.passed ? chalk.green('  ✓') : chalk.red('  ✗');
                                const msg = assertion.passed
                                    ? chalk.gray(assertion.name)
                                    : `${chalk.red(assertion.name)}: ${chalk.gray(assertion.message || '')}`;
                                console.log(`    ${aIcon} ${msg}`);
                            }
                        }
                    }

                    if (result.passed) totalPassed++;
                    else totalFailed++;
                }

                console.log('');
                console.log(chalk.bold('  Summary:'));
                console.log(`    ${chalk.green(`${totalPassed} passed`)} / ${chalk.red(`${totalFailed} failed`)} / ${results.length} total`);
                console.log('');

                if (totalFailed > 0) {
                    process.exit(1);
                }
            } catch (error: any) {
                console.error(chalk.red('Error:'), error.message || error);
                process.exit(1);
            }
        });
}

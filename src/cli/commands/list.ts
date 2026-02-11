/**
 * `skills list` command — List all discovered skills
 */
import { Command } from 'commander';
import chalk from 'chalk';
import { discoverSkills } from '../../core/index.js';

export function registerListCommand(program: Command) {
    program
        .command('list')
        .description('List all discovered skills')
        .option('-p, --paths <paths...>', 'Custom search paths')
        .option('-v, --verbose', 'Show detailed information')
        .option('--json', 'Output as JSON')
        .option('--table', 'Output as ASCII table')
        .option('-q, --quiet', 'Output names only (for scripting)')
        .action(async (options) => {
            try {
                const config = options.paths ? { searchPaths: options.paths } : {};
                const skills = await discoverSkills(config);

                if (skills.length === 0) {
                    if (options.json) {
                        console.log(JSON.stringify({ skills: [], count: 0 }));
                    } else if (!options.quiet) {
                        console.log(chalk.yellow('No skills found.'));
                        console.log(chalk.gray('Skills are searched in:'));
                        console.log(chalk.gray('  - ~/.antigravity/skills/'));
                        console.log(chalk.gray('  - .antigravity/skills/'));
                        console.log(chalk.gray('  - ./skills/'));
                    }
                    return;
                }

                // JSON output
                if (options.json) {
                    console.log(JSON.stringify({
                        skills: skills.map(s => ({
                            name: s.name,
                            description: s.description,
                            path: s.path
                        })),
                        count: skills.length
                    }, null, 2));
                    return;
                }

                // Quiet output (names only)
                if (options.quiet) {
                    skills.forEach(s => console.log(s.name));
                    return;
                }

                // Table output
                if (options.table) {
                    const maxName = Math.max(...skills.map(s => s.name.length), 4);
                    const maxDesc = Math.min(Math.max(...skills.map(s => (s.description || '').length), 11), 50);

                    console.log('');
                    console.log(chalk.bold('Name'.padEnd(maxName + 2) + 'Description'));
                    console.log('─'.repeat(maxName + 2 + maxDesc));

                    for (const skill of skills) {
                        const desc = (skill.description || '').slice(0, 50);
                        console.log(chalk.cyan(skill.name.padEnd(maxName + 2)) + chalk.gray(desc));
                    }
                    console.log('');
                    return;
                }

                // Default output
                console.log(chalk.bold(`\nFound ${skills.length} skill(s):\n`));

                for (const skill of skills) {
                    console.log(chalk.cyan(`  ${skill.name}`));
                    if (options.verbose) {
                        console.log(chalk.gray(`    ${skill.description}`));
                        console.log(chalk.gray(`    Path: ${skill.path}`));
                    }
                }
                console.log('');
            } catch (error) {
                console.error(chalk.red('Error listing skills:'), error);
                process.exit(1);
            }
        });
}

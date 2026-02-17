/**
 * Split Command
 * Split a large skill into focused sub-skills.
 */
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';

export function registerSplitCommand(program: Command) {
    program
        .command('split <skill>')
        .description('Split a large skill into focused sub-skills by topic')
        .option('-m, --min-sections <n>', 'Minimum sections per sub-skill (default: 2)', parseInt)
        .option('--save <dir>', 'Save sub-skills to directory')
        .option('--dry-run', 'Only preview the split, do not save')
        .option('--json', 'Output as JSON')
        .action(async (skill: string, options: any) => {
            try {
                const { existsSync } = await import('fs');
                const { mkdir, writeFile } = await import('fs/promises');
                const { homedir } = await import('os');
                const { join } = await import('path');
                const { splitSkill } = await import('../../core/splitter.js');

                const home = homedir();
                const skillsDir = join(home, '.antigravity', 'skills');

                // Resolve skill path
                let skillPath = skill;
                if (!existsSync(skillPath) && !existsSync(join(skillPath, 'SKILL.md'))) {
                    // Try global
                    const globalPath = join(skillsDir, skill);
                    if (existsSync(join(globalPath, 'SKILL.md'))) {
                        skillPath = globalPath;
                    } else {
                        console.error(chalk.red(`  ✗ Skill not found: ${skill}\n`));
                        return;
                    }
                }

                const spinner = ora('Analyzing skill for splitting...').start();
                const result = await splitSkill(skillPath, options.minSections || 2);
                spinner.stop();

                if (options.json) {
                    console.log(JSON.stringify(result, null, 2));
                    return;
                }

                console.log(chalk.bold(`\n✂️  Skill Splitter: ${chalk.cyan(result.originalName)}\n`));
                console.log(chalk.gray(`  Original: ${result.originalTokens} tokens`));
                console.log('');

                if (!result.worthSplitting) {
                    console.log(chalk.yellow(`  ⚠ Not worth splitting: ${result.reason}\n`));
                    return;
                }

                console.log(chalk.green(`  Can be split into ${result.skills.length} sub-skills:\n`));

                for (const sub of result.skills) {
                    console.log(`  📦 ${chalk.bold(sub.name)} ${chalk.gray(`(${sub.tokens} tokens)`)}`);
                    console.log(`     Sections: ${sub.headings.join(', ')}`);
                    console.log('');
                }

                const totalTokens = result.skills.reduce((s, sk) => s + sk.tokens, 0);
                const savings = result.originalTokens - totalTokens;
                console.log(chalk.bold('  Summary:'));
                console.log(`    Original:    ${chalk.yellow(String(result.originalTokens))} tokens`);
                console.log(`    After split: ${chalk.green(String(totalTokens))} tokens total`);
                if (savings > 0) {
                    console.log(`    Overhead:    ${chalk.gray(`+${savings} tokens from frontmatter duplication`)}`);
                }
                console.log('');

                // Save if not dry run
                if (!options.dryRun && (options.save || !options.dryRun)) {
                    const saveDir = options.save || skillsDir;
                    for (const sub of result.skills) {
                        const subDir = join(saveDir, sub.name);
                        await mkdir(subDir, { recursive: true });
                        await writeFile(join(subDir, 'SKILL.md'), sub.fullContent);
                        console.log(`  ${chalk.green('✓')} Saved ${chalk.bold(sub.name)} → ${chalk.gray(join(subDir, 'SKILL.md'))}`);
                    }
                    console.log('');
                }
            } catch (error: any) {
                console.error(chalk.red('Error:'), error.message || error);
                process.exit(1);
            }
        });
}

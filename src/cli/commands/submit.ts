/**
 * Submit Command
 * Submit skills to the marketplace
 * (SkillKit calls this "publish submit" — we call it "submit")
 */

import chalk from 'chalk';
import ora from 'ora';
import { Command } from 'commander';
import { readFile, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, join, basename } from 'path';
import { loadSkill, validateMetadata, validateBody } from '../../core/index.js';

export interface SubmitOptions {
    dryRun?: boolean;
    name?: string;
}

// Supabase API for submission
const SUBMIT_API = 'https://www.agentskills.in/api/skills/submit';

/**
 * Register the submit command with commander
 */
export function registerSubmitCommand(program: Command): void {
    program
        .command('submit [path]')
        .description('Submit a skill to the Agent Skills marketplace')
        .option('-n, --dry-run', 'Preview what would be submitted without uploading')
        .option('--name <name>', 'Custom skill name (overrides SKILL.md name)')
        .action(async (path: string | undefined, options: SubmitOptions) => {
            try {
                await submitCommand(path || '.', options);
            } catch (err: any) {
                console.error(chalk.red('Error:'), err.message);
                process.exit(1);
            }
        });
}

/**
 * Run the submit command
 */
async function submitCommand(targetPath: string, options: SubmitOptions): Promise<void> {
    const resolvedPath = resolve(targetPath);

    // Step 1: Find and validate SKILL.md
    const spinner = ora('Validating skill...').start();

    let skillMdPath: string;
    const pathStat = await stat(resolvedPath);

    if (pathStat.isDirectory()) {
        skillMdPath = join(resolvedPath, 'SKILL.md');
    } else {
        skillMdPath = resolvedPath;
    }

    if (!existsSync(skillMdPath)) {
        spinner.fail('No SKILL.md found');
        console.log(chalk.dim(`  Looked in: ${skillMdPath}`));
        console.log(chalk.dim(`  Create one with: ${chalk.white('skills craft <name>')}`));
        process.exit(1);
    }

    // Load and validate
    const skillContent = await readFile(skillMdPath, 'utf-8');

    let skill;
    try {
        skill = await loadSkill(pathStat.isDirectory() ? resolvedPath : resolve(resolvedPath, '..'));
    } catch (err: any) {
        spinner.fail(`Failed to load skill: ${err.message}`);
        process.exit(1);
    }

    if (!skill) {
        spinner.fail('Could not parse skill from SKILL.md');
        process.exit(1);
    }

    // Validate metadata
    const metaResult = validateMetadata(skill.metadata);
    if (!metaResult.valid) {
        spinner.fail('Skill validation failed');
        console.log('');
        for (const error of metaResult.errors) {
            console.log(`  ${chalk.red('✖')} ${error.message}`);
        }
        console.log('');
        console.log(chalk.dim('Fix validation errors before submitting.'));
        process.exit(1);
    }

    // Validate body
    const bodyResult = validateBody(skill.body);
    if (!bodyResult.valid) {
        spinner.warn('Skill has body warnings');
        for (const warning of bodyResult.warnings || []) {
            console.log(`  ${chalk.yellow('⚠')} ${warning.message}`);
        }
    }

    spinner.succeed('Skill validated');
    console.log('');

    // Step 2: Extract metadata
    const skillName = options.name || skill.metadata?.name || basename(resolvedPath);
    const description = skill.metadata?.description || '';
    const tags: string[] = (skill.metadata?.metadata as any)?.tags || [];
    const version = (skill.metadata?.metadata as any)?.version || '1.0.0';

    // Display submission preview
    console.log(chalk.bold('📦 Submission Preview:'));
    console.log(`  ${chalk.dim('Name:')}         ${chalk.cyan(skillName)}`);
    console.log(`  ${chalk.dim('Description:')}  ${description || chalk.yellow('(none)')}`);
    console.log(`  ${chalk.dim('Version:')}      ${version}`);
    console.log(`  ${chalk.dim('Tags:')}         ${tags.length > 0 ? tags.join(', ') : chalk.yellow('(none)')}`);
    console.log(`  ${chalk.dim('Content:')}      ${skillContent.split('\n').length} lines`);
    console.log('');

    if (options.dryRun) {
        console.log(chalk.yellow('🏃 Dry run — skill was NOT submitted'));
        console.log(chalk.dim('  Remove --dry-run to submit for real'));
        return;
    }

    // Step 3: Submit to marketplace
    const submitSpinner = ora('Submitting to marketplace...').start();

    try {
        const response = await fetch(SUBMIT_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: skillName,
                description,
                tags,
                version,
                content: skillContent,
                source: resolvedPath,
            }),
        });

        if (response.ok) {
            const data = await response.json() as any;
            submitSpinner.succeed('Submitted successfully!');
            console.log('');
            console.log(chalk.green('✨ Your skill has been submitted for review!'));
            if (data?.url) {
                console.log(chalk.dim(`  View at: ${chalk.white(data.url)}`));
            }
            console.log(chalk.dim(`  Status: Pending review`));
        } else {
            const errorText = await response.text();
            submitSpinner.fail('Submission failed');
            console.log(chalk.red(`  Server responded: ${response.status} ${errorText}`));
            console.log('');
            console.log(chalk.dim('If this persists, submit via GitHub:'));
            console.log(chalk.dim('  https://github.com/Karanjot786/agent-skills-cli/issues/new'));
        }
    } catch (err: any) {
        submitSpinner.fail('Could not reach marketplace API');
        console.log(chalk.dim(`  ${err.message}`));
        console.log('');
        console.log(chalk.dim('Alternative: Submit via GitHub issue:'));
        console.log(chalk.dim(`  ${chalk.white('https://github.com/Karanjot786/agent-skills-cli/issues/new')}`));
    }

    console.log('');
}

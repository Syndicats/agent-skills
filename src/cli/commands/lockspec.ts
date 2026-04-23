/**
 * Lockspec Command
 * Team manifest — pin exact skill versions for reproducible environments
 * (SkillKit calls this "manifest" — we call it "lockspec")
 */

import chalk from 'chalk';
import ora from 'ora';
import { Command } from 'commander';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { readLock, listInstalledSkills, type LockEntry } from '../../core/skill-lock.js';

interface LockspecManifest {
    version: string;
    generatedAt: string;
    generatedBy: string;
    skills: LockspecEntry[];
}

interface LockspecEntry {
    name: string;
    scopedName: string;
    source: string;
    sourceType: string;
    version: string;
    agents: string[];
    checksum?: string;
}

const LOCKSPEC_FILE = 'skills.lockspec.json';

/**
 * Register the lockspec command
 */
export function registerLockspecCommand(program: Command): void {
    const lockspec = program
        .command('lockspec')
        .alias('ls')
        .description('Generate or apply a team skill manifest');

    lockspec
        .command('generate')
        .alias('gen')
        .description('Generate lockspec from currently installed skills')
        .option('-o, --output <path>', `Output file (default: ${LOCKSPEC_FILE})`)
        .action(async (options: { output?: string }) => {
            try {
                await lockspecGenerate(options.output);
            } catch (err: any) {
                console.error(chalk.red('Error:'), err.message);
                process.exit(1);
            }
        });

    lockspec
        .command('verify')
        .description('Verify current installation matches lockspec')
        .option('-f, --file <path>', `Lockspec file (default: ${LOCKSPEC_FILE})`)
        .action(async (options: { file?: string }) => {
            try {
                await lockspecVerify(options.file);
            } catch (err: any) {
                console.error(chalk.red('Error:'), err.message);
                process.exit(1);
            }
        });

    lockspec
        .command('diff')
        .description('Show differences between lockspec and installed skills')
        .option('-f, --file <path>', `Lockspec file (default: ${LOCKSPEC_FILE})`)
        .action(async (options: { file?: string }) => {
            try {
                await lockspecDiff(options.file);
            } catch (err: any) {
                console.error(chalk.red('Error:'), err.message);
                process.exit(1);
            }
        });
}

async function lockspecGenerate(outputPath?: string): Promise<void> {
    const spinner = ora('Reading installed skills...').start();

    const installed = await listInstalledSkills();

    if (installed.length === 0) {
        spinner.warn('No skills installed');
        return;
    }

    const manifest: LockspecManifest = {
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
        generatedBy: '@syndicats/agent-skills',
        skills: installed.map(s => ({
            name: s.name,
            scopedName: s.scopedName || s.name,
            source: s.source,
            sourceType: s.sourceType,
            version: s.version || 'latest',
            agents: s.agents,
        })),
    };

    const filePath = resolve(outputPath || LOCKSPEC_FILE);
    await writeFile(filePath, JSON.stringify(manifest, null, 2));

    spinner.succeed(`Generated lockspec with ${manifest.skills.length} skill(s)`);
    console.log('');
    console.log(`  ${chalk.dim('File:')} ${chalk.cyan(filePath)}`);
    console.log(`  ${chalk.dim('Skills:')} ${manifest.skills.length}`);
    console.log('');

    for (const skill of manifest.skills) {
        console.log(`  ${chalk.green('◆')} ${skill.scopedName} ${chalk.dim(`v${skill.version}`)} ${chalk.dim(`→ ${skill.agents.join(', ')}`)}`);
    }

    console.log('');
    console.log(chalk.dim('Commit this file to share with your team.'));
    console.log('');
}

async function lockspecVerify(filePath?: string): Promise<void> {
    const lockspecPath = resolve(filePath || LOCKSPEC_FILE);

    if (!existsSync(lockspecPath)) {
        console.error(chalk.red(`Lockspec not found: ${lockspecPath}`));
        console.log(chalk.dim('Generate one with: skills lockspec generate'));
        process.exit(1);
    }

    const spinner = ora('Verifying installation...').start();

    const manifest: LockspecManifest = JSON.parse(await readFile(lockspecPath, 'utf-8'));
    const installed = await listInstalledSkills();
    const installedNames = new Set(installed.map(s => s.name));

    let matches = 0;
    let missing = 0;
    let extra = 0;

    for (const spec of manifest.skills) {
        if (installedNames.has(spec.name)) {
            matches++;
        } else {
            missing++;
        }
    }

    const specNames = new Set(manifest.skills.map(s => s.name));
    for (const inst of installed) {
        if (!specNames.has(inst.name)) {
            extra++;
        }
    }

    if (missing === 0 && extra === 0) {
        spinner.succeed(chalk.green('Installation matches lockspec ✓'));
    } else {
        spinner.warn('Installation differs from lockspec');
        console.log('');
        if (missing > 0) console.log(chalk.red(`  ${missing} missing skill(s)`));
        if (extra > 0) console.log(chalk.yellow(`  ${extra} extra skill(s) not in lockspec`));
        console.log(chalk.dim(`  ${matches} skill(s) match`));
    }
    console.log('');
}

async function lockspecDiff(filePath?: string): Promise<void> {
    const lockspecPath = resolve(filePath || LOCKSPEC_FILE);

    if (!existsSync(lockspecPath)) {
        console.error(chalk.red(`Lockspec not found: ${lockspecPath}`));
        process.exit(1);
    }

    const manifest: LockspecManifest = JSON.parse(await readFile(lockspecPath, 'utf-8'));
    const installed = await listInstalledSkills();

    const installedMap = new Map(installed.map(s => [s.name, s]));
    const specMap = new Map(manifest.skills.map(s => [s.name, s]));

    console.log('');
    console.log(chalk.bold('📋 Lockspec Diff'));
    console.log('');

    let hasDiff = false;

    // Missing from installation
    for (const [name, spec] of specMap) {
        if (!installedMap.has(name)) {
            console.log(`  ${chalk.red('- MISSING')}  ${spec.scopedName} ${chalk.dim(`v${spec.version}`)}`);
            hasDiff = true;
        }
    }

    // Extra in installation
    for (const [name, inst] of installedMap) {
        if (!specMap.has(name)) {
            console.log(`  ${chalk.green('+ EXTRA')}    ${inst.scopedName || inst.name} ${chalk.dim(`v${inst.version || '?'}`)}`);
            hasDiff = true;
        }
    }

    // Version mismatches
    for (const [name, spec] of specMap) {
        const inst = installedMap.get(name);
        if (inst && inst.version !== spec.version && spec.version !== 'latest') {
            console.log(`  ${chalk.yellow('~ VERSION')} ${spec.scopedName} ${chalk.dim(`spec:${spec.version} installed:${inst.version || '?'}`)}`);
            hasDiff = true;
        }
    }

    if (!hasDiff) {
        console.log(chalk.green('  No differences — installation matches lockspec'));
    }

    console.log('');
}

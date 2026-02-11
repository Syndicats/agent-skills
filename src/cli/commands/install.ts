/**
 * `skills install` command — Install skills from various sources
 */
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import * as p from '@clack/prompts';
import { AGENTS, AgentConfig } from '../agents.js';
import {
    addSkillToLock,
    createLockEntry,
    installFromGitHubUrl,
    getSkillByScoped,
    fetchSkillsForCLI,
} from '../../core/index.js';
import { trackCommand } from '../../core/telemetry.js';

/** Install a skill from its database record into a target directory */
async function installSkillFromDatabase(skill: any, targetDir: string): Promise<string> {
    const githubUrl = skill.github_url || skill.githubUrl;
    if (githubUrl) {
        const result = await installFromGitHubUrl(githubUrl, targetDir);
        return result.path;
    }
    throw new Error(`No GitHub URL found for skill ${skill.name}`);
}

export function registerInstallCommand(program: Command) {
    program
        .command('install [source]')
        .alias('i')
        .alias('add')
        .description('Install skill(s) from marketplace, GitHub URL, or local directory')
        .option('-g, --global', 'Install globally (user-wide)')
        .option('-s, --skill <skills...>', 'Specify skill names to install')
        .option('-a, --agent <agents...>', 'Specify agents to install to')
        .option('--all', 'Install to all agents')
        .option('-y, --yes', 'Skip confirmation prompts')
        .action(async (source, options) => {
            try {
                const { mkdir, cp, rm, readdir, readFile } = await import('fs/promises');
                const { existsSync, statSync } = await import('fs');
                const { join, basename, dirname } = await import('path');
                const { tmpdir } = await import('os');
                const { exec } = await import('child_process');
                const { promisify } = await import('util');
                const execAsync = promisify(exec);

                const isGlobal = options.global || false;

                // Determine agents
                let agents: string[] = options.agent || [];

                // --all flag: install to all agents
                if (options.all) {
                    agents = Object.keys(AGENTS);
                }

                if (agents.length === 0) {
                    const agentChoices = Object.entries(AGENTS).map(([key, config]: [string, AgentConfig]) => ({
                        label: config.displayName,
                        value: key,
                        hint: config.projectDir,
                    }));

                    const selected = await p.multiselect({
                        message: 'Install to which agents?',
                        options: agentChoices,
                        initialValues: ['cursor', 'claude'],
                        required: true,
                    });

                    if (p.isCancel(selected)) {
                        p.cancel('Installation cancelled');
                        return;
                    }
                    agents = selected as string[];
                }

                // If no source, try to detect or prompt
                if (!source) {
                    // Check if there's a skills.lock for reinstalling
                    const { readLock } = await import('../../core/index.js');
                    const lock = await readLock();
                    const lockSkills = Object.values(lock.skills);

                    if (lockSkills.length > 0 && !options.skill) {
                        const { reinstall } = await inquirer.prompt([{
                            type: 'confirm',
                            name: 'reinstall',
                            message: `Found ${lockSkills.length} skills in lock file. Reinstall all?`,
                            default: true
                        }]);

                        if (reinstall) {
                            source = 'lock';
                        }
                    }

                    if (!source && !options.skill) {
                        console.log(chalk.yellow('\nUsage:'));
                        console.log(chalk.gray('  skills install <owner/repo>      Install from GitHub'));
                        console.log(chalk.gray('  skills install <url>             Install from URL'));
                        console.log(chalk.gray('  skills install .                 Install from current directory'));
                        console.log(chalk.gray('  skills install -s <name>         Install from marketplace by name'));
                        console.log(chalk.gray('  skills install                   Reinstall from lock file'));
                        return;
                    }
                }

                // Install from lock file
                if (source === 'lock') {
                    const { readLock } = await import('../../core/index.js');
                    const lock = await readLock();
                    const lockSkills = Object.values(lock.skills);

                    console.log(chalk.bold(`\n📦 Reinstalling ${lockSkills.length} skills from lock file...\n`));

                    let successCount = 0;
                    for (const lockSkill of lockSkills) {
                        const spinner = ora(`Installing ${lockSkill.scopedName}...`).start();
                        try {
                            for (const agent of lockSkill.agents) {
                                const config = AGENTS[agent];
                                if (!config) continue;

                                const targetDir = lockSkill.isGlobal ? config.globalDir : config.projectDir;

                                if (lockSkill.sourceType === 'github' || lockSkill.sourceType === 'gitlab') {
                                    const tempDir = join(tmpdir(), `skill-install-${Date.now()}`);
                                    await mkdir(tempDir, { recursive: true });
                                    await execAsync(`git clone --depth 1 ${lockSkill.source} .`, { cwd: tempDir });

                                    const skillDir = join(targetDir, lockSkill.name);
                                    await mkdir(skillDir, { recursive: true });
                                    await cp(tempDir, skillDir, { recursive: true });
                                    await rm(tempDir, { recursive: true, force: true }).catch(() => { });
                                }
                            }
                            spinner.succeed(`${lockSkill.scopedName}`);
                            successCount++;
                        } catch (err: any) {
                            spinner.fail(`${lockSkill.scopedName}: ${err.message}`);
                        }
                    }

                    console.log(chalk.bold.green(`\n✨ Reinstalled ${successCount}/${lockSkills.length} skills\n`));
                    return;
                }

                // Install by marketplace name(s) using -s flag
                if (options.skill && options.skill.length > 0) {
                    const skillNames = options.skill;

                    for (const skillName of skillNames) {
                        const spinner = ora(`Searching for ${skillName}...`).start();
                        try {
                            // Try exact match first
                            let skill = await getSkillByScoped(skillName);

                            if (!skill) {
                                // Search by name
                                const result = await fetchSkillsForCLI({ search: skillName, limit: 1, sortBy: 'stars' });
                                if (result.skills.length > 0) {
                                    skill = result.skills[0] as any;
                                }
                            }

                            if (!skill) {
                                spinner.fail(`Skill not found: ${skillName}`);
                                continue;
                            }

                            spinner.text = `Installing ${(skill as any).scoped_name || skill.name}...`;

                            for (const agent of agents) {
                                const config = AGENTS[agent];
                                const targetDir = isGlobal ? config.globalDir : config.projectDir;
                                await installSkillFromDatabase(skill as any, targetDir);
                            }

                            // Add to lock
                            const lockEntry = createLockEntry({
                                name: skill.name,
                                scopedName: (skill as any).scoped_name || skill.name,
                                source: (skill as any).github_url || `database:${skill.name}`,
                                sourceType: (skill as any).github_url ? 'github' : 'database',
                                version: (skill as any).version,
                                agents,
                                canonicalPath: isGlobal ? AGENTS[agents[0]].globalDir : AGENTS[agents[0]].projectDir,
                                isGlobal,
                            });
                            await addSkillToLock(lockEntry);

                            spinner.succeed(`Installed ${(skill as any).scoped_name || skill.name}`);
                        } catch (err: any) {
                            spinner.fail(`${skillName}: ${err.message}`);
                        }
                    }

                    console.log('');
                    return;
                }

                // Install from local directory
                if (source === '.' || existsSync(source)) {
                    const sourcePath = source === '.' ? process.cwd() : source;
                    const stat = statSync(sourcePath);

                    if (!stat.isDirectory()) {
                        console.error(chalk.red('Source must be a directory'));
                        return;
                    }

                    const skillName = basename(sourcePath);
                    console.log(chalk.bold(`\n📦 Installing from local directory: ${skillName}\n`));

                    for (const agent of agents) {
                        const config = AGENTS[agent];
                        const targetDir = isGlobal ? config.globalDir : config.projectDir;
                        const skillDir = join(targetDir, skillName);

                        const spinner = ora(`Installing to ${config.displayName}...`).start();
                        await mkdir(skillDir, { recursive: true });
                        await cp(sourcePath, skillDir, { recursive: true });
                        spinner.succeed(`${config.displayName}: ${skillDir}`);
                    }

                    // Add to lock
                    const lockEntry = createLockEntry({
                        name: skillName,
                        scopedName: skillName,
                        source: sourcePath,
                        sourceType: 'local',
                        agents,
                        canonicalPath: sourcePath,
                        isGlobal,
                    });
                    await addSkillToLock(lockEntry);

                    console.log(chalk.bold.green(`\n✨ Installed ${skillName}\n`));
                    return;
                }

                // Install from GitHub URL or owner/repo
                let githubUrl = source;

                // Handle @scoped/name format — try marketplace first
                if (source.startsWith('@')) {
                    const spinner = ora(`Looking up "${source}" in marketplace...`).start();
                    try {
                        const skill = await getSkillByScoped(source);

                        if (skill) {
                            spinner.text = `Installing ${(skill as any).scoped_name || skill.name}...`;

                            for (const agent of agents) {
                                const config = AGENTS[agent];
                                const targetDir = isGlobal ? config.globalDir : config.projectDir;
                                await installSkillFromDatabase(skill as any, targetDir);
                            }

                            const lockEntry = createLockEntry({
                                name: skill.name,
                                scopedName: (skill as any).scoped_name || skill.name,
                                source: (skill as any).github_url || `database:${skill.name}`,
                                sourceType: (skill as any).github_url ? 'github' : 'database',
                                version: (skill as any).version,
                                agents,
                                canonicalPath: isGlobal ? AGENTS[agents[0]].globalDir : AGENTS[agents[0]].projectDir,
                                isGlobal,
                            });
                            await addSkillToLock(lockEntry);

                            spinner.succeed(`Installed ${(skill as any).scoped_name || skill.name}`);
                            console.log('');
                            return;
                        } else {
                            spinner.fail(`Could not find "${source}" in marketplace`);
                            return;
                        }
                    } catch (err: any) {
                        spinner.fail(`Error: ${err.message}`);
                        return;
                    }
                }

                // Convert owner/repo to full URL
                if (source.match(/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/)) {
                    githubUrl = `https://github.com/${source}`;
                }

                // Validate it's a git URL
                if (!githubUrl.includes('github.com') && !githubUrl.includes('gitlab.com')) {
                    // Maybe it's a marketplace ID?
                    const spinner = ora(`Looking up "${source}" in marketplace...`).start();
                    try {
                        let skill = await getSkillByScoped(source);
                        if (!skill) {
                            const result = await fetchSkillsForCLI({ search: source, limit: 1, sortBy: 'stars' });
                            if (result.skills.length > 0) {
                                skill = result.skills[0] as any;
                            }
                        }

                        if (skill) {
                            spinner.text = `Installing ${(skill as any).scoped_name || skill.name}...`;

                            for (const agent of agents) {
                                const config = AGENTS[agent];
                                const targetDir = isGlobal ? config.globalDir : config.projectDir;
                                await installSkillFromDatabase(skill as any, targetDir);
                            }

                            const lockEntry = createLockEntry({
                                name: skill.name,
                                scopedName: (skill as any).scoped_name || skill.name,
                                source: (skill as any).github_url || `database:${skill.name}`,
                                sourceType: (skill as any).github_url ? 'github' : 'database',
                                version: (skill as any).version,
                                agents,
                                canonicalPath: isGlobal ? AGENTS[agents[0]].globalDir : AGENTS[agents[0]].projectDir,
                                isGlobal,
                            });
                            await addSkillToLock(lockEntry);

                            spinner.succeed(`Installed ${(skill as any).scoped_name || skill.name}`);
                            console.log('');
                            return;
                        } else {
                            spinner.fail(`Could not find "${source}" in marketplace or as a URL`);
                            return;
                        }
                    } catch (err: any) {
                        spinner.fail(`Error: ${err.message}`);
                        return;
                    }
                }

                // Git clone install
                console.log(chalk.bold(`\n📦 Installing from ${githubUrl}\n`));

                const tempDir = join(tmpdir(), `skill-install-${Date.now()}`);
                await mkdir(tempDir, { recursive: true });

                const cloneSpinner = ora('Cloning repository...').start();
                await execAsync(`git clone --depth 1 ${githubUrl} .`, { cwd: tempDir });
                cloneSpinner.succeed('Cloned');

                // Detect skills in repo
                const entries = await readdir(tempDir, { withFileTypes: true });
                let skillDirs: string[] = [];

                // Check if root is a skill
                if (existsSync(join(tempDir, 'SKILL.md'))) {
                    skillDirs.push(tempDir);
                }

                // Check subdirectories
                for (const entry of entries) {
                    if (entry.isDirectory() && !entry.name.startsWith('.')) {
                        if (existsSync(join(tempDir, entry.name, 'SKILL.md'))) {
                            skillDirs.push(join(tempDir, entry.name));
                        }
                    }
                }

                if (skillDirs.length === 0) {
                    // Treat entire repo as a skill
                    skillDirs.push(tempDir);
                }

                const repoName = githubUrl.split('/').pop()?.replace('.git', '') || 'skill';

                for (const skillSourceDir of skillDirs) {
                    const skillName = skillSourceDir === tempDir ? repoName : basename(skillSourceDir);

                    for (const agent of agents) {
                        const config = AGENTS[agent];
                        const targetDir = isGlobal ? config.globalDir : config.projectDir;
                        const skillDir = join(targetDir, skillName);

                        const spinner = ora(`Installing ${skillName} to ${config.displayName}...`).start();
                        await mkdir(skillDir, { recursive: true });
                        await cp(skillSourceDir, skillDir, { recursive: true });
                        spinner.succeed(`${config.displayName}: ${skillDir}`);
                    }

                    // Get version
                    let version: string | undefined;
                    try {
                        const { stdout } = await execAsync('git rev-parse HEAD', { cwd: tempDir });
                        version = stdout.trim();
                    } catch { }

                    // Add to lock
                    const lockEntry = createLockEntry({
                        name: skillName,
                        scopedName: `${githubUrl.split('/').slice(-2).join('/')}/${skillName}`,
                        source: githubUrl,
                        sourceType: githubUrl.includes('gitlab') ? 'gitlab' : 'github',
                        version,
                        agents,
                        canonicalPath: isGlobal ? AGENTS[agents[0]].globalDir : AGENTS[agents[0]].projectDir,
                        isGlobal,
                    });
                    await addSkillToLock(lockEntry);
                }

                // Cleanup
                await rm(tempDir, { recursive: true, force: true }).catch(() => { });

                console.log(chalk.bold.green(`\n✨ Installed ${skillDirs.length} skill(s)\n`));

                trackCommand('install', `source=${githubUrl} count=${skillDirs.length}`);
            } catch (error: any) {
                console.error(chalk.red('Error installing skill:'), error.message || error);
                process.exit(1);
            }
        });
}

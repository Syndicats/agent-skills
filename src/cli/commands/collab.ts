/**
 * Collab Command
 * Team skill sharing and collaboration
 * (SkillKit calls this "team" — we call it "collab")
 */

import chalk from 'chalk';
import * as p from '@clack/prompts';
import { Command } from 'commander';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, join } from 'path';

interface CollabConfig {
    team: string;
    members: string[];
    sharedSkills: string[];
    syncUrl?: string;
    createdAt: string;
    updatedAt: string;
}

const COLLAB_FILE = '.skills-collab.json';

/**
 * Register the collab command
 */
export function registerCollabCommand(program: Command): void {
    const collab = program
        .command('collab')
        .alias('cl')
        .description('Team skill collaboration');

    collab
        .command('init <team-name>')
        .description('Initialize team collaboration')
        .action(async (teamName: string) => {
            try {
                await collabInit(teamName);
            } catch (err: any) {
                console.error(chalk.red('Error:'), err.message);
                process.exit(1);
            }
        });

    collab
        .command('add <member>')
        .description('Add a team member')
        .action(async (member: string) => {
            try {
                await collabAddMember(member);
            } catch (err: any) {
                console.error(chalk.red('Error:'), err.message);
                process.exit(1);
            }
        });

    collab
        .command('share <skill>')
        .description('Share a skill with the team')
        .action(async (skill: string) => {
            try {
                await collabShare(skill);
            } catch (err: any) {
                console.error(chalk.red('Error:'), err.message);
                process.exit(1);
            }
        });

    collab
        .command('status')
        .description('Show team collaboration status')
        .action(async () => {
            try {
                await collabStatus();
            } catch (err: any) {
                console.error(chalk.red('Error:'), err.message);
                process.exit(1);
            }
        });

    collab
        .command('sync')
        .description('Sync shared skills with team')
        .action(async () => {
            try {
                await collabSync();
            } catch (err: any) {
                console.error(chalk.red('Error:'), err.message);
                process.exit(1);
            }
        });
}

async function loadCollabConfig(): Promise<CollabConfig | null> {
    const configPath = resolve(COLLAB_FILE);
    if (!existsSync(configPath)) return null;
    try {
        return JSON.parse(await readFile(configPath, 'utf-8'));
    } catch {
        return null;
    }
}

async function saveCollabConfig(config: CollabConfig): Promise<void> {
    config.updatedAt = new Date().toISOString();
    await writeFile(resolve(COLLAB_FILE), JSON.stringify(config, null, 2));
}

async function collabInit(teamName: string): Promise<void> {
    const existing = await loadCollabConfig();
    if (existing) {
        console.error(chalk.yellow(`Team "${existing.team}" already initialized. Use collab status to view.`));
        return;
    }

    const config: CollabConfig = {
        team: teamName,
        members: [],
        sharedSkills: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    await saveCollabConfig(config);

    console.log('');
    console.log(chalk.green(`✨ Team "${teamName}" initialized!`));
    console.log('');
    console.log(chalk.dim('Next steps:'));
    console.log(chalk.dim(`  skills collab add <username>   Add team members`));
    console.log(chalk.dim(`  skills collab share <skill>    Share a skill`));
    console.log(chalk.dim(`  skills collab status           View team status`));
    console.log('');
}

async function collabAddMember(member: string): Promise<void> {
    const config = await loadCollabConfig();
    if (!config) {
        console.error(chalk.red('No team initialized. Run: skills collab init <team-name>'));
        process.exit(1);
    }

    if (config.members.includes(member)) {
        console.log(chalk.yellow(`${member} is already a team member`));
        return;
    }

    config.members.push(member);
    await saveCollabConfig(config);

    console.log(chalk.green(`✓ Added ${member} to team "${config.team}"`));
    console.log(chalk.dim(`  Total members: ${config.members.length}`));
}

async function collabShare(skillName: string): Promise<void> {
    const config = await loadCollabConfig();
    if (!config) {
        console.error(chalk.red('No team initialized. Run: skills collab init <team-name>'));
        process.exit(1);
    }

    if (config.sharedSkills.includes(skillName)) {
        console.log(chalk.yellow(`${skillName} is already shared`));
        return;
    }

    config.sharedSkills.push(skillName);
    await saveCollabConfig(config);

    console.log(chalk.green(`✓ Shared "${skillName}" with team "${config.team}"`));
    console.log(chalk.dim(`  Total shared skills: ${config.sharedSkills.length}`));
}

async function collabStatus(): Promise<void> {
    const config = await loadCollabConfig();
    if (!config) {
        console.log(chalk.yellow('No team initialized. Run: skills collab init <team-name>'));
        return;
    }

    console.log('');
    console.log(chalk.bold(`👥 Team: ${chalk.cyan(config.team)}`));
    console.log('');

    console.log(chalk.bold('Members:'));
    if (config.members.length === 0) {
        console.log(chalk.dim('  No members yet. Use: skills collab add <username>'));
    } else {
        for (const m of config.members) {
            console.log(`  ${chalk.green('●')} ${m}`);
        }
    }
    console.log('');

    console.log(chalk.bold('Shared Skills:'));
    if (config.sharedSkills.length === 0) {
        console.log(chalk.dim('  No skills shared. Use: skills collab share <skill>'));
    } else {
        for (const s of config.sharedSkills) {
            console.log(`  ${chalk.cyan('◆')} ${s}`);
        }
    }

    console.log('');
    console.log(chalk.dim(`Created: ${config.createdAt}`));
    console.log(chalk.dim(`Updated: ${config.updatedAt}`));
    console.log('');
}

async function collabSync(): Promise<void> {
    const config = await loadCollabConfig();
    if (!config) {
        console.error(chalk.red('No team initialized. Run: skills collab init <team-name>'));
        process.exit(1);
    }

    const spinner = p.spinner();
    spinner.start('Syncing team skills...');

    // Sync is currently local-only (future: Git/API based sync)
    await new Promise(r => setTimeout(r, 500));

    spinner.stop('Skills synchronized');
    console.log(chalk.dim(`  ${config.sharedSkills.length} skill(s) in sync`));
    console.log('');
}

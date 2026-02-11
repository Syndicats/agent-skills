/**
 * `skills search` command — Search and install skills from marketplace (67K+ skills)
 */
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { fetchSkillsForCLI, installFromGitHubUrl, searchSkills } from '../../core/index.js';
import { AGENTS, AgentConfig } from '../agents.js';
import { fzfSearch } from '../fzf-search.js';

/** Install a skill from its database record into a target directory */
async function installSkillFromDatabase(skill: any, targetDir: string): Promise<string> {
    const githubUrl = skill.github_url || skill.githubUrl;
    if (githubUrl) {
        const result = await installFromGitHubUrl(githubUrl, targetDir);
        return result.path;
    }
    throw new Error(`No GitHub URL found for skill ${skill.name}`);
}

export function registerSearchInstallCommand(program: Command) {
    program
        .command('search [query...]')
        .alias('s')
        .description('Search and install skills from marketplace (67K+ skills)')
        .option('-l, --limit <n>', 'Maximum results to show', '20')
        .option('-s, --sort <by>', 'Sort by: stars, recent, name', 'stars')
        .option('-i, --interactive', 'Launch interactive FZF-style search')
        .option('--json', 'Output as JSON for scripting (no interactive prompt)')
        .action(async (queryParts, options) => {
            try {
                // Interactive FZF mode
                if (options.interactive || (queryParts.length === 0 && !options.json)) {
                    await fzfSearch();
                    return;
                }

                const query = queryParts.join(' ');
                const limit = parseInt(options.limit) || 20;
                const sortBy = options.sort || 'stars';

                const spinner = ora('Searching marketplace...').start();

                let skills: any[] = [];
                let total = 0;
                try {
                    const result = await fetchSkillsForCLI({ search: query || undefined, limit, sortBy });
                    skills = result.skills;
                    total = result.total;
                } catch {
                    // Fallback to GitHub search
                    const results = await searchSkills(query);
                    skills = results.slice(0, limit);
                    total = results.length;
                }

                spinner.stop();

                if (skills.length === 0) {
                    console.log(chalk.yellow(`\nNo skills found${query ? ` for "${query}"` : ''}.`));
                    return;
                }

                // JSON output (no interactive prompt)
                if (options.json) {
                    console.log(JSON.stringify({ skills, total, query }, null, 2));
                    return;
                }

                console.log(chalk.bold(`\n🔍 ${total.toLocaleString()} skills found${query ? ` for "${query}"` : ''}\n`));

                // Display results with install option
                const choices = skills.map((skill: any, i: number) => {
                    const stars = skill.stars ? chalk.yellow(`⭐${skill.stars.toLocaleString()}`) : '';
                    const desc = skill.description ? skill.description.slice(0, 50) : '';
                    return {
                        name: `${chalk.cyan(skill.scoped_name || skill.name)} ${stars}\n    ${chalk.gray(desc)}`,
                        value: skill,
                        short: skill.scoped_name || skill.name
                    };
                });

                choices.push({ name: chalk.gray('Skip'), value: null, short: 'Skip' } as any);

                const { selected } = await inquirer.prompt([{
                    type: 'list',
                    name: 'selected',
                    message: 'Select skill to install (or skip):',
                    choices,
                    pageSize: 15
                }]);

                if (!selected) return;

                // Select agents
                const agentChoices = Object.entries(AGENTS).map(([key, config]: [string, AgentConfig]) => ({
                    name: config.displayName,
                    value: key,
                    checked: key === 'cursor' || key === 'claude'
                }));

                const { agents } = await inquirer.prompt([{
                    type: 'checkbox',
                    name: 'agents',
                    message: 'Install to which agents?',
                    choices: agentChoices
                }]);

                if (agents.length === 0) {
                    console.log(chalk.yellow('No agents selected.'));
                    return;
                }

                // Select scope
                const { scope } = await inquirer.prompt([{
                    type: 'list',
                    name: 'scope',
                    message: 'Install scope:',
                    choices: [
                        { name: 'Global (~/.agent/skills)', value: 'global' },
                        { name: 'Project (.agent/skills)', value: 'project' }
                    ]
                }]);

                const isGlobal = scope === 'global';

                // Install the skill
                const installSpinner = ora(`Installing ${selected.scoped_name || selected.name}...`).start();

                try {
                    const { addSkillToLock, createLockEntry } = await import('../../core/index.js');

                    let installDir: string;
                    if (selected.github_url || selected.raw_url) {
                        // Install from GitHub URL
                        const url = selected.github_url || selected.raw_url;
                        for (const agent of agents) {
                            const config = AGENTS[agent];
                            const targetDir = isGlobal ? config.globalDir : config.projectDir;
                            const { mkdir, cp, rm } = await import('fs/promises');
                            const { tmpdir } = await import('os');
                            const { join } = await import('path');
                            const { exec } = await import('child_process');
                            const { promisify } = await import('util');
                            const execAsync = promisify(exec);

                            const tempDir = join(tmpdir(), `skill-install-${Date.now()}`);
                            await mkdir(tempDir, { recursive: true });
                            await execAsync(`git clone --depth 1 ${url} .`, { cwd: tempDir });

                            const skillName = selected.name || url.split('/').pop();
                            const skillDir = join(targetDir, skillName);
                            await mkdir(skillDir, { recursive: true });
                            await cp(tempDir, skillDir, { recursive: true });
                            await rm(tempDir, { recursive: true, force: true }).catch(() => { });

                            installDir = skillDir;
                        }
                    } else {
                        // Database-based install
                        for (const agent of agents) {
                            const config = AGENTS[agent];
                            const targetDir = isGlobal ? config.globalDir : config.projectDir;
                            installDir = await installSkillFromDatabase(selected, targetDir);
                        }
                    }

                    // Add to lock file
                    const lockEntry = createLockEntry({
                        name: selected.name,
                        scopedName: selected.scoped_name || selected.name,
                        source: selected.github_url || selected.raw_url || `database:${selected.name}`,
                        sourceType: selected.github_url ? 'github' : 'database',
                        version: selected.version,
                        agents,
                        canonicalPath: installDir!,
                        isGlobal,
                    });
                    await addSkillToLock(lockEntry);

                    installSpinner.succeed(`Installed ${selected.scoped_name || selected.name}`);

                    for (const agent of agents) {
                        const config = AGENTS[agent];
                        const dir = isGlobal ? config.globalDir : config.projectDir;
                        console.log(chalk.gray(`  → ${config.displayName}: ${dir}/${selected.name}`));
                    }
                    console.log('');
                } catch (err: any) {
                    installSpinner.fail(`Failed to install: ${err.message || err}`);
                }
            } catch (error) {
                console.error(chalk.red('Error:'), error);
                process.exit(1);
            }
        });
}

/**
 * Interactive wizard commands — install-wizard, export-interactive, setup
 * Also: run, context, preview, scripts, completion, info
 */
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import {
    discoverSkills,
    loadSkill,
    generateSkillsPromptXML,
    generateFullSkillsContext,
} from '../../core/index.js';
import { AGENTS } from '../agents.js';

type AgentTarget = 'copilot' | 'cursor' | 'claude' | 'codex' | 'antigravity';

/** Helper used by interactive wizard flows */
async function exportToAgent(
    target: AgentTarget,
    skillRefs: Array<{ name: string; description: string; path: string }>,
    projectDir: string,
    fs: any
) {
    const loadedSkills = [];
    for (const ref of skillRefs) {
        const skill = await loadSkill(ref.path);
        if (skill) loadedSkills.push(skill);
    }

    const exportFns: Record<AgentTarget, (s: any[], d: string, f: any) => Promise<void>> = {
        copilot: exportToCopilot,
        cursor: exportToCursor,
        claude: exportToClaude,
        codex: exportToCodex,
        antigravity: exportToAntigravity,
    };

    const fn = exportFns[target];
    if (fn) await fn(loadedSkills, projectDir, fs);
}

async function exportToCopilot(skills: any[], projectDir: string, fs: any) {
    const copilotDir = fs.join(projectDir, '.github', 'skills');
    await fs.mkdir(copilotDir, { recursive: true });
    for (const skill of skills) {
        const skillDir = fs.join(copilotDir, skill.metadata.name);
        await fs.mkdir(skillDir, { recursive: true });
        const content = `---\nname: ${skill.metadata.name}\ndescription: ${skill.metadata.description}\n---\n\n${skill.body}\n`;
        await fs.writeFile(fs.join(skillDir, 'SKILL.md'), content);
    }
    console.log(chalk.green(`  ✓ GitHub Copilot: .github/skills/<skill>/SKILL.md`));
}

async function exportToCursor(skills: any[], projectDir: string, fs: any) {
    const cursorDir = fs.join(projectDir, '.cursor', 'skills');
    await fs.mkdir(cursorDir, { recursive: true });
    for (const skill of skills) {
        const skillDir = fs.join(cursorDir, skill.metadata.name);
        await fs.mkdir(skillDir, { recursive: true });
        const content = `---\nname: ${skill.metadata.name}\ndescription: ${skill.metadata.description}\n---\n\n${skill.body}\n`;
        await fs.writeFile(fs.join(skillDir, 'SKILL.md'), content);
    }
    console.log(chalk.green(`  ✓ Cursor: .cursor/skills/<skill>/SKILL.md`));
}

async function exportToClaude(skills: any[], projectDir: string, fs: any) {
    const claudeDir = fs.join(projectDir, '.claude', 'skills');
    await fs.mkdir(claudeDir, { recursive: true });
    for (const skill of skills) {
        const skillDir = fs.join(claudeDir, skill.metadata.name);
        await fs.mkdir(skillDir, { recursive: true });
        const content = `---\nname: ${skill.metadata.name}\ndescription: ${skill.metadata.description}\n---\n\n${skill.body}\n`;
        await fs.writeFile(fs.join(skillDir, 'SKILL.md'), content);
    }
    console.log(chalk.green(`  ✓ Claude Code: .claude/skills/<skill>/SKILL.md`));
}

async function exportToCodex(skills: any[], projectDir: string, fs: any) {
    const codexDir = fs.join(projectDir, '.codex', 'skills');
    await fs.mkdir(codexDir, { recursive: true });
    for (const skill of skills) {
        const skillDir = fs.join(codexDir, skill.metadata.name);
        await fs.mkdir(skillDir, { recursive: true });
        const content = `---\nname: ${skill.metadata.name}\ndescription: ${skill.metadata.description}\n---\n\n${skill.body}\n`;
        await fs.writeFile(fs.join(skillDir, 'SKILL.md'), content);
    }
    console.log(chalk.green(`  ✓ OpenAI Codex: .codex/skills/<skill>/SKILL.md`));
}

async function exportToAntigravity(skills: any[], projectDir: string, fs: any) {
    const skillsDir = fs.join(projectDir, '.agent', 'skills');
    await fs.mkdir(skillsDir, { recursive: true });
    for (const skill of skills) {
        const skillDir = fs.join(skillsDir, skill.metadata.name);
        await fs.mkdir(skillDir, { recursive: true });
        const content = `---\nname: ${skill.metadata.name}\ndescription: ${skill.metadata.description}\n---\n\n${skill.body}\n`;
        await fs.writeFile(fs.join(skillDir, 'SKILL.md'), content);
    }
    console.log(chalk.green(`  ✓ Antigravity: .agent/skills/<skill>/SKILL.md`));
}

export function registerInteractiveCommands(program: Command) {
    // Install wizard (legacy — points to `skills install` now)
    program
        .command('install-wizard')
        .alias('iw')
        .description('Interactive skill installation wizard (legacy)')
        .action(async () => {
            console.log(chalk.yellow('\nThe install-wizard is no longer available.'));
            console.log(chalk.gray('Use the install command instead:'));
            console.log(chalk.gray('  skills install owner/repo'));
            console.log(chalk.gray('  skills install <git-url>'));
            console.log('');
        });

    // Export interactive
    program
        .command('export-interactive')
        .alias('ei')
        .description('Interactive export with agent selection menu')
        .action(async () => {
            try {
                const skills = await discoverSkills();

                if (skills.length === 0) {
                    console.log(chalk.yellow('No skills found to export.'));
                    return;
                }

                const { agents } = await inquirer.prompt([{
                    type: 'checkbox',
                    name: 'agents',
                    message: 'Select target AI agents:',
                    choices: [
                        { name: 'GitHub Copilot  (.github/skills/<skill>/SKILL.md)', value: 'copilot', checked: true },
                        { name: 'Cursor          (.cursor/skills/<skill>/SKILL.md)', value: 'cursor', checked: true },
                        { name: 'Claude Code     (.claude/skills/<skill>/SKILL.md)', value: 'claude', checked: true },
                        { name: 'OpenAI Codex    (.codex/skills/<skill>/SKILL.md)', value: 'codex', checked: true },
                        { name: 'Antigravity     (.agent/skills/<skill>/SKILL.md)', value: 'antigravity', checked: true }
                    ]
                }]);

                if (agents.length === 0) {
                    console.log(chalk.yellow('No agents selected.'));
                    return;
                }

                const { mkdir, writeFile, appendFile } = await import('fs/promises');
                const { join } = await import('path');
                const { existsSync } = await import('fs');

                console.log(chalk.bold(`\nExporting ${skills.length} skill(s) to: ${agents.join(', ')}\n`));

                for (const target of agents) {
                    const spinner = ora(`Exporting to ${target}...`).start();
                    await exportToAgent(target, skills, '.', { mkdir, writeFile, appendFile, join, existsSync });
                    spinner.succeed();
                }

                console.log(chalk.bold.green('\n✓ Export complete!'));
            } catch (error) {
                console.error(chalk.red('Error:'), error);
                process.exit(1);
            }
        });

    // Setup wizard — export-only (marketplace install removed)
    program
        .command('setup')
        .description('Interactive setup wizard - export installed skills to your agents')
        .action(async () => {
            console.log(chalk.bold.cyan('\nAgent Skills Setup Wizard\n'));

            const { agents } = await inquirer.prompt([{
                type: 'checkbox',
                name: 'agents',
                message: 'Which AI agents do you use?',
                choices: [
                    { name: 'Cursor', value: 'cursor', checked: true },
                    { name: 'Claude Code', value: 'claude', checked: true },
                    { name: 'GitHub Copilot', value: 'copilot', checked: true },
                    { name: 'OpenAI Codex', value: 'codex', checked: false }
                ]
            }]);

            const skills = await discoverSkills();
            if (skills.length === 0) {
                console.log(chalk.yellow('No skills found to export.'));
                console.log(chalk.gray('Install skills first: skills install owner/repo'));
                return;
            }

            const { mkdir, writeFile, appendFile } = await import('fs/promises');
            const { join } = await import('path');
            const { existsSync } = await import('fs');

            for (const target of agents) {
                const spinner = ora(`Exporting to ${target}...`).start();
                await exportToAgent(target, skills, '.', { mkdir, writeFile, appendFile, join, existsSync });
                spinner.succeed();
            }

            console.log(chalk.bold.green('\nSetup complete!'));
            console.log(chalk.gray('Your skills are now ready to use in your AI agents.\n'));
        });

    // Run command
    program
        .command('run <skill-name> <script>')
        .description('Execute a script from an installed skill')
        .option('-a, --args <args...>', 'Arguments to pass to the script')
        .option('--timeout <ms>', 'Timeout in milliseconds', '30000')
        .action(async (skillName, script, options) => {
            try {
                const { executeScript, listScripts } = await import('../../core/executor.js');
                const { homedir } = await import('os');
                const { join } = await import('path');
                const { existsSync } = await import('fs');

                const skillsDir = join(homedir(), '.antigravity', 'skills');
                const skillPath = join(skillsDir, skillName);

                if (!existsSync(skillPath)) {
                    console.error(chalk.red(`Skill not found: ${skillName}`));
                    console.log(chalk.gray(`Expected at: ${skillPath}`));
                    console.log(chalk.gray('\nInstall with: skills install <skill-name>'));
                    process.exit(1);
                }

                const scripts = await listScripts(skillPath);
                if (scripts.length === 0) {
                    console.log(chalk.yellow(`No scripts found in ${skillName}`));
                    console.log(chalk.gray('Skills can have scripts in the scripts/ directory.'));
                    return;
                }

                if (!scripts.includes(script)) {
                    console.log(chalk.red(`Script not found: ${script}`));
                    console.log(chalk.cyan('\nAvailable scripts:'));
                    scripts.forEach(s => console.log(chalk.gray(`  - ${s}`)));
                    return;
                }

                const spinner = ora(`Running ${script}...`).start();

                const result = await executeScript(
                    skillPath,
                    script,
                    options.args || [],
                    { timeout: parseInt(options.timeout) }
                );

                if (result.success) {
                    spinner.succeed(`Completed in ${result.executionTime}ms`);
                    if (result.stdout) {
                        console.log(chalk.gray('\nOutput:'));
                        console.log(result.stdout);
                    }
                } else {
                    spinner.fail(`Failed (exit code: ${result.exitCode})`);
                    if (result.stderr) {
                        console.error(chalk.red(result.stderr));
                    }
                    process.exit(1);
                }
            } catch (error) {
                console.error(chalk.red('Error running script:'), error);
                process.exit(1);
            }
        });

    // Context command
    program
        .command('context')
        .description('Generate system prompt context for AI agents')
        .option('-f, --format <format>', 'Output format: xml, json, markdown', 'xml')
        .option('-s, --skills <skills...>', 'Specific skills to include (default: all installed)')
        .option('-o, --output <file>', 'Write to file instead of stdout')
        .action(async (options) => {
            try {
                const allSkills = await discoverSkills();

                let skills = allSkills;
                if (options.skills && options.skills.length > 0) {
                    skills = allSkills.filter(s =>
                        options.skills.some((name: string) =>
                            s.name.toLowerCase().includes(name.toLowerCase())
                        )
                    );
                }

                if (skills.length === 0) {
                    console.error(chalk.yellow('No skills found.'));
                    console.log(chalk.gray('Install skills with: skills install <name>'));
                    return;
                }

                let output = '';

                if (options.format === 'xml') {
                    const result = generateSkillsPromptXML(skills);
                    output = result.xml;
                    if (!options.output) {
                        console.log(chalk.gray(`\n# ${result.skillCount} skills, ~${result.estimatedTokens} tokens\n`));
                    }
                } else if (options.format === 'json') {
                    output = JSON.stringify({
                        skills: skills.map(s => ({
                            name: s.name,
                            description: s.description,
                            path: s.path
                        })),
                        count: skills.length
                    }, null, 2);
                } else if (options.format === 'markdown') {
                    output = generateFullSkillsContext(skills);
                }

                if (options.output) {
                    const { writeFile } = await import('fs/promises');
                    await writeFile(options.output, output);
                    console.log(chalk.green(`✓ Written to ${options.output}`));
                } else {
                    console.log(output);
                }
            } catch (error) {
                console.error(chalk.red('Error generating context:'), error);
                process.exit(1);
            }
        });

    // Preview command
    program
        .command('preview <skill-name>')
        .description('Open skill detail page in browser')
        .option('--url-only', 'Just print the URL without opening')
        .action(async (skillName, options) => {
            try {
                const clean = skillName.replace(/^@/, '');
                const url = `https://github.com/${clean}`;

                if (options.urlOnly) {
                    console.log(url);
                } else {
                    const { exec } = await import('child_process');
                    const { promisify } = await import('util');
                    const execAsync = promisify(exec);

                    const cmd = process.platform === 'darwin' ? 'open' :
                        process.platform === 'win32' ? 'start' : 'xdg-open';

                    await execAsync(`${cmd} "${url}"`);
                    console.log(chalk.green(`✓ Opened: ${url}`));
                }
            } catch (error) {
                console.error(chalk.red('Error opening preview:'), error);
                process.exit(1);
            }
        });

    // Scripts command
    program
        .command('scripts <skill-name>')
        .description('List available scripts in an installed skill')
        .action(async (skillName) => {
            try {
                const { listScripts, isScriptSafe } = await import('../../core/executor.js');
                const { homedir } = await import('os');
                const { join } = await import('path');
                const { existsSync } = await import('fs');
                const { readFile } = await import('fs/promises');

                const skillsDir = join(homedir(), '.antigravity', 'skills');
                const skillPath = join(skillsDir, skillName);

                if (!existsSync(skillPath)) {
                    console.error(chalk.red(`Skill not found: ${skillName}`));
                    return;
                }

                const scripts = await listScripts(skillPath);

                if (scripts.length === 0) {
                    console.log(chalk.yellow('No scripts found in this skill.'));
                    return;
                }

                console.log(chalk.bold(`\n📜 Scripts in ${skillName}:\n`));

                for (const script of scripts) {
                    const scriptPath = join(skillPath, 'scripts', script);
                    try {
                        const content = await readFile(scriptPath, 'utf-8');
                        const safety = isScriptSafe(content);
                        const safetyIcon = safety.safe ? chalk.green('✓') : chalk.yellow('⚠');

                        console.log(`  ${safetyIcon} ${chalk.cyan(script)}`);
                        if (!safety.safe) {
                            safety.warnings.forEach(w =>
                                console.log(chalk.gray(`      Warning: ${w}`))
                            );
                        }
                    } catch {
                        console.log(`  ${chalk.gray('?')} ${script}`);
                    }
                }

                console.log(chalk.gray(`\nRun with: skills run ${skillName} <script>\n`));
            } catch (error) {
                console.error(chalk.red('Error listing scripts:'), error);
                process.exit(1);
            }
        });

    // Completion command
    program
        .command('completion <shell>')
        .description('Generate shell completion script (bash, zsh, fish)')
        .action((shell) => {
            const commands = [
                'list', 'validate', 'show', 'prompt', 'init',
                'install', 'search', 'run', 'context',
                'preview', 'scripts', 'setup', 'completion',
                'check', 'update', 'remove', 'export', 'doctor',
                'score', 'diff', 'compose', 'test', 'watch',
            ];

            if (shell === 'bash') {
                console.log(`# Bash completion for skills CLI
# Add to ~/.bashrc: eval "$(skills completion bash)"

_skills_completions() {
    local cur="\${COMP_WORDS[COMP_CWORD]}"
    local commands="${commands.join(' ')}"
    
    if [ \${COMP_CWORD} -eq 1 ]; then
        COMPREPLY=( $(compgen -W "\${commands}" -- "\${cur}") )
    fi
}

complete -F _skills_completions skills`);
            } else if (shell === 'zsh') {
                console.log(`# Zsh completion for skills CLI
# Add to ~/.zshrc: eval "$(skills completion zsh)"

_skills() {
    local commands=(
        ${commands.map(c => `'${c}:${c} command'`).join('\n        ')}
    )
    
    _arguments '1: :->command' && return
    
    case $state in
        command)
            _describe 'command' commands
            ;;
    esac
}

compdef _skills skills`);
            } else if (shell === 'fish') {
                console.log(`# Fish completion for skills CLI
# Save to ~/.config/fish/completions/skills.fish

${commands.map(c => `complete -c skills -f -n "__fish_use_subcommand" -a "${c}" -d "${c} command"`).join('\n')}`);
            } else {
                console.error(chalk.red(`Unknown shell: ${shell}`));
                console.log(chalk.gray('Supported: bash, zsh, fish'));
                process.exit(1);
            }
        });

    // Info command
    program
        .command('info')
        .description('Show skills installation status and paths')
        .action(async () => {
            try {
                const { homedir } = await import('os');
                const { join } = await import('path');
                const { existsSync } = await import('fs');
                const { readdir } = await import('fs/promises');

                const { AGENTS } = await import('../agents.js');

                console.log(chalk.bold('\n📦 Skills CLI Info\n'));

                // Core paths
                const paths = [
                    { name: 'Skills config', path: join(homedir(), '.skills', 'marketplace.json') },
                    { name: 'Lock file', path: join(homedir(), '.skills', 'skills.lock') },
                ];

                console.log(chalk.cyan('📁 Config:'));
                for (const { name, path } of paths) {
                    const exists = existsSync(path);
                    const icon = exists ? chalk.green('✓') : chalk.gray('○');
                    console.log(`  ${icon} ${name}: ${chalk.gray(path)}`);
                }

                // Agent directories — project-level and global
                console.log(chalk.cyan('\n🤖 Agent Skills (project):'));
                let totalSkillCount = 0;
                for (const [, config] of Object.entries(AGENTS)) {
                    const fullPath = join(process.cwd(), config.projectDir);
                    const exists = existsSync(fullPath);
                    if (exists) {
                        const entries = await readdir(fullPath, { withFileTypes: true });
                        const count = entries.filter(e => e.isDirectory()).length;
                        totalSkillCount += count;
                        console.log(`  ${chalk.green('✓')} ${config.displayName}: ${chalk.gray(config.projectDir)} ${chalk.dim(`(${count} skills)`)}`);
                    }
                }
                // Show a few unconfigured agents for discoverability
                const unconfigured = Object.values(AGENTS).filter(c => !existsSync(join(process.cwd(), c.projectDir)));
                if (unconfigured.length > 0) {
                    const sample = unconfigured.slice(0, 3).map(c => c.displayName).join(', ');
                    const more = unconfigured.length > 3 ? ` +${unconfigured.length - 3} more` : '';
                    console.log(chalk.gray(`  ○ Not configured: ${sample}${more}`));
                }

                console.log(chalk.cyan('\n🌐 Agent Skills (global):'));
                for (const [, config] of Object.entries(AGENTS)) {
                    const exists = existsSync(config.globalDir);
                    if (exists) {
                        const entries = await readdir(config.globalDir, { withFileTypes: true });
                        const count = entries.filter(e => e.isDirectory()).length;
                        totalSkillCount += count;
                        console.log(`  ${chalk.green('✓')} ${config.displayName}: ${chalk.gray(config.globalDir)} ${chalk.dim(`(${count} skills)`)}`);
                    }
                }

                console.log(chalk.cyan('\n📊 Stats:'));
                console.log(`  Total installed skills: ${chalk.bold(totalSkillCount.toString())}`);
                console.log(`  Platform: ${chalk.gray(process.platform)}`);
                console.log(`  Node: ${chalk.gray(process.version)}`);
                console.log(`  Agents supported: ${chalk.gray(Object.keys(AGENTS).length.toString())}`);

                console.log('');
            } catch (error) {
                console.error(chalk.red('Error:'), error);
                process.exit(1);
            }
        });
}

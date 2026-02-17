/**
 * Watch Mode Command
 * Watch for SKILL.md changes and auto-sync across agent directories.
 */
import { Command } from 'commander';
import chalk from 'chalk';

export function registerWatchCommand(program: Command) {
    program
        .command('watch [dir]')
        .description('Watch for skill file changes and auto-sync across agents')
        .option('-a, --agent <agents...>', 'Agents to sync to')
        .option('--debounce <ms>', 'Debounce delay in milliseconds', '500')
        .action(async (dir: string | undefined, options: any) => {
            try {
                const { existsSync, watch: fsWatch } = await import('fs');
                const { readdir, copyFile, mkdir, readFile } = await import('fs/promises');
                const { homedir } = await import('os');
                const { join, basename, relative } = await import('path');
                const { AGENTS } = await import('../agents.js');

                const home = homedir();
                const watchDir = dir || join(home, '.antigravity', 'skills');

                if (!existsSync(watchDir)) {
                    console.log(chalk.red(`\n  ✗ Directory does not exist: ${watchDir}\n`));
                    return;
                }

                console.log(chalk.bold(`\n👁️  Watch Mode\n`));
                console.log(chalk.gray(`  Watching: ${watchDir}`));

                // Determine target agents
                const targetAgents = options.agent
                    ? options.agent.filter((a: string) => AGENTS[a])
                    : Object.keys(AGENTS);

                console.log(chalk.gray(`  Syncing to: ${targetAgents.join(', ')}`));
                console.log(chalk.gray(`  Press Ctrl+C to stop.\n`));

                let debounceTimer: ReturnType<typeof setTimeout> | null = null;
                const debounceMs = parseInt(options.debounce) || 500;

                // Use Node.js built-in fs.watch (recursive supported on macOS)
                const watcher = fsWatch(watchDir, { recursive: true }, (event, filename) => {
                    if (!filename) return;

                    // Only react to SKILL.md changes
                    if (!filename.endsWith('SKILL.md') && !filename.endsWith('.md')) return;

                    // Debounce
                    if (debounceTimer) clearTimeout(debounceTimer);
                    debounceTimer = setTimeout(async () => {
                        const fullPath = join(watchDir, filename);
                        if (!existsSync(fullPath)) return;

                        const skillName = basename(join(watchDir, filename, '..'));
                        const timestamp = new Date().toLocaleTimeString();

                        console.log(`  ${chalk.yellow('⟳')} ${chalk.gray(timestamp)} ${chalk.bold(skillName)} changed`);

                        // Sync to agent directories
                        let syncCount = 0;
                        for (const agent of targetAgents) {
                            const config = AGENTS[agent];
                            if (!config) continue;

                            const targetDir = join(config.globalDir, skillName);
                            try {
                                await mkdir(targetDir, { recursive: true });
                                const targetFile = join(targetDir, basename(filename));
                                await copyFile(fullPath, targetFile);
                                syncCount++;
                            } catch (err: any) {
                                console.log(`    ${chalk.red('✗')} Failed to sync to ${config.displayName}: ${err.message}`);
                            }
                        }

                        if (syncCount > 0) {
                            console.log(`    ${chalk.green('✓')} Synced to ${syncCount} agent(s)`);
                        }
                    }, debounceMs);
                });

                // Keep alive
                process.on('SIGINT', () => {
                    watcher.close();
                    console.log(chalk.gray('\n  Watch mode stopped.\n'));
                    process.exit(0);
                });

                // Keep the process alive
                await new Promise(() => { });
            } catch (error: any) {
                console.error(chalk.red('Error:'), error.message || error);
                process.exit(1);
            }
        });
}

/**
 * `skills search` command — Search locally installed skills
 */
import { Command } from 'commander';
import chalk from 'chalk';
import { AGENTS } from '../agents.js';

export function registerSearchInstallCommand(program: Command) {
    program
        .command('search [query...]')
        .alias('s')
        .description('Search locally installed skills')
        .option('-g, --global', 'Search global skills')
        .option('--json', 'Output as JSON')
        .action(async (queryParts, options) => {
            try {
                const query = queryParts.join(' ').toLowerCase();
                const { existsSync } = await import('fs');
                const { readdir, readFile } = await import('fs/promises');
                const { join, basename } = await import('path');
                const { homedir } = await import('os');

                const results: Array<{ name: string; agent: string; path: string; description?: string }> = [];

                for (const [key, config] of Object.entries(AGENTS)) {
                    const baseDir = options.global
                        ? config.globalDir
                        : join(process.cwd(), config.projectDir);

                    if (!existsSync(baseDir)) continue;

                    let entries;
                    try {
                        entries = await readdir(baseDir, { withFileTypes: true });
                    } catch {
                        continue;
                    }

                    for (const entry of entries) {
                        if (!entry.isDirectory()) continue;
                        const skillName = entry.name;

                        // If query provided, filter by name match
                        if (query && !skillName.toLowerCase().includes(query)) continue;

                        // Try to read description from SKILL.md
                        let description = '';
                        const skillMdPath = join(baseDir, skillName, 'SKILL.md');
                        try {
                            if (existsSync(skillMdPath)) {
                                const content = await readFile(skillMdPath, 'utf-8');
                                const descMatch = content.match(/description:\s*(.+)/i);
                                if (descMatch) description = descMatch[1].trim();
                            }
                        } catch { }

                        results.push({
                            name: skillName,
                            agent: config.displayName,
                            path: join(baseDir, skillName),
                            description,
                        });
                    }
                }

                if (options.json) {
                    console.log(JSON.stringify(results, null, 2));
                    return;
                }

                if (results.length === 0) {
                    console.log(chalk.yellow(`\nNo installed skills found${query ? ` matching "${query}"` : ''}.`));
                    console.log(chalk.gray('Install skills with: skills install owner/repo'));
                    return;
                }

                console.log(chalk.bold(`\nFound ${results.length} installed skill(s)${query ? ` matching "${query}"` : ''}:\n`));

                for (const result of results) {
                    console.log(`  ${chalk.cyan(result.name)} ${chalk.dim(`(${result.agent})`)}`);
                    if (result.description) {
                        console.log(`    ${chalk.gray(result.description)}`);
                    }
                }
                console.log('');
            } catch (error) {
                console.error(chalk.red('Error:'), error);
                process.exit(1);
            }
        });
}

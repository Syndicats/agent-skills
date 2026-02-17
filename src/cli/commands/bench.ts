/**
 * Skill Benchmarking Command
 * Compare skill effectiveness with metrics and quality scores.
 */
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';

export function registerBenchCommand(program: Command) {
    program
        .command('bench [skills...]')
        .description('Benchmark and compare skills by quality, size, and coverage')
        .option('-a, --all', 'Benchmark all installed skills')
        .option('--sort <field>', 'Sort by: quality, tokens, name (default: quality)', 'quality')
        .option('--json', 'Output as JSON')
        .option('--min-quality <score>', 'Filter skills below this quality score (0-100)', parseInt)
        .action(async (skills: string[], options: any) => {
            try {
                const { existsSync } = await import('fs');
                const { readdir, readFile } = await import('fs/promises');
                const { homedir } = await import('os');
                const { join, basename } = await import('path');
                const matter = (await import('gray-matter')).default;

                const home = homedir();
                const skillsDir = join(home, '.antigravity', 'skills');

                let skillPaths: string[] = [];

                if (options.all) {
                    if (existsSync(skillsDir)) {
                        const entries = await readdir(skillsDir, { withFileTypes: true });
                        for (const entry of entries) {
                            if (entry.isDirectory() && existsSync(join(skillsDir, entry.name, 'SKILL.md'))) {
                                skillPaths.push(join(skillsDir, entry.name));
                            }
                        }
                    }
                } else if (skills.length > 0) {
                    for (const s of skills) {
                        if (existsSync(s)) skillPaths.push(s);
                        else if (existsSync(join(skillsDir, s))) skillPaths.push(join(skillsDir, s));
                        else console.error(chalk.red(`  ✗ Skill not found: ${s}`));
                    }
                } else {
                    console.log(chalk.yellow('\n  No skills specified. Use --all or provide skill names.\n'));
                    return;
                }

                if (skillPaths.length === 0) {
                    console.log(chalk.yellow('\n  No skills found to benchmark.\n'));
                    return;
                }

                const spinner = ora(`Benchmarking ${skillPaths.length} skill(s)...`).start();

                // Benchmark each skill
                interface BenchResult {
                    name: string;
                    path: string;
                    tokens: number;
                    lines: number;
                    sections: number;
                    codeBlocks: number;
                    quality: number;
                    hasFrontmatter: boolean;
                    hasExamples: boolean;
                    hasInstructions: boolean;
                }

                const results: BenchResult[] = [];

                for (const sp of skillPaths) {
                    try {
                        const raw = await readFile(join(sp, 'SKILL.md'), 'utf-8');
                        const { data, content } = matter(raw);
                        const name = data.name || basename(sp);

                        const lines = content.split('\n').length;
                        const tokens = Math.ceil(raw.length / 4);
                        const sections = (content.match(/^#{2,4}\s+/gm) || []).length;
                        const codeBlocks = (content.match(/```[\s\S]*?```/g) || []).length;
                        const hasExamples = /example|sample|demo/i.test(content);
                        const hasInstructions = /^\s*[-*]\s+.+/m.test(content) || /^\s*\d+\.\s+.+/m.test(content);

                        // Quality score (0-100)
                        let quality = 0;
                        if (data.name) quality += 10;
                        if (data.description && data.description.length > 10) quality += 10;
                        if (sections >= 2) quality += 15;
                        if (sections >= 5) quality += 5;
                        if (codeBlocks >= 1) quality += 15;
                        if (codeBlocks >= 3) quality += 5;
                        if (hasExamples) quality += 10;
                        if (hasInstructions) quality += 10;
                        if (tokens >= 100 && tokens <= 10000) quality += 10;
                        if (!/TODO|FIXME|PLACEHOLDER/i.test(content)) quality += 10;

                        results.push({
                            name,
                            path: sp,
                            tokens,
                            lines,
                            sections,
                            codeBlocks,
                            quality,
                            hasFrontmatter: !!data.name,
                            hasExamples,
                            hasInstructions,
                        });
                    } catch {
                        // Skip invalid skills
                    }
                }

                spinner.stop();

                if (options.minQuality) {
                    const filtered = results.filter(r => r.quality >= options.minQuality);
                    if (filtered.length < results.length) {
                        console.log(chalk.gray(`  Filtered: ${results.length - filtered.length} skills below quality threshold ${options.minQuality}\n`));
                    }
                    results.length = 0;
                    results.push(...filtered);
                }

                // Sort
                switch (options.sort) {
                    case 'tokens':
                        results.sort((a, b) => b.tokens - a.tokens);
                        break;
                    case 'name':
                        results.sort((a, b) => a.name.localeCompare(b.name));
                        break;
                    default:
                        results.sort((a, b) => b.quality - a.quality);
                }

                if (options.json) {
                    console.log(JSON.stringify(results, null, 2));
                    return;
                }

                console.log(chalk.bold(`\n📈 Skill Benchmark Results\n`));

                // Table header
                const header = `  ${'Skill'.padEnd(25)} ${'Quality'.padEnd(10)} ${'Tokens'.padEnd(8)} ${'Sections'.padEnd(10)} ${'Code'.padEnd(6)} ${'Features'}`;
                console.log(chalk.bold(header));
                console.log(chalk.gray('  ' + '─'.repeat(85)));

                for (const r of results) {
                    const qualityColor = r.quality >= 80 ? chalk.green : r.quality >= 60 ? chalk.yellow : chalk.red;
                    const qualityBar = qualityColor('█'.repeat(Math.round(r.quality / 10)) + '░'.repeat(10 - Math.round(r.quality / 10)));

                    const features: string[] = [];
                    if (r.hasFrontmatter) features.push('📝');
                    if (r.hasExamples) features.push('💡');
                    if (r.hasInstructions) features.push('📋');

                    console.log(`  ${chalk.bold(r.name.slice(0, 24).padEnd(25))} ${qualityBar} ${chalk.gray(String(r.tokens).padEnd(8))} ${chalk.gray(String(r.sections).padEnd(10))} ${chalk.gray(String(r.codeBlocks).padEnd(6))} ${features.join(' ')}`);
                }

                console.log('');
                console.log(chalk.bold('  Summary:'));
                const avgQuality = Math.round(results.reduce((s, r) => s + r.quality, 0) / results.length);
                const totalTokens = results.reduce((s, r) => s + r.tokens, 0);
                console.log(`    Skills:      ${results.length}`);
                console.log(`    Avg quality: ${avgQuality}%`);
                console.log(`    Total tokens: ${totalTokens}`);
                console.log(`    Legend: 📝 frontmatter  💡 examples  📋 instructions`);
                console.log('');
            } catch (error: any) {
                console.error(chalk.red('Error:'), error.message || error);
                process.exit(1);
            }
        });
}

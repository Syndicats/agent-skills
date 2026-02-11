/**
 * Mine Command
 * Extract patterns and conventions from git history
 * (SkillKit calls this "learn" — we call it "mine")
 */

import chalk from 'chalk';
import ora from 'ora';
import { Command } from 'commander';
import { execSync } from 'child_process';
import { writeFile, mkdir } from 'fs/promises';
import { resolve, join } from 'path';

interface MineOptions {
    depth?: string;
    output?: string;
    format?: string;
}

interface MinedPattern {
    type: string;
    pattern: string;
    frequency: number;
    examples: string[];
}

/**
 * Register the mine command
 */
export function registerMineCommand(program: Command): void {
    program
        .command('mine')
        .alias('mn')
        .description('Extract coding patterns and conventions from git history')
        .option('-d, --depth <n>', 'Number of commits to analyze', '100')
        .option('-o, --output <path>', 'Save patterns to file')
        .option('-f, --format <fmt>', 'Output format: text, json, skill', 'text')
        .action(async (options: MineOptions) => {
            try {
                await mineCommand(options);
            } catch (err: any) {
                console.error(chalk.red('Error:'), err.message);
                process.exit(1);
            }
        });
}

async function mineCommand(options: MineOptions): Promise<void> {
    const depth = parseInt(options.depth || '100');
    const spinner = ora(`Analyzing last ${depth} commits...`).start();

    // Check if we're in a git repo
    try {
        execSync('git rev-parse --git-dir', { stdio: 'pipe' });
    } catch {
        spinner.fail('Not a git repository');
        process.exit(1);
    }

    // Extract patterns
    const patterns: MinedPattern[] = [];

    // 1. Commit message patterns
    spinner.text = 'Mining commit message patterns...';
    const commitPatterns = mineCommitPatterns(depth);
    patterns.push(...commitPatterns);

    // 2. File change patterns
    spinner.text = 'Mining file change patterns...';
    const filePatterns = mineFilePatterns(depth);
    patterns.push(...filePatterns);

    // 3. Extension/language patterns
    spinner.text = 'Mining language patterns...';
    const langPatterns = mineLanguagePatterns(depth);
    patterns.push(...langPatterns);

    spinner.succeed(`Mined ${patterns.length} patterns from ${depth} commits`);
    console.log('');

    // Output based on format
    if (options.format === 'json') {
        const output = JSON.stringify(patterns, null, 2);
        if (options.output) {
            await writeFile(resolve(options.output), output);
            console.log(chalk.green(`Saved to ${options.output}`));
        } else {
            console.log(output);
        }
    } else if (options.format === 'skill') {
        const skillContent = patternsToSkill(patterns);
        if (options.output) {
            const outDir = resolve(options.output);
            await mkdir(outDir, { recursive: true });
            await writeFile(join(outDir, 'SKILL.md'), skillContent);
            console.log(chalk.green(`Saved skill to ${options.output}/SKILL.md`));
        } else {
            console.log(skillContent);
        }
    } else {
        printPatterns(patterns);
        if (options.output) {
            await writeFile(resolve(options.output), formatPatternsText(patterns));
            console.log('');
            console.log(chalk.green(`Saved to ${options.output}`));
        }
    }
    console.log('');
}

function mineCommitPatterns(depth: number): MinedPattern[] {
    const patterns: MinedPattern[] = [];

    try {
        const log = execSync(`git log --oneline -${depth} --format="%s"`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
        const messages = log.trim().split('\n').filter(Boolean);

        // Detect conventional commits
        const prefixCounts: Record<string, number> = {};
        const prefixExamples: Record<string, string[]> = {};

        for (const msg of messages) {
            const match = msg.match(/^(feat|fix|docs|style|refactor|test|chore|ci|build|perf|revert)(\(.*?\))?:/i);
            if (match) {
                const prefix = match[1].toLowerCase();
                prefixCounts[prefix] = (prefixCounts[prefix] || 0) + 1;
                if (!prefixExamples[prefix]) prefixExamples[prefix] = [];
                if (prefixExamples[prefix].length < 3) prefixExamples[prefix].push(msg);
            }
        }

        const conventionalTotal = Object.values(prefixCounts).reduce((a, b) => a + b, 0);
        if (conventionalTotal > messages.length * 0.3) {
            patterns.push({
                type: 'commit-convention',
                pattern: 'Conventional Commits',
                frequency: Math.round((conventionalTotal / messages.length) * 100),
                examples: Object.entries(prefixCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([k, v]) => `${k}: ${v} commits`),
            });
        }

        // Detect other patterns
        const avgLength = messages.reduce((a, m) => a + m.length, 0) / messages.length;
        patterns.push({
            type: 'commit-style',
            pattern: `Average commit message: ${Math.round(avgLength)} chars`,
            frequency: 100,
            examples: messages.slice(0, 3),
        });
    } catch { /* ignore git errors */ }

    return patterns;
}

function mineFilePatterns(depth: number): MinedPattern[] {
    const patterns: MinedPattern[] = [];

    try {
        const log = execSync(`git log --name-only --oneline -${depth} --format=""`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
        const files = log.trim().split('\n').filter(Boolean);

        // Count most changed files
        const fileCounts: Record<string, number> = {};
        for (const file of files) {
            fileCounts[file] = (fileCounts[file] || 0) + 1;
        }

        const hotFiles = Object.entries(fileCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        if (hotFiles.length > 0) {
            patterns.push({
                type: 'hotspots',
                pattern: 'Most frequently changed files',
                frequency: hotFiles[0][1],
                examples: hotFiles.slice(0, 5).map(([f, c]) => `${f} (${c} changes)`),
            });
        }

        // Detect co-change patterns
        const dirCounts: Record<string, number> = {};
        for (const file of files) {
            const dir = file.split('/').slice(0, -1).join('/');
            if (dir) dirCounts[dir] = (dirCounts[dir] || 0) + 1;
        }

        const hotDirs = Object.entries(dirCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        if (hotDirs.length > 0) {
            patterns.push({
                type: 'active-directories',
                pattern: 'Most active directories',
                frequency: hotDirs[0][1],
                examples: hotDirs.map(([d, c]) => `${d}/ (${c} changes)`),
            });
        }
    } catch { /* ignore */ }

    return patterns;
}

function mineLanguagePatterns(depth: number): MinedPattern[] {
    const patterns: MinedPattern[] = [];

    try {
        const log = execSync(`git log --name-only --oneline -${depth} --format=""`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
        const files = log.trim().split('\n').filter(Boolean);

        const extCounts: Record<string, number> = {};
        for (const file of files) {
            const ext = file.split('.').pop()?.toLowerCase();
            if (ext && ext.length < 10) {
                extCounts[ext] = (extCounts[ext] || 0) + 1;
            }
        }

        const topExts = Object.entries(extCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8);

        if (topExts.length > 0) {
            patterns.push({
                type: 'languages',
                pattern: 'File types by change frequency',
                frequency: topExts[0][1],
                examples: topExts.map(([e, c]) => `.${e} (${c} changes)`),
            });
        }
    } catch { /* ignore */ }

    return patterns;
}

function printPatterns(patterns: MinedPattern[]): void {
    console.log(chalk.bold('⛏️  Mined Patterns'));
    console.log('');

    for (const p of patterns) {
        const typeIcon = p.type === 'commit-convention' ? '📝' :
            p.type === 'commit-style' ? '✏️' :
                p.type === 'hotspots' ? '🔥' :
                    p.type === 'active-directories' ? '📁' :
                        p.type === 'languages' ? '🔤' : '◆';

        console.log(`  ${typeIcon} ${chalk.bold(p.pattern)}`);
        for (const ex of p.examples) {
            console.log(`     ${chalk.dim('↳')} ${chalk.dim(ex)}`);
        }
        console.log('');
    }
}

function formatPatternsText(patterns: MinedPattern[]): string {
    const lines: string[] = ['# Mined Patterns', ''];
    for (const p of patterns) {
        lines.push(`## ${p.pattern}`);
        lines.push(`Type: ${p.type}`);
        for (const ex of p.examples) {
            lines.push(`- ${ex}`);
        }
        lines.push('');
    }
    return lines.join('\n');
}

function patternsToSkill(patterns: MinedPattern[]): string {
    const lines: string[] = [];
    lines.push('---');
    lines.push('name: project-patterns');
    lines.push('description: Conventions mined from git history');
    lines.push('---');
    lines.push('');
    lines.push('# Project Patterns');
    lines.push('');
    lines.push('Conventions automatically extracted from git history.');
    lines.push('');

    for (const p of patterns) {
        lines.push(`## ${p.pattern}`);
        lines.push('');
        for (const ex of p.examples) {
            lines.push(`- ${ex}`);
        }
        lines.push('');
    }

    return lines.join('\n');
}

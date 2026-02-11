/**
 * Capture Command
 * Save URL content, text, or files as reusable skills
 * (Unique feature — no SkillKit equivalent)
 */

import chalk from 'chalk';
import ora from 'ora';
import { Command } from 'commander';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, join, basename } from 'path';

interface CaptureOptions {
    name?: string;
    output?: string;
    tags?: string;
    type?: string;
}

/**
 * Register the capture command
 */
export function registerCaptureCommand(program: Command): void {
    program
        .command('capture <source>')
        .alias('cp')
        .description('Capture a URL, text, or file as a skill')
        .option('-n, --name <name>', 'Skill name')
        .option('-o, --output <dir>', 'Output directory', '.')
        .option('-t, --tags <tags>', 'Comma-separated tags')
        .option('--type <type>', 'Source type: url, file, text', 'auto')
        .action(async (source: string, options: CaptureOptions) => {
            try {
                await captureCommand(source, options);
            } catch (err: any) {
                console.error(chalk.red('Error:'), err.message);
                process.exit(1);
            }
        });
}

async function captureCommand(source: string, options: CaptureOptions): Promise<void> {
    const spinner = ora('Capturing...').start();

    // Detect source type
    const sourceType = options.type === 'auto' ? detectSourceType(source) : options.type!;
    let content = '';
    let sourceName = '';

    switch (sourceType) {
        case 'url':
            spinner.text = `Fetching ${source}...`;
            try {
                const response = await fetch(source);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                content = await response.text();
                sourceName = new URL(source).hostname.replace(/\./g, '-');
            } catch (err: any) {
                spinner.fail(`Failed to fetch URL: ${err.message}`);
                process.exit(1);
            }
            break;

        case 'file':
            const filePath = resolve(source);
            if (!existsSync(filePath)) {
                spinner.fail(`File not found: ${filePath}`);
                process.exit(1);
            }
            content = await readFile(filePath, 'utf-8');
            sourceName = basename(filePath, '.md').replace(/\s+/g, '-').toLowerCase();
            break;

        case 'text':
            content = source;
            sourceName = 'captured-text';
            break;

        default:
            spinner.fail(`Unknown type: ${sourceType}`);
            process.exit(1);
    }

    // Build skill
    const skillName = options.name || sourceName || 'captured-skill';
    const tags = options.tags ? options.tags.split(',').map(t => t.trim()) : [];
    const tagsYaml = tags.length > 0 ? `\ntags:\n${tags.map(t => `  - ${t}`).join('\n')}` : '';

    const skillContent = `---
name: ${skillName}
description: Captured from ${sourceType === 'url' ? source : sourceType}${tagsYaml}
---

# ${skillName.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}

> Captured from: ${sourceType === 'url' ? `[${source}](${source})` : sourceType}
> Date: ${new Date().toISOString().split('T')[0]}

## Content

${content.substring(0, 10000)}${content.length > 10000 ? '\n\n... (truncated)' : ''}
`;

    // Save skill
    const outputDir = resolve(options.output || '.');
    const skillDir = join(outputDir, skillName);
    await mkdir(skillDir, { recursive: true });
    await writeFile(join(skillDir, 'SKILL.md'), skillContent);

    spinner.succeed(`Captured as skill: ${chalk.cyan(skillName)}`);
    console.log('');
    console.log(`  ${chalk.dim('Source:')}  ${source}`);
    console.log(`  ${chalk.dim('Type:')}    ${sourceType}`);
    console.log(`  ${chalk.dim('Output:')}  ${chalk.cyan(join(skillDir, 'SKILL.md'))}`);
    console.log(`  ${chalk.dim('Size:')}    ${(content.length / 1024).toFixed(1)} KB`);
    console.log('');
}

function detectSourceType(source: string): string {
    if (source.startsWith('http://') || source.startsWith('https://')) return 'url';
    if (existsSync(resolve(source))) return 'file';
    return 'text';
}

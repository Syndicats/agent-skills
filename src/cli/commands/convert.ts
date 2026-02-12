/**
 * Convert Command
 * Cross-agent format translation for skills
 * (SkillKit calls this "translate" — we call it "convert")
 */

import chalk from 'chalk';
import ora from 'ora';
import { Command } from 'commander';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, join, basename, dirname } from 'path';
import { getAdapter, AGENTS } from '../agents.js';
import type { ParsedSkillInput } from '../../adapters/adapter.js';

interface ConvertOptions {
    output?: string;
    overwrite?: boolean;
}

type AgentFormat = string;

// Derive valid formats from the AGENTS registry + well-known names
const VALID_FORMATS = Object.keys(AGENTS);

/**
 * Register the convert command
 */
export function registerConvertCommand(program: Command): void {
    program
        .command('convert <source> <target-format>')
        .alias('cv')
        .description(`Convert skills between agent formats (${VALID_FORMATS.join(', ')})`)
        .option('-o, --output <path>', 'Output file path (default: auto)')
        .option('--overwrite', 'Overwrite existing output file')
        .action(async (source: string, targetFormat: string, options: ConvertOptions) => {
            try {
                await convertCommand(source, targetFormat as AgentFormat, options);
            } catch (err: any) {
                console.error(chalk.red('Error:'), err.message);
                process.exit(1);
            }
        });
}

async function convertCommand(source: string, targetFormat: AgentFormat, options: ConvertOptions): Promise<void> {
    // Validate target format
    if (!VALID_FORMATS.includes(targetFormat)) {
        console.error(chalk.red(`Invalid format: ${targetFormat}`));
        console.log(chalk.dim(`Valid formats: ${VALID_FORMATS.join(', ')}`));
        process.exit(1);
    }

    const sourcePath = resolve(source);

    if (!existsSync(sourcePath)) {
        console.error(chalk.red(`Source not found: ${sourcePath}`));
        process.exit(1);
    }

    const spinner = ora(`Converting to ${targetFormat} format...`).start();

    // Read source content
    const content = await readFile(sourcePath, 'utf-8');
    const sourceFormat = detectFormat(sourcePath, content);

    if (!sourceFormat) {
        spinner.fail('Could not detect source format');
        process.exit(1);
    }

    // Parse source into intermediate representation
    const parsed = parseSkillContent(content, sourceFormat);

    // Convert to target format using adapter
    const adapter = getAdapter(targetFormat);
    const converted = adapter.generateConfig({
        name: parsed.name,
        description: parsed.description,
        rawContent: parsed.rawContent,
        sections: parsed.sections,
        frontmatter: parsed.frontmatter,
    });

    // Determine output path using adapter
    const outputPath = options.output
        ? resolve(options.output)
        : join(dirname(sourcePath), adapter.getProjectDir(), adapter.getSkillFilename());

    if (existsSync(outputPath) && !options.overwrite) {
        spinner.fail(`Output file exists: ${outputPath}`);
        console.log(chalk.dim('Use --overwrite to replace'));
        process.exit(1);
    }

    // Write output
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, converted);

    spinner.succeed(`Converted ${sourceFormat} → ${targetFormat}`);
    console.log('');
    console.log(`  ${chalk.dim('Source:')} ${chalk.cyan(basename(sourcePath))}`);
    console.log(`  ${chalk.dim('Output:')} ${chalk.green(outputPath)}`);
    console.log('');
}

interface ParsedSkill {
    name: string;
    description: string;
    sections: { heading: string; content: string }[];
    rawContent: string;
    frontmatter?: Record<string, any>;
}

function detectFormat(filePath: string, content: string): AgentFormat | null {
    const filename = basename(filePath).toLowerCase();

    if (filename === '.cursorrules') return 'cursor';
    if (filename === '.windsurfrules') return 'windsurf';
    if (filename === 'claude.md') return 'claude';
    if (filename === 'agents.md') return 'codex';
    if (filename === 'copilot-instructions.md') return 'copilot';
    if (filename === 'skill.md') return 'antigravity';

    // Try content-based detection
    if (content.startsWith('---\n') && content.includes('name:')) return 'antigravity';

    return null;
}

function parseSkillContent(content: string, format: AgentFormat): ParsedSkill {
    const parsed: ParsedSkill = {
        name: '',
        description: '',
        sections: [],
        rawContent: content,
    };

    // Extract frontmatter if present
    if (content.startsWith('---\n')) {
        const endIdx = content.indexOf('\n---\n', 4);
        if (endIdx > 0) {
            const fm = content.substring(4, endIdx);
            parsed.frontmatter = {};
            for (const line of fm.split('\n')) {
                const colonIdx = line.indexOf(':');
                if (colonIdx > 0) {
                    const key = line.substring(0, colonIdx).trim();
                    const val = line.substring(colonIdx + 1).trim();
                    parsed.frontmatter[key] = val;
                }
            }
            parsed.name = parsed.frontmatter['name'] || '';
            parsed.description = parsed.frontmatter['description'] || '';
            content = content.substring(endIdx + 5);
        }
    }

    // Parse markdown sections
    const lines = content.split('\n');
    let currentHeading = '';
    let currentContent: string[] = [];

    for (const line of lines) {
        if (line.startsWith('# ') || line.startsWith('## ')) {
            if (currentHeading || currentContent.length > 0) {
                parsed.sections.push({ heading: currentHeading, content: currentContent.join('\n').trim() });
            }
            currentHeading = line.replace(/^#+\s*/, '');
            currentContent = [];
        } else {
            currentContent.push(line);
        }
    }

    if (currentHeading || currentContent.length > 0) {
        parsed.sections.push({ heading: currentHeading, content: currentContent.join('\n').trim() });
    }

    if (!parsed.name && parsed.sections.length > 0) {
        parsed.name = parsed.sections[0].heading;
    }

    return parsed;
}

// Legacy render functions kept for backwards compatibility
// Adapters call these internally when needed

function renderAsSkillMd(parsed: ParsedSkill): string {
    const lines: string[] = [];
    lines.push('---');
    lines.push(`name: ${parsed.name || 'converted-skill'}`);
    lines.push(`description: ${parsed.description || 'Converted skill'}`);
    lines.push('---');
    lines.push('');
    for (const section of parsed.sections) {
        if (section.heading) lines.push(`## ${section.heading}`);
        if (section.content) lines.push(section.content);
        lines.push('');
    }
    return lines.join('\n');
}

/**
 * Forge Command
 * AI-powered skill generation from natural language descriptions
 * (SkillKit calls this "ai generate" — we call it "forge")
 */

import chalk from 'chalk';
import ora from 'ora';
import { Command } from 'commander';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, join } from 'path';

interface ForgeOptions {
    output?: string;
    agent?: string;
    model?: string;
    dryRun?: boolean;
}

/**
 * Register the forge command
 */
export function registerForgeCommand(program: Command): void {
    program
        .command('forge <description>')
        .alias('fg')
        .description('AI-generate a skill from a natural language description')
        .option('-o, --output <dir>', 'Output directory', '.')
        .option('-a, --agent <agent>', 'Target agent format')
        .option('-m, --model <model>', 'AI model to use (default: built-in)')
        .option('-n, --dry-run', 'Preview generated content without saving')
        .action(async (description: string, options: ForgeOptions) => {
            try {
                await forgeCommand(description, options);
            } catch (err: any) {
                console.error(chalk.red('Error:'), err.message);
                process.exit(1);
            }
        });
}

async function forgeCommand(description: string, options: ForgeOptions): Promise<void> {
    const spinner = ora('Forging skill from description...').start();

    // Extract key concepts from description
    const concepts = extractConcepts(description);
    const skillName = generateSkillName(description);

    spinner.text = 'Generating skill content...';

    // Generate skill content using template-based approach
    const content = generateSkillContent(skillName, description, concepts);

    spinner.succeed('Skill forged!');
    console.log('');

    if (options.dryRun) {
        console.log(chalk.bold('📄 Preview:'));
        console.log(chalk.dim('─'.repeat(60)));
        console.log(content);
        console.log(chalk.dim('─'.repeat(60)));
        console.log('');
        console.log(chalk.yellow('🏃 Dry run — skill was NOT saved'));
        return;
    }

    // Save the skill
    const outputDir = resolve(options.output || '.');
    const skillDir = join(outputDir, skillName);

    if (existsSync(skillDir)) {
        console.error(chalk.red(`Directory already exists: ${skillDir}`));
        process.exit(1);
    }

    await mkdir(skillDir, { recursive: true });
    await writeFile(join(skillDir, 'SKILL.md'), content);

    console.log(chalk.green(`✨ Skill created: ${chalk.cyan(skillDir)}`));
    console.log('');
    console.log(chalk.dim('Next steps:'));
    console.log(chalk.dim(`  1. Review and edit ${skillDir}/SKILL.md`));
    console.log(chalk.dim(`  2. Run ${chalk.white(`skills validate ${skillDir}`)}`));
    console.log(chalk.dim(`  3. Run ${chalk.white(`skills audit ${skillDir}`)}`));
    console.log('');
}

function extractConcepts(description: string): string[] {
    const words = description.toLowerCase().split(/\s+/);
    const stopWords = new Set(['a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
        'for', 'and', 'nor', 'but', 'or', 'yet', 'so', 'in', 'on', 'at', 'to', 'of',
        'with', 'by', 'from', 'up', 'about', 'into', 'through', 'that', 'this', 'it',
        'how', 'what', 'when', 'where', 'who', 'which', 'why', 'skill', 'create', 'make',
        'build', 'write', 'generate', 'agent', 'ai']);

    return words
        .filter(w => w.length > 2 && !stopWords.has(w))
        .filter((w, i, arr) => arr.indexOf(w) === i)
        .slice(0, 10);
}

function generateSkillName(description: string): string {
    const concepts = extractConcepts(description);
    const name = concepts.slice(0, 3).join('-');
    return name || 'forged-skill';
}

function generateSkillContent(name: string, description: string, concepts: string[]): string {
    const displayName = name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const tags = concepts.slice(0, 5).map(c => `  - ${c}`).join('\n');

    return `---
name: ${name}
description: ${description}
version: 1.0.0
tags:
${tags}
---

# ${displayName}

## Overview

${description}

## Guidelines

### Best Practices

When working with ${concepts.slice(0, 3).join(', ')}:

1. **Follow established patterns** — Use conventions already present in the codebase
2. **Write clear code** — Prefer readability over cleverness
3. **Handle errors** — Always handle error cases and edge conditions
4. **Add documentation** — Document non-obvious decisions and complex logic
5. **Test thoroughly** — Write tests for both happy path and error scenarios

### Do's

\`\`\`
✓ Follow single responsibility principle
✓ Use descriptive naming
✓ Handle edge cases
✓ Write meaningful commit messages
✓ Keep functions focused and small
\`\`\`

### Don'ts

\`\`\`
✗ Leave TODO comments without tracking issues
✗ Use magic numbers without constants
✗ Skip error handling
✗ Write overly complex one-liners
✗ Ignore accessibility requirements
\`\`\`

## Examples

### Example 1: Standard Implementation

Follow the project's existing patterns and conventions when implementing new features related to ${concepts[0] || 'this domain'}.

### Example 2: Error Handling

Always wrap operations in proper error handling and provide meaningful error messages.

## References

- Review existing codebase patterns for consistency
- Follow the project's contributing guidelines
`;
}

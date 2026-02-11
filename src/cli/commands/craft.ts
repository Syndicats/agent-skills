/**
 * Craft Command
 * Enhanced skill scaffolding with optional directories
 * (SkillKit calls this "create" — we call it "craft")
 */

import chalk from 'chalk';
import * as p from '@clack/prompts';
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, resolve } from 'path';
import { Command } from 'commander';

export interface CraftOptions {
    full?: boolean;
    scripts?: boolean;
    references?: boolean;
    assets?: boolean;
    dir?: string;
}

/**
 * Register the craft command with commander
 */
export function registerCraftCommand(program: Command): void {
    program
        .command('craft <name>')
        .description('Craft a new skill with full structure')
        .option('-f, --full', 'Include all optional directories (scripts, references, assets)')
        .option('-s, --scripts', 'Include scripts/ directory with templates')
        .option('-r, --references', 'Include references/ directory')
        .option('-a, --assets', 'Include assets/ directory')
        .option('-d, --dir <path>', 'Parent directory to create skill in', '.')
        .action(async (name: string, options: CraftOptions) => {
            try {
                await craftCommand(name, options);
            } catch (err: any) {
                console.error(chalk.red('Error:'), err.message);
                process.exit(1);
            }
        });
}

/**
 * Run the craft command
 */
async function craftCommand(name: string, options: CraftOptions): Promise<void> {
    const baseDir = resolve(options.dir || '.');
    const skillDir = join(baseDir, name);

    // Check if directory already exists
    if (existsSync(skillDir)) {
        console.error(chalk.red(`Error: Directory "${name}" already exists`));
        process.exit(1);
    }

    const spinner = p.spinner();
    spinner.start(`Crafting skill "${name}"...`);

    // Create main skill directory
    await mkdir(skillDir, { recursive: true });

    // Create SKILL.md with comprehensive template
    const skillMd = generateSkillTemplate(name);
    await writeFile(join(skillDir, 'SKILL.md'), skillMd);

    // Create optional directories
    const includeScripts = options.full || options.scripts;
    const includeReferences = options.full || options.references;
    const includeAssets = options.full || options.assets;

    if (includeScripts) {
        const scriptsDir = join(skillDir, 'scripts');
        await mkdir(scriptsDir, { recursive: true });

        // Create setup script template
        await writeFile(join(scriptsDir, 'setup.sh'), generateSetupScript(name));

        // Create test script template
        await writeFile(join(scriptsDir, 'test.sh'), generateTestScript(name));

        // Create run script template
        await writeFile(join(scriptsDir, 'run.sh'), generateRunScript(name));
    }

    if (includeReferences) {
        const refsDir = join(skillDir, 'references');
        await mkdir(refsDir, { recursive: true });

        await writeFile(join(refsDir, 'README.md'), `# References for ${name}\n\nAdd reference documents, examples, and documentation here.\n`);
    }

    if (includeAssets) {
        const assetsDir = join(skillDir, 'assets');
        await mkdir(assetsDir, { recursive: true });

        await writeFile(join(assetsDir, '.gitkeep'), '');
    }

    // Create .gitignore
    await writeFile(join(skillDir, '.gitignore'), `node_modules/\n.env\n*.log\n`);

    spinner.stop(`Skill "${name}" crafted successfully!`);
    console.log('');

    // Show created structure
    console.log(chalk.bold('📁 Created structure:'));
    console.log(`  ${chalk.cyan(name)}/`);
    console.log(`  ├── ${chalk.green('SKILL.md')}          ${chalk.dim('← Main skill file')}`);
    console.log(`  ├── ${chalk.dim('.gitignore')}`);

    if (includeScripts) {
        console.log(`  ├── ${chalk.yellow('scripts/')}`);
        console.log(`  │   ├── setup.sh       ${chalk.dim('← Environment setup')}`);
        console.log(`  │   ├── test.sh        ${chalk.dim('← Test runner')}`);
        console.log(`  │   └── run.sh         ${chalk.dim('← Main execution')}`);
    }

    if (includeReferences) {
        console.log(`  ├── ${chalk.blue('references/')}`);
        console.log(`  │   └── README.md`);
    }

    if (includeAssets) {
        console.log(`  └── ${chalk.magenta('assets/')}`);
        console.log(`      └── .gitkeep`);
    }

    console.log('');
    console.log(chalk.dim('Next steps:'));
    console.log(chalk.dim(`  1. Edit ${name}/SKILL.md to add your skill content`));
    console.log(chalk.dim(`  2. Run ${chalk.white(`skills validate ${name}`)} to check format`));
    console.log(chalk.dim(`  3. Run ${chalk.white(`skills audit ${name}`)} for security scan`));
    console.log(chalk.dim(`  4. Run ${chalk.white(`skills submit ${name}`)} to publish`));
    console.log('');
}

function generateSkillTemplate(name: string): string {
    const displayName = name
        .split('-')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

    return `---
name: ${displayName}
description: A brief description of what this skill does
version: 1.0.0
tags:
  - coding
  - best-practices
globs:
  - "**/*.ts"
  - "**/*.js"
---

# ${displayName}

## Overview

Describe what this skill teaches the AI agent. Be specific and actionable.

## Guidelines

### Rule 1: [Name]

Explain the first guideline clearly.

**Do:**
\`\`\`typescript
// Good example
const result = await fetchData();
\`\`\`

**Don't:**
\`\`\`typescript
// Bad example
const result = fetchData(); // Missing await
\`\`\`

### Rule 2: [Name]

Explain the second guideline.

## Examples

Provide concrete examples of the skill in action.

## References

- [Link to docs](https://example.com)
- [Related resource](https://example.com)
`;
}

function generateSetupScript(name: string): string {
    return `#!/bin/bash
# Setup script for ${name}
# This runs when the skill is first installed

echo "Setting up ${name}..."

# Add your setup logic here
# Examples:
#   - Install dependencies
#   - Check prerequisites
#   - Configure environment

echo "Setup complete!"
`;
}

function generateTestScript(name: string): string {
    return `#!/bin/bash
# Test script for ${name}
# Validates the skill works correctly

echo "Testing ${name}..."

# Add your test logic here
# Examples:
#   - Validate SKILL.md format
#   - Check file structure
#   - Run integration tests

echo "All tests passed!"
`;
}

function generateRunScript(name: string): string {
    return `#!/bin/bash
# Run script for ${name}
# Main execution logic

echo "Running ${name}..."

# Add your execution logic here

echo "Done!"
`;
}

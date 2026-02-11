/**
 * Method Command
 * Methodology packs — apply development methodologies as skills
 */

import chalk from 'chalk';
import { Command } from 'commander';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, join } from 'path';

interface MethodPack {
    name: string;
    description: string;
    rules: string[];
}

const PACKS: Record<string, MethodPack> = {
    tdd: {
        name: 'Test-Driven Development',
        description: 'Write tests first, then implement',
        rules: [
            '1. Write a failing test before writing any production code',
            '2. Write only enough test code to make it fail',
            '3. Write only enough production code to pass the test',
            '4. Refactor while keeping all tests green',
            '5. Repeat the red-green-refactor cycle',
        ],
    },
    ddd: {
        name: 'Domain-Driven Design',
        description: 'Model software around business domains',
        rules: [
            '1. Use ubiquitous language from the domain',
            '2. Separate domain logic from infrastructure',
            '3. Define bounded contexts clearly',
            '4. Use aggregates to enforce invariants',
            '5. Communicate between contexts via events',
        ],
    },
    clean: {
        name: 'Clean Architecture',
        description: 'Separate concerns into concentric layers',
        rules: [
            '1. Dependencies point inward only',
            '2. Entities contain business rules',
            '3. Use cases orchestrate entity interactions',
            '4. Adapters translate between layers',
            '5. Frameworks are outer-layer details',
        ],
    },
    solid: {
        name: 'SOLID Principles',
        description: 'Five object-oriented design principles',
        rules: [
            '1. Single Responsibility: one class, one reason to change',
            '2. Open/Closed: open for extension, closed for modification',
            '3. Liskov Substitution: subtypes must be substitutable',
            '4. Interface Segregation: prefer small, focused interfaces',
            '5. Dependency Inversion: depend on abstractions, not concretions',
        ],
    },
    trunk: {
        name: 'Trunk-Based Development',
        description: 'Short-lived branches merged frequently',
        rules: [
            '1. Main branch is always deployable',
            '2. Feature branches live max 1-2 days',
            '3. Use feature flags for incomplete work',
            '4. Review code before merging',
            '5. Deploy from trunk continuously',
        ],
    },
};

export function registerMethodCommand(program: Command): void {
    const method = program
        .command('method')
        .alias('mt')
        .description('Apply development methodology packs');

    method.command('list')
        .description('List available methodology packs')
        .action(() => {
            console.log('');
            console.log(chalk.bold('📚 Methodology Packs'));
            console.log('');
            for (const [key, pack] of Object.entries(PACKS)) {
                console.log(`  ${chalk.cyan(key.padEnd(10))} ${pack.name} — ${chalk.dim(pack.description)}`);
            }
            console.log('');
            console.log(chalk.dim('  Apply: skills method apply <name>'));
            console.log('');
        });

    method.command('show <name>')
        .description('Show methodology details')
        .action((name: string) => {
            const pack = PACKS[name.toLowerCase()];
            if (!pack) {
                console.error(chalk.red(`Unknown method: ${name}`));
                console.log(chalk.dim(`Available: ${Object.keys(PACKS).join(', ')}`));
                return;
            }
            console.log('');
            console.log(chalk.bold(`📖 ${pack.name}`));
            console.log(chalk.dim(`   ${pack.description}`));
            console.log('');
            for (const rule of pack.rules) {
                console.log(`   ${rule}`);
            }
            console.log('');
        });

    method.command('apply <name>')
        .description('Apply a methodology as a skill')
        .option('-o, --output <dir>', 'Output directory', '.')
        .action(async (name: string, options: { output: string }) => {
            try {
                await methodApply(name, options.output);
            } catch (err: any) {
                console.error(chalk.red('Error:'), err.message);
                process.exit(1);
            }
        });
}

async function methodApply(name: string, outputDir: string): Promise<void> {
    const pack = PACKS[name.toLowerCase()];
    if (!pack) {
        console.error(chalk.red(`Unknown method: ${name}`));
        console.log(chalk.dim(`Available: ${Object.keys(PACKS).join(', ')}`));
        process.exit(1);
    }

    const skillDir = join(resolve(outputDir), `method-${name}`);
    await mkdir(skillDir, { recursive: true });

    const content = `---
name: method-${name}
description: ${pack.name} methodology
---

# ${pack.name}

${pack.description}

## Rules

${pack.rules.map(r => `- ${r}`).join('\n')}
`;

    await writeFile(join(skillDir, 'SKILL.md'), content);
    console.log(chalk.green(`✨ Applied ${pack.name} as skill`));
    console.log(`  ${chalk.dim('Location:')} ${chalk.cyan(skillDir)}`);
}

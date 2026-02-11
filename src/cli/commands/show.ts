/**
 * `skills show`, `skills prompt`, and `skills init` commands
 */
import { Command } from 'commander';
import chalk from 'chalk';
import {
    discoverSkills,
    loadSkill,
    listSkillResources,
    generateSkillsPromptXML,
    generateFullSkillsContext,
} from '../../core/index.js';

export function registerShowCommand(program: Command) {
    // Show command
    program
        .command('show <name>')
        .description('Show detailed information about a skill')
        .action(async (name) => {
            try {
                const skills = await discoverSkills();
                const skillRef = skills.find(s => s.name === name);

                if (!skillRef) {
                    console.error(chalk.red(`Skill not found: ${name}`));
                    console.log(chalk.gray('Available skills:'), skills.map(s => s.name).join(', ') || 'none');
                    process.exit(1);
                }

                const skill = await loadSkill(skillRef.path);
                if (!skill) {
                    console.error(chalk.red(`Could not load skill: ${name}`));
                    process.exit(1);
                }

                console.log(chalk.bold(`\n${skill.metadata.name}`));
                console.log('─'.repeat(40));
                console.log(chalk.cyan('Description:'), skill.metadata.description);
                console.log(chalk.cyan('Path:'), skill.path);

                if (skill.metadata.license) {
                    console.log(chalk.cyan('License:'), skill.metadata.license);
                }

                if (skill.metadata.compatibility) {
                    console.log(chalk.cyan('Compatibility:'), skill.metadata.compatibility);
                }

                // List resources
                const resources = await listSkillResources(skill.path);
                if (resources.scripts.length > 0) {
                    console.log(chalk.cyan('\nScripts:'));
                    resources.scripts.forEach(s => console.log(chalk.gray(`  - ${s}`)));
                }
                if (resources.references.length > 0) {
                    console.log(chalk.cyan('\nReferences:'));
                    resources.references.forEach(r => console.log(chalk.gray(`  - ${r}`)));
                }
                if (resources.assets.length > 0) {
                    console.log(chalk.cyan('\nAssets:'));
                    resources.assets.forEach(a => console.log(chalk.gray(`  - ${a}`)));
                }

                // Body preview
                const bodyLines = skill.body.split('\n').slice(0, 10);
                console.log(chalk.cyan('\nInstructions (preview):'));
                console.log(chalk.gray(bodyLines.join('\n')));
                if (skill.body.split('\n').length > 10) {
                    console.log(chalk.gray('...'));
                }
                console.log('');
            } catch (error) {
                console.error(chalk.red('Error showing skill:'), error);
                process.exit(1);
            }
        });

    // Prompt command - generate system prompt XML
    program
        .command('prompt')
        .description('Generate system prompt XML for discovered skills')
        .option('-f, --full', 'Include full skill system instructions')
        .action(async (options) => {
            try {
                const skills = await discoverSkills();

                if (skills.length === 0) {
                    console.log(chalk.yellow('No skills found.'));
                    return;
                }

                if (options.full) {
                    const context = generateFullSkillsContext(skills);
                    console.log(context);
                } else {
                    const { xml, skillCount, estimatedTokens } = generateSkillsPromptXML(skills);
                    console.log(xml);
                    console.log(chalk.gray(`\n# ${skillCount} skills, ~${estimatedTokens} tokens`));
                }
            } catch (error) {
                console.error(chalk.red('Error generating prompt:'), error);
                process.exit(1);
            }
        });

    // Init command - create a new skill
    program
        .command('init <name>')
        .description('Create a new skill from template')
        .option('-d, --directory <dir>', 'Directory to create skill in', './skills')
        .action(async (name, options) => {
            try {
                const { mkdir, writeFile } = await import('fs/promises');
                const { join } = await import('path');

                const skillDir = join(options.directory, name);

                // Create directories
                await mkdir(join(skillDir, 'scripts'), { recursive: true });
                await mkdir(join(skillDir, 'references'), { recursive: true });
                await mkdir(join(skillDir, 'assets'), { recursive: true });

                // Create SKILL.md
                const skillMd = `---
name: ${name}
description: Brief description of what this skill does and when to use it.
license: MIT
metadata:
  author: your-name
  version: "1.0"
---

# ${name.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}

## When to use this skill

Use this skill when the user needs to...

## Instructions

1. First step
2. Second step
3. Third step

## Examples

### Example 1

\`\`\`
Example input or command
\`\`\`

## Best practices

- Best practice 1
- Best practice 2
`;

                await writeFile(join(skillDir, 'SKILL.md'), skillMd);

                console.log(chalk.green(`✓ Created skill: ${name}`));
                console.log(chalk.gray(`  Path: ${skillDir}`));
                console.log(chalk.gray('\nNext steps:'));
                console.log(chalk.gray('  1. Edit SKILL.md with your instructions'));
                console.log(chalk.gray('  2. Add scripts to scripts/'));
                console.log(chalk.gray('  3. Run: skills validate ' + skillDir));
            } catch (error) {
                console.error(chalk.red('Error creating skill:'), error);
                process.exit(1);
            }
        });
}

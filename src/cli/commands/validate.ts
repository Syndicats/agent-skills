/**
 * `skills validate` command — Validate a skill against the Agent Skills specification
 */
import { Command } from 'commander';
import chalk from 'chalk';
import { loadSkill, validateMetadata, validateBody, formatValidationResult } from '../../core/index.js';

export function registerValidateCommand(program: Command) {
    program
        .command('validate <path>')
        .description('Validate a skill against the Agent Skills specification')
        .action(async (path) => {
            try {
                const skill = await loadSkill(path);

                if (!skill) {
                    console.error(chalk.red(`Skill not found at: ${path}`));
                    process.exit(1);
                }

                console.log(chalk.bold(`\nValidating: ${skill.metadata.name}\n`));

                // Validate metadata
                const metadataResult = validateMetadata(skill.metadata);
                console.log(chalk.underline('Metadata:'));
                console.log(formatValidationResult(metadataResult));

                // Validate body
                const bodyResult = validateBody(skill.body);
                console.log(chalk.underline('\nBody Content:'));
                console.log(formatValidationResult(bodyResult));

                // Overall result
                const isValid = metadataResult.valid && bodyResult.valid;
                console.log('\n' + '─'.repeat(40));
                if (isValid) {
                    console.log(chalk.green.bold('✓ Skill is valid'));
                } else {
                    console.log(chalk.red.bold('✗ Skill has validation errors'));
                    process.exit(1);
                }
            } catch (error) {
                console.error(chalk.red('Error validating skill:'), error);
                process.exit(1);
            }
        });
}

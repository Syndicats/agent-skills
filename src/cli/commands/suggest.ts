/**
 * Suggest Command
 * Project-aware skill recommendations based on tech stack analysis
 */

import chalk from 'chalk';
import ora from 'ora';
import { Command } from 'commander';
import {
    analyzeProject,
    buildSearchKeywords,
    type SuggestOptions,
} from '../../core/suggest.js';

export function registerSuggestCommand(program: Command): void {
    program
        .command('suggest')
        .alias('sg')
        .description('Analyze project tech stack and suggest skill keywords')
        .option('-v, --verbose', 'Show detailed analysis')
        .option('-j, --json', 'Output in JSON format')
        .option('-p, --path <dir>', 'Project path (default: current directory)')
        .action(async (options: any) => {
            try {
                const projectPath = options.path || process.cwd();
                const spinner = ora('Analyzing your project...').start();
                const analysis = await analyzeProject(projectPath);

                if (analysis.languages.length === 0 && analysis.frameworks.length === 0) {
                    spinner.warn('Could not detect project tech stack. Try running from a project directory.');
                    return;
                }

                const keywords = buildSearchKeywords(analysis);
                spinner.succeed('Project analyzed');
                console.log('');

                if (options.json) {
                    console.log(JSON.stringify({ analysis, keywords }, null, 2));
                    return;
                }

                console.log(chalk.bold('Detected Tech Stack:'));
                if (analysis.languages.length > 0) {
                    console.log(`  ${chalk.dim('Languages:')}  ${analysis.languages.join(', ')}`);
                }
                if (analysis.frameworks.length > 0) {
                    console.log(`  ${chalk.dim('Frameworks:')} ${analysis.frameworks.join(', ')}`);
                }
                if (analysis.libraries.length > 0) {
                    console.log(`  ${chalk.dim('Libraries:')}  ${analysis.libraries.join(', ')}`);
                }
                if (analysis.testTools.length > 0) {
                    console.log(`  ${chalk.dim('Testing:')}    ${analysis.testTools.join(', ')}`);
                }
                if (analysis.buildTools.length > 0) {
                    console.log(`  ${chalk.dim('Build:')}      ${analysis.buildTools.join(', ')}`);
                }
                console.log('');
                console.log(chalk.bold('Search Keywords:'));
                console.log(`  ${keywords.join(', ')}`);
                console.log('');
                console.log(chalk.dim('Use these keywords to find skills in Git repositories:'));
                console.log(chalk.gray(`  skills install owner/repo`));
                console.log('');
            } catch (err: any) {
                console.error(chalk.red('Error:'), err.message);
                process.exit(1);
            }
        });
}

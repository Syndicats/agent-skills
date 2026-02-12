/**
 * Score Command
 * Assess skill quality with a 4-dimension scoring system
 */

import chalk from 'chalk';
import { Command } from 'commander';
import { resolve } from 'path';
import { assessQuality, formatScoreBar, getScoreColor } from '../../core/quality.js';
import type { QualityScore, ScoreDetail } from '../../core/quality.js';

interface ScoreOptions {
    json?: boolean;
    verbose?: boolean;
}

/**
 * Register the score command with commander
 */
export function registerScoreCommand(program: Command): void {
    program
        .command('score [path]')
        .description('Score a skill\'s quality (structure, clarity, specificity, advanced)')
        .option('--json', 'Output as JSON')
        .option('-v, --verbose', 'Show individual check details')
        .action(async (path: string | undefined, options: ScoreOptions) => {
            try {
                await scoreCommand(path || '.', options);
            } catch (err: any) {
                console.error(chalk.red('Error:'), err.message);
                process.exit(1);
            }
        });
}

/**
 * Run the score command
 */
async function scoreCommand(targetPath: string, options: ScoreOptions): Promise<void> {
    const resolved = resolve(targetPath);
    const result = await assessQuality(resolved);

    // JSON output
    if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
    }

    // Header
    console.log('');
    console.log(chalk.bold('🎯 Skill Quality Score'));
    console.log(chalk.dim(`   ${resolved}`));
    console.log('');

    // Overall score
    const color = getScoreColor(result.overall);
    console.log(`   ${chalk.bold('Overall:')}  ${chalk[color](formatScoreBar(result.overall))}  ${chalk.bold[color](result.grade)}`);
    console.log('');

    // Dimension breakdown
    const dims: { name: string; key: keyof Pick<QualityScore, 'structure' | 'clarity' | 'specificity' | 'advanced'>; weight: string }[] = [
        { name: 'Structure', key: 'structure', weight: '30%' },
        { name: 'Clarity', key: 'clarity', weight: '30%' },
        { name: 'Specificity', key: 'specificity', weight: '30%' },
        { name: 'Advanced', key: 'advanced', weight: '10%' },
    ];

    for (const dim of dims) {
        const s = result[dim.key];
        const c = getScoreColor(s);
        const bar = formatScoreBar(s, 15);
        console.log(`   ${chalk.dim(dim.weight.padEnd(4))} ${dim.name.padEnd(12)} ${chalk[c](bar)}`);

        // Verbose: show checks for this dimension
        if (options.verbose) {
            const checks = result.details.filter(d => d.dimension === dim.key);
            for (const check of checks) {
                const icon = check.passed ? chalk.green('✔') : chalk.red('✖');
                const pts = chalk.dim(`${check.points}/${check.maxPoints}`);
                console.log(`         ${icon} ${check.check} ${pts}`);
                if (!check.passed && check.tip) {
                    console.log(`           ${chalk.dim('→ ' + check.tip)}`);
                }
            }
            console.log('');
        }
    }

    if (!options.verbose) {
        console.log('');
        console.log(chalk.dim('   Use --verbose to see individual checks'));
    }

    // Tips for improvement
    const failedChecks = result.details.filter(d => !d.passed && d.tip);
    if (failedChecks.length > 0 && !options.verbose) {
        console.log('');
        console.log(chalk.bold('💡 Top improvements:'));
        const topTips = failedChecks
            .sort((a, b) => b.maxPoints - a.maxPoints)
            .slice(0, 3);
        for (const tip of topTips) {
            console.log(`   ${chalk.yellow('→')} ${tip.tip}`);
        }
    }

    console.log('');
}

/**
 * Audit Command
 * Security vulnerability scanning for AI agent skills
 * (SkillKit calls this "scan" — we call it "audit")
 */

import chalk from 'chalk';
import ora from 'ora';
import { Command } from 'commander';
import { resolve } from 'path';
import {
    runAudit,
    shouldFail,
    toSARIF,
    type ScanResult,
    type ScanFinding,
    type Severity,
    type AuditOptions,
} from '../../core/audit.js';

/**
 * Register the audit command with commander
 */
export function registerAuditCommand(program: Command): void {
    program
        .command('audit <path>')
        .alias('scan')
        .description('Security audit — scan skills for vulnerabilities')
        .option('-f, --format <format>', 'Output format: summary, json, table, sarif', 'summary')
        .option('--fail-on <severity>', 'Exit code 1 if findings at this severity or above (critical, high, medium, low)')
        .option('--skip-rules <rules>', 'Comma-separated rule IDs or categories to skip')
        .action(async (path: string, options: any) => {
            try {
                const auditOptions: AuditOptions = {
                    format: options.format || 'summary',
                    failOn: options.failOn as Severity | undefined,
                    skipRules: options.skipRules ? options.skipRules.split(',').map((s: string) => s.trim()) : [],
                };

                await auditCommand(path, auditOptions);
            } catch (err: any) {
                console.error(chalk.red('Error:'), err.message);
                process.exit(1);
            }
        });
}

/**
 * Run the audit command
 */
async function auditCommand(targetPath: string, options: AuditOptions): Promise<void> {
    const resolvedPath = resolve(targetPath);
    const spinner = ora('Scanning for security vulnerabilities...').start();

    const result = await runAudit(resolvedPath, options);

    spinner.succeed(`Scanned ${result.filesScanned} file(s)`);
    console.log('');

    // Output based on format
    switch (options.format) {
        case 'json':
            console.log(JSON.stringify(result, null, 2));
            break;

        case 'sarif':
            console.log(JSON.stringify(toSARIF(result), null, 2));
            break;

        case 'table':
            printTable(result);
            break;

        case 'summary':
        default:
            printSummary(result);
            break;
    }

    // Exit with error if threshold exceeded
    if (options.failOn && shouldFail(result, options.failOn)) {
        console.log('');
        console.log(chalk.red(`✖ Audit failed: findings at ${options.failOn} severity or above`));
        process.exit(1);
    }
}

/**
 * Print summary format
 */
function printSummary(result: ScanResult): void {
    if (result.findings.length === 0) {
        console.log(chalk.green('🛡️  No security issues found!'));
        console.log('');
        return;
    }

    console.log(chalk.bold('🛡️  Security Audit Results'));
    console.log('');

    // Group by file
    const byFile = new Map<string, ScanFinding[]>();
    for (const finding of result.findings) {
        const existing = byFile.get(finding.file) || [];
        existing.push(finding);
        byFile.set(finding.file, existing);
    }

    for (const [file, findings] of byFile) {
        console.log(chalk.bold.underline(file));
        console.log('');

        for (const f of findings.sort((a, b) => severityRank(a.severity) - severityRank(b.severity))) {
            const icon = severityIcon(f.severity);
            const color = severityColor(f.severity);
            const ruleId = chalk.dim(`[${f.ruleId}]`);

            console.log(`  ${icon} ${color(f.severity.toUpperCase().padEnd(8))} ${ruleId} ${f.title} ${chalk.dim(`(line ${f.line})`)}`);
            console.log(`    ${chalk.dim(truncate(f.lineContent, 80))}`);
            console.log('');
        }
    }

    // Print summary bar
    const parts: string[] = [];
    if (result.summary.critical > 0) parts.push(chalk.red(`${result.summary.critical} critical`));
    if (result.summary.high > 0) parts.push(chalk.red(`${result.summary.high} high`));
    if (result.summary.medium > 0) parts.push(chalk.yellow(`${result.summary.medium} medium`));
    if (result.summary.low > 0) parts.push(chalk.dim(`${result.summary.low} low`));
    if (result.summary.info > 0) parts.push(chalk.dim(`${result.summary.info} info`));

    console.log(chalk.bold(`Summary: ${parts.join(', ')}  |  ${result.summary.total} finding(s) across ${result.filesScanned} file(s)`));
    console.log('');
}

/**
 * Print table format
 */
function printTable(result: ScanResult): void {
    if (result.findings.length === 0) {
        console.log(chalk.green('No findings.'));
        return;
    }

    // Header
    console.log(
        chalk.bold('Severity'.padEnd(10)) +
        chalk.bold('Rule'.padEnd(8)) +
        chalk.bold('Category'.padEnd(22)) +
        chalk.bold('File'.padEnd(30)) +
        chalk.bold('Line'.padEnd(6)) +
        chalk.bold('Title')
    );
    console.log('─'.repeat(120));

    for (const f of result.findings.sort((a, b) => severityRank(a.severity) - severityRank(b.severity))) {
        const color = severityColor(f.severity);
        console.log(
            color(f.severity.toUpperCase().padEnd(10)) +
            chalk.dim(f.ruleId.padEnd(8)) +
            f.category.padEnd(22) +
            truncate(f.file, 28).padEnd(30) +
            String(f.line).padEnd(6) +
            f.title
        );
    }
}

function severityRank(severity: Severity): number {
    const ranks: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    return ranks[severity];
}

function severityIcon(severity: Severity): string {
    const icons: Record<Severity, string> = {
        critical: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '🔵',
        info: 'ℹ️ ',
    };
    return icons[severity];
}

function severityColor(severity: Severity): (s: string) => string {
    const colors: Record<Severity, (s: string) => string> = {
        critical: chalk.red.bold,
        high: chalk.red,
        medium: chalk.yellow,
        low: chalk.blue,
        info: chalk.dim,
    };
    return colors[severity];
}

function truncate(str: string, maxLen: number): string {
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen - 1) + '…';
}

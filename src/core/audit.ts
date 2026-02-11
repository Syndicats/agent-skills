/**
 * Audit Engine - Security vulnerability scanning for skills
 * Scans skill files against 46+ rules for 6 threat categories
 */

import { readFile, readdir, stat } from 'fs/promises';
import { join, relative, extname } from 'path';
import {
    SCANNER_RULES,
    createEmptyScanResult,
    type ScanFinding,
    type ScanResult,
    type Severity,
    type ScannerRule,
} from './scanner-rules.js';

export type { ScanResult, ScanFinding, Severity };

export interface AuditOptions {
    format?: 'summary' | 'json' | 'table' | 'sarif';
    failOn?: Severity;
    skipRules?: string[];
}

// File extensions to scan
const SCANNABLE_EXTENSIONS = new Set([
    '.md', '.txt', '.yaml', '.yml', '.json', '.toml',
    '.ts', '.js', '.py', '.sh', '.bash', '.zsh',
    '.rb', '.go', '.rs', '.java', '.kt',
    '.mdc', '.cursorrules', '.rules',
]);

// Max file size (256KB)
const MAX_FILE_SIZE = 256 * 1024;

/**
 * Recursively collect scannable files
 */
async function collectFiles(dir: string, baseDir: string): Promise<string[]> {
    const files: string[] = [];

    try {
        const entries = await readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = join(dir, entry.name);

            // Skip hidden dirs, node_modules, .git
            if (entry.name.startsWith('.') || entry.name === 'node_modules') {
                continue;
            }

            if (entry.isDirectory()) {
                const subFiles = await collectFiles(fullPath, baseDir);
                files.push(...subFiles);
            } else if (entry.isFile()) {
                const ext = extname(entry.name).toLowerCase();
                // Scan known extensions or extensionless files (like SKILL.md)
                if (SCANNABLE_EXTENSIONS.has(ext) || entry.name === 'SKILL.md' || !ext) {
                    const fileStat = await stat(fullPath);
                    if (fileStat.size <= MAX_FILE_SIZE) {
                        files.push(fullPath);
                    }
                }
            }
        }
    } catch {
        // Skip inaccessible directories
    }

    return files;
}

/**
 * Scan a single file against all rules
 */
function scanFile(
    content: string,
    filePath: string,
    rules: ScannerRule[]
): ScanFinding[] {
    const findings: ScanFinding[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        for (const rule of rules) {
            if (rule.pattern.test(line)) {
                // Run false positive check if available
                if (rule.falsePositiveCheck) {
                    const context = lines.slice(Math.max(0, i - 2), i + 3);
                    if (rule.falsePositiveCheck(line, context)) {
                        continue;
                    }
                }

                const match = line.match(rule.pattern);
                findings.push({
                    ruleId: rule.id,
                    category: rule.category,
                    severity: rule.severity,
                    title: rule.title,
                    description: rule.description,
                    file: filePath,
                    line: i + 1,
                    lineContent: line.trim(),
                    column: match?.index,
                });
            }
        }
    }

    return findings;
}

/**
 * Run a full security audit on a directory or file
 */
export async function runAudit(
    targetPath: string,
    options: AuditOptions = {}
): Promise<ScanResult> {
    const result = createEmptyScanResult();
    const skipRuleIds = new Set(options.skipRules || []);

    // Filter rules
    const activeRules = SCANNER_RULES.filter(r => {
        if (skipRuleIds.has(r.id)) return false;
        // Also allow skipping entire categories
        if (skipRuleIds.has(r.category)) return false;
        return true;
    });

    // Collect files
    const fileStat = await stat(targetPath);
    let files: string[];

    if (fileStat.isDirectory()) {
        files = await collectFiles(targetPath, targetPath);
    } else {
        files = [targetPath];
    }

    result.filesScanned = files.length;

    // Scan each file
    for (const file of files) {
        try {
            const content = await readFile(file, 'utf-8');
            const relPath = relative(targetPath, file) || file;
            const findings = scanFile(content, relPath, activeRules);
            result.findings.push(...findings);
        } catch {
            // Skip unreadable files
        }
    }

    // Build summary
    for (const finding of result.findings) {
        result.summary[finding.severity]++;
        result.summary.total++;
    }

    return result;
}

/**
 * Check if audit should fail based on severity threshold
 */
export function shouldFail(result: ScanResult, failOn: Severity): boolean {
    const severityOrder: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];
    const threshold = severityOrder.indexOf(failOn);

    for (const finding of result.findings) {
        if (severityOrder.indexOf(finding.severity) <= threshold) {
            return true;
        }
    }

    return false;
}

/**
 * Convert scan result to SARIF format (for GitHub Code Scanning)
 */
export function toSARIF(result: ScanResult): object {
    return {
        version: '2.1.0',
        $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json',
        runs: [{
            tool: {
                driver: {
                    name: 'agent-skills-audit',
                    version: '1.0.0',
                    informationUri: 'https://agentskills.in',
                    rules: SCANNER_RULES.map(r => ({
                        id: r.id,
                        name: r.title,
                        shortDescription: { text: r.title },
                        fullDescription: { text: r.description },
                        defaultConfiguration: {
                            level: r.severity === 'critical' || r.severity === 'high'
                                ? 'error'
                                : r.severity === 'medium'
                                    ? 'warning'
                                    : 'note',
                        },
                        properties: {
                            category: r.category,
                            severity: r.severity,
                        },
                    })),
                },
            },
            results: result.findings.map(f => ({
                ruleId: f.ruleId,
                level: f.severity === 'critical' || f.severity === 'high'
                    ? 'error'
                    : f.severity === 'medium'
                        ? 'warning'
                        : 'note',
                message: { text: `${f.title}: ${f.description}` },
                locations: [{
                    physicalLocation: {
                        artifactLocation: { uri: f.file },
                        region: {
                            startLine: f.line,
                            startColumn: f.column || 1,
                        },
                    },
                }],
            })),
        }],
    };
}

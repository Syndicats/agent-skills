/**
 * Skill Quality Scoring Module
 * 4-dimension quality assessment for skills
 *
 * Dimensions:
 *   Structure    (30%) — frontmatter, required fields, directory layout
 *   Clarity      (30%) — description quality, headings, examples, "when to use"
 *   Specificity  (30%) — actionable steps, code examples, numbered instructions
 *   Advanced     (10%) — scripts, references, assets, anti-patterns, changelog
 */

import { readFile, stat, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, resolve } from 'path';

// ── Types ────────────────────────────────────────────────────────────────

export interface QualityScore {
    /** Overall weighted score 0–100 */
    overall: number;
    /** Structure dimension 0–100 */
    structure: number;
    /** Clarity dimension 0–100 */
    clarity: number;
    /** Specificity dimension 0–100 */
    specificity: number;
    /** Advanced dimension 0–100 */
    advanced: number;
    /** Individual check results */
    details: ScoreDetail[];
    /** Human-readable grade */
    grade: string;
}

export interface ScoreDetail {
    dimension: 'structure' | 'clarity' | 'specificity' | 'advanced';
    check: string;
    passed: boolean;
    points: number;
    maxPoints: number;
    tip?: string;
}

// ── Weights ──────────────────────────────────────────────────────────────

const WEIGHTS = {
    structure: 0.30,
    clarity: 0.30,
    specificity: 0.30,
    advanced: 0.10,
} as const;

// ── Main Entry ───────────────────────────────────────────────────────────

/**
 * Assess the quality of a skill at the given path.
 * @param skillPath — path to skill directory or SKILL.md file
 */
export async function assessQuality(skillPath: string): Promise<QualityScore> {
    const resolved = resolve(skillPath);
    const pathStat = await stat(resolved).catch(() => null);

    let dir: string;
    let skillMdPath: string;

    if (pathStat?.isDirectory()) {
        dir = resolved;
        skillMdPath = join(resolved, 'SKILL.md');
    } else {
        dir = resolve(resolved, '..');
        skillMdPath = resolved;
    }

    let content = '';
    if (existsSync(skillMdPath)) {
        content = await readFile(skillMdPath, 'utf-8');
    }

    const details: ScoreDetail[] = [];

    // Run all dimension checks
    const structureScore = scoreStructure(content, dir, details);
    const clarityScore = scoreClarity(content, details);
    const specificityScore = scoreSpecificity(content, details);
    const advancedScore = await scoreAdvanced(content, dir, details);

    const overall = Math.round(
        structureScore * WEIGHTS.structure +
        clarityScore * WEIGHTS.clarity +
        specificityScore * WEIGHTS.specificity +
        advancedScore * WEIGHTS.advanced
    );

    return {
        overall,
        structure: structureScore,
        clarity: clarityScore,
        specificity: specificityScore,
        advanced: advancedScore,
        details,
        grade: toGrade(overall),
    };
}

// ── Dimension 1: Structure (30%) ─────────────────────────────────────────

function scoreStructure(content: string, dir: string, details: ScoreDetail[]): number {
    let score = 0;
    const max = 100;

    // Check 1: SKILL.md exists (25 pts)
    const hasMd = content.length > 0;
    addDetail(details, 'structure', 'SKILL.md file exists', hasMd, 25, 25,
        hasMd ? undefined : 'Create a SKILL.md file in your skill directory');
    if (hasMd) score += 25;

    // Check 2: YAML frontmatter present (25 pts)
    const hasFrontmatter = /^---\n[\s\S]*?\n---/m.test(content);
    addDetail(details, 'structure', 'YAML frontmatter present', hasFrontmatter, hasFrontmatter ? 25 : 0, 25,
        hasFrontmatter ? undefined : 'Add YAML frontmatter with --- delimiters at the top');
    if (hasFrontmatter) score += 25;

    // Check 3: Name field in frontmatter (20 pts)
    const hasName = /^name:\s*.+/m.test(content);
    addDetail(details, 'structure', 'name field in frontmatter', hasName, hasName ? 20 : 0, 20,
        hasName ? undefined : 'Add a "name:" field to your frontmatter');
    if (hasName) score += 20;

    // Check 4: Description field in frontmatter (20 pts)
    const hasDesc = /^description:\s*.+/m.test(content);
    addDetail(details, 'structure', 'description field in frontmatter', hasDesc, hasDesc ? 20 : 0, 20,
        hasDesc ? undefined : 'Add a "description:" field to your frontmatter');
    if (hasDesc) score += 20;

    // Check 5: Proper directory structure (10 pts)
    const hasProperDir = existsSync(join(dir, 'SKILL.md'));
    addDetail(details, 'structure', 'Proper directory structure (skillname/SKILL.md)', hasProperDir, hasProperDir ? 10 : 0, 10,
        hasProperDir ? undefined : 'Place SKILL.md inside a named directory');
    if (hasProperDir) score += 10;

    return Math.min(score, max);
}

// ── Dimension 2: Clarity (30%) ───────────────────────────────────────────

function scoreClarity(content: string, details: ScoreDetail[]): number {
    let score = 0;
    const max = 100;

    // Check 1: Description is meaningful (>50 chars) (20 pts)
    const descMatch = content.match(/^description:\s*(.+)/m);
    const descLen = descMatch?.[1]?.trim().length ?? 0;
    const goodDesc = descLen >= 50;
    addDetail(details, 'clarity', 'Description is meaningful (≥50 chars)', goodDesc, goodDesc ? 20 : 0, 20,
        goodDesc ? undefined : `Description is ${descLen} chars — aim for 50+ to explain when/why to use this skill`);
    if (goodDesc) score += 20;

    // Check 2: Has section headings (## or ###) (20 pts)
    const headings = content.match(/^#{2,3}\s+.+/gm) || [];
    const hasHeadings = headings.length >= 2;
    addDetail(details, 'clarity', 'Has section headings (≥2)', hasHeadings, hasHeadings ? 20 : 0, 20,
        hasHeadings ? undefined : 'Add ## headings to organize your skill into logical sections');
    if (hasHeadings) score += 20;

    // Check 3: "When to use" or "Usage" section (15 pts)
    const hasUsage = /when\s+to\s+use|usage|use\s+cases?/i.test(content);
    addDetail(details, 'clarity', '"When to use" or "Usage" section', hasUsage, hasUsage ? 15 : 0, 15,
        hasUsage ? undefined : 'Add a "When to Use" section so agents know when to activate this skill');
    if (hasUsage) score += 15;

    // Check 4: Has examples section (15 pts)
    const hasExamples = /example|demo|sample/i.test(content);
    addDetail(details, 'clarity', 'Has examples or demos', hasExamples, hasExamples ? 15 : 0, 15,
        hasExamples ? undefined : 'Include examples to show expected behavior');
    if (hasExamples) score += 15;

    // Check 5: Body is substantial (>100 lines → 15 pts, >50 → 10, >20 → 5)
    const lines = content.split('\n').length;
    const bodyPts = lines > 100 ? 15 : lines > 50 ? 10 : lines > 20 ? 5 : 0;
    addDetail(details, 'clarity', `Substantial body content (${lines} lines)`, bodyPts > 0, bodyPts, 15,
        bodyPts > 0 ? undefined : 'Add more content — skills under 20 lines are rarely comprehensive');
    score += bodyPts;

    // Check 6: No excessive blank lines (15 pts)
    const blankRatio = (content.match(/\n\n\n+/g) || []).length;
    const cleanFormat = blankRatio <= 3;
    addDetail(details, 'clarity', 'Clean formatting (no excessive blank lines)', cleanFormat, cleanFormat ? 15 : 0, 15,
        cleanFormat ? undefined : 'Remove excessive blank lines for better readability');
    if (cleanFormat) score += 15;

    return Math.min(score, max);
}

// ── Dimension 3: Specificity (30%) ───────────────────────────────────────

function scoreSpecificity(content: string, details: ScoreDetail[]): number {
    let score = 0;
    const max = 100;

    // Check 1: Has code blocks (25 pts)
    const codeBlocks = content.match(/```[\s\S]*?```/g) || [];
    const hasCode = codeBlocks.length >= 1;
    addDetail(details, 'specificity', 'Contains code blocks', hasCode, hasCode ? 25 : 0, 25,
        hasCode ? undefined : 'Add code blocks with concrete examples agents can follow');
    if (hasCode) score += 25;

    // Check 2: Has numbered/ordered steps (20 pts)
    const hasSteps = /^\d+\.\s+/m.test(content) || /^-\s+\*\*Step/m.test(content);
    addDetail(details, 'specificity', 'Has numbered/ordered steps', hasSteps, hasSteps ? 20 : 0, 20,
        hasSteps ? undefined : 'Use numbered steps (1. 2. 3.) for step-by-step instructions');
    if (hasSteps) score += 20;

    // Check 3: References specific tools or commands (15 pts)
    const hasToolRefs = /`[a-z]+\s+[a-z]+`|npm\s+|npx\s+|git\s+|docker\s+|curl\s+/i.test(content);
    addDetail(details, 'specificity', 'References specific tools or commands', hasToolRefs, hasToolRefs ? 15 : 0, 15,
        hasToolRefs ? undefined : 'Reference specific CLI commands or tools the agent should use');
    if (hasToolRefs) score += 15;

    // Check 4: File path references (15 pts)
    const hasFilePaths = /`[^\s`]*\/[^\s`]*`|`\.[a-z]+`/i.test(content);
    addDetail(details, 'specificity', 'References file paths or extensions', hasFilePaths, hasFilePaths ? 15 : 0, 15,
        hasFilePaths ? undefined : 'Include file paths or extensions the skill targets');
    if (hasFilePaths) score += 15;

    // Check 5: Conditional logic / decision trees (10 pts)
    const hasConditional = /\bif\b.*\bthen\b|when\s+.*\bdo\b|in\s+case/i.test(content)
        || /\bIF\b|\bWHEN\b|\bUNLESS\b/m.test(content);
    addDetail(details, 'specificity', 'Has conditional logic or decision rules', hasConditional, hasConditional ? 10 : 0, 10,
        hasConditional ? undefined : 'Add conditional rules (IF...THEN) for nuanced agent behavior');
    if (hasConditional) score += 10;

    // Check 6: Constraints / "Do NOT" rules (15 pts)
    const hasConstraints = /\bdo\s+not\b|\bdon't\b|\bnever\b|\bavoid\b|\bmust\s+not\b/i.test(content);
    addDetail(details, 'specificity', 'Has constraints or "Do NOT" rules', hasConstraints, hasConstraints ? 15 : 0, 15,
        hasConstraints ? undefined : 'Add "Do NOT" or "Avoid" constraints to prevent common mistakes');
    if (hasConstraints) score += 15;

    return Math.min(score, max);
}

// ── Dimension 4: Advanced (10%) ──────────────────────────────────────────

async function scoreAdvanced(content: string, dir: string, details: ScoreDetail[]): Promise<number> {
    let score = 0;
    const max = 100;

    // Check 1: Has scripts/ directory (25 pts)
    const hasScripts = existsSync(join(dir, 'scripts'));
    addDetail(details, 'advanced', 'Has scripts/ directory', hasScripts, hasScripts ? 25 : 0, 25,
        hasScripts ? undefined : 'Add a scripts/ directory for automation hooks');
    if (hasScripts) score += 25;

    // Check 2: Has references/ or resources/ directory (20 pts)
    const hasRefs = existsSync(join(dir, 'references')) || existsSync(join(dir, 'resources'));
    addDetail(details, 'advanced', 'Has references/ or resources/ directory', hasRefs, hasRefs ? 20 : 0, 20,
        hasRefs ? undefined : 'Add a references/ directory for supporting documentation');
    if (hasRefs) score += 20;

    // Check 3: Has anti-patterns section (20 pts)
    const hasAntiPatterns = /anti.?pattern|common\s+mistake|pitfall|gotcha/i.test(content);
    addDetail(details, 'advanced', 'Has anti-patterns or pitfalls section', hasAntiPatterns, hasAntiPatterns ? 20 : 0, 20,
        hasAntiPatterns ? undefined : 'Document anti-patterns or common mistakes to help agents avoid errors');
    if (hasAntiPatterns) score += 20;

    // Check 4: Has changelog or version history (15 pts)
    const hasChangelog = /changelog|version\s+history|what'?s\s+new/i.test(content)
        || existsSync(join(dir, 'CHANGELOG.md'));
    addDetail(details, 'advanced', 'Has changelog or version history', hasChangelog, hasChangelog ? 15 : 0, 15,
        hasChangelog ? undefined : 'Add a version history to track skill evolution');
    if (hasChangelog) score += 15;

    // Check 5: Has tests or testing section (20 pts)
    const hasTests = existsSync(join(dir, 'tests')) || existsSync(join(dir, '__tests__'))
        || /testing|test\s+cases?|validation/i.test(content);
    addDetail(details, 'advanced', 'Has tests or testing instructions', hasTests, hasTests ? 20 : 0, 20,
        hasTests ? undefined : 'Add testing instructions or a tests/ directory');
    if (hasTests) score += 20;

    return Math.min(score, max);
}

// ── Helpers ──────────────────────────────────────────────────────────────

function addDetail(
    details: ScoreDetail[],
    dimension: ScoreDetail['dimension'],
    check: string,
    passed: boolean,
    points: number,
    maxPoints: number,
    tip?: string,
): void {
    details.push({ dimension, check, passed, points, maxPoints, tip });
}

function toGrade(score: number): string {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
}

/**
 * Format a quality score as a colored bar string (for terminal output).
 */
export function formatScoreBar(score: number, width: number = 20): string {
    const filled = Math.round((score / 100) * width);
    const empty = width - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return `${bar} ${score}/100`;
}

/**
 * Get color name for a score (for chalk usage).
 */
export function getScoreColor(score: number): 'green' | 'yellow' | 'red' {
    if (score >= 70) return 'green';
    if (score >= 50) return 'yellow';
    return 'red';
}

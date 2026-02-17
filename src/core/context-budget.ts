/**
 * Context Budget Manager
 * Ranks installed skills by relevance to the current project and selects
 * the best combination that fits within a token budget.
 *
 * Relevance scoring (no LLM required):
 *   1. File extension matching   — project files vs. skill code languages
 *   2. Dependency matching       — package.json / requirements.txt keywords
 *   3. Keyword density           — skill keywords vs. project file names
 *   4. Recency boost             — recently installed skills get a small bump
 */

import { readFile, readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { join, extname, basename } from 'path';
import matter from 'gray-matter';

// ── Types ────────────────────────────────────────────────────────────────

export interface SkillWithRelevance {
    /** Skill name */
    name: string;
    /** Path to skill directory */
    path: string;
    /** Estimated token count */
    tokens: number;
    /** Relevance score 0-100 */
    relevance: number;
    /** Why this relevance score */
    reason: string;
    /** Full SKILL.md content (for output) */
    content: string;
}

export interface ContextPlan {
    /** Skills selected to load (within budget) */
    loaded: SkillWithRelevance[];
    /** Skills skipped (didn't fit or too irrelevant) */
    skipped: SkillWithRelevance[];
    /** Total tokens used */
    totalTokens: number;
    /** Budget that was set */
    budget: number;
    /** Budget remaining */
    budgetRemaining: number;
}

export interface ContextOptions {
    /** Token budget */
    budget: number;
    /** Minimum relevance score to include (0-100, default 10) */
    minRelevance?: number;
    /** Project directory to analyze (default: process.cwd()) */
    projectDir?: string;
    /** Output format */
    format?: 'text' | 'xml' | 'json';
}

// ── Extension → Language Mapping ─────────────────────────────────────────

const EXT_TO_LANGUAGE: Record<string, string[]> = {
    '.ts': ['typescript', 'ts', 'node', 'javascript'],
    '.tsx': ['typescript', 'react', 'tsx', 'frontend'],
    '.js': ['javascript', 'js', 'node'],
    '.jsx': ['javascript', 'react', 'jsx', 'frontend'],
    '.py': ['python', 'py', 'django', 'flask', 'fastapi'],
    '.rs': ['rust', 'rs', 'cargo'],
    '.go': ['go', 'golang'],
    '.java': ['java', 'spring', 'maven', 'gradle'],
    '.kt': ['kotlin', 'android'],
    '.swift': ['swift', 'ios', 'swiftui'],
    '.rb': ['ruby', 'rails', 'gems'],
    '.php': ['php', 'laravel', 'wordpress'],
    '.cs': ['csharp', 'dotnet', 'unity'],
    '.cpp': ['cpp', 'c++'],
    '.c': ['c', 'embedded'],
    '.vue': ['vue', 'vuejs', 'frontend'],
    '.svelte': ['svelte', 'sveltekit', 'frontend'],
    '.astro': ['astro', 'frontend'],
    '.sol': ['solidity', 'web3', 'ethereum'],
    '.yml': ['devops', 'ci', 'config'],
    '.yaml': ['devops', 'ci', 'config'],
    '.tf': ['terraform', 'infrastructure', 'devops'],
    '.dockerfile': ['docker', 'containers', 'devops'],
    '.sql': ['sql', 'database', 'postgres', 'mysql'],
    '.prisma': ['prisma', 'database', 'orm'],
    '.graphql': ['graphql', 'api'],
    '.proto': ['protobuf', 'grpc', 'api'],
    '.md': ['documentation', 'markdown'],
    '.css': ['css', 'styling', 'frontend'],
    '.scss': ['sass', 'styling', 'frontend'],
};

// ── Main Entry ───────────────────────────────────────────────────────────

/**
 * Build a context plan that fits installed skills into a token budget.
 *
 * @param skillPaths — array of absolute paths to skill directories
 * @param options    — budget + project analysis options
 */
export async function buildContextPlan(
    skillPaths: string[],
    options: ContextOptions
): Promise<ContextPlan> {
    const { budget, minRelevance = 10, projectDir = process.cwd() } = options;

    // 1. Analyze project
    const projectSignals = await analyzeProjectSignals(projectDir);

    // 2. Score each skill
    const scored: SkillWithRelevance[] = [];
    for (const sp of skillPaths) {
        const skill = await scoreSkillRelevance(sp, projectSignals);
        if (skill) scored.push(skill);
    }

    // 3. Sort by relevance (descending)
    scored.sort((a, b) => b.relevance - a.relevance);

    // 4. Greedy selection within budget
    const loaded: SkillWithRelevance[] = [];
    const skipped: SkillWithRelevance[] = [];
    let usedTokens = 0;

    for (const skill of scored) {
        if (skill.relevance < minRelevance) {
            skipped.push(skill);
            continue;
        }
        if (usedTokens + skill.tokens <= budget) {
            loaded.push(skill);
            usedTokens += skill.tokens;
        } else {
            skipped.push(skill);
        }
    }

    return {
        loaded,
        skipped,
        totalTokens: usedTokens,
        budget,
        budgetRemaining: budget - usedTokens,
    };
}

// ── Project Analysis ─────────────────────────────────────────────────────

interface ProjectSignals {
    /** Language keywords from file extensions */
    languages: string[];
    /** Dependency names */
    dependencies: string[];
    /** Directory/file name keywords */
    fileKeywords: string[];
}

/**
 * Analyze the project directory to extract signals.
 */
async function analyzeProjectSignals(projectDir: string): Promise<ProjectSignals> {
    const languages: Set<string> = new Set();
    const dependencies: Set<string> = new Set();
    const fileKeywords: Set<string> = new Set();

    // Scan file extensions (top 2 levels only)
    try {
        await scanExtensions(projectDir, languages, fileKeywords, 0, 2);
    } catch {
        // Directory may not exist
    }

    // Read package.json if exists
    const pkgPath = join(projectDir, 'package.json');
    if (existsSync(pkgPath)) {
        try {
            const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));
            const allDeps = {
                ...pkg.dependencies,
                ...pkg.devDependencies,
            };
            for (const dep of Object.keys(allDeps || {})) {
                dependencies.add(dep.replace(/^@/, '').replace(/\//g, '-').toLowerCase());
                // Also add the base name
                const lastPart = dep.split('/').pop();
                if (lastPart) dependencies.add(lastPart.toLowerCase());
            }
            // Also add scripts keywords
            if (pkg.scripts) {
                for (const script of Object.values(pkg.scripts as Record<string, string>)) {
                    const words = script.split(/\s+/).filter((w: string) => w.length > 3);
                    words.forEach((w: string) => fileKeywords.add(w.toLowerCase()));
                }
            }
        } catch {
            // Invalid JSON
        }
    }

    // Read requirements.txt if exists
    const reqPath = join(projectDir, 'requirements.txt');
    if (existsSync(reqPath)) {
        try {
            const content = await readFile(reqPath, 'utf-8');
            for (const line of content.split('\n')) {
                const pkg = line.trim().split(/[=<>!]/)[0].trim();
                if (pkg && !pkg.startsWith('#')) {
                    dependencies.add(pkg.toLowerCase());
                }
            }
        } catch {
            // Invalid file
        }
    }

    // Read Cargo.toml if exists
    const cargoPath = join(projectDir, 'Cargo.toml');
    if (existsSync(cargoPath)) {
        try {
            const content = await readFile(cargoPath, 'utf-8');
            const depMatches = content.matchAll(/^\s*(\w[\w-]*)\s*=/gm);
            for (const match of depMatches) {
                dependencies.add(match[1].toLowerCase());
            }
        } catch { }
    }

    return {
        languages: [...languages],
        dependencies: [...dependencies],
        fileKeywords: [...fileKeywords],
    };
}

/**
 * Recursively scan extensions in a directory.
 */
async function scanExtensions(
    dir: string,
    languages: Set<string>,
    fileKeywords: Set<string>,
    depth: number,
    maxDepth: number
): Promise<void> {
    if (depth >= maxDepth) return;

    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') continue;

        if (entry.isFile()) {
            const ext = extname(entry.name).toLowerCase();
            const langs = EXT_TO_LANGUAGE[ext];
            if (langs) langs.forEach(l => languages.add(l));
            // Add filename without extension as keyword
            const nameWithoutExt = basename(entry.name, ext).toLowerCase();
            if (nameWithoutExt.length > 2) fileKeywords.add(nameWithoutExt);
        } else if (entry.isDirectory()) {
            fileKeywords.add(entry.name.toLowerCase());
            await scanExtensions(join(dir, entry.name), languages, fileKeywords, depth + 1, maxDepth);
        }
    }
}

// ── Skill Scoring ────────────────────────────────────────────────────────

/**
 * Score a single skill's relevance to the project.
 */
async function scoreSkillRelevance(
    skillPath: string,
    signals: ProjectSignals
): Promise<SkillWithRelevance | null> {
    const skillMd = skillPath.endsWith('SKILL.md') ? skillPath : join(skillPath, 'SKILL.md');
    if (!existsSync(skillMd)) return null;

    try {
        const raw = await readFile(skillMd, 'utf-8');
        const { data, content } = matter(raw);
        const name = data.name || basename(skillPath);
        const tokens = Math.ceil(raw.length / 4);

        // Extract skill keywords from body
        const skillKeywords = extractSignificantWords(content);
        const skillDescription = (data.description || '').toLowerCase();

        // Score components
        let score = 0;
        const reasons: string[] = [];

        // 1. Language match (0-40 points)
        const langScore = matchScore(skillKeywords, signals.languages) * 40;
        if (langScore > 0) reasons.push(`lang match: ${Math.round(langScore)}pts`);
        score += langScore;

        // 2. Dependency match (0-30 points)
        const depScore = matchScore(skillKeywords, signals.dependencies) * 30;
        if (depScore > 0) reasons.push(`dep match: ${Math.round(depScore)}pts`);
        score += depScore;

        // 3. File keyword match (0-20 points)
        const fileScore = matchScore(skillKeywords, signals.fileKeywords) * 20;
        if (fileScore > 0) reasons.push(`file match: ${Math.round(fileScore)}pts`);
        score += fileScore;

        // 4. Description match against all signals (0-10 points)
        const allSignals = [...signals.languages, ...signals.dependencies, ...signals.fileKeywords];
        const descWords = skillDescription.split(/\s+/);
        const descHits = descWords.filter((w: string) => allSignals.some((s: string) => s.includes(w) || w.includes(s))).length;
        const descScore = Math.min(10, (descHits / Math.max(1, descWords.length)) * 30);
        if (descScore > 0) reasons.push(`desc match: ${Math.round(descScore)}pts`);
        score += descScore;

        // Clamp to 0-100
        const relevance = Math.round(Math.min(100, Math.max(0, score)));
        const reason = reasons.length > 0 ? reasons.join(', ') : 'no project match';

        return { name, path: skillPath, tokens, relevance, reason, content: raw };
    } catch {
        return null;
    }
}

/**
 * How well do skill keywords match project signals? Returns 0-1.
 */
function matchScore(skillWords: string[], signals: string[]): number {
    if (skillWords.length === 0 || signals.length === 0) return 0;

    let hits = 0;
    const signalSet = new Set(signals);
    for (const word of skillWords) {
        if (signalSet.has(word)) hits++;
        // Also check partial match (e.g. "react" matches "react-dom")
        for (const sig of signals) {
            if (sig.includes(word) || word.includes(sig)) {
                hits += 0.5;
                break;
            }
        }
    }

    return Math.min(1, hits / Math.max(1, signals.length));
}

/**
 * Extract significant words from text (no stop words, min length 3).
 */
function extractSignificantWords(text: string): string[] {
    const stopWords = new Set([
        'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
        'her', 'was', 'one', 'our', 'out', 'use', 'has', 'word', 'each', 'make',
        'like', 'just', 'over', 'such', 'take', 'than', 'them', 'would', 'other',
        'into', 'when', 'some', 'time', 'very', 'your', 'with', 'this', 'that',
        'from', 'they', 'been', 'have', 'will', 'should', 'using', 'skill',
    ]);

    return [...new Set(
        text.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length >= 3 && !stopWords.has(w))
    )];
}

// ── Output Formatters ────────────────────────────────────────────────────

/**
 * Format the context plan as XML for agent consumption.
 */
export function formatContextXML(plan: ContextPlan): string {
    const lines = ['<skills>'];
    for (const skill of plan.loaded) {
        lines.push(`  <skill name="${skill.name}" tokens="${skill.tokens}" relevance="${skill.relevance}">`);
        lines.push(`    ${skill.content}`);
        lines.push('  </skill>');
    }
    lines.push('</skills>');
    return lines.join('\n');
}

/**
 * Format the context plan as JSON.
 */
export function formatContextJSON(plan: ContextPlan): string {
    return JSON.stringify({
        loaded: plan.loaded.map(s => ({ name: s.name, tokens: s.tokens, relevance: s.relevance, reason: s.reason })),
        skipped: plan.skipped.map(s => ({ name: s.name, tokens: s.tokens, relevance: s.relevance, reason: s.reason })),
        totalTokens: plan.totalTokens,
        budget: plan.budget,
        budgetRemaining: plan.budgetRemaining,
    }, null, 2);
}

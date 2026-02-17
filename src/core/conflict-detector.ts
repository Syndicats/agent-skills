/**
 * Skill Conflict Detector Module
 * Detects contradictory instructions and overlapping topics across installed skills.
 *
 * 3 detection strategies (no LLM required):
 *   1. Keyword Contradiction — imperative statements that oppose each other
 *   2. Topic Overlap         — skills covering identical topics (token waste)
 *   3. Rule Extraction       — Do/Don't lists with conflicting directives
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, basename } from 'path';
import matter from 'gray-matter';

// ── Types ────────────────────────────────────────────────────────────────

export interface Conflict {
    /** critical = opposing instructions, warning = potential ambiguity */
    severity: 'critical' | 'warning';
    /** Skill A name */
    skillA: string;
    /** Skill B name */
    skillB: string;
    /** Conflict category */
    category: string;
    /** Human-readable description */
    description: string;
    /** The conflicting line from skill A */
    lineA: string;
    /** The conflicting line from skill B */
    lineB: string;
}

export interface Overlap {
    /** Skills sharing the topic */
    skills: string[];
    /** Topic description */
    topic: string;
    /** Estimated duplicate tokens */
    tokenWaste: number;
}

export interface ConflictResult {
    /** Direct contradictions found */
    conflicts: Conflict[];
    /** Topic overlaps found */
    overlaps: Overlap[];
    /** Summary counts */
    summary: {
        total: number;
        critical: number;
        warnings: number;
        overlapCount: number;
        estimatedTokenWaste: number;
    };
}

// ── Internal types ───────────────────────────────────────────────────────

interface SkillContent {
    name: string;
    path: string;
    body: string;
    directives: Directive[];
    topics: TopicBag;
}

interface Directive {
    line: string;
    verb: 'use' | 'avoid' | 'always' | 'never' | 'prefer' | 'do' | 'dont';
    subject: string;
    original: string;
}

interface TopicBag {
    keywords: string[];
    headings: string[];
    codeLanguages: string[];
}

// ── Patterns ─────────────────────────────────────────────────────────────

/** Patterns for extracting imperative directives */
const DIRECTIVE_PATTERNS: Array<{ regex: RegExp; verb: Directive['verb'] }> = [
    { regex: /^\s*[-*]?\s*(?:always\s+)use\s+(.+)/i, verb: 'use' },
    { regex: /^\s*[-*]?\s*always\s+(.+)/i, verb: 'always' },
    { regex: /^\s*[-*]?\s*never\s+(.+)/i, verb: 'never' },
    { regex: /^\s*[-*]?\s*avoid\s+(.+)/i, verb: 'avoid' },
    { regex: /^\s*[-*]?\s*prefer\s+(.+)/i, verb: 'prefer' },
    { regex: /^\s*[-*]?\s*(?:do\s+not|don'?t)\s+(.+)/i, verb: 'dont' },
    { regex: /^\s*[-*]?\s*do\s+(.+)/i, verb: 'do' },
];

/** Verbs that oppose each other */
const OPPOSING_VERBS: Array<[Directive['verb'], Directive['verb']]> = [
    ['use', 'avoid'],
    ['always', 'never'],
    ['prefer', 'avoid'],
    ['do', 'dont'],
    ['use', 'dont'],
    ['always', 'dont'],
    ['use', 'never'],
];

/** Code fence language regex */
const CODE_FENCE_RE = /```(\w+)/g;

/** Common stop words to ignore in topic matching */
const STOP_WORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'should', 'could', 'may', 'might', 'shall', 'can', 'need', 'must',
    'this', 'that', 'these', 'those', 'it', 'its', 'you', 'your', 'we',
    'our', 'they', 'their', 'when', 'where', 'how', 'what', 'which',
    'who', 'whom', 'if', 'then', 'else', 'not', 'no', 'as', 'so',
    'than', 'too', 'very', 'just', 'about', 'up', 'out', 'all', 'also',
    'each', 'every', 'any', 'some', 'such', 'only', 'own', 'same',
    'use', 'using', 'used', 'make', 'sure', 'file', 'code', 'skill',
]);

// ── Main Entry ───────────────────────────────────────────────────────────

/**
 * Detect conflicts and overlaps across a set of installed skills.
 *
 * @param skillPaths — array of absolute paths to skill directories
 *                     (each should contain a SKILL.md)
 */
export async function detectConflicts(skillPaths: string[]): Promise<ConflictResult> {
    // 1. Load all skills
    const skills: SkillContent[] = [];
    for (const p of skillPaths) {
        const skill = await loadSkillContent(p);
        if (skill) skills.push(skill);
    }

    // 2. Run detection strategies
    const conflicts = detectContradictions(skills);
    const overlaps = detectOverlaps(skills);

    // 3. Build summary
    const critical = conflicts.filter(c => c.severity === 'critical').length;
    const warnings = conflicts.filter(c => c.severity === 'warning').length;
    const estimatedTokenWaste = overlaps.reduce((sum, o) => sum + o.tokenWaste, 0);

    return {
        conflicts,
        overlaps,
        summary: {
            total: conflicts.length + overlaps.length,
            critical,
            warnings,
            overlapCount: overlaps.length,
            estimatedTokenWaste,
        },
    };
}

// ── Strategy 1: Keyword Contradiction ────────────────────────────────────

/**
 * Extract directives from all skills, then cross-compare for contradictions.
 */
function detectContradictions(skills: SkillContent[]): Conflict[] {
    const conflicts: Conflict[] = [];

    for (let i = 0; i < skills.length; i++) {
        for (let j = i + 1; j < skills.length; j++) {
            const a = skills[i];
            const b = skills[j];

            for (const da of a.directives) {
                for (const db of b.directives) {
                    const opposition = checkOpposition(da, db);
                    if (opposition) {
                        conflicts.push({
                            severity: opposition.confidence > 0.7 ? 'critical' : 'warning',
                            skillA: a.name,
                            skillB: b.name,
                            category: opposition.category,
                            description: opposition.description,
                            lineA: da.original,
                            lineB: db.original,
                        });
                    }
                }
            }
        }
    }

    return conflicts;
}

/**
 * Check if two directives oppose each other.
 */
function checkOpposition(
    a: Directive,
    b: Directive
): { confidence: number; category: string; description: string } | null {
    // Check if verbs are opposing
    const isOpposing = OPPOSING_VERBS.some(
        ([v1, v2]) => (a.verb === v1 && b.verb === v2) || (a.verb === v2 && b.verb === v1)
    );

    if (!isOpposing) return null;

    // Check if subjects are similar (normalized comparison)
    const similarity = subjectSimilarity(a.subject, b.subject);
    if (similarity < 0.4) return null;

    // Determine category from subject keywords
    const category = categorizeSubject(a.subject + ' ' + b.subject);

    return {
        confidence: similarity,
        category,
        description: `"${a.verb} ${a.subject}" conflicts with "${b.verb} ${b.subject}"`,
    };
}

/**
 * Compute similarity between two subjects (0-1).
 * Uses normalized word overlap (Jaccard-like).
 */
function subjectSimilarity(a: string, b: string): number {
    const wordsA = extractWords(a);
    const wordsB = extractWords(b);

    if (wordsA.length === 0 || wordsB.length === 0) return 0;

    const setA = new Set(wordsA);
    const setB = new Set(wordsB);

    let intersection = 0;
    for (const word of setA) {
        if (setB.has(word)) intersection++;
    }

    const union = new Set([...setA, ...setB]).size;
    return union === 0 ? 0 : intersection / union;
}

// ── Strategy 2: Topic Overlap ────────────────────────────────────────────

/**
 * Detect skills that cover the same topic (duplicate instructions).
 */
function detectOverlaps(skills: SkillContent[]): Overlap[] {
    const overlaps: Overlap[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < skills.length; i++) {
        for (let j = i + 1; j < skills.length; j++) {
            const a = skills[i];
            const b = skills[j];
            const key = [a.name, b.name].sort().join('::');
            if (seen.has(key)) continue;

            // Check heading overlap
            const headingOverlap = arrayOverlap(a.topics.headings, b.topics.headings);
            // Check keyword overlap
            const keywordOverlap = arrayOverlap(a.topics.keywords, b.topics.keywords);
            // Check language overlap
            const langOverlap = arrayOverlap(a.topics.codeLanguages, b.topics.codeLanguages);

            // Weighted score
            const score = headingOverlap * 0.5 + keywordOverlap * 0.35 + langOverlap * 0.15;

            if (score > 0.35) {
                seen.add(key);

                // Estimate token waste: smaller skill's token count × overlap ratio
                const tokensA = Math.ceil(a.body.length / 4);
                const tokensB = Math.ceil(b.body.length / 4);
                const waste = Math.round(Math.min(tokensA, tokensB) * score);

                // Find the common topic
                const commonHeadings = a.topics.headings.filter(h => b.topics.headings.includes(h));
                const commonKeywords = a.topics.keywords.filter(k => b.topics.keywords.includes(k));
                const topic = commonHeadings.length > 0
                    ? commonHeadings.slice(0, 3).join(', ')
                    : commonKeywords.slice(0, 5).join(', ');

                overlaps.push({
                    skills: [a.name, b.name],
                    topic: topic || 'general instructions',
                    tokenWaste: waste,
                });
            }
        }
    }

    return overlaps;
}

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Load a skill's content and extract directives + topics.
 */
async function loadSkillContent(skillPath: string): Promise<SkillContent | null> {
    const skillMd = skillPath.endsWith('SKILL.md')
        ? skillPath
        : join(skillPath, 'SKILL.md');

    if (!existsSync(skillMd)) return null;

    try {
        const raw = await readFile(skillMd, 'utf-8');
        const { data, content } = matter(raw);
        const name = data.name || basename(skillPath);

        const directives = extractDirectives(content);
        const topics = extractTopics(content);

        return { name, path: skillPath, body: content, directives, topics };
    } catch {
        return null;
    }
}

/**
 * Extract imperative directives from skill body.
 */
function extractDirectives(body: string): Directive[] {
    const directives: Directive[] = [];
    const lines = body.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('```')) continue;

        for (const { regex, verb } of DIRECTIVE_PATTERNS) {
            const match = trimmed.match(regex);
            if (match) {
                const subject = match[1].replace(/[.!,;:]+$/, '').trim().toLowerCase();
                if (subject.length > 2 && subject.length < 200) {
                    directives.push({ line: trimmed, verb, subject, original: trimmed });
                }
                break; // only match first pattern per line
            }
        }
    }

    return directives;
}

/**
 * Extract topic signals from skill body: headings, keywords, code languages.
 */
function extractTopics(body: string): TopicBag {
    const lines = body.split('\n');
    const headings: string[] = [];
    const allWords: string[] = [];
    const codeLanguages: string[] = [];

    let inCodeBlock = false;
    for (const line of lines) {
        if (line.trim().startsWith('```')) {
            inCodeBlock = !inCodeBlock;
            // Extract language from opening fence
            if (inCodeBlock) {
                const match = line.match(/```(\w+)/);
                if (match && match[1]) {
                    codeLanguages.push(match[1].toLowerCase());
                }
            }
            continue;
        }

        if (inCodeBlock) continue;

        // Extract headings (## or ###)
        const headingMatch = line.match(/^#{2,4}\s+(.+)/);
        if (headingMatch) {
            headings.push(headingMatch[1].toLowerCase().trim());
        }

        // Extract significant words
        const words = extractWords(line);
        allWords.push(...words);
    }

    // Get top keywords by frequency (skip stop words)
    const freq = new Map<string, number>();
    for (const word of allWords) {
        freq.set(word, (freq.get(word) || 0) + 1);
    }

    const keywords = [...freq.entries()]
        .filter(([, count]) => count >= 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30)
        .map(([word]) => word);

    return {
        keywords,
        headings: [...new Set(headings)],
        codeLanguages: [...new Set(codeLanguages)],
    };
}

/**
 * Extract significant words from a line (lowercase, no stop words, min length 3).
 */
function extractWords(text: string): string[] {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length >= 3 && !STOP_WORDS.has(w));
}

/**
 * Compute overlap ratio between two arrays (Jaccard index).
 */
function arrayOverlap(a: string[], b: string[]): number {
    if (a.length === 0 || b.length === 0) return 0;
    const setA = new Set(a);
    const setB = new Set(b);
    let intersection = 0;
    for (const item of setA) {
        if (setB.has(item)) intersection++;
    }
    const union = new Set([...setA, ...setB]).size;
    return union === 0 ? 0 : intersection / union;
}

/**
 * Categorize a subject string into a conflict category.
 */
function categorizeSubject(text: string): string {
    const lower = text.toLowerCase();

    const categories: Array<[string, string[]]> = [
        ['formatting', ['format', 'indent', 'tab', 'space', 'semicolon', 'quote', 'lint', 'prettier', 'eslint']],
        ['architecture', ['component', 'class', 'function', 'functional', 'module', 'pattern', 'architecture', 'structure']],
        ['testing', ['test', 'spec', 'jest', 'vitest', 'mocha', 'assert', 'mock', 'stub']],
        ['styling', ['css', 'style', 'tailwind', 'sass', 'scss', 'styled', 'theme', 'color']],
        ['state management', ['state', 'redux', 'zustand', 'context', 'store', 'signal', 'observable']],
        ['dependencies', ['import', 'require', 'dependency', 'package', 'library', 'framework']],
        ['language', ['typescript', 'javascript', 'python', 'rust', 'go', 'java', 'type', 'interface']],
        ['security', ['auth', 'token', 'password', 'secret', 'encrypt', 'cors', 'xss', 'csrf']],
        ['deployment', ['deploy', 'build', 'ci', 'cd', 'docker', 'kubernetes', 'vercel', 'aws']],
        ['api', ['api', 'rest', 'graphql', 'endpoint', 'route', 'fetch', 'request', 'response']],
    ];

    for (const [category, keywords] of categories) {
        if (keywords.some(kw => lower.includes(kw))) return category;
    }

    return 'general';
}

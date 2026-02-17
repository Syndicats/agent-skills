/**
 * Skill Splitter Module
 * Splits a monolithic skill into focused sub-skills based on topic sections.
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, basename } from 'path';
import matter from 'gray-matter';

// ── Types ────────────────────────────────────────────────────────────────

export interface SplitSkill {
    /** Suggested name for this sub-skill */
    name: string;
    /** Section heading(s) this came from */
    headings: string[];
    /** Content body */
    body: string;
    /** Full SKILL.md content with frontmatter */
    fullContent: string;
    /** Estimated token count */
    tokens: number;
}

export interface SplitResult {
    /** Original skill name */
    originalName: string;
    /** Original token count */
    originalTokens: number;
    /** Generated sub-skills */
    skills: SplitSkill[];
    /** Whether the split was meaningful */
    worthSplitting: boolean;
    /** Reason if not worth it */
    reason?: string;
}

// ── Main Entry ───────────────────────────────────────────────────────────

/**
 * Split a skill into sub-skills based on topic clustering.
 *
 * @param skillPath — path to skill directory or SKILL.md
 * @param minSections — minimum sections per sub-skill (default 2)
 */
export async function splitSkill(
    skillPath: string,
    minSections: number = 2
): Promise<SplitResult> {
    const skillMd = skillPath.endsWith('SKILL.md') ? skillPath : join(skillPath, 'SKILL.md');
    if (!existsSync(skillMd)) throw new Error(`SKILL.md not found at ${skillMd}`);

    const raw = await readFile(skillMd, 'utf-8');
    const { data, content } = matter(raw);
    const name = data.name || basename(skillPath);
    const originalTokens = Math.ceil(raw.length / 4);

    // Parse into sections
    const sections = parseSections(content);

    // Not worth splitting if too few sections
    if (sections.length < 3) {
        return {
            originalName: name,
            originalTokens,
            skills: [],
            worthSplitting: false,
            reason: `Only ${sections.length} section(s) found — too few to split meaningfully.`,
        };
    }

    // Group sections by topic similarity
    const groups = clusterSections(sections, minSections);

    if (groups.length <= 1) {
        return {
            originalName: name,
            originalTokens,
            skills: [],
            worthSplitting: false,
            reason: 'All sections belong to a single coherent topic.',
        };
    }

    // Build sub-skills
    const subSkills: SplitSkill[] = groups.map((group, i) => {
        const subName = group.suggestedName || `${name}-part-${i + 1}`;
        const headings = group.sections.map(s => s.heading);
        const body = group.sections.map(s => `## ${s.heading}\n${s.content}`).join('\n\n');

        const fullContent = [
            '---',
            `name: ${subName}`,
            `description: "Split from ${name}: ${headings.slice(0, 2).join(', ')}"`,
            `split_from: "${name}"`,
            '---',
            '',
            body,
        ].join('\n');

        return {
            name: subName,
            headings,
            body,
            fullContent,
            tokens: Math.ceil(fullContent.length / 4),
        };
    });

    return {
        originalName: name,
        originalTokens,
        skills: subSkills,
        worthSplitting: true,
    };
}

// ── Section Parsing ──────────────────────────────────────────────────────

interface Section {
    heading: string;
    level: number;
    content: string;
    keywords: string[];
}

function parseSections(body: string): Section[] {
    const lines = body.split('\n');
    const sections: Section[] = [];
    let currentHeading = '';
    let currentLevel = 0;
    let currentLines: string[] = [];

    for (const line of lines) {
        const match = line.match(/^(#{2,4})\s+(.+)/);
        if (match) {
            if (currentHeading && currentLines.length > 0) {
                const content = currentLines.join('\n');
                sections.push({
                    heading: currentHeading,
                    level: currentLevel,
                    content,
                    keywords: extractKeywords(currentHeading + ' ' + content),
                });
            }
            currentHeading = match[2].trim();
            currentLevel = match[1].length;
            currentLines = [];
        } else {
            currentLines.push(line);
        }
    }

    if (currentHeading && currentLines.length > 0) {
        const content = currentLines.join('\n');
        sections.push({
            heading: currentHeading,
            level: currentLevel,
            content,
            keywords: extractKeywords(currentHeading + ' ' + content),
        });
    }

    return sections;
}

// ── Topic Clustering ─────────────────────────────────────────────────────

interface SectionGroup {
    sections: Section[];
    suggestedName: string;
}

function clusterSections(sections: Section[], minPerGroup: number): SectionGroup[] {
    // Topic categories for clustering
    const topicGroups: Record<string, string[]> = {
        'setup': ['install', 'setup', 'getting started', 'prerequisites', 'requirements', 'configuration', 'config'],
        'coding-style': ['style', 'format', 'naming', 'conventions', 'lint', 'prettier', 'eslint', 'pattern'],
        'testing': ['test', 'spec', 'jest', 'vitest', 'mocha', 'assert', 'coverage', 'mock'],
        'architecture': ['architecture', 'structure', 'pattern', 'component', 'module', 'design', 'layer'],
        'deployment': ['deploy', 'build', 'ci', 'cd', 'docker', 'kubernetes', 'production', 'hosting'],
        'security': ['security', 'auth', 'token', 'password', 'encrypt', 'cors', 'xss', 'vulnerability'],
        'api': ['api', 'rest', 'graphql', 'endpoint', 'route', 'middleware', 'handler'],
        'database': ['database', 'sql', 'query', 'model', 'schema', 'migration', 'orm', 'prisma'],
        'documentation': ['doc', 'readme', 'changelog', 'comment', 'jsdoc', 'tsdoc'],
        'performance': ['performance', 'optimize', 'cache', 'lazy', 'bundle', 'minify', 'compress'],
    };

    // Assign each section to a topic
    const assigned = new Map<string, Section[]>();

    for (const section of sections) {
        let bestTopic = 'other';
        let bestScore = 0;

        for (const [topic, keywords] of Object.entries(topicGroups)) {
            const score = section.keywords.filter(kw => keywords.some(tk => kw.includes(tk) || tk.includes(kw))).length;
            if (score > bestScore) {
                bestScore = score;
                bestTopic = topic;
            }
        }

        if (!assigned.has(bestTopic)) assigned.set(bestTopic, []);
        assigned.get(bestTopic)!.push(section);
    }

    // Filter groups that have enough sections
    const groups: SectionGroup[] = [];
    const overflow: Section[] = [];

    for (const [topic, secs] of assigned) {
        if (secs.length >= minPerGroup) {
            groups.push({ sections: secs, suggestedName: topic });
        } else {
            overflow.push(...secs);
        }
    }

    // Add overflow sections to the closest group or create an "other" group
    if (overflow.length > 0) {
        if (overflow.length >= minPerGroup) {
            groups.push({ sections: overflow, suggestedName: 'general' });
        } else if (groups.length > 0) {
            // Add to the largest group
            groups.sort((a, b) => b.sections.length - a.sections.length);
            groups[0].sections.push(...overflow);
        } else {
            // All sections are in overflow — not worth splitting
            return [{ sections: overflow, suggestedName: 'general' }];
        }
    }

    return groups;
}

// ── Helpers ──────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
    'could', 'may', 'might', 'shall', 'can', 'need', 'must',
    'use', 'using', 'used', 'make', 'sure', 'file', 'code',
]);

function extractKeywords(text: string): string[] {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length >= 3 && !STOP_WORDS.has(w));
}

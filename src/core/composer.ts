/**
 * Skill Composer Module
 * Merges multiple skills into a single coherent super-skill.
 *
 * Strategies:
 *   merge       — combine sections, deduplicate bullets
 *   chain       — sequential application ("first do A, then B")
 *   conditional — context-dependent ("for React use A, for Vue use B")
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, basename } from 'path';
import matter from 'gray-matter';

// ── Types ────────────────────────────────────────────────────────────────

export type ComposeStrategy = 'merge' | 'chain' | 'conditional';

export interface ComposeOptions {
    /** Skill paths to compose */
    skills: string[];
    /** Output skill name */
    output: string;
    /** Merge strategy */
    strategy: ComposeStrategy;
    /** Deduplicate similar bullets (default true) */
    dedup: boolean;
}

export interface ComposedSkill {
    /** Generated name */
    name: string;
    /** Generated description */
    description: string;
    /** Merged SKILL.md body */
    body: string;
    /** Source skill names */
    sourceSkills: string[];
    /** Estimated token count */
    tokenCount: number;
    /** How many sections were deduplicated */
    deduplicatedCount: number;
    /** Full SKILL.md content (with frontmatter) */
    fullContent: string;
}

// ── Internal ─────────────────────────────────────────────────────────────

interface ParsedSkill {
    name: string;
    description: string;
    sections: Section[];
    body: string;
}

interface Section {
    heading: string;
    level: number;
    content: string;
}

// ── Main Entry ───────────────────────────────────────────────────────────

/**
 * Compose multiple skills into one.
 */
export async function composeSkills(options: ComposeOptions): Promise<ComposedSkill> {
    const { skills: paths, output, strategy, dedup } = options;

    // Load all skills
    const skills: ParsedSkill[] = [];
    for (const p of paths) {
        const skill = await loadAndParse(p);
        if (skill) skills.push(skill);
    }

    if (skills.length === 0) {
        throw new Error('No valid skills found to compose');
    }

    if (skills.length === 1) {
        // Just return the single skill with new name
        const s = skills[0];
        const fullContent = buildFrontmatter(output, s.description, [s.name]) + '\n' + s.body;
        return {
            name: output,
            description: s.description,
            body: s.body,
            sourceSkills: [s.name],
            tokenCount: Math.ceil(fullContent.length / 4),
            deduplicatedCount: 0,
            fullContent,
        };
    }

    let body: string;
    let dedupCount = 0;

    switch (strategy) {
        case 'chain':
            body = composeChain(skills);
            break;
        case 'conditional':
            body = composeConditional(skills);
            break;
        case 'merge':
        default:
            const result = composeMerge(skills, dedup);
            body = result.body;
            dedupCount = result.deduplicatedCount;
            break;
    }

    const descriptions = skills.map(s => s.description).filter(Boolean);
    const description = `Composed skill combining: ${skills.map(s => s.name).join(', ')}. ${descriptions[0] || ''}`;

    const sourceSkills = skills.map(s => s.name);
    const fullContent = buildFrontmatter(output, description, sourceSkills) + '\n' + body;

    return {
        name: output,
        description,
        body,
        sourceSkills,
        tokenCount: Math.ceil(fullContent.length / 4),
        deduplicatedCount: dedupCount,
        fullContent,
    };
}

// ── Strategy: Merge ──────────────────────────────────────────────────────

function composeMerge(skills: ParsedSkill[], dedup: boolean): { body: string; deduplicatedCount: number } {
    // Group all sections by similar headings
    const groups = new Map<string, Array<{ skill: string; content: string }>>();
    let dedupCount = 0;

    for (const skill of skills) {
        for (const section of skill.sections) {
            const key = normalizeHeading(section.heading);
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push({ skill: skill.name, content: section.content });
        }
    }

    const lines: string[] = [];

    for (const [heading, entries] of groups) {
        // Use the most descriptive heading
        const displayHeading = heading === '(intro)'
            ? ''
            : `## ${heading.charAt(0).toUpperCase() + heading.slice(1)}`;

        if (displayHeading) lines.push(displayHeading);

        if (dedup && entries.length > 1) {
            // Merge and deduplicate bullets
            const allBullets = new Set<string>();
            const merged: string[] = [];

            for (const entry of entries) {
                const entryLines = entry.content.split('\n');
                for (const line of entryLines) {
                    const normalized = line.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '');
                    if (normalized.length < 3) {
                        merged.push(line);
                        continue;
                    }
                    if (allBullets.has(normalized)) {
                        dedupCount++;
                        continue;
                    }
                    allBullets.add(normalized);
                    merged.push(line);
                }
            }
            lines.push(merged.join('\n'));
        } else {
            // Just concatenate
            for (const entry of entries) {
                lines.push(entry.content);
            }
        }

        lines.push('');
    }

    return { body: lines.join('\n').trim(), deduplicatedCount: dedupCount };
}

// ── Strategy: Chain ──────────────────────────────────────────────────────

function composeChain(skills: ParsedSkill[]): string {
    const lines: string[] = [];

    lines.push('This is a composed skill. Apply the following sections in order:\n');

    for (let i = 0; i < skills.length; i++) {
        const skill = skills[i];
        lines.push(`## Step ${i + 1}: ${skill.name}`);
        lines.push(`> ${skill.description}`);
        lines.push('');
        lines.push(skill.body);
        lines.push('');
        lines.push('---');
        lines.push('');
    }

    return lines.join('\n').trim();
}

// ── Strategy: Conditional ────────────────────────────────────────────────

function composeConditional(skills: ParsedSkill[]): string {
    const lines: string[] = [];

    lines.push('This is a composed skill with conditional sections. Choose the appropriate section based on your context:\n');

    for (const skill of skills) {
        lines.push(`## When working with: ${skill.name}`);
        lines.push(`> ${skill.description}`);
        lines.push('');
        lines.push(skill.body);
        lines.push('');
        lines.push('---');
        lines.push('');
    }

    return lines.join('\n').trim();
}

// ── Helpers ──────────────────────────────────────────────────────────────

async function loadAndParse(path: string): Promise<ParsedSkill | null> {
    const skillMd = path.endsWith('SKILL.md') ? path : join(path, 'SKILL.md');
    if (!existsSync(skillMd)) return null;

    try {
        const raw = await readFile(skillMd, 'utf-8');
        const { data, content } = matter(raw);
        const name = data.name || basename(path);
        const description = data.description || '';

        return {
            name,
            description,
            sections: parseSections(content),
            body: content.trim(),
        };
    } catch {
        return null;
    }
}

function parseSections(body: string): Section[] {
    const lines = body.split('\n');
    const sections: Section[] = [];
    let currentHeading = '(intro)';
    let currentLevel = 0;
    let currentLines: string[] = [];

    for (const line of lines) {
        const match = line.match(/^(#{1,4})\s+(.+)/);
        if (match) {
            if (currentLines.length > 0) {
                sections.push({ heading: currentHeading, level: currentLevel, content: currentLines.join('\n') });
            }
            currentHeading = match[2].trim();
            currentLevel = match[1].length;
            currentLines = [];
        } else {
            currentLines.push(line);
        }
    }

    if (currentLines.length > 0) {
        sections.push({ heading: currentHeading, level: currentLevel, content: currentLines.join('\n') });
    }

    return sections;
}

function normalizeHeading(heading: string): string {
    const normalized = heading.toLowerCase().trim();

    // Group similar headings
    const aliases: Record<string, string[]> = {
        'when to use': ['usage', 'use cases', 'scenarios', 'when to apply'],
        'steps': ['instructions', 'how to', 'process', 'workflow'],
        'examples': ['code examples', 'usage examples', 'sample'],
        'best practices': ['guidelines', 'recommendations', 'tips'],
        'setup': ['installation', 'getting started', 'prerequisites'],
    };

    for (const [canonical, alts] of Object.entries(aliases)) {
        if (normalized === canonical || alts.includes(normalized)) return canonical;
    }

    return normalized;
}

function buildFrontmatter(name: string, description: string, sources: string[]): string {
    return [
        '---',
        `name: ${name}`,
        `description: "${description.replace(/"/g, '\\"')}"`,
        `composed_from: [${sources.map(s => `"${s}"`).join(', ')}]`,
        '---',
        '',
    ].join('\n');
}

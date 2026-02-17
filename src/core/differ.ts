/**
 * Skill Differ Module
 * Compare two skills side-by-side with section-aware diffing.
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, basename } from 'path';
import matter from 'gray-matter';

// ── Types ────────────────────────────────────────────────────────────────

export interface SectionDiff {
    /** Section heading */
    heading: string;
    /** Lines added in B */
    linesAdded: number;
    /** Lines removed from A */
    linesRemoved: number;
    /** Unified diff preview */
    preview: string;
}

export interface DiffResult {
    /** Skill A name */
    skillA: string;
    /** Skill B name */
    skillB: string;
    /** Sections only in B */
    added: string[];
    /** Sections only in A */
    removed: string[];
    /** Changed sections */
    changed: SectionDiff[];
    /** Unchanged sections */
    unchanged: string[];
    /** Token count difference (positive = B is larger) */
    tokenDelta: number;
    /** Total lines in A */
    linesA: number;
    /** Total lines in B */
    linesB: number;
}

// ── Main Entry ───────────────────────────────────────────────────────────

/**
 * Compare two skills and produce a diff result.
 *
 * @param pathA — path to first skill directory or SKILL.md
 * @param pathB — path to second skill directory or SKILL.md
 */
export async function diffSkills(pathA: string, pathB: string): Promise<DiffResult> {
    const skillA = await loadSkillForDiff(pathA);
    const skillB = await loadSkillForDiff(pathB);

    if (!skillA) throw new Error(`Cannot load skill at ${pathA}`);
    if (!skillB) throw new Error(`Cannot load skill at ${pathB}`);

    const sectionsA = parseSections(skillA.body);
    const sectionsB = parseSections(skillB.body);

    const headingsA = new Set(sectionsA.map(s => s.heading));
    const headingsB = new Set(sectionsB.map(s => s.heading));

    // Added sections (in B but not A)
    const added = [...headingsB].filter(h => !headingsA.has(h));

    // Removed sections (in A but not B)
    const removed = [...headingsA].filter(h => !headingsB.has(h));

    // Changed and unchanged sections
    const changed: SectionDiff[] = [];
    const unchanged: string[] = [];

    const commonHeadings = [...headingsA].filter(h => headingsB.has(h));
    for (const heading of commonHeadings) {
        const secA = sectionsA.find(s => s.heading === heading)!;
        const secB = sectionsB.find(s => s.heading === heading)!;

        if (secA.content.trim() === secB.content.trim()) {
            unchanged.push(heading);
        } else {
            const linesA = secA.content.split('\n');
            const linesB = secB.content.split('\n');

            // Simple line diff
            const addedLines = linesB.filter(l => !linesA.includes(l));
            const removedLines = linesA.filter(l => !linesB.includes(l));

            // Build preview (max 6 lines)
            const previewLines: string[] = [];
            for (const line of removedLines.slice(0, 3)) {
                previewLines.push(`- ${line}`);
            }
            for (const line of addedLines.slice(0, 3)) {
                previewLines.push(`+ ${line}`);
            }

            changed.push({
                heading,
                linesAdded: addedLines.length,
                linesRemoved: removedLines.length,
                preview: previewLines.join('\n'),
            });
        }
    }

    const tokensA = Math.ceil(skillA.raw.length / 4);
    const tokensB = Math.ceil(skillB.raw.length / 4);

    return {
        skillA: skillA.name,
        skillB: skillB.name,
        added,
        removed,
        changed,
        unchanged,
        tokenDelta: tokensB - tokensA,
        linesA: skillA.body.split('\n').length,
        linesB: skillB.body.split('\n').length,
    };
}

// ── Helpers ──────────────────────────────────────────────────────────────

interface SkillForDiff {
    name: string;
    body: string;
    raw: string;
}

async function loadSkillForDiff(path: string): Promise<SkillForDiff | null> {
    const skillMd = path.endsWith('SKILL.md') ? path : join(path, 'SKILL.md');
    if (!existsSync(skillMd)) return null;

    try {
        const raw = await readFile(skillMd, 'utf-8');
        const { data, content } = matter(raw);
        return {
            name: data.name || basename(path),
            body: content,
            raw,
        };
    } catch {
        return null;
    }
}

interface Section {
    heading: string;
    content: string;
}

function parseSections(body: string): Section[] {
    const lines = body.split('\n');
    const sections: Section[] = [];
    let currentHeading = '(intro)';
    let currentLines: string[] = [];

    for (const line of lines) {
        const match = line.match(/^#{1,4}\s+(.+)/);
        if (match) {
            if (currentLines.length > 0) {
                sections.push({ heading: currentHeading, content: currentLines.join('\n') });
            }
            currentHeading = match[1].trim().toLowerCase();
            currentLines = [];
        } else {
            currentLines.push(line);
        }
    }

    if (currentLines.length > 0) {
        sections.push({ heading: currentHeading, content: currentLines.join('\n') });
    }

    return sections;
}

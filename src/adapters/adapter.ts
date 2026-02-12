/**
 * Agent Adapter — Base Interface & Abstract Class
 *
 * Provides a formal adapter pattern for all 42 supported AI agents.
 * Each agent can override config path generation, format rendering,
 * and feature detection.
 */

import { homedir } from 'os';
import { join } from 'path';

// ── Interface ────────────────────────────────────────────────────────────

export interface AgentAdapter {
    /** Internal key, e.g. "cursor" */
    readonly name: string;
    /** Human-readable name, e.g. "Cursor" */
    readonly displayName: string;

    /** Relative project-level skill directory */
    getProjectDir(): string;
    /** Absolute global skill directory */
    getGlobalDir(): string;
    /** Full path for a given skill, e.g. `.cursor/skills/my-skill/SKILL.md` */
    getConfigPath(skillName: string, global: boolean): string;
    /** Generate agent-specific config content from parsed skill */
    generateConfig(parsed: ParsedSkillInput): string;
    /** Does this adapter support a particular format? */
    supportsFormat(format: string): boolean;
    /** Get the filename the agent expects (usually SKILL.md) */
    getSkillFilename(): string;
}

/** Minimal skill input for config generation */
export interface ParsedSkillInput {
    name: string;
    description: string;
    rawContent: string;
    sections?: { heading: string; content: string }[];
    frontmatter?: Record<string, any>;
}

// ── Base Adapter ─────────────────────────────────────────────────────────

export abstract class BaseAdapter implements AgentAdapter {
    abstract readonly name: string;
    abstract readonly displayName: string;

    protected readonly projectDir: string;
    protected readonly globalDir: string;

    constructor(projectDir: string, globalDir: string) {
        this.projectDir = projectDir;
        this.globalDir = globalDir;
    }

    getProjectDir(): string {
        return this.projectDir;
    }

    getGlobalDir(): string {
        return this.globalDir;
    }

    getConfigPath(skillName: string, global: boolean): string {
        const base = global ? this.getGlobalDir() : this.getProjectDir();
        return join(base, skillName, this.getSkillFilename());
    }

    generateConfig(parsed: ParsedSkillInput): string {
        // Default: output as standard SKILL.md format
        const lines: string[] = [];

        if (parsed.frontmatter && Object.keys(parsed.frontmatter).length > 0) {
            lines.push('---');
            for (const [key, value] of Object.entries(parsed.frontmatter)) {
                lines.push(`${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`);
            }
            lines.push('---');
            lines.push('');
        }

        lines.push(parsed.rawContent);
        return lines.join('\n');
    }

    supportsFormat(format: string): boolean {
        return format === 'skill.md' || format === 'markdown';
    }

    getSkillFilename(): string {
        return 'SKILL.md';
    }
}

// ── Home directory constant ──────────────────────────────────────────────

export const HOME = homedir();

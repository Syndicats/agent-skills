/**
 * .skillsrc Configuration File Module
 * 
 * Supports project-level and user-level configuration for skill sources,
 * registries, and installation defaults.
 * 
 * Search order:
 * 1. cwd/.skillsrc (YAML/JSON)
 * 2. cwd/.skillsrc.json
 * 3. ~/.skillsrc
 * 4. ~/.skillsrc.json
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// ─── Types ───────────────────────────────────────────────────────────

export interface SkillsRCSource {
    /** Source type */
    type: 'git' | 'npm';
    /** Git URL (for git sources) */
    url?: string;
    /** npm registry URL (for npm sources) */
    registry?: string;
    /** npm scope (e.g. "@company") */
    scope?: string;
    /** Auth method hint */
    auth?: 'token' | 'ssh' | 'env';
    /** Environment variable name containing auth token */
    envVar?: string;
    /** Optional label for display */
    name?: string;
}

export interface SkillsRCDefaults {
    /** Default agents to install to */
    agents?: string[];
    /** Whether to install globally by default */
    global?: boolean;
}

export interface SkillsRC {
    /** Pre-configured skill sources */
    sources?: SkillsRCSource[];
    /** Installation defaults */
    defaults?: SkillsRCDefaults;
}

// ─── Config File Loading ─────────────────────────────────────────────

/**
 * Normalize parsed config to handle field name variants.
 * Supports both "agent" (singular string from README) and "agents" (plural array).
 */
function normalizeConfig(raw: any): SkillsRC {
    const config = raw as SkillsRC;
    if (config.defaults) {
        const defaults = config.defaults as any;
        // Support "agent" (singular string) → convert to "agents" (plural array)
        if (!defaults.agents && defaults.agent) {
            const agent = defaults.agent;
            defaults.agents = Array.isArray(agent)
                ? agent
                : String(agent).split(',').map((a: string) => a.trim()).filter(Boolean);
            delete defaults.agent;
        }
        // Ensure agents is always an array if it's a string
        if (typeof defaults.agents === 'string') {
            defaults.agents = defaults.agents.split(',').map((a: string) => a.trim()).filter(Boolean);
        }
    }
    return config;
}

/**
 * Try to parse a file as JSON or simple YAML-like key-value format
 */
async function parseConfigFile(filePath: string): Promise<SkillsRC | null> {
    try {
        const content = await readFile(filePath, 'utf-8');
        const trimmed = content.trim();

        // Try JSON first
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            return normalizeConfig(JSON.parse(trimmed));
        }

        // Try JSON (sometimes files don't start with { if they have comments)
        try {
            return normalizeConfig(JSON.parse(trimmed));
        } catch {
            // Not JSON — try simple YAML-like format
        }

        // Simple YAML-like parsing (handles common cases)
        return parseSimpleYaml(trimmed);
    } catch {
        return null;
    }
}

/**
 * Parse a simple YAML-like format for .skillsrc files
 * Handles nested objects and arrays with basic indentation
 */
function parseSimpleYaml(content: string): SkillsRC | null {
    try {
        const result: SkillsRC = {};
        const lines = content.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));

        let currentSection: string | null = null;
        let currentSource: Partial<SkillsRCSource> | null = null;

        for (const line of lines) {
            const trimmed = line.trim();
            const indent = line.length - line.trimStart().length;

            // Top-level section
            if (indent === 0 && trimmed.endsWith(':')) {
                currentSection = trimmed.slice(0, -1);
                if (currentSection === 'sources') {
                    result.sources = result.sources || [];
                } else if (currentSection === 'defaults') {
                    result.defaults = result.defaults || {};
                }
                currentSource = null;
                continue;
            }

            // Array item (- prefix)
            if (trimmed.startsWith('- ') && currentSection === 'sources') {
                if (currentSource && Object.keys(currentSource).length > 0) {
                    result.sources!.push(currentSource as SkillsRCSource);
                }
                currentSource = {};
                const kv = trimmed.slice(2).trim();
                if (kv.includes(':')) {
                    const [key, ...rest] = kv.split(':');
                    const value = rest.join(':').trim();
                    (currentSource as any)[key.trim()] = value;
                }
                continue;
            }

            // Key-value pair within current context
            if (trimmed.includes(':') && !trimmed.startsWith('#')) {
                const [key, ...rest] = trimmed.split(':');
                const value = rest.join(':').trim();

                if (currentSource && indent >= 4) {
                    (currentSource as any)[key.trim()] = value === 'true' ? true : value === 'false' ? false : value;
                } else if (currentSection === 'defaults' && result.defaults) {
                    const k = key.trim();
                    if (k === 'global') {
                        result.defaults.global = value === 'true';
                    } else if (k === 'agents' || k === 'agent') {
                        result.defaults.agents = value.split(',').map(a => a.trim()).filter(Boolean);
                    }
                }
            }
        }

        // Push last source
        if (currentSource && Object.keys(currentSource).length > 0) {
            result.sources = result.sources || [];
            result.sources.push(currentSource as SkillsRCSource);
        }

        return Object.keys(result).length > 0 ? result : null;
    } catch {
        return null;
    }
}

// ─── Main API ────────────────────────────────────────────────────────

/**
 * Load .skillsrc configuration from project or user directory
 * 
 * Searches in order:
 * 1. cwd/.skillsrc
 * 2. cwd/.skillsrc.json
 * 3. ~/.skillsrc
 * 4. ~/.skillsrc.json
 * 
 * Returns the first valid config found, or null if none exist.
 */
export async function loadSkillsRC(cwd?: string): Promise<SkillsRC | null> {
    const searchDirs = [
        cwd || process.cwd(),
        homedir(),
    ];

    const fileNames = ['.skillsrc', '.skillsrc.json'];

    for (const dir of searchDirs) {
        for (const fileName of fileNames) {
            const filePath = join(dir, fileName);
            if (existsSync(filePath)) {
                const config = await parseConfigFile(filePath);
                if (config) return config;
            }
        }
    }

    return null;
}

/**
 * Get all configured sources from .skillsrc, optionally filtered by type
 */
export function getSourcesByType(config: SkillsRC, type: 'git' | 'npm'): SkillsRCSource[] {
    return (config.sources || []).filter(s => s.type === type);
}

/**
 * Get the npm registry URL for a given scope from .skillsrc
 */
export function getRegistryForScope(config: SkillsRC, scope: string): string | undefined {
    const source = (config.sources || []).find(
        s => s.type === 'npm' && s.scope === scope
    );
    return source?.registry;
}

/**
 * Get the auth env var for a given source URL
 */
export function getAuthEnvVar(config: SkillsRC, url: string): string | undefined {
    const source = (config.sources || []).find(
        s => s.url && url.includes(s.url)
    );
    return source?.envVar;
}

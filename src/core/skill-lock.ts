/**
 * Skill Lock File Module
 * Tracks installed skills for check/update/remove operations
 */

import { homedir } from 'os';
import { join, dirname } from 'path';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

/**
 * Lock file location (always in home, tracks both global and project skills)
 */
const LOCK_FILE = join(homedir(), '.skills', 'skills.lock');

/**
 * Source type for installed skills
 */
export type SourceType = 'database' | 'github' | 'gitlab' | 'bitbucket' | 'npm' | 'private-git' | 'local';

/**
 * Lock entry for a single installed skill
 */
export interface LockEntry {
    /** Skill name */
    name: string;
    /** Scoped name like @author/skillname */
    scopedName: string;
    /** Source URL or path */
    source: string;
    /** Type of source */
    sourceType: SourceType;
    /** Version (commit SHA for git sources) */
    version?: string;
    /** Installation timestamp (ISO 8601) */
    installedAt: string;
    /** Last update timestamp (ISO 8601) */
    updatedAt?: string;
    /** List of agents this skill is installed to */
    agents: string[];
    /** Path to the canonical copy */
    canonicalPath: string;
    /** Whether this is a global or project installation */
    isGlobal: boolean;
    /** Project directory (for project installations) */
    projectDir?: string;
}

/**
 * Full lock file structure
 */
export interface SkillsLock {
    /** Lock file format version */
    version: '1';
    /** Map of skill name to lock entry */
    skills: Record<string, LockEntry>;
}

/**
 * Get the lock file path
 */
export function getLockFilePath(): string {
    return LOCK_FILE;
}

/**
 * Read the lock file (returns empty lock if doesn't exist)
 */
export async function readLock(): Promise<SkillsLock> {
    try {
        if (!existsSync(LOCK_FILE)) {
            return { version: '1', skills: {} };
        }
        const content = await readFile(LOCK_FILE, 'utf-8');
        return JSON.parse(content);
    } catch {
        return { version: '1', skills: {} };
    }
}

/**
 * Write the lock file
 */
export async function writeLock(lock: SkillsLock): Promise<void> {
    await mkdir(dirname(LOCK_FILE), { recursive: true });
    await writeFile(LOCK_FILE, JSON.stringify(lock, null, 2));
}

/**
 * Add or update a skill in the lock file
 */
export async function addSkillToLock(entry: LockEntry): Promise<void> {
    const lock = await readLock();
    lock.skills[entry.name] = entry;
    await writeLock(lock);
}

/**
 * Remove a skill from the lock file
 */
export async function removeSkillFromLock(skillName: string): Promise<void> {
    const lock = await readLock();
    delete lock.skills[skillName];
    await writeLock(lock);
}

/**
 * Get a skill entry from the lock file
 */
export async function getSkillFromLock(skillName: string): Promise<LockEntry | null> {
    const lock = await readLock();
    return lock.skills[skillName] || null;
}

/**
 * Options for listing installed skills
 */
export interface ListOptions {
    /** Filter to global installations only */
    global?: boolean;
    /** Filter to specific agent */
    agent?: string;
    /** Filter to specific project directory */
    projectDir?: string;
}

/**
 * List all installed skills, optionally filtered
 */
export async function listInstalledSkills(options?: ListOptions): Promise<LockEntry[]> {
    const lock = await readLock();
    let skills = Object.values(lock.skills);

    if (options?.global !== undefined) {
        skills = skills.filter(s => s.isGlobal === options.global);
    }

    if (options?.agent) {
        skills = skills.filter(s => s.agents.includes(options.agent!));
    }

    if (options?.projectDir) {
        skills = skills.filter(s => s.projectDir === options.projectDir);
    }

    return skills;
}

/**
 * Check if a skill is installed
 */
export async function isSkillInstalled(skillName: string): Promise<boolean> {
    const lock = await readLock();
    return !!lock.skills[skillName];
}

/**
 * Get installed skill count
 */
export async function getInstalledSkillCount(): Promise<number> {
    const lock = await readLock();
    return Object.keys(lock.skills).length;
}

/**
 * Update a skill's version in the lock file
 */
export async function updateSkillVersion(
    skillName: string,
    version: string
): Promise<void> {
    const lock = await readLock();
    if (lock.skills[skillName]) {
        lock.skills[skillName].version = version;
        lock.skills[skillName].updatedAt = new Date().toISOString();
        await writeLock(lock);
    }
}

/**
 * Update agents for an installed skill
 */
export async function updateSkillAgents(
    skillName: string,
    agents: string[]
): Promise<void> {
    const lock = await readLock();
    if (lock.skills[skillName]) {
        lock.skills[skillName].agents = agents;
        await writeLock(lock);
    }
}

/**
 * Create a lock entry for a newly installed skill
 */
export function createLockEntry(
    options: {
        name: string;
        scopedName: string;
        source: string;
        sourceType: SourceType;
        version?: string;
        agents: string[];
        canonicalPath: string;
        isGlobal: boolean;
        projectDir?: string;
    }
): LockEntry {
    return {
        name: options.name,
        scopedName: options.scopedName,
        source: options.source,
        sourceType: options.sourceType,
        version: options.version,
        installedAt: new Date().toISOString(),
        agents: options.agents,
        canonicalPath: options.canonicalPath,
        isGlobal: options.isGlobal,
        projectDir: options.projectDir,
    };
}

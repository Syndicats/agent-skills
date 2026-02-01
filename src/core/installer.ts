/**
 * Skill Installer Module
 * Handles symlink-based installation of skills to agent directories
 */

import { homedir } from 'os';
import { join, dirname, relative } from 'path';
import { mkdir, cp, rm, symlink, lstat, readlink } from 'fs/promises';
import { existsSync } from 'fs';

/**
 * Agent configuration interface
 */
export interface AgentConfig {
    name: string;
    displayName: string;
    projectDir: string;
    globalDir: string;
}

/**
 * Installation options
 */
export interface InstallOptions {
    global: boolean;
    agents: string[];
    cwd: string;
}

/**
 * Information about an installed skill
 */
export interface InstalledSkillInfo {
    name: string;
    canonicalPath: string;
    agents: string[];
    linkedPaths: string[];
    method: 'symlink' | 'copy';
}

/**
 * Get the canonical skills storage directory
 * - Global: ~/.skills/
 * - Project: .skills/
 */
export function getCanonicalSkillsDir(global: boolean, cwd: string): string {
    return global
        ? join(homedir(), '.skills')
        : join(cwd, '.skills');
}

/**
 * Get the canonical path for a specific skill
 */
export function getCanonicalPath(
    skillName: string,
    options: { global: boolean; cwd: string }
): string {
    return join(getCanonicalSkillsDir(options.global, options.cwd), skillName);
}

/**
 * Get the agent skill directory path
 */
export function getAgentSkillPath(
    skillName: string,
    agentConfig: AgentConfig,
    options: { global: boolean; cwd: string }
): string {
    const baseDir = options.global
        ? agentConfig.globalDir
        : join(options.cwd, agentConfig.projectDir);
    return join(baseDir, skillName);
}

/**
 * Check if a path is a symlink
 */
export async function isSymlink(path: string): Promise<boolean> {
    try {
        const stats = await lstat(path);
        return stats.isSymbolicLink();
    } catch {
        return false;
    }
}

/**
 * Create a symlink, falling back to copy if symlinks fail (Windows)
 */
async function createSymlinkOrCopy(
    source: string,
    target: string
): Promise<'symlink' | 'copy'> {
    try {
        // Remove existing target if any
        if (existsSync(target)) {
            await rm(target, { recursive: true, force: true });
        }

        // Ensure parent directory exists
        await mkdir(dirname(target), { recursive: true });

        // Try creating symlink
        await symlink(source, target, 'junction'); // 'junction' works on Windows without admin
        return 'symlink';
    } catch (err: any) {
        // Symlink failed, fall back to copy
        console.warn(`Symlink failed, using copy: ${err.message}`);
        await mkdir(dirname(target), { recursive: true });
        await cp(source, target, { recursive: true });
        return 'copy';
    }
}

/**
 * Install a skill with symlinks to each agent
 * 
 * @param sourcePath - Path to downloaded skill (temp directory)
 * @param skillName - Name of the skill
 * @param agents - Map of agent configs to install to
 * @param options - Install options
 */
export async function installSkillWithSymlinks(
    sourcePath: string,
    skillName: string,
    agentConfigs: Record<string, AgentConfig>,
    targetAgents: string[],
    options: InstallOptions
): Promise<InstalledSkillInfo> {
    const canonicalPath = getCanonicalPath(skillName, options);

    // 1. Create canonical directory and copy skill
    await mkdir(dirname(canonicalPath), { recursive: true });

    // Remove existing canonical copy if any
    if (existsSync(canonicalPath)) {
        await rm(canonicalPath, { recursive: true, force: true });
    }

    // Copy to canonical location
    await cp(sourcePath, canonicalPath, { recursive: true });

    // 2. Create symlinks/copies for each agent
    const linkedPaths: string[] = [];
    let method: 'symlink' | 'copy' = 'symlink';

    for (const agentName of targetAgents) {
        const agentConfig = agentConfigs[agentName];
        if (!agentConfig) continue;

        const agentSkillPath = getAgentSkillPath(skillName, agentConfig, options);

        const linkMethod = await createSymlinkOrCopy(canonicalPath, agentSkillPath);
        if (linkMethod === 'copy') {
            method = 'copy'; // If any fails, mark as copy
        }

        linkedPaths.push(agentSkillPath);
    }

    return {
        name: skillName,
        canonicalPath,
        agents: targetAgents,
        linkedPaths,
        method
    };
}

/**
 * Remove a skill from all its installed locations
 */
export async function removeSkillInstallation(
    skillName: string,
    agentConfigs: Record<string, AgentConfig>,
    agents: string[],
    options: { global: boolean; cwd: string }
): Promise<void> {
    // Remove from each agent directory
    for (const agentName of agents) {
        const agentConfig = agentConfigs[agentName];
        if (!agentConfig) continue;

        const agentSkillPath = getAgentSkillPath(skillName, agentConfig, options);

        if (existsSync(agentSkillPath)) {
            await rm(agentSkillPath, { recursive: true, force: true });
        }
    }

    // Remove canonical copy
    const canonicalPath = getCanonicalPath(skillName, options);
    if (existsSync(canonicalPath)) {
        await rm(canonicalPath, { recursive: true, force: true });
    }
}

/**
 * Check if a skill is installed via symlink or copy
 */
export async function getSkillInstallMethod(
    skillName: string,
    agentConfig: AgentConfig,
    options: { global: boolean; cwd: string }
): Promise<'symlink' | 'copy' | 'none'> {
    const agentSkillPath = getAgentSkillPath(skillName, agentConfig, options);

    if (!existsSync(agentSkillPath)) {
        return 'none';
    }

    if (await isSymlink(agentSkillPath)) {
        return 'symlink';
    }

    return 'copy';
}

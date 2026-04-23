/**
 * Source Parser for Agent Skills CLI
 * Based on vercel-labs/skills implementation
 * 
 * Supports:
 * - Local paths: ./path, ../path, /absolute/path
 * - GitHub URLs: https://github.com/owner/repo
 * - GitHub shorthand: owner/repo
 * - GitLab URLs: https://gitlab.com/owner/repo
 * - Bitbucket URLs: https://bitbucket.org/owner/repo
 * - SSH URLs: git@host:owner/repo.git
 * - npm packages: npm:@scope/package
 * - Custom/self-hosted Git: https://git.company.com/team/repo
 * - Direct SKILL.md URLs
 * - Generic git URLs
 */

import { isAbsolute, resolve } from 'path';

export interface ParsedSource {
    type: 'local' | 'github' | 'gitlab' | 'bitbucket' | 'npm' | 'private-git' | 'direct-url' | 'well-known';
    url: string;
    localPath?: string;
    ref?: string;
    subpath?: string;
    /** npm registry URL (for npm sources) */
    registry?: string;
    /** SSH host (for SSH URLs) */
    sshHost?: string;
}

/**
 * Check if a string represents a local file system path
 */
function isLocalPath(input: string): boolean {
    return (
        isAbsolute(input) ||
        input.startsWith('./') ||
        input.startsWith('../') ||
        input === '.' ||
        input === '..' ||
        // Windows absolute paths like C:\ or D:\
        /^[a-zA-Z]:[/\\]/.test(input)
    );
}

/**
 * Check if a URL is a direct link to a SKILL.md file
 */
function isDirectSkillUrl(input: string): boolean {
    if (!input.startsWith('http://') && !input.startsWith('https://')) {
        return false;
    }

    // Must end with skill.md (case insensitive)
    if (!input.toLowerCase().endsWith('/skill.md')) {
        return false;
    }

    // Exclude GitHub and GitLab repository URLs - they have their own handling
    if (input.includes('github.com/') && !input.includes('raw.githubusercontent.com')) {
        if (!input.includes('/blob/') && !input.includes('/raw/')) {
            return false;
        }
    }
    if (input.includes('gitlab.com/') && !input.includes('/-/raw/')) {
        return false;
    }

    return true;
}

/**
 * Parse a source string into a structured format
 */
export function parseSource(input: string): ParsedSource {
    // Extract #branch suffix before parsing (for SSH and shorthand URLs)
    // HTTP URLs use /tree/branch path convention, so skip those
    let fragmentRef: string | undefined;
    if (!input.startsWith('http://') && !input.startsWith('https://')) {
        const hashIndex = input.lastIndexOf('#');
        if (hashIndex > 0) {
            fragmentRef = input.slice(hashIndex + 1);
            input = input.slice(0, hashIndex);
        }
    }

    const result = parseSourceInner(input);

    // Merge extracted #branch ref into result (if not already set by URL path)
    if (fragmentRef && !result.ref) {
        result.ref = fragmentRef;
    }

    return result;
}

function parseSourceInner(input: string): ParsedSource {
    // npm package: npm:@scope/package or npm:package-name
    const npmMatch = input.match(/^npm:(.+)$/);
    if (npmMatch) {
        return {
            type: 'npm',
            url: npmMatch[1],
        };
    }

    // SSH URL with protocol: ssh://git@hostname:port/path or ssh://git@hostname/path
    const sshProtoMatch = input.match(/^ssh:\/\/([^@]+@)?([^:/]+)(?::(\d+))?\/(.+?)(?:\.git)?$/);
    if (sshProtoMatch) {
        const [, , host, , path] = sshProtoMatch;
        const parts = path.split('/');
        return {
            type: 'private-git',
            url: input,
            sshHost: host,
            subpath: parts.length > 2 ? parts.slice(2).join('/') : undefined,
        };
    }

    // SSH URL: git@hostname:owner/repo.git or git@hostname/owner/repo.git
    const sshMatch = input.match(/^git@([^:/]+)[:/](.+?)(?:\.git)?$/);
    if (sshMatch) {
        const [, host, path] = sshMatch;
        const parts = path.split('/');
        return {
            type: 'private-git',
            url: input.includes(':') ? input : `git@${host}:${path}${input.endsWith('.git') ? '' : '.git'}`,
            sshHost: host,
            subpath: parts.length > 2 ? parts.slice(2).join('/') : undefined,
        };
    }

    // Local path: absolute, relative, or current directory
    if (isLocalPath(input)) {
        const resolvedPath = resolve(input);
        return {
            type: 'local',
            url: resolvedPath,
            localPath: resolvedPath,
        };
    }

    // Direct skill.md URL (non-GitHub/GitLab)
    if (isDirectSkillUrl(input)) {
        return {
            type: 'direct-url',
            url: input,
        };
    }

    // GitHub URL with path: https://github.com/owner/repo/tree/branch/path/to/skill
    const githubTreeWithPathMatch = input.match(/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)\/(.+)/);
    if (githubTreeWithPathMatch) {
        const [, owner, repo, ref, subpath] = githubTreeWithPathMatch;
        return {
            type: 'github',
            url: `https://github.com/${owner}/${repo}.git`,
            ref,
            subpath,
        };
    }

    // GitHub URL with branch only: https://github.com/owner/repo/tree/branch
    const githubTreeMatch = input.match(/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)$/);
    if (githubTreeMatch) {
        const [, owner, repo, ref] = githubTreeMatch;
        return {
            type: 'github',
            url: `https://github.com/${owner}/${repo}.git`,
            ref,
        };
    }

    // GitHub URL: https://github.com/owner/repo
    const githubRepoMatch = input.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (githubRepoMatch) {
        const [, owner, repo] = githubRepoMatch;
        const cleanRepo = repo!.replace(/\.git$/, '');
        return {
            type: 'github',
            url: `https://github.com/${owner}/${cleanRepo}.git`,
        };
    }

    // GitLab URL with path: https://gitlab.com/owner/repo/-/tree/branch/path
    const gitlabTreeWithPathMatch = input.match(
        /gitlab\.com\/([^/]+)\/([^/]+)\/-\/tree\/([^/]+)\/(.+)/
    );
    if (gitlabTreeWithPathMatch) {
        const [, owner, repo, ref, subpath] = gitlabTreeWithPathMatch;
        return {
            type: 'gitlab',
            url: `https://gitlab.com/${owner}/${repo}.git`,
            ref,
            subpath,
        };
    }

    // GitLab URL with branch only: https://gitlab.com/owner/repo/-/tree/branch
    const gitlabTreeMatch = input.match(/gitlab\.com\/([^/]+)\/([^/]+)\/-\/tree\/([^/]+)$/);
    if (gitlabTreeMatch) {
        const [, owner, repo, ref] = gitlabTreeMatch;
        return {
            type: 'gitlab',
            url: `https://gitlab.com/${owner}/${repo}.git`,
            ref,
        };
    }

    // GitLab URL: https://gitlab.com/owner/repo
    const gitlabRepoMatch = input.match(/gitlab\.com\/([^/]+)\/([^/]+)/);
    if (gitlabRepoMatch) {
        const [, owner, repo] = gitlabRepoMatch;
        const cleanRepo = repo!.replace(/\.git$/, '');
        return {
            type: 'gitlab',
            url: `https://gitlab.com/${owner}/${cleanRepo}.git`,
        };
    }

    // Bitbucket URL with path: https://bitbucket.org/owner/repo/src/branch/path
    const bitbucketSrcMatch = input.match(/bitbucket\.org\/([^/]+)\/([^/]+)\/src\/([^/]+)\/(.+)/);
    if (bitbucketSrcMatch) {
        const [, owner, repo, ref, subpath] = bitbucketSrcMatch;
        return {
            type: 'bitbucket',
            url: `https://bitbucket.org/${owner}/${repo}.git`,
            ref,
            subpath,
        };
    }

    // Bitbucket URL with branch: https://bitbucket.org/owner/repo/src/branch
    const bitbucketBranchMatch = input.match(/bitbucket\.org\/([^/]+)\/([^/]+)\/src\/([^/]+)$/);
    if (bitbucketBranchMatch) {
        const [, owner, repo, ref] = bitbucketBranchMatch;
        return {
            type: 'bitbucket',
            url: `https://bitbucket.org/${owner}/${repo}.git`,
            ref,
        };
    }

    // Bitbucket URL: https://bitbucket.org/owner/repo
    const bitbucketRepoMatch = input.match(/bitbucket\.org\/([^/]+)\/([^/]+)/);
    if (bitbucketRepoMatch) {
        const [, owner, repo] = bitbucketRepoMatch;
        const cleanRepo = repo!.replace(/\.git$/, '');
        return {
            type: 'bitbucket',
            url: `https://bitbucket.org/${owner}/${cleanRepo}.git`,
        };
    }

    // GitHub shorthand: owner/repo or owner/repo/path/to/skill
    // But NOT if 'owner' looks like a domain name (contains dots, e.g. git.company.com)
    const shorthandMatch = input.match(/^([^/]+)\/([^/]+)(?:\/(.+))?$/);
    if (shorthandMatch && !input.includes(':') && !input.startsWith('.') && !input.startsWith('/')) {
        const [, owner, repo, subpath] = shorthandMatch;

        // If the 'owner' part contains dots, it's likely a domain name (e.g. git.wosai-inc.com)
        // Treat it as a self-hosted Git URL instead of GitHub shorthand
        if (owner!.includes('.')) {
            const fullPath = subpath ? `${repo}/${subpath}` : repo;
            return {
                type: 'private-git',
                url: `https://${owner}/${fullPath}`,
            };
        }

        return {
            type: 'github',
            url: `https://github.com/${owner}/${repo}.git`,
            subpath,
        };
    }

    // Well-known skills: arbitrary HTTP(S) URLs that aren't GitHub/GitLab/Bitbucket
    if (isWellKnownUrl(input)) {
        return {
            type: 'well-known',
            url: input,
        };
    }

    // Custom/self-hosted Git HTTPS URL (not a known host)
    if (input.startsWith('http://') || input.startsWith('https://')) {
        return {
            type: 'private-git',
            url: input,
        };
    }

    // Fallback: treat as generic git URL
    return {
        type: 'private-git',
        url: input,
    };
}

/**
 * Check if a URL could be a well-known skills endpoint
 */
function isWellKnownUrl(input: string): boolean {
    if (!input.startsWith('http://') && !input.startsWith('https://')) {
        return false;
    }

    try {
        const parsed = new URL(input);

        // Exclude known git hosts that have their own handling
        const excludedHosts = [
            'github.com',
            'gitlab.com',
            'bitbucket.org',
            'huggingface.co',
            'raw.githubusercontent.com',
        ];
        if (excludedHosts.includes(parsed.hostname)) {
            return false;
        }

        // Don't match URLs that look like direct skill.md links
        if (input.toLowerCase().endsWith('/skill.md')) {
            return false;
        }

        // Don't match URLs that look like git repos
        if (input.endsWith('.git')) {
            return false;
        }

        // Only match if the URL explicitly has a well-known or skills path
        // This prevents arbitrary HTTPS URLs from being classified as well-known
        // instead of private-git
        const wellKnownPatterns = [
            '/.well-known/skills',
            '/.well-known/agent-skills',
            '/skills.json',
            '/skill-registry',
        ];
        return wellKnownPatterns.some(pattern => parsed.pathname.includes(pattern));
    } catch {
        return false;
    }
}

/**
 * Extract owner/repo from a parsed source for telemetry
 */
export function getOwnerRepo(parsed: ParsedSource): string | null {
    if (parsed.type === 'local') {
        return null;
    }

    // Extract from git URL: https://github.com/owner/repo.git or similar
    const match = parsed.url.match(/(?:github|gitlab|bitbucket)\.(?:com|org)\/([^/]+)\/([^/]+?)(?:\.git)?$/);
    if (match) {
        return `${match[1]}/${match[2]}`;
    }

    // Extract from SSH URL: git@host:owner/repo.git
    const sshOwnerRepo = parsed.url.match(/^git@[^:]+:([^/]+)\/([^/]+?)(?:\.git)?$/);
    if (sshOwnerRepo) {
        return `${sshOwnerRepo[1]}/${sshOwnerRepo[2]}`;
    }

    return null;
}

/**
 * Get display name for a source type
 */
export function getSourceTypeDisplay(type: ParsedSource['type']): string {
    switch (type) {
        case 'local': return 'Local';
        case 'github': return 'GitHub';
        case 'gitlab': return 'GitLab';
        case 'bitbucket': return 'Bitbucket';
        case 'npm': return 'npm';
        case 'private-git': return 'Private Git';
        case 'direct-url': return 'Direct URL';
        case 'well-known': return 'Well-Known';
        default: return 'Unknown';
    }
}

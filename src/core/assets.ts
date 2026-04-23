/**
 * On-Demand Asset Fetching
 * Derives asset URLs from skill's raw_url without database storage
 */

/**
 * Asset entry from index.jsonl manifest
 */
export interface AssetEntry {
    id: string;
    name: string;
    category?: string;
    section?: string;
    subsection?: string;
}

/**
 * Asset file metadata
 */
export interface AssetFile {
    name: string;
    path: string;
    size?: number;
    rawUrl: string;
}

/**
 * Get base URL for a skill's assets from its raw_url
 * 
 * @example
 * // raw_url: https://raw.githubusercontent.com/owner/repo/main/skills/my-skill/SKILL.md
 * // returns: https://raw.githubusercontent.com/owner/repo/main/skills/my-skill
 */
export function getSkillBaseUrl(rawUrl: string): string {
    return rawUrl.replace(/\/SKILL\.md$/i, '');
}

/**
 * Construct full asset URL from base URL and relative path
 * 
 * @example
 * getAssetUrl('https://.../tailwind-ui', 'assets/buttons.html')
 * // returns: https://.../tailwind-ui/assets/buttons.html
 */
export function getAssetUrl(baseUrl: string, assetPath: string): string {
    // Remove leading slash if present
    const cleanPath = assetPath.replace(/^\//, '');
    return `${baseUrl}/${cleanPath}`;
}

/**
 * Parse repo info from raw_url
 * 
 * @example
 * parseRawUrl('https://raw.githubusercontent.com/owner/repo/main/path/SKILL.md')
 * // returns: { owner: 'owner', repo: 'repo', branch: 'main', path: 'path' }
 */
export function parseRawUrl(rawUrl: string): {
    owner: string;
    repo: string;
    branch: string;
    path: string;
} | null {
    const match = rawUrl.match(
        /https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)/
    );

    if (!match) return null;

    return {
        owner: match[1],
        repo: match[2],
        branch: match[3],
        path: match[4].replace(/\/SKILL\.md$/i, '')
    };
}

/**
 * Fetch asset manifest (index.jsonl) if skill has one
 * Returns array of asset entries or null if no manifest exists
 */
export async function fetchAssetManifest(baseUrl: string): Promise<AssetEntry[] | null> {
    const manifestUrl = `${baseUrl}/assets/index.jsonl`;

    try {
        const resp = await fetch(manifestUrl);
        if (!resp.ok) return null;

        const content = await resp.text();
        return content
            .trim()
            .split('\n')
            .filter(line => line.trim())
            .map(line => JSON.parse(line));
    } catch {
        return null;
    }
}

/**
 * List assets using GitHub Contents API (fallback when no manifest)
 * Note: Rate limited (60 req/hour unauthenticated)
 */
export async function listAssetsFromGitHub(
    owner: string,
    repo: string,
    skillPath: string,
    token?: string
): Promise<AssetFile[]> {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${skillPath}/assets`;

    const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': '@syndicats/agent-skills'
    };

    if (token) {
        headers['Authorization'] = `token ${token}`;
    }

    try {
        const resp = await fetch(apiUrl, { headers });
        if (!resp.ok) return [];

        const items = await resp.json() as Array<{
            type: string;
            name: string;
            path: string;
            size: number;
            download_url: string;
        }>;

        return items
            .filter((item) => item.type === 'file')
            .map((item) => ({
                name: item.name,
                path: item.path,
                size: item.size,
                rawUrl: item.download_url
            }));
    } catch {
        return [];
    }
}

/**
 * Fetch individual asset content from GitHub raw URL
 */
export async function fetchAsset(assetUrl: string): Promise<string | null> {
    try {
        const resp = await fetch(assetUrl);
        if (!resp.ok) return null;
        return await resp.text();
    } catch {
        return null;
    }
}

/**
 * Fetch asset as binary (for images, etc)
 */
export async function fetchAssetBinary(assetUrl: string): Promise<ArrayBuffer | null> {
    try {
        const resp = await fetch(assetUrl);
        if (!resp.ok) return null;
        return await resp.arrayBuffer();
    } catch {
        return null;
    }
}

/**
 * Get all assets for a skill using best available method
 * 1. Try manifest (index.jsonl) - no rate limits
 * 2. Fallback to GitHub API - rate limited
 */
export async function getSkillAssets(
    rawUrl: string,
    githubToken?: string
): Promise<{
    assets: AssetEntry[] | AssetFile[];
    source: 'manifest' | 'github-api' | 'none';
}> {
    const baseUrl = getSkillBaseUrl(rawUrl);

    // Try manifest first (no rate limits)
    const manifest = await fetchAssetManifest(baseUrl);
    if (manifest && manifest.length > 0) {
        return { assets: manifest, source: 'manifest' };
    }

    // Fallback to GitHub API
    const parsed = parseRawUrl(rawUrl);
    if (parsed) {
        const files = await listAssetsFromGitHub(
            parsed.owner,
            parsed.repo,
            parsed.path,
            githubToken
        );
        if (files.length > 0) {
            return { assets: files, source: 'github-api' };
        }
    }

    return { assets: [], source: 'none' };
}

/**
 * Construct asset URL from manifest entry
 */
export function getAssetUrlFromEntry(
    baseUrl: string,
    entry: AssetEntry,
    format: 'html' | 'jsx' | 'vue' = 'html'
): string {
    // Pattern: assets/code/v3/{format}/{entry.id}.{format}
    return `${baseUrl}/assets/code/v3/${format}/${entry.id}.${format}`;
}

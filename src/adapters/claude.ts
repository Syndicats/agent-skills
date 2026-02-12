/**
 * Claude Adapter
 * Handles Claude Code-specific skill format (CLAUDE.md awareness)
 */

import { BaseAdapter, HOME, type ParsedSkillInput } from './adapter.js';

export class ClaudeAdapter extends BaseAdapter {
    readonly name = 'claude';
    readonly displayName = 'Claude Code';

    constructor() {
        super('.claude/skills', `${HOME}/.claude/skills`);
    }

    supportsFormat(format: string): boolean {
        return format === 'skill.md' || format === 'claudemd';
    }

    /**
     * Generate CLAUDE.md format (Claude Code's native config)
     */
    toClaudeMd(parsed: ParsedSkillInput): string {
        const lines: string[] = [];
        lines.push(`# ${parsed.name}`);
        lines.push('');
        if (parsed.description) {
            lines.push(`> ${parsed.description}`);
            lines.push('');
        }
        lines.push(parsed.rawContent);
        return lines.join('\n');
    }
}

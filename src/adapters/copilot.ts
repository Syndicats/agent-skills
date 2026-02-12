/**
 * Copilot Adapter
 * Handles GitHub Copilot-specific skill paths (.github/)
 */

import { BaseAdapter, HOME, type ParsedSkillInput } from './adapter.js';

export class CopilotAdapter extends BaseAdapter {
    readonly name = 'copilot';
    readonly displayName = 'GitHub Copilot';

    constructor() {
        super('.github/skills', `${HOME}/.github/skills`);
    }

    supportsFormat(format: string): boolean {
        return format === 'skill.md' || format === 'copilot';
    }

    /**
     * Generate Copilot instructions format
     */
    toCopilotInstructions(parsed: ParsedSkillInput): string {
        const lines: string[] = [];
        lines.push(`# ${parsed.name}`);
        lines.push('');
        if (parsed.description) {
            lines.push(`**Purpose:** ${parsed.description}`);
            lines.push('');
        }
        lines.push('## Instructions');
        lines.push('');
        lines.push(parsed.rawContent);
        return lines.join('\n');
    }
}

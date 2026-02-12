/**
 * Cursor Adapter
 * Handles Cursor-specific skill format (.cursorrules legacy + SKILL.md)
 */

import { BaseAdapter, HOME, type ParsedSkillInput } from './adapter.js';

export class CursorAdapter extends BaseAdapter {
    readonly name = 'cursor';
    readonly displayName = 'Cursor';

    constructor() {
        super('.cursor/skills', `${HOME}/.cursor/skills`);
    }

    supportsFormat(format: string): boolean {
        return format === 'skill.md' || format === 'cursorrules' || format === 'mdc';
    }

    generateConfig(parsed: ParsedSkillInput): string {
        // Cursor uses standard SKILL.md but also supports .cursorrules
        return super.generateConfig(parsed);
    }

    /**
     * Generate .cursorrules format (legacy Cursor config)
     */
    toCursorRules(parsed: ParsedSkillInput): string {
        const lines: string[] = [];
        lines.push(`# ${parsed.name}`);
        lines.push('');
        if (parsed.description) {
            lines.push(parsed.description);
            lines.push('');
        }
        lines.push(parsed.rawContent);
        return lines.join('\n');
    }
}

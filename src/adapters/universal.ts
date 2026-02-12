/**
 * Universal Adapter
 * Handles all agents that use the standard SKILL.md format.
 * Dynamically configured via the existing AGENTS record.
 */

import { BaseAdapter, type ParsedSkillInput } from './adapter.js';

export class UniversalAdapter extends BaseAdapter {
    readonly name: string;
    readonly displayName: string;

    constructor(name: string, displayName: string, projectDir: string, globalDir: string) {
        super(projectDir, globalDir);
        this.name = name;
        this.displayName = displayName;
    }

    // Uses default BaseAdapter behavior for everything
    // Standard SKILL.md format, standard paths
}

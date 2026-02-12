/**
 * Adapters — barrel file
 * Re-exports all agent adapters and the factory function
 */

export type { AgentAdapter, ParsedSkillInput } from './adapter.js';
export { BaseAdapter, HOME } from './adapter.js';
export { CursorAdapter } from './cursor.js';
export { ClaudeAdapter } from './claude.js';
export { CopilotAdapter } from './copilot.js';
export { UniversalAdapter } from './universal.js';

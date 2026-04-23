/**
 * Telemetry module — disabled in this fork.
 * All exports are no-op stubs to avoid breaking consumers.
 */

export function setVersion(_version: string): void { }
export function track(_data: unknown): void { }
export function trackInstall(_skill: string, _agent: string, _isGlobal: boolean, _source?: string): void { }
export function trackSearch(_query: string, _resultCount: number): void { }
export function trackCommand(_command: string, _args?: string): void { }

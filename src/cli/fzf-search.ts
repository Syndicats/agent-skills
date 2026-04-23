/**
 * FZF-Style Interactive Search
 * Real-time fuzzy search with keyboard navigation
 */

import chalk from 'chalk';
import * as readline from 'readline';

const API_URL = ''; // Marketplace API removed in this fork

/**
 * Search result from API
 */
export interface SearchResult {
    name: string;
    scopedName: string;
    description: string;
    author: string;
    stars: number;
    githubUrl: string;
}

/**
 * FZF search state
 */
interface SearchState {
    query: string;
    results: SearchResult[];
    selectedIndex: number;
    loading: boolean;
}

/**
 * Run FZF-style interactive search
 * Returns the selected skill or null if cancelled
 */
export async function fzfSearch(initialQuery = ''): Promise<SearchResult | null> {
    const state: SearchState = {
        query: initialQuery,
        results: [],
        selectedIndex: 0,
        loading: false
    };

    let debounceTimer: NodeJS.Timeout | null = null;

    // Setup terminal
    if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
    }
    readline.emitKeypressEvents(process.stdin);
    process.stdin.resume();

    // Hide cursor
    process.stdout.write('\x1b[?25l');

    /**
     * Render the search UI
     */
    function render(): void {
        // Clear screen and move to top
        process.stdout.write('\x1b[2J\x1b[H');

        // Header
        console.log(chalk.bold.cyan('🔍 Search Skills'));
        console.log(chalk.dim('Type to search • ↑↓ navigate • Enter select • Esc cancel'));
        console.log('');

        // Search input with cursor
        console.log(`${chalk.cyan('>')} ${state.query}${chalk.dim('|')}`);
        console.log('');

        // Results or status
        if (state.query.length < 2) {
            console.log(chalk.dim('  Start typing to search (min 2 chars)'));
        } else if (state.loading) {
            console.log(chalk.dim('  Searching...'));
        } else if (state.results.length === 0) {
            console.log(chalk.dim('  No skills found'));
        } else {
            const displayCount = Math.min(state.results.length, 10);

            for (let i = 0; i < displayCount; i++) {
                const skill = state.results[i];
                const isSelected = i === state.selectedIndex;

                const prefix = isSelected ? chalk.cyan('❯') : ' ';
                const name = isSelected
                    ? chalk.bold.white(skill.name)
                    : skill.name;
                const author = chalk.dim(`@${skill.author}`);
                const stars = chalk.yellow(`★${skill.stars.toLocaleString()}`);

                console.log(`  ${prefix} ${name} ${author} ${stars}`);

                // Show description for selected item
                if (isSelected && skill.description) {
                    const desc = skill.description.length > 70
                        ? skill.description.slice(0, 67) + '...'
                        : skill.description;
                    console.log(chalk.dim(`      ${desc}`));
                }
            }

            if (state.results.length > 10) {
                console.log('');
                console.log(chalk.dim(`  ... and ${state.results.length - 10} more results`));
            }
        }
    }

    /**
     * Search the API
     */
    async function search(query: string): Promise<void> {
        if (query.length < 2) {
            state.results = [];
            render();
            return;
        }

        state.loading = true;
        render();

        try {
            const url = `${API_URL}?search=${encodeURIComponent(query)}&limit=20&sortBy=stars`;
            const response = await fetch(url);
            const data = await response.json();

            const apiData = data as { skills?: any[] };
            state.results = (apiData.skills || []).map((s: any) => ({
                name: s.name,
                scopedName: s.scopedName || `@${s.author}/${s.name}`,
                description: s.description || '',
                author: s.author,
                stars: s.stars || 0,
                githubUrl: s.githubUrl || s.github_url || ''
            }));

            state.selectedIndex = 0;
        } catch (err) {
            state.results = [];
        }

        state.loading = false;
        render();
    }

    /**
     * Trigger debounced search
     */
    function triggerSearch(): void {
        if (debounceTimer) clearTimeout(debounceTimer);
        render();
        debounceTimer = setTimeout(() => search(state.query), 200);
    }

    /**
     * Cleanup terminal state
     */
    function cleanup(): void {
        process.stdin.removeListener('keypress', handleKeypress);
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(false);
        }
        process.stdout.write('\x1b[?25h'); // Show cursor
        console.clear();
    }

    /**
     * Handle keypress events
     */
    function handleKeypress(_char: string, key: readline.Key): void {
        if (!key) return;

        // Escape or Ctrl+C to cancel
        if (key.name === 'escape' || (key.ctrl && key.name === 'c')) {
            cleanup();
            resolvePromise(null);
            return;
        }

        // Enter to select
        if (key.name === 'return' && state.results.length > 0) {
            cleanup();
            resolvePromise(state.results[state.selectedIndex]);
            return;
        }

        // Up arrow
        if (key.name === 'up') {
            state.selectedIndex = Math.max(0, state.selectedIndex - 1);
            render();
            return;
        }

        // Down arrow
        if (key.name === 'down') {
            state.selectedIndex = Math.min(
                state.results.length - 1,
                state.selectedIndex + 1
            );
            render();
            return;
        }

        // Backspace
        if (key.name === 'backspace') {
            state.query = state.query.slice(0, -1);
            triggerSearch();
            return;
        }

        // Regular character input
        if (key.sequence && key.sequence.length === 1 && !key.ctrl && !key.meta) {
            state.query += key.sequence;
            triggerSearch();
        }
    }

    // Promise to return result
    let resolvePromise: (value: SearchResult | null) => void;

    const promise = new Promise<SearchResult | null>((resolve) => {
        resolvePromise = resolve;
    });

    // Start listening for keypresses
    process.stdin.on('keypress', handleKeypress);

    // Initial render
    if (initialQuery) {
        triggerSearch();
    } else {
        render();
    }

    return promise;
}

/**
 * Simple non-interactive search for --json mode
 */
export async function searchSkillsAPI(
    query: string,
    options: { limit?: number; sortBy?: string } = {}
): Promise<SearchResult[]> {
    const limit = options.limit || 20;
    const sortBy = options.sortBy || 'stars';

    try {
        const url = `${API_URL}?search=${encodeURIComponent(query)}&limit=${limit}&sortBy=${sortBy}`;
        const response = await fetch(url);
        const data = await response.json();

        const apiData = data as { skills?: any[] };
        return (apiData.skills || []).map((s: any) => ({
            name: s.name,
            scopedName: s.scopedName || `@${s.author}/${s.name}`,
            description: s.description || '',
            author: s.author,
            stars: s.stars || 0,
            githubUrl: s.githubUrl || s.github_url || ''
        }));
    } catch {
        return [];
    }
}

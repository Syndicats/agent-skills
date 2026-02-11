/**
 * Recall Command
 * Session memory — persist and recall context across sessions
 * (SkillKit calls this "memory" — we call it "recall")
 */

import chalk from 'chalk';
import { Command } from 'commander';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, join } from 'path';
import { homedir } from 'os';

interface MemoryEntry {
    key: string;
    value: string;
    tags: string[];
    createdAt: string;
    updatedAt: string;
    sessionId?: string;
}

interface MemoryStore {
    version: string;
    entries: MemoryEntry[];
}

const MEMORY_DIR = join(homedir(), '.agent-skills', 'memory');
const MEMORY_FILE = join(MEMORY_DIR, 'store.json');

/**
 * Register the recall command
 */
export function registerRecallCommand(program: Command): void {
    const recall = program
        .command('recall')
        .alias('rc')
        .description('Session memory — store and recall context across sessions');

    recall
        .command('save <key> <value>')
        .description('Save a memory entry')
        .option('-t, --tags <tags>', 'Comma-separated tags')
        .action(async (key: string, value: string, options: { tags?: string }) => {
            try {
                await recallSave(key, value, options.tags);
            } catch (err: any) {
                console.error(chalk.red('Error:'), err.message);
                process.exit(1);
            }
        });

    recall
        .command('get <key>')
        .description('Retrieve a memory entry')
        .action(async (key: string) => {
            try {
                await recallGet(key);
            } catch (err: any) {
                console.error(chalk.red('Error:'), err.message);
                process.exit(1);
            }
        });

    recall
        .command('list')
        .description('List all memory entries')
        .option('-t, --tag <tag>', 'Filter by tag')
        .option('-j, --json', 'Output as JSON')
        .action(async (options: { tag?: string; json?: boolean }) => {
            try {
                await recallList(options.tag, options.json);
            } catch (err: any) {
                console.error(chalk.red('Error:'), err.message);
                process.exit(1);
            }
        });

    recall
        .command('search <query>')
        .description('Search memory entries')
        .action(async (query: string) => {
            try {
                await recallSearch(query);
            } catch (err: any) {
                console.error(chalk.red('Error:'), err.message);
                process.exit(1);
            }
        });

    recall
        .command('delete <key>')
        .description('Delete a memory entry')
        .action(async (key: string) => {
            try {
                await recallDelete(key);
            } catch (err: any) {
                console.error(chalk.red('Error:'), err.message);
                process.exit(1);
            }
        });

    recall
        .command('clear')
        .description('Clear all memory entries')
        .action(async () => {
            try {
                await recallClear();
            } catch (err: any) {
                console.error(chalk.red('Error:'), err.message);
                process.exit(1);
            }
        });
}

async function loadStore(): Promise<MemoryStore> {
    if (!existsSync(MEMORY_FILE)) {
        return { version: '1.0.0', entries: [] };
    }
    try {
        return JSON.parse(await readFile(MEMORY_FILE, 'utf-8'));
    } catch {
        return { version: '1.0.0', entries: [] };
    }
}

async function saveStore(store: MemoryStore): Promise<void> {
    await mkdir(MEMORY_DIR, { recursive: true });
    await writeFile(MEMORY_FILE, JSON.stringify(store, null, 2));
}

async function recallSave(key: string, value: string, tags?: string): Promise<void> {
    const store = await loadStore();
    const now = new Date().toISOString();
    const tagList = tags ? tags.split(',').map(t => t.trim()) : [];

    const existing = store.entries.findIndex(e => e.key === key);
    if (existing >= 0) {
        store.entries[existing].value = value;
        store.entries[existing].tags = tagList.length > 0 ? tagList : store.entries[existing].tags;
        store.entries[existing].updatedAt = now;
        console.log(chalk.green(`✓ Updated memory: ${chalk.cyan(key)}`));
    } else {
        store.entries.push({ key, value, tags: tagList, createdAt: now, updatedAt: now });
        console.log(chalk.green(`✓ Saved memory: ${chalk.cyan(key)}`));
    }

    await saveStore(store);
}

async function recallGet(key: string): Promise<void> {
    const store = await loadStore();
    const entry = store.entries.find(e => e.key === key);

    if (!entry) {
        console.log(chalk.yellow(`No memory found for key: ${key}`));
        return;
    }

    console.log('');
    console.log(`${chalk.bold(entry.key)}: ${entry.value}`);
    if (entry.tags.length > 0) {
        console.log(chalk.dim(`  Tags: ${entry.tags.join(', ')}`));
    }
    console.log(chalk.dim(`  Saved: ${entry.createdAt}`));
    console.log('');
}

async function recallList(tag?: string, json?: boolean): Promise<void> {
    const store = await loadStore();
    let entries = store.entries;

    if (tag) {
        entries = entries.filter(e => e.tags.includes(tag));
    }

    if (json) {
        console.log(JSON.stringify(entries, null, 2));
        return;
    }

    if (entries.length === 0) {
        console.log(chalk.dim('No memories stored.'));
        return;
    }

    console.log('');
    console.log(chalk.bold(`🧠 Memory Store (${entries.length} entries)`));
    console.log('');

    for (const entry of entries) {
        const tags = entry.tags.length > 0 ? chalk.dim(` [${entry.tags.join(', ')}]`) : '';
        console.log(`  ${chalk.cyan(entry.key.padEnd(25))} ${entry.value.substring(0, 50)}${entry.value.length > 50 ? '…' : ''}${tags}`);
    }
    console.log('');
}

async function recallSearch(query: string): Promise<void> {
    const store = await loadStore();
    const q = query.toLowerCase();
    const matches = store.entries.filter(e =>
        e.key.toLowerCase().includes(q) ||
        e.value.toLowerCase().includes(q) ||
        e.tags.some(t => t.toLowerCase().includes(q))
    );

    if (matches.length === 0) {
        console.log(chalk.dim(`No matches for "${query}"`));
        return;
    }

    console.log('');
    console.log(chalk.bold(`🔍 Found ${matches.length} matches for "${query}"`));
    console.log('');
    for (const entry of matches) {
        console.log(`  ${chalk.cyan(entry.key)}: ${entry.value.substring(0, 60)}${entry.value.length > 60 ? '…' : ''}`);
    }
    console.log('');
}

async function recallDelete(key: string): Promise<void> {
    const store = await loadStore();
    const idx = store.entries.findIndex(e => e.key === key);

    if (idx < 0) {
        console.log(chalk.yellow(`No memory found for key: ${key}`));
        return;
    }

    store.entries.splice(idx, 1);
    await saveStore(store);
    console.log(chalk.green(`✓ Deleted memory: ${key}`));
}

async function recallClear(): Promise<void> {
    const store: MemoryStore = { version: '1.0.0', entries: [] };
    await saveStore(store);
    console.log(chalk.green('✓ All memories cleared'));
}

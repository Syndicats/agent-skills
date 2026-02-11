/**
 * Track Command
 * Session state tracking — save/restore working context
 * (SkillKit calls this "session" — we call it "track")
 */

import chalk from 'chalk';
import { Command } from 'commander';
import { readFile, writeFile, mkdir, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

interface SessionSnapshot {
    id: string;
    name: string;
    cwd: string;
    branch?: string;
    timestamp: string;
    notes?: string;
    activeFiles: string[];
    env: Record<string, string>;
}

const SESSIONS_DIR = join(homedir(), '.agent-skills', 'sessions');

/**
 * Register the track command
 */
export function registerTrackCommand(program: Command): void {
    const track = program
        .command('track')
        .alias('tk')
        .description('Session state tracking');

    track.command('save <name>')
        .description('Save current session state')
        .option('-n, --notes <notes>', 'Add session notes')
        .action(async (name: string, options: any) => {
            try { await trackSave(name, options.notes); } catch (err: any) { console.error(chalk.red('Error:'), err.message); process.exit(1); }
        });

    track.command('restore <name>')
        .description('Restore a saved session')
        .action(async (name: string) => {
            try { await trackRestore(name); } catch (err: any) { console.error(chalk.red('Error:'), err.message); process.exit(1); }
        });

    track.command('list')
        .description('List saved sessions')
        .action(async () => {
            try { await trackList(); } catch (err: any) { console.error(chalk.red('Error:'), err.message); process.exit(1); }
        });

    track.command('show <name>')
        .description('Show session details')
        .action(async (name: string) => {
            try { await trackShow(name); } catch (err: any) { console.error(chalk.red('Error:'), err.message); process.exit(1); }
        });

    track.command('delete <name>')
        .description('Delete a saved session')
        .action(async (name: string) => {
            try { await trackDelete(name); } catch (err: any) { console.error(chalk.red('Error:'), err.message); process.exit(1); }
        });
}

function getSessionPath(name: string): string {
    return join(SESSIONS_DIR, `${name}.json`);
}

async function trackSave(name: string, notes?: string): Promise<void> {
    await mkdir(SESSIONS_DIR, { recursive: true });

    // Get current git branch
    let branch: string | undefined;
    try {
        const { execSync } = await import('child_process');
        branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    } catch { /* not in git repo */ }

    // Get recently modified files
    let activeFiles: string[] = [];
    try {
        const { execSync } = await import('child_process');
        const result = execSync('git diff --name-only HEAD 2>/dev/null || true', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
        activeFiles = result.trim().split('\n').filter(Boolean).slice(0, 20);
    } catch { /* ignore */ }

    const snapshot: SessionSnapshot = {
        id: Date.now().toString(36),
        name,
        cwd: process.cwd(),
        branch,
        timestamp: new Date().toISOString(),
        notes,
        activeFiles,
        env: {
            NODE_ENV: process.env.NODE_ENV || '',
        },
    };

    await writeFile(getSessionPath(name), JSON.stringify(snapshot, null, 2));
    console.log(chalk.green(`✓ Session saved: ${chalk.cyan(name)}`));
    if (branch) console.log(chalk.dim(`  Branch: ${branch}`));
    if (activeFiles.length > 0) console.log(chalk.dim(`  Active files: ${activeFiles.length}`));
}

async function trackRestore(name: string): Promise<void> {
    const path = getSessionPath(name);
    if (!existsSync(path)) {
        console.error(chalk.red(`Session "${name}" not found`));
        process.exit(1);
    }

    const snapshot: SessionSnapshot = JSON.parse(await readFile(path, 'utf-8'));

    console.log('');
    console.log(chalk.bold(`🔄 Restoring session: ${chalk.cyan(name)}`));
    console.log('');
    console.log(`  ${chalk.dim('Directory:')} ${snapshot.cwd}`);
    if (snapshot.branch) console.log(`  ${chalk.dim('Branch:')}    ${snapshot.branch}`);
    if (snapshot.notes) console.log(`  ${chalk.dim('Notes:')}     ${snapshot.notes}`);

    if (snapshot.activeFiles.length > 0) {
        console.log('');
        console.log(chalk.dim('  Active files:'));
        for (const f of snapshot.activeFiles) {
            console.log(`    ${chalk.cyan('•')} ${f}`);
        }
    }

    if (snapshot.branch) {
        console.log('');
        console.log(chalk.dim(`  To switch branch: git checkout ${snapshot.branch}`));
    }
    console.log('');
}

async function trackList(): Promise<void> {
    await mkdir(SESSIONS_DIR, { recursive: true });
    const files = await readdir(SESSIONS_DIR);
    const sessions = files.filter(f => f.endsWith('.json'));

    if (sessions.length === 0) {
        console.log(chalk.dim('No saved sessions.'));
        console.log(chalk.dim('  Save one: skills track save "my-session"'));
        return;
    }

    console.log('');
    console.log(chalk.bold(`📍 Saved Sessions (${sessions.length})`));
    console.log('');

    for (const file of sessions) {
        try {
            const snapshot: SessionSnapshot = JSON.parse(await readFile(join(SESSIONS_DIR, file), 'utf-8'));
            const age = timeAgo(new Date(snapshot.timestamp));
            console.log(`  ${chalk.cyan('●')} ${chalk.bold(snapshot.name)} ${chalk.dim(`(${age})`)}`);
            if (snapshot.branch) console.log(`    ${chalk.dim('branch:')} ${snapshot.branch}`);
            if (snapshot.notes) console.log(`    ${chalk.dim('notes:')} ${snapshot.notes}`);
        } catch { /* skip corrupt files */ }
    }
    console.log('');
}

async function trackShow(name: string): Promise<void> {
    const path = getSessionPath(name);
    if (!existsSync(path)) { console.error(chalk.red(`Session "${name}" not found`)); return; }
    const snapshot: SessionSnapshot = JSON.parse(await readFile(path, 'utf-8'));
    console.log(JSON.stringify(snapshot, null, 2));
}

async function trackDelete(name: string): Promise<void> {
    const path = getSessionPath(name);
    if (!existsSync(path)) { console.error(chalk.red(`Session "${name}" not found`)); return; }
    const { unlink } = await import('fs/promises');
    await unlink(path);
    console.log(chalk.green(`✓ Deleted session: ${name}`));
}

function timeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

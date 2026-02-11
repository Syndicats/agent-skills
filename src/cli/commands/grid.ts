/**
 * Grid Command
 * P2P skill mesh — discover and share skills on the local network
 * (SkillKit calls this "mesh" — we call it "grid")
 */

import chalk from 'chalk';
import ora from 'ora';
import { Command } from 'commander';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir, hostname, networkInterfaces } from 'os';
import { createServer } from 'http';
import { listInstalledSkills } from '../../core/skill-lock.js';

interface GridOptions {
    port?: string;
    host?: string;
}

const GRID_DIR = join(homedir(), '.agent-skills', 'grid');
const GRID_CONFIG = join(GRID_DIR, 'config.json');
const DEFAULT_PORT = 4242;

/**
 * Register the grid command
 */
export function registerGridCommand(program: Command): void {
    const grid = program
        .command('grid')
        .alias('gd')
        .description('P2P skill sharing on local network');

    grid
        .command('serve')
        .description('Start sharing your skills on the local network')
        .option('-p, --port <port>', `Port to serve on (default: ${DEFAULT_PORT})`)
        .option('-h, --host <host>', 'Host to bind to', '0.0.0.0')
        .action(async (options: GridOptions) => {
            try {
                await gridServe(options);
            } catch (err: any) {
                console.error(chalk.red('Error:'), err.message);
                process.exit(1);
            }
        });

    grid
        .command('discover')
        .description('Discover skills shared on the local network')
        .option('-p, --port <port>', `Port to scan (default: ${DEFAULT_PORT})`)
        .action(async (options: GridOptions) => {
            try {
                await gridDiscover(options);
            } catch (err: any) {
                console.error(chalk.red('Error:'), err.message);
                process.exit(1);
            }
        });

    grid
        .command('status')
        .description('Show grid status')
        .action(async () => {
            try {
                await gridStatus();
            } catch (err: any) {
                console.error(chalk.red('Error:'), err.message);
                process.exit(1);
            }
        });
}

async function gridServe(options: GridOptions): Promise<void> {
    const port = parseInt(options.port || String(DEFAULT_PORT));
    const host = options.host || '0.0.0.0';

    const spinner = ora('Starting grid server...').start();

    // Get installed skills
    const installed = await listInstalledSkills();

    const server = createServer(async (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('X-Agent-Skills-Grid', '1.0');

        if (req.url === '/skills' || req.url === '/') {
            res.writeHead(200);
            res.end(JSON.stringify({
                node: hostname(),
                skills: installed.map(s => ({
                    name: s.name,
                    scopedName: s.scopedName,
                    source: s.source,
                    version: s.version,
                    agents: s.agents,
                })),
                timestamp: new Date().toISOString(),
            }));
        } else if (req.url === '/health') {
            res.writeHead(200);
            res.end(JSON.stringify({ status: 'ok' }));
        } else {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Not found' }));
        }
    });

    server.listen(port, host, () => {
        spinner.succeed('Grid server started');
        console.log('');

        const localIP = getLocalIP();
        console.log(chalk.bold('🌐 Grid Node Active'));
        console.log(`  ${chalk.dim('Address:')}  ${chalk.cyan(`http://${localIP}:${port}`)}`);
        console.log(`  ${chalk.dim('Skills:')}   ${installed.length} available`);
        console.log(`  ${chalk.dim('Host:')}     ${hostname()}`);
        console.log('');
        console.log(chalk.dim('Press Ctrl+C to stop'));
    });

    // Save config
    await mkdir(GRID_DIR, { recursive: true });
    await writeFile(GRID_CONFIG, JSON.stringify({
        port,
        host,
        startedAt: new Date().toISOString(),
        nodeId: hostname(),
    }, null, 2));

    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('');
        console.log(chalk.dim('Grid server stopped'));
        server.close();
        process.exit(0);
    });
}

async function gridDiscover(options: GridOptions): Promise<void> {
    const port = parseInt(options.port || String(DEFAULT_PORT));
    const spinner = ora('Scanning local network...').start();

    const localIP = getLocalIP();
    const subnet = localIP.split('.').slice(0, 3).join('.');
    const discovered: any[] = [];

    // Scan common IPs on the subnet
    const scanPromises: Promise<void>[] = [];
    for (let i = 1; i <= 254; i++) {
        const ip = `${subnet}.${i}`;
        scanPromises.push(
            scanNode(ip, port)
                .then(result => {
                    if (result) discovered.push({ ip, ...result });
                })
                .catch(() => { /* ignore unreachable */ })
        );
    }

    // Use Promise.allSettled for timeout handling
    await Promise.allSettled(scanPromises);

    spinner.succeed(`Scan complete`);
    console.log('');

    if (discovered.length === 0) {
        console.log(chalk.dim('No grid nodes found on the local network'));
        console.log(chalk.dim(`  Make sure peers run: ${chalk.white('skills grid serve')}`));
    } else {
        console.log(chalk.bold(`📡 Found ${discovered.length} grid node(s)`));
        console.log('');

        for (const node of discovered) {
            console.log(`  ${chalk.green('●')} ${chalk.bold(node.node || node.ip)} ${chalk.dim(`(${node.ip}:${port})`)}`);
            if (node.skills) {
                for (const skill of node.skills.slice(0, 5)) {
                    console.log(`    ${chalk.cyan('◆')} ${skill.scopedName || skill.name}`);
                }
                if (node.skills.length > 5) {
                    console.log(chalk.dim(`    ... and ${node.skills.length - 5} more`));
                }
            }
            console.log('');
        }
    }
    console.log('');
}

async function scanNode(ip: string, port: number): Promise<any | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 300);

    try {
        const res = await fetch(`http://${ip}:${port}/skills`, {
            signal: controller.signal,
            headers: { 'Accept': 'application/json' },
        });
        clearTimeout(timeout);
        if (res.ok) {
            return await res.json();
        }
    } catch {
        clearTimeout(timeout);
    }
    return null;
}

async function gridStatus(): Promise<void> {
    console.log('');
    console.log(chalk.bold('🌐 Grid Status'));
    console.log('');

    const localIP = getLocalIP();
    console.log(`  ${chalk.dim('Node:')}     ${hostname()}`);
    console.log(`  ${chalk.dim('Local IP:')} ${localIP}`);

    if (existsSync(GRID_CONFIG)) {
        try {
            const config = JSON.parse(await readFile(GRID_CONFIG, 'utf-8'));
            console.log(`  ${chalk.dim('Port:')}     ${config.port}`);
            console.log(`  ${chalk.dim('Started:')}  ${config.startedAt}`);
        } catch { /* ignore */ }
    } else {
        console.log(`  ${chalk.dim('Server:')}   Not running`);
        console.log(chalk.dim(`  Start with: ${chalk.white('skills grid serve')}`));
    }
    console.log('');
}

function getLocalIP(): string {
    const interfaces = networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name] || []) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}

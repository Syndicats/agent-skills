/**
 * Blueprint Command
 * Structured development plans with milestones and tasks
 * (SkillKit calls this "plan" — we call it "blueprint")
 */

import chalk from 'chalk';
import { Command } from 'commander';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, join } from 'path';

interface BlueprintTask {
    id: string;
    title: string;
    status: 'pending' | 'in-progress' | 'done';
    assignee?: string;
}

interface BlueprintMilestone {
    name: string;
    tasks: BlueprintTask[];
}

interface Blueprint {
    name: string;
    description: string;
    createdAt: string;
    updatedAt: string;
    milestones: BlueprintMilestone[];
}

const BLUEPRINT_FILE = '.skills-blueprint.json';

/**
 * Register the blueprint command
 */
export function registerBlueprintCommand(program: Command): void {
    const bp = program
        .command('blueprint')
        .alias('bp')
        .description('Structured development plans');

    bp.command('create <name>')
        .description('Create a new blueprint')
        .option('-d, --description <desc>', 'Blueprint description')
        .action(async (name: string, options: any) => {
            try { await bpCreate(name, options.description); } catch (err: any) { console.error(chalk.red('Error:'), err.message); process.exit(1); }
        });

    bp.command('add-milestone <milestone>')
        .description('Add a milestone to the blueprint')
        .action(async (milestone: string) => {
            try { await bpAddMilestone(milestone); } catch (err: any) { console.error(chalk.red('Error:'), err.message); process.exit(1); }
        });

    bp.command('add-task <milestone> <task>')
        .description('Add a task to a milestone')
        .option('-a, --assignee <who>', 'Assign to someone')
        .action(async (milestone: string, task: string, options: any) => {
            try { await bpAddTask(milestone, task, options.assignee); } catch (err: any) { console.error(chalk.red('Error:'), err.message); process.exit(1); }
        });

    bp.command('status')
        .description('Show blueprint status')
        .action(async () => {
            try { await bpStatus(); } catch (err: any) { console.error(chalk.red('Error:'), err.message); process.exit(1); }
        });

    bp.command('done <task-id>')
        .description('Mark a task as done')
        .action(async (taskId: string) => {
            try { await bpMarkDone(taskId); } catch (err: any) { console.error(chalk.red('Error:'), err.message); process.exit(1); }
        });

    bp.command('export')
        .description('Export blueprint as markdown')
        .option('-o, --output <file>', 'Output file', 'BLUEPRINT.md')
        .action(async (options: any) => {
            try { await bpExport(options.output); } catch (err: any) { console.error(chalk.red('Error:'), err.message); process.exit(1); }
        });
}

async function loadBlueprint(): Promise<Blueprint | null> {
    const p = resolve(BLUEPRINT_FILE);
    if (!existsSync(p)) return null;
    try { return JSON.parse(await readFile(p, 'utf-8')); } catch { return null; }
}

async function saveBlueprint(bp: Blueprint): Promise<void> {
    bp.updatedAt = new Date().toISOString();
    await writeFile(resolve(BLUEPRINT_FILE), JSON.stringify(bp, null, 2));
}

async function bpCreate(name: string, description?: string): Promise<void> {
    const bp: Blueprint = {
        name,
        description: description || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        milestones: [],
    };
    await saveBlueprint(bp);
    console.log(chalk.green(`✨ Blueprint "${name}" created`));
    console.log(chalk.dim('  Next: skills blueprint add-milestone "Phase 1"'));
}

async function bpAddMilestone(milestone: string): Promise<void> {
    const bp = await loadBlueprint();
    if (!bp) { console.error(chalk.red('No blueprint. Run: skills blueprint create <name>')); process.exit(1); }
    bp.milestones.push({ name: milestone, tasks: [] });
    await saveBlueprint(bp);
    console.log(chalk.green(`✓ Added milestone: ${chalk.cyan(milestone)}`));
}

async function bpAddTask(milestone: string, task: string, assignee?: string): Promise<void> {
    const bp = await loadBlueprint();
    if (!bp) { console.error(chalk.red('No blueprint found')); process.exit(1); }
    const ms = bp.milestones.find(m => m.name.toLowerCase() === milestone.toLowerCase());
    if (!ms) { console.error(chalk.red(`Milestone "${milestone}" not found`)); process.exit(1); }

    const id = `T${Date.now().toString(36).toUpperCase()}`;
    ms.tasks.push({ id, title: task, status: 'pending', assignee });
    await saveBlueprint(bp);
    console.log(chalk.green(`✓ Added task ${chalk.dim(`[${id}]`)} to ${chalk.cyan(milestone)}: ${task}`));
}

async function bpStatus(): Promise<void> {
    const bp = await loadBlueprint();
    if (!bp) { console.log(chalk.dim('No blueprint. Create one: skills blueprint create <name>')); return; }

    const totalTasks = bp.milestones.reduce((a, m) => a + m.tasks.length, 0);
    const doneTasks = bp.milestones.reduce((a, m) => a + m.tasks.filter(t => t.status === 'done').length, 0);
    const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    console.log('');
    console.log(chalk.bold(`📋 ${bp.name}`));
    if (bp.description) console.log(chalk.dim(`   ${bp.description}`));
    console.log(`   Progress: ${progressBar(progress)} ${progress}%`);
    console.log('');

    for (const ms of bp.milestones) {
        const msDone = ms.tasks.filter(t => t.status === 'done').length;
        console.log(`  ${chalk.bold(ms.name)} ${chalk.dim(`(${msDone}/${ms.tasks.length})`)}`);
        for (const t of ms.tasks) {
            const icon = t.status === 'done' ? chalk.green('✓') : t.status === 'in-progress' ? chalk.yellow('◐') : chalk.dim('○');
            const assignee = t.assignee ? chalk.dim(` @${t.assignee}`) : '';
            console.log(`    ${icon} ${chalk.dim(`[${t.id}]`)} ${t.title}${assignee}`);
        }
        console.log('');
    }
}

async function bpMarkDone(taskId: string): Promise<void> {
    const bp = await loadBlueprint();
    if (!bp) { console.error(chalk.red('No blueprint found')); process.exit(1); }
    for (const ms of bp.milestones) {
        const task = ms.tasks.find(t => t.id === taskId);
        if (task) { task.status = 'done'; await saveBlueprint(bp); console.log(chalk.green(`✓ Task ${taskId} marked as done`)); return; }
    }
    console.error(chalk.red(`Task "${taskId}" not found`));
}

async function bpExport(output: string): Promise<void> {
    const bp = await loadBlueprint();
    if (!bp) { console.error(chalk.red('No blueprint found')); process.exit(1); }

    const lines: string[] = [`# ${bp.name}`, ''];
    if (bp.description) lines.push(bp.description, '');

    for (const ms of bp.milestones) {
        lines.push(`## ${ms.name}`, '');
        for (const t of ms.tasks) {
            const check = t.status === 'done' ? '[x]' : '[ ]';
            const assignee = t.assignee ? ` @${t.assignee}` : '';
            lines.push(`- ${check} ${t.title}${assignee}`);
        }
        lines.push('');
    }

    await writeFile(resolve(output), lines.join('\n'));
    console.log(chalk.green(`✓ Exported blueprint to ${output}`));
}

function progressBar(pct: number): string {
    const filled = Math.round(pct / 5);
    return chalk.green('█'.repeat(filled)) + chalk.dim('░'.repeat(20 - filled));
}

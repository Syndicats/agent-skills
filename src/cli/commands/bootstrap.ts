/**
 * Bootstrap Command
 * Auto-generate agent instruction files from project context
 * (SkillKit calls this "primer" — we call it "bootstrap")
 */

import chalk from 'chalk';
import ora from 'ora';
import { Command } from 'commander';
import { writeFile, readFile, readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { join, resolve, basename } from 'path';
import { analyzeProject } from '../../core/suggest.js';

interface BootstrapOptions {
    agents?: string;
    output?: string;
    overwrite?: boolean;
}

// Agent instruction file templates
const AGENT_TEMPLATES: Record<string, { file: string; dir: string; generator: (ctx: ProjectContext) => string }> = {
    cursor: {
        file: '.cursorrules',
        dir: '.',
        generator: generateCursorRules,
    },
    claude: {
        file: 'CLAUDE.md',
        dir: '.',
        generator: generateClaudeMd,
    },
    copilot: {
        file: 'copilot-instructions.md',
        dir: '.github',
        generator: generateCopilotInstructions,
    },
    codex: {
        file: 'AGENTS.md',
        dir: '.',
        generator: generateAgentsMd,
    },
    antigravity: {
        file: 'SKILL.md',
        dir: '.agent/skills/project-conventions',
        generator: generateProjectSkill,
    },
    windsurf: {
        file: '.windsurfrules',
        dir: '.',
        generator: generateCursorRules, // Same format
    },
};

interface ProjectContext {
    name: string;
    languages: string[];
    frameworks: string[];
    libraries: string[];
    testTools: string[];
    buildTools: string[];
    scripts: Record<string, string>;
    hasReadme: boolean;
    readmeSnippet: string;
}

/**
 * Register the bootstrap command
 */
export function registerBootstrapCommand(program: Command): void {
    program
        .command('bootstrap')
        .alias('bs')
        .description('Auto-generate agent instruction files from your project')
        .option('-a, --agents <agents>', 'Comma-separated agent names (default: all)', 'all')
        .option('-o, --output <dir>', 'Output directory', '.')
        .option('--overwrite', 'Overwrite existing files')
        .action(async (options: BootstrapOptions) => {
            try {
                await bootstrapCommand(options);
            } catch (err: any) {
                console.error(chalk.red('Error:'), err.message);
                process.exit(1);
            }
        });
}

async function bootstrapCommand(options: BootstrapOptions): Promise<void> {
    const projectDir = resolve(options.output || '.');
    const spinner = ora('Analyzing project...').start();

    // Analyze project
    const analysis = await analyzeProject(projectDir);
    const ctx = await buildProjectContext(projectDir, analysis);

    spinner.succeed('Project analyzed');
    console.log('');
    console.log(chalk.bold('📊 Project: ') + chalk.cyan(ctx.name));
    console.log(chalk.dim(`  Stack: ${[...ctx.frameworks, ...ctx.languages].join(', ') || 'unknown'}`));
    console.log('');

    // Determine which agents to generate for
    const agentNames = options.agents === 'all'
        ? Object.keys(AGENT_TEMPLATES)
        : options.agents!.split(',').map(s => s.trim().toLowerCase());

    let generated = 0;
    let skipped = 0;

    for (const agentName of agentNames) {
        const template = AGENT_TEMPLATES[agentName];
        if (!template) {
            console.log(`  ${chalk.yellow('⚠')} Unknown agent: ${agentName}`);
            continue;
        }

        const dirPath = join(projectDir, template.dir);
        const filePath = join(dirPath, template.file);

        if (existsSync(filePath) && !options.overwrite) {
            console.log(`  ${chalk.dim('⊘')} ${chalk.dim(join(template.dir, template.file))} ${chalk.dim('(exists, use --overwrite)')}`);
            skipped++;
            continue;
        }

        // Generate content
        const content = template.generator(ctx);

        // Ensure directory exists
        const { mkdir } = await import('fs/promises');
        await mkdir(dirPath, { recursive: true });

        await writeFile(filePath, content);
        console.log(`  ${chalk.green('✓')} ${chalk.cyan(join(template.dir, template.file))}`);
        generated++;
    }

    console.log('');
    if (generated > 0) {
        console.log(chalk.green(`✨ Generated ${generated} agent instruction file(s)`));
    }
    if (skipped > 0) {
        console.log(chalk.dim(`   Skipped ${skipped} existing file(s)`));
    }
    console.log('');
}

async function buildProjectContext(projectDir: string, analysis: any): Promise<ProjectContext> {
    const ctx: ProjectContext = {
        name: basename(projectDir),
        languages: analysis.languages || [],
        frameworks: analysis.frameworks || [],
        libraries: analysis.libraries || [],
        testTools: analysis.testTools || [],
        buildTools: analysis.buildTools || [],
        scripts: {},
        hasReadme: false,
        readmeSnippet: '',
    };

    // Read package.json scripts
    const pkgPath = join(projectDir, 'package.json');
    if (existsSync(pkgPath)) {
        try {
            const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));
            ctx.name = pkg.name || ctx.name;
            ctx.scripts = pkg.scripts || {};
        } catch { /* ignore */ }
    }

    // Read README snippet
    const readmePath = join(projectDir, 'README.md');
    if (existsSync(readmePath)) {
        ctx.hasReadme = true;
        try {
            const readme = await readFile(readmePath, 'utf-8');
            ctx.readmeSnippet = readme.split('\n').slice(0, 10).join('\n');
        } catch { /* ignore */ }
    }

    return ctx;
}

function generateCursorRules(ctx: ProjectContext): string {
    const lines: string[] = [];
    lines.push(`# Project: ${ctx.name}`);
    lines.push('');
    lines.push('## Tech Stack');
    if (ctx.languages.length) lines.push(`- Languages: ${ctx.languages.join(', ')}`);
    if (ctx.frameworks.length) lines.push(`- Frameworks: ${ctx.frameworks.join(', ')}`);
    if (ctx.libraries.length) lines.push(`- Libraries: ${ctx.libraries.join(', ')}`);
    if (ctx.testTools.length) lines.push(`- Testing: ${ctx.testTools.join(', ')}`);
    if (ctx.buildTools.length) lines.push(`- Build: ${ctx.buildTools.join(', ')}`);
    lines.push('');
    lines.push('## Conventions');
    lines.push('- Follow existing code patterns and naming conventions');
    lines.push('- Write clear, descriptive variable and function names');
    lines.push('- Add comments for non-obvious logic');
    if (ctx.languages.includes('typescript')) {
        lines.push('- Use TypeScript strict mode');
        lines.push('- Prefer explicit types over `any`');
        lines.push('- Use interfaces for object shapes');
    }
    if (ctx.testTools.length > 0) {
        lines.push(`- Write tests using ${ctx.testTools[0]}`);
        lines.push('- Test edge cases and error paths');
    }
    lines.push('');
    if (Object.keys(ctx.scripts).length > 0) {
        lines.push('## Available Scripts');
        for (const [name, cmd] of Object.entries(ctx.scripts)) {
            lines.push(`- \`npm run ${name}\`: ${cmd}`);
        }
        lines.push('');
    }
    return lines.join('\n');
}

function generateClaudeMd(ctx: ProjectContext): string {
    const lines: string[] = [];
    lines.push(`# ${ctx.name}`);
    lines.push('');
    lines.push('## Project Overview');
    lines.push(`This is a ${ctx.frameworks.join('/') || ctx.languages.join('/')} project.`);
    lines.push('');
    lines.push('## Development Guidelines');
    lines.push('');
    if (ctx.languages.includes('typescript')) {
        lines.push('### TypeScript');
        lines.push('- Use strict TypeScript; avoid `any`');
        lines.push('- Prefer `const` over `let`');
        lines.push('- Use proper error types, not `catch(e: any)`');
        lines.push('');
    }
    if (ctx.testTools.length > 0) {
        lines.push('### Testing');
        lines.push(`- Use ${ctx.testTools.join(', ')} for testing`);
        if (ctx.scripts['test']) lines.push(`- Run tests: \`npm test\``);
        lines.push('');
    }
    if (Object.keys(ctx.scripts).length > 0) {
        lines.push('### Commands');
        for (const [name, cmd] of Object.entries(ctx.scripts)) {
            lines.push(`- \`npm run ${name}\` — ${cmd}`);
        }
        lines.push('');
    }
    return lines.join('\n');
}

function generateCopilotInstructions(ctx: ProjectContext): string {
    const lines: string[] = [];
    lines.push(`# Copilot Instructions for ${ctx.name}`);
    lines.push('');
    lines.push('## Context');
    lines.push(`This project uses ${[...ctx.frameworks, ...ctx.languages].join(', ')}.`);
    lines.push('');
    lines.push('## Code Style');
    lines.push('- Follow existing patterns in the codebase');
    lines.push('- Use meaningful names for variables and functions');
    if (ctx.languages.includes('typescript')) {
        lines.push('- Always use TypeScript types; avoid `any`');
    }
    lines.push('');
    if (ctx.testTools.length > 0) {
        lines.push('## Testing');
        lines.push(`- Write tests with ${ctx.testTools[0]}`);
        lines.push('');
    }
    return lines.join('\n');
}

function generateAgentsMd(ctx: ProjectContext): string {
    return generateClaudeMd(ctx); // Same format works for Codex
}

function generateProjectSkill(ctx: ProjectContext): string {
    const lines: string[] = [];
    lines.push('---');
    lines.push(`name: ${ctx.name}-conventions`);
    lines.push(`description: Project conventions for ${ctx.name}`);
    lines.push('---');
    lines.push('');
    lines.push(`# ${ctx.name} Conventions`);
    lines.push('');
    lines.push('## Tech Stack');
    if (ctx.frameworks.length) lines.push(`- **Frameworks**: ${ctx.frameworks.join(', ')}`);
    if (ctx.libraries.length) lines.push(`- **Libraries**: ${ctx.libraries.join(', ')}`);
    if (ctx.testTools.length) lines.push(`- **Testing**: ${ctx.testTools.join(', ')}`);
    lines.push('');
    lines.push('## Guidelines');
    lines.push('- Follow existing code patterns');
    lines.push('- Write tests for new features');
    lines.push('- Use clear naming conventions');
    lines.push('');
    return lines.join('\n');
}

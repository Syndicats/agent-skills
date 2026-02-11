/**
 * CI Command
 * Generate CI/CD workflow files for GitHub Actions, GitLab CI, etc.
 * (SkillKit calls this "cicd" — we call it "ci")
 */

import chalk from 'chalk';
import { Command } from 'commander';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, join } from 'path';

type CIPlatform = 'github' | 'gitlab' | 'bitbucket';

/**
 * Register the ci command
 */
export function registerCiCommand(program: Command): void {
    program
        .command('ci [platform]')
        .description('Generate CI/CD workflow for skill validation')
        .option('-o, --output <dir>', 'Output directory (auto-detected)')
        .option('--audit', 'Include security audit step', true)
        .option('--validate', 'Include validation step', true)
        .action(async (platform: string | undefined, options: any) => {
            try {
                await ciCommand(platform as CIPlatform || 'github', options);
            } catch (err: any) {
                console.error(chalk.red('Error:'), err.message);
                process.exit(1);
            }
        });
}

async function ciCommand(platform: CIPlatform, options: any): Promise<void> {
    const generators: Record<CIPlatform, () => { path: string; content: string }> = {
        github: () => generateGitHubActions(options),
        gitlab: () => generateGitLabCI(options),
        bitbucket: () => generateBitbucketPipelines(options),
    };

    const generator = generators[platform];
    if (!generator) {
        console.error(chalk.red(`Unknown platform: ${platform}`));
        console.log(chalk.dim(`Supported: ${Object.keys(generators).join(', ')}`));
        process.exit(1);
    }

    const { path: outputPath, content } = generator();
    const finalPath = options.output ? join(resolve(options.output), outputPath) : resolve(outputPath);

    if (existsSync(finalPath)) {
        console.log(chalk.yellow(`⚠ File already exists: ${finalPath}`));
        console.log(chalk.dim('  Delete it first or use --output to specify a different location'));
        return;
    }

    const dir = finalPath.substring(0, finalPath.lastIndexOf('/'));
    await mkdir(dir, { recursive: true });
    await writeFile(finalPath, content);

    console.log('');
    console.log(chalk.green(`✨ Generated ${platform} CI workflow`));
    console.log(`  ${chalk.dim('File:')} ${chalk.cyan(finalPath)}`);
    console.log('');
    console.log(chalk.dim('Features:'));
    if (options.validate !== false) console.log(chalk.dim('  ✓ Skill validation'));
    if (options.audit !== false) console.log(chalk.dim('  ✓ Security audit'));
    console.log('');
    console.log(chalk.dim(`Commit and push to activate the workflow.`));
    console.log('');
}

function generateGitHubActions(options: any): { path: string; content: string } {
    const steps: string[] = [];

    steps.push(`      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install agent-skills-cli
        run: npm install -g agent-skills-cli`);

    if (options.validate !== false) {
        steps.push(`      - name: Validate Skills
        run: skills validate .`);
    }

    if (options.audit !== false) {
        steps.push(`      - name: Security Audit
        run: skills audit . --format sarif --output results.sarif
      - name: Upload SARIF
        if: always()
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: results.sarif`);
    }

    const content = `name: Skill Validation

on:
  push:
    paths:
      - '**/*.md'
      - '.agent/**'
      - '.cursor/**'
      - '.claude/**'
      - '.github/skills/**'
  pull_request:
    paths:
      - '**/*.md'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
${steps.join('\n')}
`;

    return { path: '.github/workflows/skill-validation.yml', content };
}

function generateGitLabCI(options: any): { path: string; content: string } {
    const scripts: string[] = ['npm install -g agent-skills-cli'];
    if (options.validate !== false) scripts.push('skills validate .');
    if (options.audit !== false) scripts.push('skills audit . --fail-on high');

    const content = `skill-validation:
  image: node:20
  stage: test
  script:
${scripts.map(s => `    - ${s}`).join('\n')}
  only:
    changes:
      - "**/*.md"
      - ".agent/**"
      - ".cursor/**"
      - ".claude/**"
`;

    return { path: '.gitlab-ci.yml', content };
}

function generateBitbucketPipelines(options: any): { path: string; content: string } {
    const scripts: string[] = ['npm install -g agent-skills-cli'];
    if (options.validate !== false) scripts.push('skills validate .');
    if (options.audit !== false) scripts.push('skills audit . --fail-on high');

    const content = `pipelines:
  default:
    - step:
        name: Skill Validation
        image: node:20
        script:
${scripts.map(s => `          - ${s}`).join('\n')}
`;

    return { path: 'bitbucket-pipelines.yml', content };
}

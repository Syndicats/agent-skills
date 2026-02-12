/**
 * Submit-Repo Command
 * Submit a GitHub repo link for marketplace indexing.
 * We extract everything from the repo — user only provides the link.
 */

import chalk from 'chalk';
import ora from 'ora';
import { Command } from 'commander';

/**
 * Register the submit-repo command
 */
export function registerSubmitRepoCommand(program: Command): void {
    program
        .command('submit-repo <repo>')
        .description('Submit a GitHub repo to be indexed in the marketplace')
        .action(async (repo: string) => {
            try {
                await submitRepoCommand(repo);
            } catch (err: any) {
                console.error(chalk.red('Error:'), err.message);
                process.exit(1);
            }
        });
}

// API endpoint
const SUBMIT_REPO_API = 'https://www.agentskills.in/api/repos/submit';

/**
 * Run the submit-repo command
 */
async function submitRepoCommand(repo: string): Promise<void> {
    // Parse owner/repo from any format
    const parts = repo
        .replace(/https?:\/\/(www\.)?github\.com\//, '')
        .replace(/\.git$/, '')
        .replace(/\/$/, '')
        .split('/');

    if (parts.length !== 2 || !parts[0] || !parts[1]) {
        console.error(chalk.red('Invalid repo. Use: owner/repo or a GitHub URL'));
        console.log(chalk.dim('  Example: skills submit-repo facebook/react'));
        process.exit(1);
    }

    const [owner, repoName] = parts;
    console.log('');
    console.log(chalk.bold('📤 Submit Skills Repository'));
    console.log('');

    // Step 1: Fetch repo info from GitHub
    const spinner = ora('Fetching repo info from GitHub...').start();

    let repoData: any;
    try {
        const res = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
            headers: { 'Accept': 'application/vnd.github.v3+json' },
        });

        if (!res.ok) {
            spinner.fail(res.status === 404 ? 'Repository not found' : `GitHub API error: ${res.status}`);
            process.exit(1);
        }

        repoData = await res.json();
        spinner.succeed(`Found ${chalk.cyan(repoData.full_name)}`);
    } catch (err: any) {
        spinner.fail('Could not reach GitHub API');
        console.log(chalk.dim(`  ${err.message}`));
        process.exit(1);
    }

    // Step 2: Scan for SKILL.md files
    const scanSpinner = ora('Scanning for skills...').start();
    let skillPaths: string[] = [];

    try {
        const treeRes = await fetch(
            `https://api.github.com/repos/${owner}/${repoName}/git/trees/${repoData.default_branch}?recursive=1`,
            { headers: { 'Accept': 'application/vnd.github.v3+json' } }
        );

        if (treeRes.ok) {
            const treeData = await treeRes.json() as any;
            skillPaths = (treeData.tree || [])
                .filter((f: any) => f.type === 'blob' && f.path.endsWith('SKILL.md'))
                .map((f: any) => f.path);
        }
    } catch { /* non-critical */ }

    if (skillPaths.length === 0) {
        scanSpinner.warn('No SKILL.md files found — repo will still be submitted for review');
    } else {
        scanSpinner.succeed(`Found ${chalk.bold(skillPaths.length)} skill(s)`);
        for (const p of skillPaths.slice(0, 5)) {
            console.log(chalk.dim(`    ${p}`));
        }
        if (skillPaths.length > 5) {
            console.log(chalk.dim(`    ... and ${skillPaths.length - 5} more`));
        }
    }

    // Step 3: Submit
    const submitSpinner = ora('Submitting for indexing...').start();

    try {
        const response = await fetch(SUBMIT_REPO_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                full_name: repoData.full_name,
                html_url: repoData.html_url,
                description: repoData.description || '',
                stars: repoData.stargazers_count || 0,
                language: repoData.language || '',
                license: repoData.license?.spdx_id || '',
                default_branch: repoData.default_branch,
                skills_count: skillPaths.length,
                skill_paths: skillPaths,
            }),
        });

        if (response.ok) {
            submitSpinner.succeed('Submitted!');
            console.log('');
            console.log(chalk.green('✨ Your repo has been submitted for indexing!'));
            console.log(chalk.dim('  Skills will appear in the marketplace once processed.'));
        } else {
            const data = await response.json().catch(() => ({})) as any;
            if (response.status === 409) {
                submitSpinner.warn('Already submitted');
                console.log(chalk.dim(`  Status: ${data.status || 'pending'}`));
            } else {
                submitSpinner.fail(data.error || `Failed (${response.status})`);
            }
        }
    } catch (err: any) {
        submitSpinner.fail('Could not reach API');
        console.log(chalk.dim(`  ${err.message}`));
        console.log(chalk.dim('  Submit via GitHub issue instead:'));
        console.log(chalk.dim(`  ${chalk.white('https://github.com/Karanjot786/agent-skills-cli/issues/new')}`));
    }

    console.log('');
}

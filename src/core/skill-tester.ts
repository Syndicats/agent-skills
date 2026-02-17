/**
 * Skill Testing Framework
 * Run static and dynamic assertions against skills.
 *
 * Test definitions can come from:
 *   1. skill-test.yml in the skill directory
 *   2. tests section in SKILL.md frontmatter
 *   3. Built-in structural checks
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, basename } from 'path';
import matter from 'gray-matter';

// ── Types ────────────────────────────────────────────────────────────────

export interface SkillTest {
    /** Test name */
    name: string;
    /** Test type */
    type: 'structure' | 'content' | 'quality';
    /** Expected condition */
    assertion: string;
    /** Check function */
    check: (content: string, data: Record<string, any>) => boolean;
}

export interface TestResult {
    /** Skill name */
    skillName: string;
    /** Skill path */
    skillPath: string;
    /** Individual assertion results */
    assertions: AssertionResult[];
    /** Overall pass/fail */
    passed: boolean;
    /** Duration in ms */
    duration: number;
    /** Pass rate */
    passRate: number;
}

export interface AssertionResult {
    /** Test name */
    name: string;
    /** Pass/fail */
    passed: boolean;
    /** Type of test */
    type: string;
    /** Error message if failed */
    message?: string;
}

// ── Built-in Tests ───────────────────────────────────────────────────────

function getBuiltinTests(): SkillTest[] {
    return [
        {
            name: 'Has frontmatter name',
            type: 'structure',
            assertion: 'SKILL.md must have a name field in frontmatter',
            check: (_content, data) => !!data.name && typeof data.name === 'string',
        },
        {
            name: 'Has frontmatter description',
            type: 'structure',
            assertion: 'SKILL.md must have a description field in frontmatter',
            check: (_content, data) => !!data.description && typeof data.description === 'string' && data.description.length > 10,
        },
        {
            name: 'Has meaningful content',
            type: 'content',
            assertion: 'SKILL.md body should have at least 50 characters',
            check: (content) => content.trim().length >= 50,
        },
        {
            name: 'Has section headings',
            type: 'structure',
            assertion: 'SKILL.md should have at least one ## heading',
            check: (content) => /^#{2,4}\s+.+/m.test(content),
        },
        {
            name: 'Has "when to use" section',
            type: 'content',
            assertion: 'Should describe when the skill should be used',
            check: (content) => /when\s+to\s+use|usage|use\s+cases?|scenarios?/i.test(content),
        },
        {
            name: 'Has actionable instructions',
            type: 'content',
            assertion: 'Should contain numbered steps or bullet points',
            check: (content) => /^\s*[-*]\s+.+/m.test(content) || /^\s*\d+\.\s+.+/m.test(content),
        },
        {
            name: 'Has code examples',
            type: 'content',
            assertion: 'Should include at least one code block',
            check: (content) => /```[\s\S]*?```/.test(content),
        },
        {
            name: 'Description is concise',
            type: 'quality',
            assertion: 'Description should be under 200 characters',
            check: (_content, data) => !data.description || data.description.length <= 200,
        },
        {
            name: 'No placeholder content',
            type: 'quality',
            assertion: 'Should not contain TODO, FIXME, or placeholder text',
            check: (content) => !/\b(TODO|FIXME|PLACEHOLDER|CHANGE\s+ME|INSERT\s+HERE)\b/i.test(content),
        },
        {
            name: 'Reasonable length',
            type: 'quality',
            assertion: 'SKILL.md should be between 100 and 50,000 characters',
            check: (content) => content.length >= 100 && content.length <= 50000,
        },
    ];
}

// ── Custom Test Parsing ──────────────────────────────────────────────────

/**
 * Load custom tests from skill-test.yml if it exists.
 */
async function loadCustomTests(skillDir: string): Promise<SkillTest[]> {
    const testFile = join(skillDir, 'skill-test.yml');
    if (!existsSync(testFile)) return [];

    try {
        const raw = await readFile(testFile, 'utf-8');
        const { data } = matter(`---\n${raw}\n---`);

        if (!data.tests || !Array.isArray(data.tests)) return [];

        return data.tests.map((t: any) => ({
            name: t.name || 'Custom test',
            type: 'content' as const,
            assertion: t.assertion || t.name,
            check: (content: string) => {
                let pass = true;
                if (t.expect_contains) {
                    for (const kw of t.expect_contains) {
                        if (!content.includes(kw)) pass = false;
                    }
                }
                if (t.expect_not_contains) {
                    for (const kw of t.expect_not_contains) {
                        if (content.includes(kw)) pass = false;
                    }
                }
                if (t.expect_min_length) {
                    if (content.length < t.expect_min_length) pass = false;
                }
                if (t.expect_sections) {
                    for (const section of t.expect_sections) {
                        if (!new RegExp(`^#{2,4}\\s+${section}`, 'im').test(content)) pass = false;
                    }
                }
                return pass;
            },
        }));
    } catch {
        return [];
    }
}

// ── Main Entry ───────────────────────────────────────────────────────────

/**
 * Run all tests against a skill.
 *
 * @param skillPath — path to skill directory or SKILL.md
 */
export async function testSkill(skillPath: string): Promise<TestResult> {
    const start = Date.now();
    const skillMd = skillPath.endsWith('SKILL.md') ? skillPath : join(skillPath, 'SKILL.md');
    const skillDir = skillPath.endsWith('SKILL.md') ? join(skillPath, '..') : skillPath;

    if (!existsSync(skillMd)) {
        throw new Error(`SKILL.md not found at ${skillMd}`);
    }

    const raw = await readFile(skillMd, 'utf-8');
    const { data, content } = matter(raw);
    const name = data.name || basename(skillDir);

    // Combine built-in + custom tests
    const builtinTests = getBuiltinTests();
    const customTests = await loadCustomTests(skillDir);
    const allTests = [...builtinTests, ...customTests];

    // Run tests
    const assertions: AssertionResult[] = [];
    for (const test of allTests) {
        try {
            const passed = test.check(content, data);
            assertions.push({
                name: test.name,
                passed,
                type: test.type,
                message: passed ? undefined : test.assertion,
            });
        } catch (err: any) {
            assertions.push({
                name: test.name,
                passed: false,
                type: test.type,
                message: `Error: ${err.message || err}`,
            });
        }
    }

    const passedCount = assertions.filter(a => a.passed).length;

    return {
        skillName: name,
        skillPath: skillDir,
        assertions,
        passed: assertions.every(a => a.passed),
        duration: Date.now() - start,
        passRate: Math.round((passedCount / assertions.length) * 100),
    };
}

/**
 * Run tests against multiple skills.
 */
export async function testSkills(skillPaths: string[]): Promise<TestResult[]> {
    const results: TestResult[] = [];
    for (const path of skillPaths) {
        try {
            results.push(await testSkill(path));
        } catch (err: any) {
            results.push({
                skillName: basename(path),
                skillPath: path,
                assertions: [{ name: 'Load skill', passed: false, type: 'structure', message: err.message }],
                passed: false,
                duration: 0,
                passRate: 0,
            });
        }
    }
    return results;
}

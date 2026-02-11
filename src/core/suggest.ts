/**
 * Suggest Engine - Project-aware skill recommendations
 * Analyzes package.json and project files to recommend matching skills from our 67K+ DB
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export interface ProjectAnalysis {
    languages: string[];
    frameworks: string[];
    libraries: string[];
    testTools: string[];
    buildTools: string[];
    categories: string[];
}

export interface SuggestedSkill {
    name: string;
    author: string;
    scopedName: string;
    description: string;
    score: number;
    matchReasons: string[];
    githubUrl: string;
    stars: number;
}

export interface SuggestOptions {
    limit?: number;
    minScore?: number;
    category?: string;
    task?: string;
    verbose?: boolean;
    json?: boolean;
    path?: string;
}

// Framework detection patterns
const FRAMEWORK_PATTERNS: Record<string, string[]> = {
    'react': ['react', 'react-dom'],
    'next.js': ['next'],
    'vue': ['vue'],
    'nuxt': ['nuxt'],
    'angular': ['@angular/core'],
    'svelte': ['svelte'],
    'express': ['express'],
    'fastify': ['fastify'],
    'nest.js': ['@nestjs/core'],
    'remix': ['@remix-run/react'],
    'astro': ['astro'],
    'gatsby': ['gatsby'],
    'electron': ['electron'],
    'react-native': ['react-native'],
    'flutter': ['flutter'],
    'django': ['django'],
    'flask': ['flask'],
    'fastapi': ['fastapi'],
    'rails': ['rails'],
    'spring': ['spring-boot'],
    'laravel': ['laravel'],
};

const LIBRARY_PATTERNS: Record<string, string[]> = {
    'tailwindcss': ['tailwindcss'],
    'prisma': ['prisma', '@prisma/client'],
    'drizzle': ['drizzle-orm'],
    'typeorm': ['typeorm'],
    'mongoose': ['mongoose'],
    'zod': ['zod'],
    'joi': ['joi'],
    'redux': ['redux', '@reduxjs/toolkit'],
    'zustand': ['zustand'],
    'tanstack-query': ['@tanstack/react-query'],
    'trpc': ['@trpc/server'],
    'graphql': ['graphql', '@apollo/client'],
    'stripe': ['stripe'],
    'auth.js': ['next-auth', '@auth/core'],
    'supabase': ['@supabase/supabase-js'],
    'firebase': ['firebase', 'firebase-admin'],
    'aws-sdk': ['aws-sdk', '@aws-sdk/client-s3'],
    'docker': ['dockerode'],
    'socket.io': ['socket.io'],
    'three.js': ['three'],
};

const TEST_TOOL_PATTERNS: Record<string, string[]> = {
    'jest': ['jest'],
    'vitest': ['vitest'],
    'mocha': ['mocha'],
    'cypress': ['cypress'],
    'playwright': ['@playwright/test', 'playwright'],
    'testing-library': ['@testing-library/react', '@testing-library/jest-dom'],
    'storybook': ['@storybook/react'],
};

const BUILD_TOOL_PATTERNS: Record<string, string[]> = {
    'vite': ['vite'],
    'webpack': ['webpack'],
    'turbopack': ['@vercel/turbopack-next'],
    'esbuild': ['esbuild'],
    'tsup': ['tsup'],
    'rollup': ['rollup'],
    'parcel': ['parcel'],
};

/**
 * Analyze a project directory to detect tech stack
 */
export async function analyzeProject(projectPath: string): Promise<ProjectAnalysis> {
    const analysis: ProjectAnalysis = {
        languages: [],
        frameworks: [],
        libraries: [],
        testTools: [],
        buildTools: [],
        categories: [],
    };

    // Check package.json (Node.js/JS/TS projects)
    const pkgPath = join(projectPath, 'package.json');
    if (existsSync(pkgPath)) {
        try {
            const pkgContent = await readFile(pkgPath, 'utf-8');
            const pkg = JSON.parse(pkgContent);
            const allDeps = {
                ...pkg.dependencies,
                ...pkg.devDependencies,
                ...pkg.peerDependencies,
            };

            const depNames = Object.keys(allDeps || {});

            // Detect language
            if (depNames.includes('typescript') || existsSync(join(projectPath, 'tsconfig.json'))) {
                analysis.languages.push('typescript');
            }
            analysis.languages.push('javascript');

            // Detect frameworks
            for (const [name, patterns] of Object.entries(FRAMEWORK_PATTERNS)) {
                if (patterns.some(p => depNames.includes(p))) {
                    analysis.frameworks.push(name);
                }
            }

            // Detect libraries
            for (const [name, patterns] of Object.entries(LIBRARY_PATTERNS)) {
                if (patterns.some(p => depNames.includes(p))) {
                    analysis.libraries.push(name);
                }
            }

            // Detect test tools
            for (const [name, patterns] of Object.entries(TEST_TOOL_PATTERNS)) {
                if (patterns.some(p => depNames.includes(p))) {
                    analysis.testTools.push(name);
                }
            }

            // Detect build tools
            for (const [name, patterns] of Object.entries(BUILD_TOOL_PATTERNS)) {
                if (patterns.some(p => depNames.includes(p))) {
                    analysis.buildTools.push(name);
                }
            }
        } catch {
            // Ignore parse errors
        }
    }

    // Check for Python projects
    const pyprojectPath = join(projectPath, 'pyproject.toml');
    const requirementsPath = join(projectPath, 'requirements.txt');
    if (existsSync(pyprojectPath) || existsSync(requirementsPath)) {
        analysis.languages.push('python');
    }

    // Check for Go projects
    if (existsSync(join(projectPath, 'go.mod'))) {
        analysis.languages.push('go');
    }

    // Check for Rust projects
    if (existsSync(join(projectPath, 'Cargo.toml'))) {
        analysis.languages.push('rust');
    }

    // Check for Java projects
    if (existsSync(join(projectPath, 'pom.xml')) || existsSync(join(projectPath, 'build.gradle'))) {
        analysis.languages.push('java');
    }

    // Build categories from detected stack
    if (analysis.frameworks.some(f => ['react', 'vue', 'svelte', 'angular'].includes(f))) {
        analysis.categories.push('frontend');
    }
    if (analysis.frameworks.some(f => ['express', 'fastify', 'nest.js', 'django', 'flask', 'fastapi'].includes(f))) {
        analysis.categories.push('backend');
    }
    if (analysis.frameworks.some(f => ['next.js', 'nuxt', 'remix', 'astro'].includes(f))) {
        analysis.categories.push('fullstack');
    }
    if (analysis.testTools.length > 0) {
        analysis.categories.push('testing');
    }
    if (analysis.libraries.some(l => ['prisma', 'drizzle', 'typeorm', 'mongoose'].includes(l))) {
        analysis.categories.push('database');
    }

    return analysis;
}

/**
 * Build search keywords from project analysis
 */
export function buildSearchKeywords(analysis: ProjectAnalysis, task?: string): string[] {
    const keywords: string[] = [];

    // Add task-specific keywords first (highest priority)
    if (task) {
        keywords.push(...task.split(/\s+/).filter(w => w.length > 2));
    }

    // Add frameworks and libraries
    keywords.push(...analysis.frameworks);
    keywords.push(...analysis.libraries);
    keywords.push(...analysis.testTools);
    keywords.push(...analysis.languages);
    keywords.push(...analysis.categories);

    // Deduplicate
    return [...new Set(keywords)];
}

/**
 * Score a skill against project analysis
 */
export function scoreSkill(
    skill: { name: string; description: string; stars: number },
    analysis: ProjectAnalysis,
    keywords: string[]
): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];
    const nameDesc = `${skill.name} ${skill.description}`.toLowerCase();

    // Framework match (40 weight)
    for (const fw of analysis.frameworks) {
        if (nameDesc.includes(fw.toLowerCase())) {
            score += 40;
            reasons.push(`Matches framework: ${fw}`);
            break; // Only count best framework match
        }
    }

    // Library match (30 weight)
    for (const lib of analysis.libraries) {
        if (nameDesc.includes(lib.toLowerCase())) {
            score += 30;
            reasons.push(`Matches library: ${lib}`);
            break;
        }
    }

    // Language match (15 weight)
    for (const lang of analysis.languages) {
        if (nameDesc.includes(lang.toLowerCase())) {
            score += 15;
            reasons.push(`Matches language: ${lang}`);
            break;
        }
    }

    // Category match (10 weight)
    for (const cat of analysis.categories) {
        if (nameDesc.includes(cat.toLowerCase())) {
            score += 10;
            reasons.push(`Matches category: ${cat}`);
            break;
        }
    }

    // Keyword match (5 per keyword, max 20)
    let kwScore = 0;
    for (const kw of keywords) {
        if (nameDesc.includes(kw.toLowerCase()) && kwScore < 20) {
            kwScore += 5;
            reasons.push(`Keyword: ${kw}`);
        }
    }
    score += kwScore;

    // Popularity bonus (up to 5 points)
    if (skill.stars > 1000) score += 5;
    else if (skill.stars > 100) score += 3;
    else if (skill.stars > 10) score += 1;

    return { score: Math.min(score, 100), reasons };
}

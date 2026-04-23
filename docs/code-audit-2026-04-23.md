# Code Audit: @syndicats/agent-skills v2.0.0

**Date:** 2026-04-23
**Scope:** Full repository scan for code smells, inconsistencies, and potential bugs
**Status:** Findings documented for future remediation

---

## Summary

| Severity | Count | Description |
|----------|-------|-------------|
| Critical | 4 | Security vulnerabilities, zero test coverage, no CI/CD |
| High | 5 | Silent failures, type safety, credential exposure, resource leaks |
| Medium | 6 | Duplication, hardcoded values, missing guards, inconsistent patterns |
| Low | 3 | Code style, dead code |

---

## Critical

### 1. Command Injection via `execAsync` String Interpolation

**Affected files:**
- `src/core/git-auth.ts:333` — `args.join(' ')` passes unsanitized clone URL and ref
- `src/core/marketplace.ts:391-400` — `repoUrl` and `branch` interpolated into shell commands
- `src/cli/commands/install.ts:142` — `lockSkill.source` interpolated into `git clone`
- `src/cli/commands/frozen.ts:68,72` — `entry.source` and `entry.version` interpolated
- `src/cli/commands/sandbox.ts:47` — `gitUrl` interpolated into `git clone`
- `src/cli/commands/interactive.ts:354` — `url` from user input interpolated into `open`/`xdg-open`
- `src/cli/commands/utils-commands.ts:373` — `skill.source` interpolated into `git clone`

**Impact:** A crafted repository URL or branch name (e.g., `repo.git"; rm -rf /; #`) could execute arbitrary commands on the host system.

**Solution:**
Replace all `execAsync` template-string calls with `execFile` using array-based arguments:
```typescript
// Before (unsafe)
await execAsync(`git clone --depth 1 ${url} .`, { cwd: dir });

// After (safe)
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileAsync = promisify(execFile);
await execFileAsync('git', ['clone', '--depth', '1', url, '.'], { cwd: dir });
```
Create a shared `safeExec(cmd, args, opts)` wrapper in `src/core/` to centralize this pattern.

---

### 2. Zero Test Coverage

**Affected files:** Entire codebase (50+ core modules, 36 command modules)

**Impact:** `vitest` is installed and `npm test` is configured, but no `.test.ts` or `.spec.ts` files exist. Complex logic in composer, differ, splitter, installer, and validator is completely untested. Regressions cannot be caught automatically.

**Solution:**
1. Start with unit tests for pure-logic core modules: `validator.ts`, `source-parser.ts`, `quality.ts`, `context-budget.ts`, `differ.ts`, `composer.ts`, `splitter.ts`
2. Add integration tests for `installer.ts` and `loader.ts` using temp directories
3. Add CLI smoke tests for critical commands (`install`, `list`, `validate`, `export`)
4. Target 60%+ coverage on core modules as a first milestone

---

### 3. No CI/CD Pipeline

**Affected files:** `.github/` (contains only issue/PR templates, no workflows)

**Impact:** No automated type checking, testing, or security scanning on PRs. Broken builds can be merged without detection.

**Solution:**
Create `.github/workflows/ci.yml` with:
- `npm run build` — type checking
- `npm test` — test suite (once tests exist)
- `npm audit --production` — dependency vulnerability scanning
- Run on push to `main` and all PRs

---

### 4. Known Dependency Vulnerability (rollup)

**Affected dependency:** `rollup` 4.0.0-4.58.0 (transitive via `tsup`)
**Advisory:** GHSA-mw96-cpmx-2vgc — Arbitrary File Write via Path Traversal
**Severity:** HIGH

**Impact:** Exploitable during build processes that use tsup/rollup with untrusted input.

**Solution:**
Run `npm audit fix` to update the transitive rollup dependency. If that doesn't resolve it, update tsup to a version that pulls in a patched rollup.

---

## High

### 5. Silent Error Swallowing (Empty Catch Blocks)

**Affected files:**
- `src/core/loader.ts:70-73` — Skill discovery errors silently skipped
- `src/cli/commands/install.ts:290` — `package.json` parsing failure ignored
- `src/cli/commands/install.ts:481` — Git version extraction failure ignored
- `src/core/marketplace.ts:189-191` — Index fetch failure silently caught
- `src/core/skillsrc.ts:100-102` — JSON parse failures silently caught
- `src/cli/commands/search.ts:33-36` — Directory read failures silently caught

**Impact:** Bugs and misconfigurations are invisible to users. Debugging becomes extremely difficult when errors are swallowed without logging.

**Solution:**
At minimum, log a debug-level message in every catch block:
```typescript
// Before
try { ... } catch { }

// After
try { ... } catch (err) {
  debug(`Failed to parse package.json: ${err}`);
}
```
Introduce a lightweight debug logger (e.g., using `DEBUG` env var) so these messages are visible when troubleshooting but silent in normal use.

---

### 6. Unsafe Type Assertions

**Affected files:**
- `src/cli/commands/install.ts:492` — `sourceType: sourceType as any` defeats type safety
- `src/cli/commands/install.ts:88` — `agents = selected as string[]` without validation
- `src/cli/commands/install.ts:452` — `selectedValues as string[]` without validation
- `src/cli/commands/test.ts:16` — `options: any` parameter type

**Impact:** TypeScript's type system is bypassed, allowing runtime type errors that strict mode is supposed to prevent.

**Solution:**
- Replace `as any` with proper type narrowing or a validated cast
- For prompt results, validate the shape before asserting: `if (Array.isArray(selected) && selected.every(s => typeof s === 'string'))`
- Define an `Options` interface for the test command handler

---

### 7. Git Credential Token Exposure Risk

**Affected files:** `src/core/git-auth.ts:240-248`

**Impact:** `buildAuthenticatedUrl()` embeds OAuth tokens directly into URL strings (`https://oauth2:TOKEN@host/path`). If these URLs are logged, displayed in error messages, or captured by child process argument inspection, tokens are leaked.

**Solution:**
- Use Git credential helpers or `GIT_ASKPASS` environment variable instead of URL-embedded tokens
- If URL embedding is necessary, ensure all error handlers and loggers strip credentials: `url.replace(/\/\/[^@]+@/, '//***@')`
- Add a `sanitizeUrl()` utility and apply it in all error paths

---

### 8. Temp Directory Cleanup Not Guaranteed

**Affected files:**
- `src/cli/commands/install.ts:140-147` — npm install flow
- `src/cli/commands/install.ts:225-312` — git install flow
- `src/cli/commands/install.ts:327-506` — private git install flow

**Impact:** If an exception occurs between `mkdtemp` and the cleanup code, temporary directories with cloned repositories (potentially containing secrets) are left on disk.

**Solution:**
Wrap all temp directory operations in try-finally:
```typescript
const tempDir = await mkdtemp(join(tmpdir(), 'skills-'));
try {
  // ... operations ...
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
```

---

### 9. No Linting or Formatting Enforcement

**Affected files:** Project root (missing `.eslintrc`, `.prettierrc`, `.husky/`)

**Impact:** No automated style enforcement. Code formatting is inconsistent and style issues must be caught in manual review.

**Solution:**
1. Add ESLint with `@typescript-eslint` for type-aware linting
2. Add Prettier for formatting
3. Add a pre-commit hook via `husky` + `lint-staged`
4. Add linting to CI pipeline

---

## Medium

### 10. Duplicated Section Parsing Logic

**Affected files:**
- `src/core/composer.ts:256-282` — `parseSections()` implementation
- `src/core/differ.ts:155-179` — `parseSections()` implementation
- `src/core/splitter.ts:128-165` — `parseSections()` implementation

**Impact:** Three slightly different implementations of the same markdown section parsing logic. Bug fixes or behavior changes must be applied in all three locations, creating maintenance risk.

**Solution:**
Extract a single `parseSections(content: string): Section[]` function into a shared utility (e.g., `src/core/markdown-utils.ts`) and import it in all three modules.

---

### 11. Hardcoded Paths, Timeouts, and Configuration Values

**Affected files:**
- `src/cli/commands/test.ts:25,53,62` — Hardcoded `.antigravity` and `.claude` paths instead of using `AGENTS` registry
- `src/core/executor.ts:17` — `timeout: 30000` hardcoded
- `src/core/marketplace.ts:138` — `CACHE_TTL = 5 * 60 * 1000` hardcoded
- `src/core/executor.ts:24-30` — `INTERPRETERS` map hardcoded
- `src/core/context-budget.ts:168-171` — Extension-to-language mapping hardcoded

**Impact:** Behavior cannot be customized without modifying source code. The `.antigravity` path in `test.ts` is a legacy reference that doesn't match current agent configurations.

**Solution:**
- Use `AGENTS` registry values instead of hardcoded agent directory names
- Move timeouts and cache TTLs to a `src/core/constants.ts` or make them configurable via CLI flags / environment variables
- Remove legacy `.antigravity` references

---

### 12. Missing Null/Undefined Safety Checks

**Affected files:**
- `src/cli/commands/install.ts:236` — `tarballName.split(...).pop()!` non-null assertion
- `src/cli/commands/install.ts:460` — `.split('/').pop()` unguarded, can return `undefined`
- `src/core/differ.ts:78-79` — `find()!` forced unwrap without existence check

**Impact:** If assumptions about string format are violated, these produce runtime crashes (`TypeError: Cannot read properties of undefined`).

**Solution:**
Replace non-null assertions with explicit checks:
```typescript
// Before
const name = path.split('/').pop()!;

// After
const name = path.split('/').pop();
if (!name) throw new Error(`Invalid path: ${path}`);
```

---

### 13. Inconsistent Logging and No Debug Mode

**Affected files:** Multiple core and CLI modules

**Impact:** Some modules use `console.warn()`, some use `console.log()`, some silently fail. There is no way to enable verbose/debug output for troubleshooting.

**Solution:**
1. Create a lightweight logger utility with levels (debug, info, warn, error)
2. Enable debug output via `DEBUG=skills:*` or `--verbose` flag
3. Replace all bare `console.*` calls in core modules with the logger

---

### 14. File Path Traversal Potential

**Affected files:** `src/core/installer.ts` — `getCanonicalPath()`

**Impact:** `skillName` is joined directly into a file path without validating for `../` sequences. A malicious skill name could write outside the intended skills directory.

**Solution:**
Validate that the resolved path is still within the expected base directory:
```typescript
const resolved = path.resolve(baseDir, skillName);
if (!resolved.startsWith(path.resolve(baseDir))) {
  throw new Error(`Invalid skill name: path traversal detected`);
}
```

---

### 15. Stale Reference in SECURITY.md

**Affected files:** `SECURITY.md`

**Impact:** References deprecated `~/.antigravity/skills/` path. Users following security guidance may look in the wrong location.

**Solution:**
Update SECURITY.md to reference `~/.skills/` and the current agent-specific paths from the `AGENTS` registry.

---

## Low

### 16. Bloated Functions

**Affected files:**
- `src/cli/commands/install.ts` — 482-line action handler with nested conditionals
- `src/cli/commands/utils-commands.ts` — 564 lines with multiple command registrations

**Impact:** Difficult to read, test, and maintain. High cognitive load for contributors.

**Solution:**
Extract the install handler into sub-functions by installation source type:
- `installFromNpm(source, options)`
- `installFromGit(source, options)`
- `installFromLocal(source, options)`

Split `utils-commands.ts` into individual command files following the pattern used by other commands.

---

### 17. No-Op Conditional

**Affected files:** `src/cli/commands/install.ts:484-485`

```typescript
let sourceType = parsed.type;
if (sourceType === 'private-git') sourceType = 'private-git'; // does nothing
```

**Impact:** Dead code that adds confusion. Suggests an incomplete refactor.

**Solution:**
Remove the no-op conditional. If there was intended logic (e.g., remapping the type), implement it or remove the line entirely.

---

### 18. Redundant Dynamic Import

**Affected files:** `src/core/executor.ts`

**Impact:** `glob` is imported at the top of the file (line 6) and also dynamically imported inside `listScripts()` (line 171). The dynamic import is unnecessary.

**Solution:**
Remove the dynamic import and use the top-level import throughout.

# Changelog

All notable changes to this project will be documented in this file.

## [1.1.4] - 2026-02-17

### 🔍 Skill Conflict Detector (`doctor --deep`)
- Deep conflict analysis integrated into the `doctor` command
- **3 detection strategies** (no LLM required):
  - **Keyword Contradiction** — Detects conflicting instructions across skills (e.g., "use tabs" vs "use spaces")
  - **Topic Overlap** — Jaccard similarity on section headings to find duplicate coverage
  - **Rule Extraction** — Extracts imperative instructions and compares across skills
- Estimates wasted tokens from redundant skill overlap
- Usage: `skills doctor --deep`

### 📊 Context Budget Manager (`budget`)
- Smart context budget planner — loads only the most relevant skills within a token limit
- **4-signal relevance scoring** (0–100, no LLM):
  1. File extension matching (project files → skill language keywords)
  2. Dependency matching (package.json, requirements.txt, Cargo.toml)
  3. Keyword density (skill body vs project file names)
  4. Description match against all project signals
- Greedy selection algorithm fits highest-relevance skills first
- Output formats: text (with visual bars), XML (agent-ready), JSON (machine-readable)
- Usage: `skills budget -b 8000`, `skills budget -b 4000 --format xml`

### 📊 Skill Diff (`diff`)
- Section-aware diff engine for comparing two skills side by side
- Parses SKILL.md into sections by heading, compares:
  - **Added sections** (only in skill B)
  - **Removed sections** (only in skill A)
  - **Changed sections** (with line delta preview)
- Reports token delta between skills
- Usage: `skills diff frontend-design frontend-code-review`

### ❄️ Frozen Installs (`frozen`)
- Deterministic skill installation from the lockfile (like `npm ci`)
- **Verify mode** — checks whether installed skills match lockfile entries: `skills frozen --verify`
- **Restore mode** — re-clones skills from their recorded Git sources with pinned versions
- **Strict mode** — aborts on first failure: `skills frozen --strict`
- Supports `github`, `private-git`, and `local` source types

### 🧩 Skill Compose (`compose`)
- Combine multiple skills into a single "super-skill"
- **3 composition strategies:**
  - `merge` — Combines all sections, deduplicates similar lines (default)
  - `chain` — Sequences skills with ordered phase markers
  - `conditional` — Wraps each skill in a conditional activation block
- Auto-saves composed skill: `skills compose A B -o combined --save`
- Usage: `skills compose frontend-design frontend-code-review -o combined-frontend`

### 🧪 Skill Testing (`test`)
- 10 built-in quality assertions across 3 categories:
  - **Structure:** SKILL.md exists, valid frontmatter, has name, has description
  - **Content:** has sections (headings), has code examples, has "when to use" section
  - **Quality:** concise description (<200 chars), no TODO/FIXME/placeholder, minimum content length
- Custom tests via `skill-test.yml` files in skill directories
- CI-ready: exits with code 1 on any failure
- Usage: `skills test frontend-design`, `skills test --all --verbose`

### 🧪 Sandbox Preview (`sandbox`)
- Preview a skill's quality, conflicts, and token impact **before** installing
- Combines quality scoring + conflict detection + token analysis in one command
- Supports local paths and remote GitHub repos (`@owner/repo`)
- Shows letter grade (A–F), failed assertions, and overlap analysis
- Usage: `skills sandbox ~/.antigravity/skills/my-skill`, `skills sandbox @owner/repo`

### 👁️ Watch Mode (`watch`)
- Watches skill directories for changes and auto-syncs to all agent directories
- Uses Node.js built-in `fs.watch` (no additional dependencies)
- Debounced file watching (configurable, default 500ms)
- Syncs to all 40+ agent directories on each change
- Usage: `skills watch`, `skills watch ./my-skills --agent cursor,claude`

### ✂️ Skill Splitter (`split`)
- Splits monolithic skills into focused sub-skills by topic clustering
- **10 topic categories:** setup, coding-style, testing, architecture, deployment, security, api, database, documentation, performance
- Groups sections by keyword assignment, generates frontmatter for each sub-skill
- Dry-run mode and auto-save support
- Usage: `skills split skill-creator --dry-run`, `skills split big-skill --save ./output`

### 📈 Skill Benchmarking (`bench`)
- Benchmark and compare skills by quality, size, and coverage
- **Quality scoring** (0–100) based on:
  - Frontmatter completeness, section count, code blocks, examples, instructions
  - Appropriate token count range, absence of TODOs/FIXMEs
- Table visualization with quality bars and emoji feature indicators (📝 💡 📋)
- Sortable by quality, tokens, or name; filterable by minimum quality
- Usage: `skills bench --all`, `skills bench frontend-design pdf --sort tokens`

### 🏗️ Integration
- 9 new commands registered in CLI entry point
- 6 new core modules exported from `src/core/index.ts`
- **Zero new npm dependencies** — all features use Node.js built-in APIs
- TypeScript build passes with zero errors

---

## [1.1.3] - 2026-02-13

### 🔍 Smart Skill Discovery & Selection
- **Deep SKILL.md search** — Recursively scans repos up to 3 levels deep, catching `skills/nestjs-expert/SKILL.md` patterns that were previously missed
- **Interactive skill selection** — When multiple skills found in a repo, presents a multiselect prompt to pick specific skills or install all at once
- Successfully discovers and offers **66+ skills** from repos like `Jeffallan/claude-skills`

### 🔀 `@owner/repo` Marketplace Fallback
- `skills add @Jeffallan/claude-skills` now falls through to GitHub clone when not found in marketplace
- Previously hard-failed with "Could not find in marketplace" — now strips `@` prefix and retries as Git source
- Works with both marketplace errors and marketplace misses

### 🐛 Source Parser Fixes
- Fixed SSH URL regex to handle both colon (`:`) and slash (`/`) separators (e.g., `git@host:path` and `git@host/path`)
- Improved GitHub shorthand parsing to detect domain-like names (containing dots) and route to `private-git`

---

## [1.1.1] - 2026-02-13

### 🔐 Private Git Repos — Enterprise-Ready Installation
- Install from **private Git repositories** across any provider:
  - GitHub (SSH/HTTPS), GitLab, Bitbucket, self-hosted Git instances
  - SSH URLs: `skills install git@gitlab.com:team/repo.git`
  - HTTPS with tokens: `skills install https://git.company.com/team/repo --token=xxx`
  - Bitbucket: `skills install https://bitbucket.org/team/repo`
- **Multi-strategy credential resolution** (in priority order):
  1. `--token` CLI flag
  2. Environment variables (`GH_TOKEN`, `GITLAB_TOKEN`, `BITBUCKET_TOKEN`, `GIT_TOKEN`)
  3. SSH key detection (`ssh-agent`, `~/.ssh/`)
  4. Git credential helper
  5. `.netrc` file
- Token masking in all logs and error messages for security
- New `--token <token>` option on `skills install`

### 📦 npm Package Support
- Install skills directly from npm registries: `skills install npm:@scope/package`
- Support for scoped packages, versions, and tags: `npm:@company/skills@1.1.1`
- Private registries: `skills install npm:@company/skills --registry https://npm.company.com`
- New `--registry <url>` option on `skills install`
- Uses `npm pack` + `tar` extraction for clean installs

### ⚙️ `.skillsrc` Configuration Files
- New `.skillsrc` / `.skillsrc.json` config file support
- Define custom Git sources, npm registries, and default settings
- Project-level config (`./.skillsrc`) takes priority over user-level (`~/.skillsrc`)
- Supports both JSON and simple YAML-like formats
- Source filtering by type, registry lookup by scope, auth env var resolution

### 🧪 Comprehensive Test Suite (85 Tests)
- `source-parser.test.ts` — 32 tests for all URL formats (GitHub, GitLab, Bitbucket, SSH, npm, private-git)
- `git-auth.test.ts` — 22 tests for host detection, URL manipulation, credential resolution
- `skillsrc.test.ts` — 15 tests for config loading, source filtering, registry lookup
- `skill-lock.test.ts` — 8 tests for expanded SourceType union and lock entries

### 🏗️ Source Parser Improvements
- New source types: `bitbucket`, `npm`, `private-git` added to `ParsedSource`
- SSH URL detection (`git@host:owner/repo.git`)
- Custom HTTPS Git URL detection (self-hosted instances)
- `npm:` prefix detection with scope, version, and tag parsing
- Tightened `isWellKnownUrl` to prevent false positives on arbitrary HTTPS URLs

### 🔧 Lock File Expansion
- `SourceType` expanded with `'bitbucket' | 'npm' | 'private-git'`
- Lock entries correctly track new source types with version SHAs
- Backward-compatible with existing lock files

---

## [1.1.0] - 2026-02-12

### 🎯 `skills score` — Quality Scoring System
- New 4-dimension scoring system to evaluate skill quality (0–100 with letter grades F–A)
  - **Structure** (30%) — SKILL.md exists, YAML frontmatter, name/description fields, directory layout
  - **Clarity** (30%) — Description length, section headings, "When to Use" section, examples, formatting
  - **Specificity** (30%) — Code blocks, numbered steps, tool/command references, file paths, constraints
  - **Advanced** (10%) — `scripts/` directory, `references/` directory, anti-patterns section, changelog, tests
- Output modes: default summary, `--verbose` (individual check details), `--json` (machine-readable)
- Integrated into `skills show` — displays quality badge alongside skill details
- Integrated into `skills submit` — warns if score is below 50 before publishing

### 🏗️ Formal Adapter Pattern Architecture
- Introduced `AgentAdapter` interface and `BaseAdapter` abstract class for all agent integrations
- **Specialized adapters:** `CursorAdapter`, `ClaudeAdapter`, `CopilotAdapter` for agents with custom behavior
- **`UniversalAdapter`** handles the remaining 37+ agents via a data-driven agent registry
- Refactored `convert.ts` and `export.ts` to use adapters instead of hardcoded agent logic
- Cached factory function `getAdapter(agentName)` provides the correct adapter instance
- Adding a new agent now requires only a config entry in `agents.ts` — no code changes needed

### 📤 `skills submit-repo` — Submit & Auto-Index Repos
- New command to submit an entire GitHub repository for marketplace auto-indexing
- Usage: `skills submit-repo <owner/repo>` (e.g. `skills submit-repo Jeffallan/claude-skills`)
- **Full pipeline:**
  1. Validates repo exists via GitHub API
  2. Scans for all `SKILL.md` files using Git Trees API
  3. Fetches raw content via `raw.githubusercontent.com`
  4. Parses frontmatter (name, description) from each SKILL.md
  5. Upserts each skill into the `skills` database table
  6. Refreshes global `skill_stats` cache
  7. Returns `{ indexed: N, errors: 0 }`
- Already-indexed repos return a 405 status with a clear message
- After submission, skills appear at `https://www.agentskills.in/marketplace?author=<owner>`

---

## [1.0.9] - 2026-02-11

### 🔧 `add` Alias for `install`
- `skills add` is now an alias for `skills install`
- `skills add @facebook/verify -a cursor` works identically to `skills install @facebook/verify -a cursor`
- Both commands support all the same options: `-a`, `--all`, `-g`, `-s`, `-y`

### 🌐 `--all` Flag — Install to All 42 Agents
- New `--all` flag installs a skill to every supported agent in one command
- Example: `skills install @facebook/verify --all` → installs to all 42 agents
- Works with all install sources: marketplace, GitHub repos, local directories

### 🎯 `@scoped/name` Install Fix
- `skills install @facebook/verify` now routes through a dedicated marketplace lookup
- Previously, `@scoped/name` patterns fell through to generic URL matching and often failed
- Now correctly parses `@author/skillname`, queries the database, and installs via the skill's GitHub URL

### 📤 Standardized Export Directory Structure
- All 42 agents now export to the unified `.agentname/skills/skillname/SKILL.md` format
- Removed legacy hardcoded formats (`.cursorrules`, single merged `.md` files)
- `export.ts` rewritten to dynamically support all agents from the `AGENTS` config
- Added `--list-agents` flag to show all 42 supported agents
- Comma-separated targets: `skills export -t cursor,claude,copilot`

### 🏗️ CLI Modular Architecture
- All 50 commands refactored into modular files under `src/cli/commands/`
- `index.ts` is now a thin orchestrator — all command logic in dedicated modules
- Shared agent config in `agents.ts` used by all commands

---

## [1.0.8] - 2026-02-01

### 🤖 13 New Agents (42 Total)
- **Ara** (`.ara/skills`)
- **Aide** (`.aide/skills`)
- **Alex** (`.alex/skills`)
- **BB** (`.bb/skills`)
- **CodeStory** (`.codestory/skills`)
- **Helix AI** (`.helix/skills`)
- **Meekia** (`.meekia/skills`)
- **Pear AI** (`.pear/skills`)
- **Adal** (`.adal/skills`)
- **Pochi** (`.pochi/skills`)
- **Sourcegraph Cody** (`.cody/skills`)
- **Void AI** (`.void/skills`)
- **Zed** (`.zed/skills`)

### 🔍 FZF Interactive Search
- New `-i/--interactive` flag for `skills search`
- Real-time fuzzy search with keyboard navigation (↑↓ arrows)
- Enter to select, Escape to cancel
- Auto-prompts to install selected skill
- 200ms debounce for API efficiency

### 🔒 Lock File Tracking System
- All installations tracked in `~/.skills/skills.lock`
- Stores source URL, type (database/github/gitlab/local), version (commit SHA)
- Tracks installation date, agents, and scope (global/project)
- Foundation for reliable check/update/remove operations

### 🗑️ New `skills remove` Command
- Interactive multi-select skill removal
- Filter by agent: `skills remove --agent cursor`
- Filter by global: `skills remove -g`
- Skip confirmation: `skills remove xlsx -y`
- Remove all: `skills remove --all`

### 📦 Enhanced `skills check` Command
- Now uses lock file for accurate tracking
- Shows source type with emoji indicators (🌐 Database, 🐙 GitHub, 🦊 GitLab, 📁 Local)
- Displays installation date and version
- JSON output: `skills check --json`

### 🔄 New `skills update` Command
- Re-downloads skills from their source repos
- Interactive selection or `--all` for all skills
- Updates version tracking in lock file
- Supports GitHub and GitLab sources

### 🎯 `@skill` Syntax for `skills add`
- Install specific skill directly: `skills add owner/repo@skill-name`
- Skips interactive selection when skill is specified
- Equivalent to: `skills add owner/repo --skill skill-name`

---

## [1.0.7] - 2026-01-27

### 🤖 19 New Agents (29 Total)
- **Cline** (`.cline/skills`)
- **Windsurf** (`.windsurf/skills`)
- **Gemini CLI** (`.gemini/skills`)
- **CodeBuddy** (`.codebuddy/skills`)
- **Command Code** (`.commandcode/skills`)
- **Continue** (`.continue/skills`)
- **Crush** (`.crush/skills`)
- **Clawdbot** (`skills`)
- **Droid** (`.factory/skills`)
- **Kiro CLI** (`.kiro/skills`)
- **MCPJam** (`.mcpjam/skills`)
- **Mux** (`.mux/skills`)
- **OpenHands** (`.openhands/skills`)
- **Pi** (`.pi/skills`)
- **Qoder** (`.qoder/skills`)
- **Qwen Code** (`.qwen/skills`)
- **Trae** (`.trae/skills`)
- **Zencoder** (`.zencoder/skills`)
- **Neovate** (`.neovate/skills`)

### 📊 Telemetry System
- Anonymous usage tracking with opt-out support
- Set `DISABLE_TELEMETRY=1` or `DO_NOT_TRACK=1` to opt out
- Automatically disabled in CI environments
- Tracks: search, install events (no personal data)

### 🔍 New `skills check` Command
- Check installed skills across all 29 agents
- Filter by agent: `skills check --agent cursor`
- JSON output: `skills check --json`
- Global skills: `skills check --global`

### 🔧 Source Parser
- New source parsing module for flexible installation
- Supports GitHub, GitLab, local paths, direct URLs
- Better error handling for malformed sources

---

## [1.0.6] - 2026-01-19

### 🔍 Interactive Search (`skills search`)
- New `skills search <query>` command to search 67K+ skills
- **Interactive by default** - search, select, and install in one command
- JSON output with `--json` flag for scripting (non-interactive)
- Sort by stars, recent, or name with `--sort`
- Limit results with `--limit`

---

## [1.0.5] - 2026-01-16

### 🌐 Global Install (`-g/--global`)
- Install skills globally to home directory instead of project-level
- Works with all commands: `skills install pdf -g -t claude`

### 🤖 5 New Agents (10 Total)
- **OpenCode** (`.opencode/skill`)
- **Amp** (`.agents/skills`)
- **Kilo Code** (`.kilocode/skills`)
- **Roo Code** (`.roo/skills`)
- **Goose** (`.goose/skills`)

### 📦 Git URL Support (`skills add`)
- Install from GitHub/GitLab repos: `skills add owner/repo`
- Support full URLs and subpaths
- `--list` to browse skills in repos
- `--skill` to install specific skills
- `-y` for non-interactive CI/CD mode

### ✨ UI Improvements
- Modern UI with @clack/prompts
- Shows install paths and hints
- Better cancellation handling

### 🔧 Build Optimization
- Added `npm run build:fast` using tsup
- Added @clack/prompts dependency

---

## [1.0.4] - 2026-01-11

### ⚡ Parallel Downloads
- Multiple skills now download in parallel for faster installation
- Significantly faster when installing 4+ skills at once

### 🔧 Interactive Install Fixes
- Fixed interactive wizard to install directly to platform directories
- Now copies ALL skill files (including subdirectories, references, etc.)
- Output now matches `skills install` command format
- Fixed database field name mismatch (githubUrl vs github_url)

---

## [1.0.3] - 2026-01-11

### 🌐 Website Launch
- Official website launched at [agentskills.in](https://agentskills.in)
- Browse 50,000+ skills in the marketplace
- Full documentation with interactive examples
- SEO & GEO optimized for AI search engines

### 🎯 Platform Targeting
- New `-t/--target` flag for installing to specific platforms
- Positional platform arguments: `skills install pdf claude cursor`
- `--all` flag to install to all platforms at once
- Auto-detection improvements for installed platforms

### 🔧 Improvements
- Fixed Antigravity installation to copy all skill files (including subdirectories)
- Updated API to use production endpoint
- Improved README documentation

---

## [1.0.0] - 2026-01-04

### 🚀 Initial Release

**Core Features:**
- Interactive wizard with `skills` command
- Support for 5 AI agents: Cursor, Claude Code, GitHub Copilot, OpenAI Codex, Antigravity

### 🌐 SkillsMP Integration
- Access to **40,779+ skills** from [skillsmp.com](https://skillsmp.com)
- No API key required - completely free and public
- Skills sorted by GitHub stars
- Pagination support with `--limit` and `--page` options

### 📦 Marketplace Commands
- `skills market-list` - List skills from SkillsMP (40k+ skills)
- `skills market-search <query>` - Search skills with results count
- `skills market-sources` - Show registered marketplaces
- `skills market-list --legacy` - Fallback to GitHub sources

### ⬇️ Installation Commands
- `skills install <name>` - Install by name from SkillsMP
- `skills install-url <url>` - Install from GitHub URL
- `skills market-install <name>` - Alias for install
- `skills market-uninstall <name>` - Remove installed skill

### 📤 Export Commands
- `skills export` - Export to all agents
- `skills export --target <agent>` - Export to specific agent (cursor, claude, copilot, codex, antigravity)
- `skills sync` - Sync to `.agent/workflows/` for Antigravity

### 🔧 Skill Management
- `skills list` - List all discovered skills
- `skills show <name>` - Show skill details
- `skills validate <path>` - Validate SKILL.md against spec
- `skills init <name>` - Create new skill from template

### 🔄 Update & Maintenance
- `skills market-installed` - List installed marketplace skills
- `skills market-update-check` - Check for skill updates

### 📁 Project Structure
- TypeScript codebase
- Commander.js CLI framework
- Inquirer.js for interactive prompts
- Ora spinners for progress feedback
- Chalk for colored output

### 📄 Open Source
- MIT License
- Contributing guidelines
- Security policy
- GitHub issue templates
- Pull request template

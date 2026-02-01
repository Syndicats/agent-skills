# Changelog

All notable changes to this project will be documented in this file.

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

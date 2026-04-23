# Agent Skills CLI

> **One CLI. 45+ AI agents. Self-managed skill repositories.**

[![npm version](https://img.shields.io/npm/v/@syndicats/agent-skills)](https://www.npmjs.com/package/@syndicats/agent-skills)
[![license](https://img.shields.io/npm/l/@syndicats/agent-skills)](LICENSE)

Install skills from Git repositories and sync them to **45 AI agents** including Cursor, Claude Code, GitHub Copilot, Windsurf, Cline, Gemini CLI, Zed, and more.

```bash
npm install -g @syndicats/agent-skills
skills install owner/repo
```

---

## Features

- **45 AI Agents** -- Cursor, Claude, Copilot, Windsurf, Cline, Gemini CLI, Zed, and 38+ more
- **Git Repos** -- Install from GitHub, GitLab, Bitbucket, SSH, and self-hosted Git
- **npm Packages** -- Install from npm registries: `skills install npm:@scope/package`
- **Private Repos** -- SSH keys, tokens, git credential helpers
- **Conflict Detection** -- Find contradictions and overlaps: `skills doctor --deep`
- **Context Budget** -- Smart token-aware skill selection: `skills budget -b 8000`
- **Skill Diff** -- Section-aware comparison: `skills diff A B`
- **Frozen Installs** -- Deterministic lockfile-based installs: `skills frozen`
- **Skill Compose** -- Merge, chain, or conditionally combine: `skills compose A B -o C`
- **Skill Testing** -- 10 built-in quality assertions + custom tests: `skills test --all`
- **Sandbox Preview** -- Quality + conflicts check before install: `skills sandbox @owner/repo`
- **Watch Mode** -- Auto-sync skills to agents on file changes: `skills watch`
- **Quality Scoring** -- 4-dimension skill scoring (0-100): `skills score`
- **Lock File Tracking** -- Track all installations in `~/.skills/skills.lock`
- **Platform Targeting** -- Install to specific platforms with `-a claude,cursor`
- **`.skillsrc` Config** -- Enterprise config files for custom registries, tokens, and defaults

---

## Installation

```bash
npm install -g @syndicats/agent-skills
```

**Requirements:** Node.js 18+

---

## Quick Start

```bash
# Install from a GitHub repo
skills install owner/repo

# Install from private Git (auto-detects credentials)
skills install git@gitlab.com:team/internal-skills.git
skills install https://git.company.com/team/skills --token $GIT_TOKEN

# Install from npm registry
skills install npm:@company/skills

# Install to specific platforms
skills install owner/repo -a claude,cursor

# Install to ALL 45 platforms at once
skills install owner/repo --all

# Install globally (home directory)
skills install owner/repo -g -a claude

# Install specific skill from repo
skills install owner/repo -s skill-name

# List skills in a repo
skills install owner/repo --list

# Remove installed skills
skills remove xlsx

# Check installed skills
skills check

# Update skills from source
skills update --all

# Search installed skills
skills search python
```

---

## Commands

### Core Commands

| Command | Description |
|---------|-------------|
| `skills install <source>` | Install from Git repo, URL, npm, or local directory |
| `skills search <query>` | Search locally installed skills |
| `skills check` | Check installed skills (`--agent`, `--global`, `--json`) |
| `skills update` | Update skills (`--all`, `--global`, `--yes`, `--prune`) |
| `skills remove` | Remove installed skills (`--agent`, `--global`, `--all`, `--yes`) |
| `skills score [path]` | Score skill quality (0-100, grades F-A) |
| `skills doctor` | Diagnose issues (`--deep` for conflicts, `--fix` to auto-repair) |

### Power Tools

| Command | Description |
|---------|-------------|
| `skills budget -b <tokens>` | Smart context budget -- load only relevant skills within limit |
| `skills diff <A> <B>` | Section-aware skill comparison |
| `skills compose <skills...>` | Merge/chain/conditional skill composition |
| `skills test [skills...]` | Run quality assertions against skills |
| `skills frozen` | Deterministic install from lockfile |
| `skills sandbox <source>` | Preview skill quality + conflicts before installing |
| `skills watch [dir]` | Auto-sync skills to agents on file changes |
| `skills split <skill>` | Split large skills into focused sub-skills |
| `skills bench [skills...]` | Benchmark and compare skill quality |

### Install Options

```bash
skills install owner/repo                    # Auto-detect platforms (prompts)
skills install owner/repo -a cursor          # Install to Cursor only
skills install owner/repo -a cursor,claude   # Install to multiple
skills install owner/repo --all              # Install to all 45 agents
skills install owner/repo -g -a claude       # Install globally
skills install owner/repo --local -a claude  # Install locally (overrides .skillsrc)
skills install owner/repo -s skill-name      # Install specific skill
skills install owner/repo --list             # List skills in repo
skills install owner/repo --dry-run          # Show matched skills without installing

# Bulk install (no prompts)
skills install owner/repo -a claude -y
skills install owner/repo --all -y
```

### Private Git Repos

```bash
# SSH (auto-detects SSH keys)
skills install git@github.com:team/private-repo.git
skills install git@gitlab.com:team/internal-skills.git

# HTTPS with token
skills install https://git.company.com/team/repo --token=xxx

# Token from environment variable
GITLAB_TOKEN=xxx skills install https://gitlab.com/team/repo
BITBUCKET_TOKEN=xxx skills install https://bitbucket.org/team/repo
```

**Auth resolution order:** `--token` flag -> env vars (`GH_TOKEN`, `GITLAB_TOKEN`, `BITBUCKET_TOKEN`, `GIT_TOKEN`) -> SSH keys -> git credential helper -> `.netrc`

### npm Packages

```bash
skills install npm:@company/skills
skills install npm:@company/skills@1.1.2
skills install npm:@company/skills --registry https://npm.company.com
```

### Development & Creation

| Command | Description |
|---------|-------------|
| `skills init <name>` | Create a new skill from template |
| `skills craft <name>` | Craft a new skill with full structure |
| `skills forge <description>` | AI-generate a skill from natural language |
| `skills mine` | Extract coding patterns from git history |
| `skills capture <source>` | Capture a URL, text, or file as a skill |
| `skills convert <file>` | Convert skills between agent formats |
| `skills bootstrap` | Auto-generate agent instruction files from your project |

### Validation & Quality

| Command | Description |
|---------|-------------|
| `skills validate <path>` | Validate a SKILL.md file |
| `skills audit [skills...]` | Security audit -- scan for vulnerabilities |
| `skills score [path]` | Score skill quality (0-100, grades F-A) |

### Export & Sync

| Command | Description |
|---------|-------------|
| `skills export` | Export skills to agents (`--target`, `--directory`, `--list-agents`) |
| `skills info` | Show installation status and paths |

---

## Supported Platforms (45 Agents)

| Platform | Project Dir | Global Dir |
|----------|-------------|------------|
| **Cursor** | `.cursor/skills/` | `~/.cursor/skills/` |
| **Claude Code** | `.claude/skills/` | `~/.claude/skills/` |
| **GitHub Copilot** | `.github/skills/` | `~/.github/skills/` |
| **Codex** | `.codex/skills/` | `~/.codex/skills/` |
| **Windsurf** | `.windsurf/skills/` | `~/.codeium/windsurf/skills/` |
| **Cline** | `.cline/skills/` | `~/.cline/skills/` |
| **Gemini CLI** | `.gemini/skills/` | `~/.gemini/skills/` |
| **Zed** | `.zed/skills/` | `~/.zed/skills/` |
| **Antigravity** | `.agent/skills/` | `~/.gemini/antigravity/skills/` |
| **OpenCode** | `.opencode/skill/` | `~/.config/opencode/skill/` |

**+35 more agents:** Amp, Kilo, Roo, Goose, CodeBuddy, Continue, Crush, Clawdbot, Droid, Kiro, MCPJam, Mux, OpenHands, Pi, Qoder, Qwen Code, Trae, Zencoder, Neovate, Command Code, Ara, Aide, Alex, BB, CodeStory, Helix AI, Meekia, Pear AI, Adal, Pochi, Sourcegraph Cody, Void AI, Lingma, Deep Agents, Ruler

---

## Configuration (`.skillsrc`)

Create a `.skillsrc` or `.skillsrc.json` file in your project root or home directory:

```json
{
  "sources": [
    {
      "name": "company-gitlab",
      "type": "git",
      "url": "https://gitlab.company.com",
      "auth_env": "COMPANY_GIT_TOKEN"
    },
    {
      "name": "company-npm",
      "type": "npm",
      "registry": "https://npm.company.com",
      "scope": "@company"
    }
  ],
  "defaults": {
    "agents": ["cursor", "claude"],
    "global": false
  }
}
```

Config is loaded from: project `.skillsrc` / `.skillsrc.json` -> home `~/.skillsrc` / `~/.skillsrc.json` (first found wins).

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `GH_TOKEN` / `GITHUB_TOKEN` | GitHub private repo authentication |
| `GITLAB_TOKEN` / `GL_TOKEN` | GitLab private repo authentication |
| `BITBUCKET_TOKEN` / `BB_TOKEN` | Bitbucket private repo authentication |
| `GIT_TOKEN` | Generic Git authentication (any host) |

---

## Creating Skills

Create a `SKILL.md` file:

```markdown
---
name: my-skill
description: What this skill does
---

# Instructions

Your skill instructions here...
```

Then install locally:

```bash
skills validate ./my-skill
skills export
```

---

## Credits

This project is a fork of [agent-skills-cli](https://github.com/Karanjot786/agent-skills-cli) by **Karanjot Singh** ([@Karanjot786](https://github.com/Karanjot786)), licensed under MIT. We are grateful for the original work that made this project possible.

**Changes in this fork:**
- Removed external marketplace and telemetry dependencies
- Self-managed Git repositories as the primary skill source
- Rebranded under Syndicats

---

## Links

- **GitHub:** [github.com/syndicats/agent-skills](https://github.com/syndicats/agent-skills)
- **npm:** [npmjs.com/package/@syndicats/agent-skills](https://www.npmjs.com/package/@syndicats/agent-skills)
- **Original project:** [github.com/Karanjot786/agent-skills-cli](https://github.com/Karanjot786/agent-skills-cli)

---

## License

MIT -- see [LICENSE](LICENSE)

Original work: Copyright (c) 2026 Karanjot786
This fork: Copyright (c) 2026 Syndicats

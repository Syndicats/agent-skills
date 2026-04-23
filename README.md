# Agent Skills CLI 🚀

> **One CLI. 175,000+ skills. 45 AI agents.**

[![npm version](https://img.shields.io/npm/v/agent-skills-cli)](https://www.npmjs.com/package/agent-skills-cli)
[![license](https://img.shields.io/npm/l/agent-skills-cli)](LICENSE)

Install skills from the world's largest marketplace and sync them to **45 AI agents** including Cursor, Claude Code, GitHub Copilot, Windsurf, Cline, Gemini CLI, Zed, and more — all with a single command.

**What's new in v1.1.7:** Glob matching (`--skill 'core-*'`), prune stale skills (`--prune`), branch targeting (`owner/repo#dev`), and 3 new agents (Lingma, Deep Agents, Ruler)

🌐 **Website:** [agentskills.in](https://agentskills.in)

```bash
npm install -g agent-skills-cli
skills install @anthropic/xlsx
```

---

## ✨ Features

- **175,000+ Skills** — Access the largest collection of AI agent skills
- **45 AI Agents** — Cursor, Claude, Copilot, Windsurf, Cline, Gemini CLI, Zed, and 38+ more
- **FZF Interactive Search** — Real-time search with keyboard navigation: `skills search -i`
- **Conflict Detection** — Find contradictions and overlaps across skills: `skills doctor --deep`
- **Context Budget** — Smart token-aware skill selection for your project: `skills budget -b 8000`
- **Skill Diff** — Section-aware comparison of two skills: `skills diff A B`
- **Frozen Installs** — Deterministic lockfile-based installs (like `npm ci`): `skills frozen`
- **Skill Compose** — Merge, chain, or conditionally combine skills: `skills compose A B -o C`
- **Skill Testing** — 10 built-in quality assertions + custom tests: `skills test --all`
- **Sandbox Preview** — Quality + conflicts check before install: `skills sandbox @owner/repo`
- **Watch Mode** — Auto-sync skills to agents on file changes: `skills watch`
- **Skill Splitter** — Split large skills into focused sub-skills: `skills split my-skill`
- **Benchmarking** — Compare skill quality across your collection: `skills bench --all`
- **Private Git Repos** — GitLab, Bitbucket, SSH, self-hosted Git: `skills install git@host:team/repo`
- **npm Packages** — Install from npm registries: `skills install npm:@scope/package`
- **`.skillsrc` Config** — Enterprise config files for custom registries, tokens, and defaults
- **Quality Scoring** — 4-dimension skill scoring (0–100): `skills score`
- **Lock File Tracking** — Track all installations in `~/.skills/skills.lock`
- **Platform Targeting** — Install to specific platforms with `-a claude,cursor`

---

## 📦 Installation

```bash
npm install -g agent-skills-cli
```

**Requirements:** Node.js 18+

---

## 🚀 Quick Start

```bash
# ⭐ Install a skill (auto-detects platforms)
skills install @facebook/verify

# ⭐ Install from a GitHub repo
skills add vercel-labs/agent-skills

# ⭐ Install from private Git (auto-detects credentials)
skills install git@gitlab.com:team/internal-skills.git
skills install https://git.company.com/team/skills --token $GIT_TOKEN

# ⭐ Install from npm registry
skills install npm:@company/skills
skills install npm:@company/skills --registry https://npm.company.com

# Install to specific platforms
skills install @facebook/verify -a claude,cursor

# Install to ALL 45 platforms at once
skills install @lobehub/typescript --all

# Install globally (home directory)
skills install pdf -g -a claude

# Install specific skill from repo
skills add anthropic/skills@xlsx

# List skills in a repo
skills add owner/repo --list

# Remove installed skills
skills remove xlsx

# Check installed skills
skills check

# Update skills from source
skills update --all

# Search and install skills interactively (multi-select)
skills search python

# Search + auto-install all results to an agent
skills search python -a claude -y

# Search + install to specific agents
skills search react -a cursor claude
```

---

## 🛠️ Commands

### Core Commands

| Command | Description |
|---------|-------------|
| `skills install <name>` | Install a skill from marketplace |
| `skills add <source>` | Install from Git repo (owner/repo or URL) |
| `skills search <query>` | Search and install skills (multi-select) |
| `skills search -i` | FZF-style interactive search with keyboard navigation |
| `skills search <query> -a <agent> -y` | Search and bulk-install all results to an agent |
| `skills check` | Check installed skills (`--agent`, `--global`, `--json`) |
| `skills update` | Update skills (`--all`, `--global`, `--yes`, `--prune`) |
| `skills remove` | Remove installed skills (`--agent`, `--global`, `--all`, `--yes`) |
| `skills score [path]` | Score skill quality (0–100, grades F–A) |
| `skills submit-repo <repo>` | Submit a GitHub repo for marketplace auto-indexing |
| `skills doctor` | Diagnose issues (`--deep` for conflicts, `--fix` to auto-repair) |

### Power Tools (v1.1.4)

| Command | Description |
|---------|-------------|
| `skills budget -b <tokens>` | Smart context budget — load only relevant skills within limit |
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
skills install @facebook/verify          # Auto-detect platforms (prompts)
skills install @facebook/verify -a cursor # Install to Cursor only
skills install @lobehub/typescript -a cursor,claude  # Install to multiple
skills install @facebook/verify --all     # Install to all 45 agents
skills install pdf -g -a claude           # Install globally (~/.claude/skills/)
skills install pdf --local -a claude      # Install locally (overrides .skillsrc global default)
skills install -s verify -a cursor        # Install by skill name
skills add @facebook/verify -a cursor     # 'add' / 'i' are aliases for 'install'
skills install owner/repo --list          # List skills in repo without installing
skills install owner/repo --dry-run       # Show matched skills without installing

# Bulk install all skills from a repo (no prompts)
skills install @ComposioHQ/awesome-claude-skills -a claude -y
skills install @github/awesome-copilot -a cursor,claude -y
skills install @owner/repo --all -y        # All skills to all agents
```

### Git URL Install (`skills add`)

```bash
skills add owner/repo              # GitHub shorthand
skills add owner/repo@skill-name   # Install specific skill directly
skills add https://github.com/user/repo  # Full URL
skills add https://gitlab.com/org/repo   # GitLab
skills add owner/repo --list       # List skills in repo
skills add owner/repo -s skill-name      # Install specific skill
skills add owner/repo -y -g        # Non-interactive, global
skills add owner/repo -a claude -y # Install ALL skills to claude (no prompt)
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

# Bitbucket
skills install https://bitbucket.org/team/skills-repo
```

**Auth resolution order:** `--token` flag → env vars (`GH_TOKEN`, `GITLAB_TOKEN`, `BITBUCKET_TOKEN`, `GIT_TOKEN`) → SSH keys → git credential helper → `.netrc`

### npm Packages

```bash
# Public npm packages
skills install npm:chalk
skills install npm:@anthropic/skills

# Scoped package with version
skills install npm:@company/skills@1.1.2

# Private npm registry
skills install npm:@company/skills --registry https://npm.company.com
```

### Development & Creation

| Command | Description |
|---------|-------------|
| `skills init <name>` | Create a new skill from template |
| `skills craft <name>` | Craft a new skill with full structure (`--full`, `--scripts`, `--references`) |
| `skills forge <description>` | AI-generate a skill from natural language (`--agent`, `--dry-run`) |
| `skills mine` | Extract coding patterns from git history (`--depth`, `--format skill`) |
| `skills capture <source>` | Capture a URL, text, or file as a skill (`--name`, `--tags`) |
| `skills convert <file>` | Convert skills between agent formats (`-o`, `--overwrite`) |
| `skills bootstrap` | Auto-generate agent instruction files from your project |

### Validation & Quality

| Command | Description |
|---------|-------------|
| `skills validate <path>` | Validate a SKILL.md file |
| `skills audit [skills...]` | Security audit — scan for vulnerabilities (`--format`, `--fail-on`) |
| `skills score [path]` | Score skill quality (0–100, grades F–A) (`--json`, `--verbose`) |

### Export & Sync

| Command | Description |
|---------|-------------|
| `skills export` | Export skills to agents (`--target`, `--directory`, `--list-agents`) |
| `skills info` | Show installation status and paths |

### Collaboration

| Command | Description |
|---------|-------------|
| `skills collab init <team>` | Initialize team collaboration |
| `skills collab share <skill>` | Share a skill with the team |
| `skills collab sync` | Sync shared skills with team |
| `skills lockspec generate` | Generate a team skill manifest |
| `skills lockspec verify` | Verify installation matches lockspec |
| `skills grid serve` | P2P skill sharing on local network |

### Automation & Rules

| Command | Description |
|---------|-------------|
| `skills rule add <name>` | Add an always-on coding rule (`--description`, `--global`) |
| `skills rule list` | List all coding rules |
| `skills trigger add <name>` | Auto-trigger skills on events (`--event`, `--pattern`, `--action`) |
| `skills watch [dir]` | Auto-sync skills to agents on file changes |
| `skills ci` | Generate CI/CD workflow for skill validation |

### Session & Planning

| Command | Description |
|---------|-------------|
| `skills recall save <key> <value>` | Store context across sessions |
| `skills recall search <query>` | Search stored memory entries |
| `skills track save <name>` | Save current session state |
| `skills blueprint create <name>` | Create structured development plan with milestones |
| `skills method apply <name>` | Apply a development methodology pack |
| `skills insight` | Analyze installed skills — patterns, coverage, and gaps |

### Quality Scoring

```bash
skills score ./my-skill             # Score a skill (0–100, grade F–A)
skills score ./my-skill --verbose    # Show individual check details
skills score ./my-skill --json       # Machine-readable output
```

**Dimensions:** Structure (30%), Clarity (30%), Specificity (30%), Advanced (10%)

### Submit Repos to Marketplace

```bash
skills submit-repo Jeffallan/claude-skills   # Auto-index all skills in repo
skills submit-repo vercel-labs/agent-skills   # Skills appear on marketplace
```

---

## 🤖 Supported Platforms (45 Agents)

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

## ⚙️ Configuration (`.skillsrc`)

Create a `.skillsrc` or `.skillsrc.json` file in your project root or home directory to configure private sources and defaults:

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

Config is loaded from: project `.skillsrc` / `.skillsrc.json` → home `~/.skillsrc` / `~/.skillsrc.json` (first found wins). Both `"agent": "cursor"` (singular string) and `"agents": ["cursor", "claude"]` (array) are accepted in defaults.

---

## 🔐 Environment Variables

| Variable | Purpose |
|----------|---------|  
| `GH_TOKEN` / `GITHUB_TOKEN` | GitHub private repo authentication |
| `GITLAB_TOKEN` / `GL_TOKEN` | GitLab private repo authentication |
| `BITBUCKET_TOKEN` / `BB_TOKEN` | Bitbucket private repo authentication |
| `GIT_TOKEN` | Generic Git authentication (any host) |
| `DISABLE_TELEMETRY` / `DO_NOT_TRACK` | Opt out of anonymous telemetry |

Telemetry is automatically disabled in CI environments.

---

## 📚 Creating Skills

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

## 🔗 Links

- **Website:** [agentskills.in](https://agentskills.in)
- **Marketplace:** [agentskills.in/marketplace](https://agentskills.in/marketplace)
- **Documentation:** [agentskills.in/docs](https://agentskills.in/docs)
- **CLI GitHub:** [github.com/Karanjot786/agent-skills-cli](https://github.com/Karanjot786/agent-skills-cli)
- **Website GitHub:** [github.com/Karanjot786/agent-skills-UI](https://github.com/Karanjot786/agent-skills-UI)
- **npm:** [npmjs.com/package/agent-skills-cli](https://www.npmjs.com/package/agent-skills-cli)

---

## 👤 Author

**Karanjot Singh**

- 🐦 [@Karanjotdulay](https://x.com/Karanjotdulay)
- 💼 [LinkedIn](https://www.linkedin.com/in/karanjot786/)
- 🐙 [@Karanjot786](https://github.com/Karanjot786)

---

## 📄 License

MIT © [Karanjot Singh](https://github.com/Karanjot786)

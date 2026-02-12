# Agent Skills CLI 🚀

> **One CLI. 175,000+ skills. 42 AI agents.**

[![npm version](https://img.shields.io/npm/v/agent-skills-cli)](https://www.npmjs.com/package/agent-skills-cli)
[![license](https://img.shields.io/npm/l/agent-skills-cli)](LICENSE)

Install skills from the world's largest marketplace and sync them to **42 AI agents** including Cursor, Claude Code, GitHub Copilot, Windsurf, Cline, Gemini CLI, Zed, and more — all with a single command.

**What's new in v1.1.0:** Quality scoring (`skills score`), repo auto-indexing (`skills submit-repo`), and a formal adapter pattern architecture.

🌐 **Website:** [agentskills.in](https://agentskills.in)

```bash
npm install -g agent-skills-cli
skills install @anthropic/xlsx
```

---

## ✨ Features

- **175,000+ Skills** — Access the largest collection of AI agent skills
- **FZF Interactive Search** — Real-time search with keyboard navigation: `skills search -i`
- **42 AI Agents** — Cursor, Claude, Copilot, Windsurf, Cline, Gemini CLI, Zed, and 35+ more
- **Quality Scoring** — 4-dimension skill scoring (0–100): `skills score`
- **Repo Auto-Index** — Submit entire repos to the marketplace: `skills submit-repo owner/repo`
- **Adapter Architecture** — Formal adapter pattern for clean multi-agent support
- **Lock File Tracking** — Track all installations in `~/.skills/skills.lock`
- **Git URL Support** — Install from GitHub, GitLab, or repos: `skills add owner/repo@skill`
- **Platform Targeting** — Install to specific platforms with `-t claude,cursor`
- **Update & Remove** — Full lifecycle: `skills update`, `skills check`, `skills remove`
- **Privacy-First Telemetry** — Anonymous usage tracking with opt-out

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

# Install to specific platforms
skills install @facebook/verify -a claude,cursor

# Install to ALL 42 platforms at once
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

# Search and install skills interactively
skills search python

# Search with JSON output (non-interactive)
skills search react --json
```

---

## 🛠️ Commands

### Core Commands

| Command | Description |
|---------|-------------|
| `skills install <name>` | Install a skill from marketplace |
| `skills add <source>` | Install from Git repo (owner/repo or URL) |
| `skills search <query>` | Search and install skills interactively |
| `skills search -i` | FZF-style interactive search with keyboard navigation |
| `skills check` | Check installed skills with source and version info |
| `skills update` | Update skills from their source repos |
| `skills remove` | Remove installed skills (interactive multi-select) |
| `skills score [path]` | Score skill quality (0–100, grades F–A) |
| `skills submit-repo <repo>` | Submit a GitHub repo for marketplace auto-indexing |
| `skills doctor` | Diagnose issues |

### Install Options

```bash
skills install @facebook/verify          # Auto-detect platforms (prompts)
skills install @facebook/verify -a cursor # Install to Cursor only
skills install @lobehub/typescript -a cursor,claude  # Install to multiple
skills install @facebook/verify --all     # Install to all 42 agents
skills install pdf -g -a claude           # Install globally (~/.claude/skills/)
skills install -s verify -a cursor        # Install by skill name
skills add @facebook/verify -a cursor     # 'add' is an alias for 'install'
```

### Git URL Install (`skills add`)

```bash
skills add owner/repo              # GitHub shorthand
skills add owner/repo@skill-name   # NEW: Install specific skill directly
skills add https://github.com/user/repo  # Full URL
skills add https://gitlab.com/org/repo   # GitLab
skills add owner/repo --list       # List skills in repo
skills add owner/repo -s skill-name      # Install specific skill
skills add owner/repo -y -g        # Non-interactive, global
```

### Other Commands

```bash
skills init <name>        # Create new skill from template
skills validate <path>    # Validate a SKILL.md file
skills export             # Export skills to agents
skills sync               # Sync to Antigravity workflows
skills info               # Show installation status
```

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

## 🤖 Supported Platforms (42 Agents)

| Platform | Project Dir | Global Dir |
|----------|-------------|------------|
| **Cursor** | `.cursor/skills/` | `~/.cursor/skills/` |
| **Claude Code** | `.claude/skills/` | `~/.claude/skills/` |
| **GitHub Copilot** | `.github/skills/` | `~/.github/skills/` |
| **OpenAI Codex** | `.codex/skills/` | `~/.codex/skills/` |
| **Windsurf** | `.windsurf/skills/` | `~/.codeium/windsurf/skills/` |
| **Cline** | `.cline/skills/` | `~/.cline/skills/` |
| **Gemini CLI** | `.gemini/skills/` | `~/.gemini/skills/` |
| **Zed** | `.zed/skills/` | `~/.config/zed/skills/` |
| **Antigravity** | `.agent/skills/` | `~/.gemini/antigravity/skills/` |
| **OpenCode** | `.opencode/skill/` | `~/.config/opencode/skill/` |

**+32 more agents:** Amp, Kilo, Roo, Goose, CodeBuddy, Continue, Crush, Clawdbot, Droid, Kiro, MCPJam, Mux, OpenHands, Pi, Qoder, Qwen Code, Trae, Zencoder, Neovate, Command Code, Ara, Aide, Alex, BB, CodeStory, Helix AI, Meekia, Pear AI, Adal, Pochi, Sourcegraph Cody, Void AI

---

## 🔒 Privacy & Telemetry

The CLI collects anonymous usage data to improve the product. **No personal data is collected.**

```bash
# Opt out of telemetry
export DISABLE_TELEMETRY=1
# or
export DO_NOT_TRACK=1
```

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

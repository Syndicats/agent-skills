# Agent Skills CLI 🚀

> **One CLI. 100,000+ skills. 42 AI agents.**

[![npm version](https://img.shields.io/npm/v/agent-skills-cli)](https://www.npmjs.com/package/agent-skills-cli)
[![license](https://img.shields.io/npm/l/agent-skills-cli)](LICENSE)

Install skills from the world's largest marketplace and sync them to **42 AI agents** including Cursor, Claude Code, GitHub Copilot, Windsurf, Cline, Gemini CLI, Zed, and more — all with a single command.

🌐 **Website:** [agentskills.in](https://agentskills.in)

```bash
npm install -g agent-skills-cli
skills install @anthropic/xlsx
```

---

## ✨ Features

- **100,000+ Skills** — Access the largest collection of AI agent skills
- **FZF Interactive Search** — Real-time search with keyboard navigation: `skills search -i`
- **42 AI Agents** — Cursor, Claude, Copilot, Windsurf, Cline, Gemini CLI, Zed, and 35+ more
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
# Install a skill (auto-detects platforms)
skills install xlsx

# Install to specific platforms
skills install @anthropic/pdf -t claude,cursor

# Install globally (home directory)
skills install pdf -g -t claude

# Install to all 10 platforms
skills install docx --all

# Install from Git repo
skills add vercel-labs/agent-skills

# Install specific skill from repo (new @skill syntax)
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
| `skills doctor` | Diagnose issues |

### Install Options

```bash
skills install <name>              # Auto-detect platforms
skills install <name> -g           # Install globally (~/.claude/skills/)
skills install <name> -t claude    # Install to Claude only
skills install <name> -t cursor,copilot  # Install to multiple
skills install <name> --all        # Install to all 10 platforms
skills install <name> --list       # Show details without installing
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

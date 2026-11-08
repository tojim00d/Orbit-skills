# AGENTS.md — Orbit for any coding agent

Orbit is an open-source pack of **89 skills** that form one end-to-end pipeline:
**Understand → Build → Operate**. Each skill is a plain `SKILL.md` folder with YAML
frontmatter (`name`, `description`) and step-by-step instructions. The pack is
native to Claude Code, but the skills themselves are agent-agnostic: Codex,
Qwen Code, GLM/Z.ai, DeepSeek-based agents, Cursor and any tool that can read a
Markdown skill file can use them.

## Quick orientation

- **Router:** `plugins/orbit/skills/orbit/SKILL.md` — sizes the task and proposes a
  3–7 step route. Start here unless the task obviously matches one skill.
- **All skills:** `plugins/orbit/skills/<verb-name>/SKILL.md` (89 folders).
- **Shared artifacts:** `.orbit/` — every skill reads what earlier steps wrote and
  writes its own output there. Layout and rules: `ARTIFACTS.md`.
- **Catalog:** `CATALOG.md` — every skill with its phase, step number, input,
  output, next skill and source.
- **Credits:** `CREDITS.md` — where each borrowed method came from and its licence.

## How to use Orbit from a non-Claude agent

1. Read this file, then the router skill (`plugins/orbit/skills/orbit/SKILL.md`).
2. If your agent supports a skills directory, copy the skills there:

   ```bash
   ./install.sh --skills-dir ~/.agents/skills     # or any directory your agent reads
   ```

3. Otherwise, read the relevant `SKILL.md` file(s) into context and follow their
   steps literally. Skills are self-contained; they reference each other by name,
   never by Claude-only tools.
4. Write and read artifacts under `.orbit/` in the project (see `ARTIFACTS.md`).

## Adapting Claude-specific wording

Some skills mention Claude Code features. When your agent has no such feature:

- **Slash commands** (`/orbit:orbit`, `/orbit:understand`, …) are Claude Code
  components. Elsewhere, just ask for the task in words — the router and skill
  descriptions are written to trigger on natural language.
- **Subagents** ("delegate to a subagent"): use your agent's own delegation tool,
  or do the work inline and keep the same artifact output.
- **`${CLAUDE_PLUGIN_ROOT}`**: the skill directory is `plugins/orbit/skills/<skill>`
  in this repository, or wherever `--skills-dir` copied it.
- **TodoWrite / AskUserQuestion**-style steps: use your agent's equivalent; the
  intent (plan explicitly, ask before guessing) is what matters.

## Rules that matter in every agent

- Answer in the user's language; write generated artifacts in English unless the
  project clearly uses another language.
- Work only inside the agreed scope; small complete changes; no "done" without
  evidence (`prove-done`).
- Never put secrets, internal hostnames or personal data into examples.
- Reverse engineering is for own or authorized targets only.

## Compatibility notes

See `COMPATIBILITY.md` for a per-agent table (Claude Code, Codex, Qwen Code,
GLM/Z.ai, DeepSeek, Cursor) and `README.md` for install and FAQ.

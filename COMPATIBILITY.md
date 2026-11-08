# Compatibility — models and agents

Orbit is built for **Claude Code**, where it is a native plugin: commands,
subagents and skills load automatically. The skills themselves are standard
`SKILL.md` folders, so the pack also works with other agents and models.

| Agent / model | How to use Orbit | Commands `/orbit:…` |
|---|---|---|
| **Claude Code** (Claude models) | `claude plugin marketplace add tojim00d/Orbit-skills` → `claude plugin install orbit@orbit` | ✅ native |
| **Claude Code + GLM / Z.ai** (Anthropic-compatible endpoint) | Same install; point Claude Code at the GLM endpoint | ✅ native |
| **Claude Code + Qwen / DeepSeek** (Anthropic-compatible endpoint or proxy) | Same install; configure the model endpoint | ✅ native |
| **OpenAI Codex** | Read `AGENTS.md`; skills are plain files — copy them with `./install.sh --skills-dir <dir>` or reference paths directly | ❌ use natural language |
| **Qwen Code** | Same as Codex: `AGENTS.md` + `./install.sh --skills-dir <dir>` | ❌ |
| **DeepSeek-based agents** | Read `AGENTS.md` and the relevant `SKILL.md`; or use DeepSeek as a Claude Code backend | ❌ |
| **Cursor / other IDE agents** | Put `AGENTS.md` and the skills in the project, or copy skills into the agent's rules/skills directory | ❌ |
| **Any Agent Skills–format loader** | Point it at `plugins/orbit/skills/` (or the output of `--skills-dir`) | depends on the loader |

## What is portable and what is not

**Portable (works everywhere):**
- the 89 `SKILL.md` skills and their instructions;
- the `.orbit/` artifact contract (`ARTIFACTS.md`);
- the catalog, credits and this documentation.

**Claude Code–only:**
- slash commands and the plugin marketplace;
- named subagents (`orbit-cartographer`, `orbit-reverse-analyst`);
- hooks and `${CLAUDE_PLUGIN_ROOT}` interpolation (skills mention where to adapt).

## Models

Skill instructions are model-agnostic and written in plain English. The pack is
tested with Claude; GLM, Qwen, DeepSeek and other strong instruct models follow the
same skills when the files are loaded into context. Smaller models may need one
skill at a time instead of a full 3–7 step route.

## Install for a generic agent

```bash
git clone https://github.com/tojim00d/Orbit-skills.git orbit
cd orbit
./install.sh --skills-dir ~/.agents/skills   # or your agent's skills directory
```

Then read `AGENTS.md` in your agent session and name the task in words. Add
`.orbit/` to your project for artifacts.

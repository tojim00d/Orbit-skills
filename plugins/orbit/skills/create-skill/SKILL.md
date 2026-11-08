---
name: create-skill
description: '[Orbit 3.3.3 Docs & writing] Create or improve a skill and wire it into the Orbit pipeline. Use when: «сделай скилл», «добавь в пак», «новый навык для агента», «улучши скилл»; create skill, improve an existing skill.'
---

# create-skill — create or improve a skill

> **Orbit · ③ Operate · step 3.3.3 Docs & writing**  
> **Input:** a recurring task ← `instruct-agents`  
> **Output:** a new skill → next `write-update`  
> **Works with:** `instruct-agents`  
> **Shared rules:** reply in the user's language per `speak-plain`; generated content defaults to English; stay in scope; artifacts go to `.orbit/` (contract: `ARTIFACTS.md` at the pack root).

A recurring task becomes a skill the agent applies by itself: a method, a trigger description and a place in the pipeline — not a prompt that worked once.

## When to use

- The same task is explained for the third time — the repetition is the signal.
- A borrowed method is adapted repeatedly and the team wants its own version.
- An existing skill fires wrongly, misses its triggers, or has no artifact contract — improve it, do not duplicate.
- The pack needs a new step in a route (see `CATALOG.md`) and no existing skill is close enough.
- Not for a one-off prompt (`instruct-agents`) or a document for humans (`cowrite-doc`).

## Inputs

- the recurring task: the runs that repeated, `.orbit/task/<id>/plan.md`, `.orbit/learnings/` for the method that worked;
- `docs/SKILL-STANDARD.md` — required sections, word budget, quality bar;
- `ARTIFACTS.md` — which `.orbit/` or docs path the skill reads and writes;
- `CATALOG.md` and `CATALOG.ru.md` — phase, step number and neighbours;
- the pack: `ls plugins/orbit/skills/` and a search for the trigger phrases before inventing anything.

If an input is missing, stop and get it — a skill without a stable artifact contract becomes an orphan step.

## Procedure

1. **Define the task and triggers.** What the skill does, when it fires (RU and EN phrases), what goes in, what comes out. Check for a duplicate first:

   ```bash
   ls plugins/orbit/skills/
   rg -n "<trigger phrase>" plugins/orbit/skills/*/SKILL.md
   ```

   A similar skill exists → improve it; do not duplicate a capability.
2. **Place it in the Orbit pipeline.** Phase and micro-phase, which skill comes before and after, which `.orbit/` artifact it reads and writes (`ARTIFACTS.md` at the pack root). A skill that writes nowhere is a chat prompt.
3. **Create the folder structure** next to the other skills:

   ```text
   plugins/orbit/skills/<verb-name>/
     SKILL.md            # frontmatter name + description, then the method (English)
     tools/              # scripts, theme, assets — only if the method needs them
   ```

   `name` must equal the folder name and stay kebab-case; keep `[Orbit X.Y.Z Phase]` in `description`.
4. **Write the description.** What it does + when to use + 2–4 trigger phrases in the users' languages (RU and EN); ≤1024 characters; keep the phase prefix. This field decides whether the skill ever fires.
5. **Write the body** per `docs/SKILL-STANDARD.md`: When to use / Inputs / Procedure (6–12 steps with real commands) / Output (artifact path + template) / Check (commands + pass rule) / Pitfalls (≥4) / Portability / What's improved / Based on. Each step names the file or command and what to check.
6. **Validate the structure.** `python3 tools/scripts/quick_validate.py plugins/orbit/skills/<verb-name>` must print "Skill is valid!".
7. **Test the triggers on real requests.** 3–5 prompts the skill should fire on and 2–3 it should not. Tune the description with `tools/scripts/run_eval.py` and `tools/scripts/run_loop.py`; inspect the report via `tools/scripts/generate_report.py` or `tools/eval-viewer/generate_review.py`. Eval definitions: `tools/references/schemas.md` (`evals/evals.json`).
8. **Package if the skill will be distributed.** `python3 tools/scripts/package_skill.py plugins/orbit/skills/<verb-name> [dist]` produces a `.skill` archive; exclude `evals/` and caches.
9. **Wire it into the pack.** Add the row to `CATALOG.md` and `CATALOG.ru.md`; if the skill changes a route, update the router `plugins/orbit/skills/orbit/SKILL.md`. Then run `python3 scripts/validate_pack.py` — it checks 89 skills, names, frontmatter, relative links and junk files.
10. **Ship it with evidence and credit.** Run `python3 scripts/check_skills.py --skill <verb-name>` (must be OK, score ≥ 8.0). Keep the "Based on" section with the source and licence when the method is borrowed; vendor borrowed files under `tools/` with `tools/LICENSE.upstream`.

## Output

A new or improved skill at `plugins/orbit/skills/<verb-name>/SKILL.md` — self-contained, 800–1300 words, with a tested description and a catalog row:

```text
plugins/orbit/skills/changelog-entry/
  SKILL.md          # frontmatter + method
  tools/            # optional: scripts/assets the method cites
```

Record the reason for the skill (the repeated task) and the trigger test results in `.orbit/learnings/`, and mention the new skill in the next `write-update`.

## Check

```bash
python3 tools/scripts/quick_validate.py plugins/orbit/skills/<verb-name>       # Skill is valid!
python3 scripts/check_skills.py --skill <verb-name>                            # OK, score ≥ 8.0
python3 scripts/validate_pack.py                                               # exit 0
rg -c "\[Orbit [0-9]+\.[0-9]+\.[0-9]+ [A-Za-z &]+\]" plugins/orbit/skills/<verb-name>/SKILL.md
```

Pass rule: name matches folder; description has what + when + RU/EN triggers and is ≤1024 characters; body has every section in order, ≥2 code blocks, ≥4 pitfalls, ≥4 commands, ≥2 artifact paths; `quick_validate`, `check_skills` and `validate_pack` exit 0; triggers fire on intended requests and stay quiet on unrelated ones.

## Example

A recurring request — "every merged change needs a changelog entry" — becomes a skill:

```bash
mkdir -p plugins/orbit/skills/changelog-entry
cat > plugins/orbit/skills/changelog-entry/SKILL.md <<'EOF'
---
name: changelog-entry
description: '[Orbit 3.3.5 Docs & writing] Add the changelog entry for a merged change: changelog line, category, link. Use when: «добавь в changelog», «запись в changelog»; changelog entry.'
---
# changelog-entry — …
EOF
python3 plugins/orbit/skills/create-skill/tools/scripts/quick_validate.py plugins/orbit/skills/changelog-entry
# Skill is valid!
python3 scripts/check_skills.py --skill changelog-entry          # OK, score ≥ 8.0
python3 scripts/validate_pack.py                                 # after the CATALOG rows are added
```

Then test it: "добавь запись в changelog для PR #42" and "add a changelog line for the new flag" must fire; "rename this variable" must not. Fix the description until both hold, and record the result.

## Pitfalls

- **Duplicating an existing skill.** Two skills with overlapping triggers fight, and the worse one sometimes wins. Search the pack before creating.
- **No artifact contract.** A skill whose output is "the conversation" cannot be piped into the next step; give it a real `.orbit/` or docs path.
- **A description without triggers, or over 1024 characters.** The body is perfect and the skill never loads; the description is the trigger, not a summary.
- **Skipping `quick_validate` and `check_skills`.** Frontmatter typos and missing sections are cheap to catch and expensive to discover in use.
- **Adding the skill to one catalog only.** `CATALOG.md` and `CATALOG.ru.md` drift; the pack then documents a skill that does not exist or misses one that does.
- **Borrowed tools without a licence.** Vendored files need `tools/LICENSE.upstream` and a "Based on" line; otherwise the pack cannot be shared.
- **A method with invented commands.** Concrete commands are the point; if one cannot be executed, mark it as a placeholder.
- **Description above 1024 characters.** The trigger text gets truncated or rejected; count it.

## Portability

Skills are plain Markdown and work in Claude Code, Codex, Qwen Code, GLM/Z.ai, DeepSeek, Cursor and any agent that reads a skill folder. Validation scripts are Python 3; `quick_validate.py` needs PyYAML, the rest is standard library. Without a skills directory, read `SKILL.md` into context and follow it literally. No slash commands or subagents required.

## What's improved vs the source

- The skill is wired into the pipeline at once: phase, neighbors, `.orbit/` artifacts.
- A mandatory "based on" section with source and licence when the method is borrowed.
- Skill text in English to save tokens; triggers in the users' languages.
- Three gates — structure, trigger eval, pack validation — instead of "looks good to me".

## Based on

- [Skills by Anthropic](https://github.com/anthropics/skills) — method «skill-creator» (Apache-2.0). Rewritten in our own words and improved — see "What's improved".
- Helper files in `tools/` are taken from the source unchanged; licences: `tools/LICENSE.upstream`.

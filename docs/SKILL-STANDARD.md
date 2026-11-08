# Skill depth standard (v3.0.0)

Every skill must be a **self-contained, executable method**, not a checklist. A model
that reads only this `SKILL.md` must be able to do the job in a real repository,
know what to write where, and prove the result.

Target: **800–1300 words** (hard minimum 700), **6–12 procedure steps**, **≥2 code
blocks**, **≥4 pitfalls**, **≥3 concrete commands/paths**. No filler.

## Required structure

Keep the existing frontmatter (`name`, `description`) and the last two sections.
Add/replace the body with these sections **in this order** (heading names are checked
by `scripts/check_skills.py`):

1. `# <name> — <one line>`
2. Header block: Orbit phase/step, Input, Output, Works with, one-line shared rules
   (keep it short: "Reply in the user's language; artifacts to `.orbit/`; see ARTIFACTS.md").
3. `## When to use` — 3–5 concrete triggers (and, where useful, "when not to use").
4. `## Inputs` — what to read before starting: previous artifacts (`.orbit/...`),
   repo files, commands to inspect. Say what to do if an input is missing.
5. `## Procedure` — numbered, 6–12 steps. Each step: what to do → exact command or
   file to touch → what to check. Name tools generically (git, grep/rg, pytest,
   kubectl, docker, helm, npm, gh/glab) — never invent an API.
6. `## Output` — exact artifact path(s), the template/fields, and a small example
   (5–15 lines). Outputs must match `ARTIFACTS.md`.
7. `## Check` — how to prove it is done: commands, expected output, pass/fail rule.
   Reference `prove-done` when evidence should go to `evidence.md`.
8. `## Pitfalls` — ≥4 specific failure modes and how to avoid them. Concrete, not
   "be careful".
9. `## Portability` — how to run this without Claude Code: no subagents, no slash
   commands, other CLIs; what degrades gracefully. One short paragraph.
10. `## What's improved vs the source` — keep/extend the existing list.
11. `## Based on` — keep the existing source + licence line (public repo, licence).

For flagship skills (`orbit`, `run-spec-loop`, `map-knowledge`, `reverse-app`,
`ship-k8s`, `prove-done`, `project-map`, `test-first`, `review-security`, `create-skill`)
add a short `## Example` section with a realistic 10–20 line walk-through.

## Hard rules

- **Keep every existing fact and step** — improve wording, merge duplicates, but do
  not delete a capability. The skill's name and folder stay unchanged.
- **Do not invent** tools, flags, URLs, APIs or product names. If a command is
  illustrative, mark the placeholder (`<id>`, `<repo>`, `your-org/app`).
- **Artifacts**: only paths from `ARTIFACTS.md` (`.orbit/task/...`, `.orbit/knowledge/...`,
  `.orbit/reverse/...`, `.orbit/learnings/...`, `openspec/`, `docs/project-map/`).
- **Language**: English body. Keep Russian trigger phrases in `description`.
- **Description**: keep `[Orbit X.Y.Z Phase]` prefix, extend with 2–4 trigger phrases
  (RU + EN), hard max 1024 chars; it must still start with what the skill does.
- **No filler**: no "it is important", no repeating the header, no generic advice that
  a base model already knows. Every paragraph must add a check, a command, a decision
  rule or a failure mode.
- **Consistency**: same heading names, same artifact contract, same "Check" style.

## How to self-check

```bash
python3 scripts/check_skills.py --skill <name>   # exits non-zero if below the bar
python3 scripts/check_skills.py                  # whole pack summary
```

The checker scores: sections (4), depth (3), concreteness (2), description (1) → 0–10.
Before a PR is merged, every changed skill must pass `scripts/check_skills.py`.

`orbit` is the one exception to the 1300-word ceiling: as the router it keeps all 8 ready
routes and the full 89-step pipeline table (~3.5k words), verified row-by-row.

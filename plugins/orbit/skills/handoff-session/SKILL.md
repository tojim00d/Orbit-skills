---
name: handoff-session
description: '[Orbit 3.4.2 Memory & hand-over] Hand-over to the next session: goal, state, what was tried, next steps, which skills to use. Use when: «передай дела», «продолжим завтра», «handoff», «сохрани состояние», «передай смену»; handoff.'
---

# handoff-session — hand work over to the next session

> **Orbit · ③ Operate · step 3.4.2 Memory & hand-over**
> **Input:** a long session — from `keep-learnings`
> **Output:** `.orbit/task/<id>/handoff.md` → next `run-retro`
> **Works with:** `recall-history`, `finish-branch`, `keep-learnings`
> **Shared rules:** reply in the user's language; generated artifacts default to English; no secrets; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

A long session is tired, the context is full, the agent loops, the person leaves until tomorrow — time for a hand-over that lets a fresh session continue without losses.

## When to use

- The session is long and answers got worse or repetitive.
- The same failing fix is tried again — the model has lost track of what it already tried.
- Work continues later or by another person/agent.
- A branch is paused mid-change and the context of "why" would otherwise disappear.
- Before `run-retro` or `finish-branch`, so the next session starts from facts instead of chat memory.

Do **not** write a hand-over for a finished task with nothing open; the artifacts and the MR already carry the state.

## Inputs

- `.orbit/task/<id>/brief.md` — goal and done-criteria;
- `.orbit/task/<id>/plan.md` and `evidence.md` — what is done and proven;
- the branch and its last commit (`git status`, `git log -5 --oneline`);
- `.orbit/task/<id>/risks.md`, `review.md`, `openspec/changes/<id>/` if present;
- `.orbit/learnings/` — durable lessons that the next session must not re-learn;
- the conversation itself, for what was tried and rejected.

If the task id is missing, use the branch name as `<id>` and say so. If `plan.md` does not exist, write the state in the hand-over and link it from the next session's first action.

## Procedure

1. **Stop work and check the tree.** Commit or stash intentional edits; do not hand over a dirty tree without saying exactly what is uncommitted.
   ```bash
   git status --short && git log -5 --oneline
   ```
2. **Record the header:** date, branch, last commit, task id. A hand-over without a commit hash is untraceable after the next rebase.
3. **Restate goal and done-criteria** in one line each, copied or linked from `brief.md` — never retold from memory.
4. **Write "where we are":** done (with links to `plan.md` checkboxes and `evidence.md` results), in progress (which file, which test), blocked (on what).
5. **List changed files** with one phrase each: what and why. A hash diff tells the next session *what*; this line tells it *why*.
6. **Write "tried and failed"** — the most valuable section. Each attempt: what was tried, the exact symptom, the conclusion (why it failed). This is what stops the next session from repeating the loop.
7. **Capture decisions and reasons** made in this session that are not yet in an ADR or spec; link the spec if it was updated.
8. **Write next steps** — concrete, in order, with the command or file for each. "Continue debugging" is not a step; "run `pytest tests/export -k csv`, then check `services/export/csv.py:88`" is.
9. **List open questions and blockers** with an owner and what unblocks each. Do not leave a question in prose without a name.
10. **Point to the next skills** — e.g. `run-plan`, `find-root-cause`, `write-spec`, `prove-done` — so the fresh session enters the pipeline at the right place.
11. **Scrub and verify.** Remove secrets, tokens and personal data; confirm every link in the file resolves; then check the template fields are all present.

## Output

`.orbit/task/<id>/handoff.md`:

```markdown
# Hand-over: <id> — <task>   (date, branch, last commit)
## Goal and done-criteria     — from brief.md, one line
## Where we are               — done (links to plan.md, evidence.md), in progress
## Changed files              — list with one phrase "what and why"
## Tried and failed           — and why (the most valuable part!)
## Decisions and reasons
## Next steps                 — concrete, in order, with commands
## Open questions and blockers
## Skills to use next         — e.g. run-plan, find-root-cause
```

Example of two filled sections:

```markdown
## Tried and failed
- Retried the export with a bigger timeout in the app — no effect; ingress cuts at 60 s (see keep-learnings).
- Moved the CSV write into a background job — broke the response contract; reverted in `1f3c2a9`.
## Next steps
1. `pytest tests/export -k csv -q` — currently fails on the empty-result case.
2. Add the empty-result branch in `services/export/csv.py:88`.
3. `prove-done`, then `open-mr`.
```

## Check

```bash
test -f .orbit/task/<id>/handoff.md && echo "artifact ok"
grep -c '^## ' .orbit/task/<id>/handoff.md                  # all template sections
grep -n 'Tried and failed' -A3 .orbit/task/<id>/handoff.md  # non-empty
grep -rn 'git log -1 --format=%h' .orbit/task/<id>/handoff.md
grep -rniE 'password|token|secret|bearer' .orbit/task/<id>/handoff.md || echo "clean"
```

Pass rule: every template section exists and is non-empty; the header names the branch and commit; "tried and failed" has at least one concrete attempt when attempts were made; next steps name commands and files; open questions have owners; no secrets or personal data; the file links `plan.md`, `evidence.md` and the spec rather than restating them. Write the file path into the task's `brief.md` so the next session finds it from the entry point.

## Pitfalls

- **Retelling the artifacts.** A hand-over that repeats `plan.md` goes stale in a day. Link it and say only what it cannot say: why, what failed, and what is next.
- **No commit hash or branch.** Without the exact point, the next session cannot reproduce the state and may continue on the wrong base.
- **An empty "tried and failed".** The next session re-tries the same fix; this section is the whole point of the hand-over.
- **Vague next steps.** "Keep going" is not actionable; a line with a command and a file is.
- **Secrets in the state.** Logs and env values leak into hand-overs easily; scrub before writing, never store tokens.
- **Handing over a dirty tree.** Uncommitted edits with no explanation are the most common way work is lost; commit, stash, or list the files explicitly.

## Portability

A single Markdown file plus `git` and `grep` — any agent and model can produce and read it. Without subagents, write it inline at the end of the session; the next session starts by reading this file and the brief, exactly as a new teammate would. No Claude Code features are required.

## What's improved vs the source

- The hand-over links shared task artifacts instead of retelling them — short and never out of sync.
- A "skills to use next" section ties the hand-over into the pipeline.
- No background memory service required.
- "Tried and failed" and "next steps" are mandatory and checked for concreteness, which is where hand-overs usually fail.
- The header pins branch + commit, so the state is reproducible after rebases.

## Based on

- [claude-mem](https://github.com/thedotmack/claude-mem) — method «handoff» (Apache-2.0). Rewritten in our own words and improved — see "What's improved".
- [Matt Pocock Skills](https://github.com/mattpocock/skills) — method «handoff» (MIT). Rewritten in our own words and improved — see "What's improved".

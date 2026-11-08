---
name: run-retro
description: "[Orbit 3.4.3 Memory & hand-over] Retro from artifacts: worked / hindered / try → rules, learnings, skill edits. Use when: «ретро», «что улучшить в процессе», «разбор задачи»; retrospective, retro."
---

# run-retro — retrospective of a task or session

> **Orbit · ③ Operate · step 3.4.3 Memory & hand-over**
> **Input:** finished work ← `handoff-session`
> **Output:** `.orbit/learnings/retro-<id>.md` + process edits → next `track-debt`
> **Works with:** `instruct-agents`, `keep-learnings`
> **Shared rules:** reply in the user's language per `speak-plain`; generated content (maps, diagrams, comments, docs, artifacts) defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md` at the pack root).

After a task: what worked, what didn't, what to change in the process. Goal: the next task goes easier. A retro that produces feelings instead of changes is a meeting, not a step — every conclusion here must become a rule, a learning or a skill edit.

## When to use

- A task or a multi-session piece of work is closed (`handoff-session` wrote the state, or the branch is finished).
- The same friction appeared more than once: reviews take three rounds, CI fails late, tests are written after the fix.
- A bug was found late, in production or in review, and you want the process to catch the class earlier.
- Before `track-debt` priorities are refreshed, so the debt list reflects what actually hurt.
- The person asks "what should we change next time?".

Do **not** run it as a blame session, and do not run it on a task with no artifacts — read the facts first; without them the retro is memory disguised as analysis.

## Inputs

Read the artifacts, not the chat memory:

- `.orbit/task/<id>/plan.md` — planned vs done tasks, status changes;
- `.orbit/task/<id>/evidence.md` — how many check runs, what failed, what was re-run;
- `.orbit/task/<id>/review.md` — review rounds, findings by severity, pushed-back comments;
- `.orbit/task/<id>/handoff.md` — what was open at hand-over;
- `git log --oneline <base>..HEAD` — the actual commit rhythm: fixups, reverts, late additions;
- earlier retros in `.orbit/learnings/` so a repeated lesson is visible and escalates.

If an artifact is missing, list it as a data gap in the retro instead of guessing a reason.

## Procedure

1. **Collect the facts first, in numbers where possible.** Count tasks, review rounds, check runs, failing CI jobs and commits:
   ```bash
   git log --oneline <base>..HEAD | wc -l
   git log --oneline <base>..HEAD | grep -ciE "fixup|revert|wip|fix review"
   rg -c "^## " .orbit/task/<id>/evidence.md .orbit/task/<id>/review.md
   ```
2. **Reconstruct the timeline of friction.** Where did the work stall — an unclear brief, a slow test suite, a flaky pipeline, a review round that repeated a comment? Name the moment, not the feeling.
3. **Write the "worked" list.** Which step, artifact or rule saved time? Keep those; a retro that only lists problems loses the wins that should become habits.
4. **Write the "hindered" list with a cause and a pointer.** "Tests on mocks broke on refactoring" is a cause with an example commit; "communication was bad" is not actionable and is not allowed.
5. **Write the "try" list as concrete process changes.** Each item: the change, where it lives (which file/skill/rule), and who applies it. "Add a contract test before the refactor" beats "test more".
6. **Apply the changes immediately, by type:**
   - a rule for agents → the repo's `AGENTS.md` / `CLAUDE.md` via `instruct-agents`;
   - code and system knowledge → `.orbit/learnings/` via `keep-learnings`;
   - a skill that caused friction → a fix through `create-skill` (or a note to the pack owner).
   A "try" with no home is a wish; if it cannot be applied now, it becomes a debt item with an owner.
7. **Verify each applied change is real.** `git diff` the rule file, `ls` the learning file, or the skill edit's path. A retro artifact that claims an action nobody took is worse than no retro.
8. **Write the retro artifact** (template in Output) and send the person a 3–5 line note: the biggest win, the biggest cost, and the one change that will happen next.

## Output

`.orbit/learnings/retro-<task-id>.md` — valid artifact path, readable by the next session:

```markdown
# Retro — ABC-123 CSV export (2026-11-08)

**Worked:** the reproduction test from `find-root-cause` caught the timezone bug before review;
`check-parity` matrix made the "missing export column" a number, not an argument.
**Hindered:** the export test needed a live DB, so the suite took 90 s and CI went red twice
on a flake (`tests/export/test_export.py:31`). Review round 2 repeated a comment from round 1
because `handle-review` was not run between rounds.
**Try:**
1. Replace the live DB fixture with a transaction rollback fixture — `tests/conftest.py` — owner: me, this week.
2. Add a rule to `AGENTS.md`: run `handle-review` before requesting a re-review.
3. Move the flaky wait to an explicit poll — `find-root-cause` pitfall, already fixed in the branch.
**Actions:** #2 applied in `AGENTS.md`; #1 → debt item in `docs/tech-debt.md`; #3 done.
```

The 3–5 line note to the person is derived from this file — do not send a second, different version.

## Check

```bash
test -s .orbit/learnings/retro-<task-id>.md
rg -n "Worked:|Hindered:|Try:|Actions:" .orbit/learnings/retro-<task-id>.md
git diff --stat AGENTS.md            # if a rule changed, the diff proves it
ls .orbit/learnings/                 # the learning is recorded where later steps read it
```

Pass rule: the retro cites at least two artifact facts with pointers; every "try" has a home (file, skill or debt item) and a status (`applied` / `debt` / `done`); at least one change is actually applied or recorded as debt; the person got the short note. Otherwise the retro is a draft, not an output.

## Pitfalls

- **Retro from memory.** Opinions diverge from what happened. Read `plan.md`, `evidence.md`, `review.md` and `git log` first; cite them.
- **"Communicate better."** Not a change — nobody can apply it. If communication was the issue, name the artifact that would have carried the information.
- **Only negatives.** A retro that ignores what worked deletes the practices worth keeping. Keep the "worked" list even when the task hurt.
- **Ten improvements.** A list of ten gets zero done. Pick the two or three with the best cost/benefit and apply them now.
- **Blaming a person.** The system let the mistake through; fix the system (a check, a rule, a test) and keep the retro blameless.
- **Action with no owner or date.** "We should test earlier" belongs to nobody. Every action names who and when, or becomes debt.
- **Skipping a retro after a smooth task.** Smooth tasks are where good rules are visible; capturing one rule is cheaper than learning it after an incident.
- **Retro not linked to `keep-learnings`.** Knowledge in a retro file nobody reads is lost; fold the durable lessons into `learnings/` and the rules file.

## Portability

Works in any agent: it reads Markdown artifacts and git history and writes one Markdown file. Without subagents, run it inline with the artifacts open; without `AGENTS.md`, write the rule into the repo's `CONTRIBUTING.md` or the team wiki and note the location. `rg`/`grep` and `git log` are the only tools; no slash commands are involved.

## What's improved vs the source

- The retro is based on the task's shared artifacts, not memory.
- Every conclusion becomes a concrete change: a rule, a learning, or a skill edit.
- Each "try" has a home and a status; unpaid items become debt instead of evaporating.
- Numbers (rounds, commits, re-runs) make "friction" measurable across retros.

## Based on

- [Matt Pocock Skills](https://github.com/mattpocock/skills) — method «retro» (MIT). Rewritten in our own words and improved — see "What's improved".

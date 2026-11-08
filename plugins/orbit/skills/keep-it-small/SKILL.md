---
name: keep-it-small
description: '[Orbit 0.2.3 Conventions] The smallest complete change: reuse, no speculative complexity, three strictness levels. Use when: «минимальное изменение», «без лишнего», «упрости», «не раздувай диff», «сделай по-минимуму»; minimal change, YAGNI, smallest diff.'
---

# keep-it-small — the smallest complete change

> **Orbit · Always on · step 0.2.3 Conventions**
> **Input:** any edit ← `think-first`
> **Output:** a small complete diff → next `cut-complexity`
> **Works with:** `think-first`, `slice-tickets`, `cut-complexity`
> **Shared rules:** reply in the user's language per `speak-plain`; generated content defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

Complexity is the main debt of code. Keep every change minimal and complete: it solves
the whole task and nothing beyond it. "Minimal" never means "unfinished" — error
handling and tests are part of the task, not extras. It turns "write small" into a check on your own diff.

## When to use

- About to implement a feature, fix or refactor and the diff is not yet written.
- The diff already grew past a screen, or the file count keeps rising.
- Someone asks «можно проще?», «зачем это здесь?», «почему так много?».
- Choosing between a new abstraction and three lines of plain code.
- A hotfix or production change, where only the required lines may move.

Skip the full procedure for a one-line change whose scope is obvious; apply the
"smallest complete" rule and the self-review step only.

## Inputs

- The agreed task boundary: `.orbit/task/<id>/brief.md` — **Scope** and **Not doing**.
- The plan, if one exists: `.orbit/task/<id>/plan.md` — task, files, check command.
- How the repository already solves this class of problem: `rg -n '<similar name>' src/`, `rg -n '<pattern>' --type ts`, `git log --oneline -S '<symbol>'`.
- The repository's test commands: `package.json` scripts, `Makefile`, `pyproject.toml`, `go.mod`.
- The previous diff base: `git merge-base HEAD origin/main` (or the branch the task started from).

If the brief or plan is missing, state the inferred scope in one line before editing and
confirm it with the person — do not widen the task silently.

## Procedure

1. **Restate the smallest complete outcome** in one sentence: which behaviour changes,
   which files may move, which command will prove it. If the sentence contains "and
   also", that is a second task — split it.
2. **Search for existing code before writing any.** Look for a similar function,
   pattern, utility or endpoint: `rg -n '<domain word>' src/ | head -40`. Reuse beats
   new code; a helper that already exists is always smaller than one you add.
3. **Check whether code is needed at all.** A config value, an existing flag, a standard
   library call or deleting dead code often beats a new module. Prefer deletion to addition.
4. **Estimate the size before typing.** After the first edit run
   `git diff --stat` and `git diff --numstat`. Heading over ~200 lines of logic (not
   generated files, not tests) is the split signal: stop and split the work with
   `slice-tickets`.
5. **Write the complete minimal change.** Handle the real edges — empty input, zero,
   the last item, concurrent access, error path — and add a test for new logic. A
   "minimal" change that drops an edge is not complete and will come back as a bug.
6. **Avoid speculative structure.** No new abstraction without a second consumer, no
   "future" settings, no rewriting working code on the way, no helper until something
   repeats three times. Signs it grew too big: an interface with one implementation, a
   parameter always passed the same value, a wrapper that only calls another function, a
   comment explaining what the code does. In your diff → remove; in existing code →
   report to `cut-complexity`.
7. **Keep it readable.** Domain names, short functions, flat branching. A comment that
   explains *what* the code does is a signal to rename or simplify instead.
8. **Self-review the full diff.** Read `git diff` top to bottom and mark every changed
   hunk: needed by the task, or accidental. Remove accidental edits; list nearby
   problems as "noticed, not touched" — fixing them belongs to `cut-complexity`.
9. **Record the mode and the evidence.** Set the task status in `.orbit/task/<id>/plan.md`
   (`[~]` in progress, `[x]` done with proof) and put the proving command's output in
   `.orbit/task/<id>/evidence.md`.

### Strictness levels

| Level | When | Allowed |
|---|---|---|
| `lite` (default) | normal work | small cleanups in lines you already change |
| `strict` | hotfix, prod, someone else's module | only what the task needs; no drive-by cleanup |
| `refactor` | the task is simplification | delete and merge; behavior unchanged; tests green before and after |

## Output

A small complete diff plus a change note. The note goes where the task lives — append
it to `.orbit/task/<id>/plan.md` so the next session sees why the diff is shaped this
way:

```markdown
**Change note: <task>**
Mode: lite | strict | refactor
Outcome: <one sentence — behaviour that changes>
Size: <N files, +X/−Y>; threshold: 200 lines of logic
Reused: <existing function/flag/config> at <file:line>
Edges handled: <list>
Proof: `<command>` → <result> (evidence.md)
Noticed, not touched: <file:line — problem> (goes to cut-complexity)
```

Example of a filled note:

```markdown
**Change note: EXP-42**
Mode: lite
Outcome: GET /reports/orders.csv streams the same rows as the HTML table.
Size: 2 files, +64/−3; under the 200-line threshold.
Reused: streaming helper `sendFile` at src/http/files.ts:42.
Edges handled: empty result, UTF-8 BOM, 10 000 rows.
Proof: `python3 -m pytest tests/export -q` → 7 passed (evidence.md).
Noticed, not touched: duplicated auth check in src/reports/router.ts:88.
```

## Check

Run these before reporting the change as done:

```bash
git diff --stat
git diff --numstat | awk '{add+=$1; del+=$2} END {print "added", add, "deleted", del}'
git diff --check
python3 -m pytest -q        # or: npm test / make test / go test ./...
```

Pass rule: the diff solves the whole stated task and nothing else; logic added stays
under ~200 lines (otherwise the task is split); every changed hunk can be justified by
the brief; new logic has a test and the test command exits 0; `git diff --check` is
clean; the change note lists at least the touched edges and the reused code with a
`file:line`. A failure means cut the diff, not explain it.

## Pitfalls

- **"Minimal" without error handling.** Skipping the empty/zero/error path makes the
  diff smaller and the bug guaranteed. Complete is the other half of the rule.
- **Building for the future.** A flag or a generic layer nobody asked for adds review
  surface and will be rewritten later.
- **Reinventing what the repo has.** The fifth CSV writer is larger than the existing
  one you did not search for. Always run the `rg` search first.
- **Drive-by cleanup.** Reformatting a file, renaming unrelated symbols or fixing a
  nearby bug inflates the diff and hides the real change. Report it instead.
- **Ignoring the size signal.** A 600-line "small feature" cannot be reviewed in one
  pass. Split it with `slice-tickets` before review, not after.
- **A refactor that changes behavior.** In `refactor` mode tests must be green before
  and after; if they change, it is a feature, not a refactor.
- **Silent extra files.** A lockfile or `.orbit/` dump in the diff looks like part of the
  change. Stage explicitly and review `git status`.

## Portability

No Claude-only feature: git, ripgrep/grep and the repo's test runner are enough. In any
CLI run the same `git diff --stat`/`--numstat` checks. Without subagents, do the review
inline; `plan.md` and `evidence.md` still go under `.orbit/`. In a non-interactive run where no question can
be asked, write the inferred scope and the size threshold into the change note and mark
them `[assumed]` so a reviewer can veto.

## What's improved vs the source

- "Write small" and "check size" merged: one skill, three strictness levels.
- "Small" balanced by "complete": minimalism never excuses missing error handling or tests.
- A diff-size threshold with an exit to `slice-tickets`.
- A reusable change note with reused code, handled edges and "noticed, not touched".
- The self-review step makes the size rule executable on the actual diff, not a slogan.

## Based on

- [Ponytail](https://github.com/DietrichGebert/ponytail) — method «ponytail» (MIT). Rewritten in our own words and improved — see "What's improved".

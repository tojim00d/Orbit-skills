---
name: run-plan
description: '[Orbit 2.4.2 Implementation] Execute plan.md in one session with checkpoints and statuses. Use when: «выполни план», «делай по плану», «пройди задачи по порядку»; execute plan, work through the plan.'
---

# run-plan — execute a plan in one session

> **Orbit · ② Build · step 2.4.2 Implementation**
> **Input:** a plan ← `test-first`
> **Output:** implemented tasks → next `delegate-tasks`
> **Works with:** `isolate-branch`, `prove-done`
> **Shared rules:** reply in the user's language per `speak-plain`; generated content defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

Execute `.orbit/task/<id>/plan.md` task by task with checkpoints. Fits when the tasks are
related and few — one coherent change, one session, a human available for questions. Many
independent tasks → `delegate-tasks`; the plan is the same, the execution model differs. The
discipline is: statuses and evidence are written as you go, so a session break or a handoff
loses nothing.

## When to use

- A plan with small, related tasks exists and the work fits one session.
- The change is one feature or one module, not ten independent workstreams.
- A person is available to answer contradictions before they become refactors.
- Resuming a plan another session or agent started (`handoff-session`), reading statuses from
  `plan.md` instead of guessing.
- Not when the plan has 5+ independent tasks: `delegate-tasks` keeps context smaller.

## Inputs

- `.orbit/task/<id>/plan.md` — tasks, files, check commands, statuses.
- The spec and brief: `.orbit/task/<id>/brief.md`, `openspec/changes/<id>/` or the spec
  path named in the plan.
- The repo state: `git status`, current branch, and the check command from the plan.
- The design-system or API contract the plan references, if any.
- If `plan.md` is missing tasks or check commands, stop and fix it with `plan-steps` first;
  executing a vague plan produces vague code.

## Procedure

1. **Read the whole plan, spec and brief before starting.** Note every question or
   contradiction in a short list and send it to the person **before** the first edit; a
   contradiction found at task 6 costs more than one asked at task 1.
2. **Isolate if the change is more than a couple of files** — branch or worktree by
   `isolate-branch`. Record the base commit in `plan.md`.
3. **Take the baseline:** run the plan's full check command before changing anything. Green
   → continue. Red before you → report it and record it; do not silently fix unrelated
   failures (that is scope creep and hides the real cause).
4. **Work task by task, in order.** Mark the task `[~]` in `plan.md` when you start it. Do
   the task's steps: test first (`test-first`) → code → the check command written in the
   plan. No task skips its test because "it is small".
5. **Log command and output in `.orbit/task/<id>/evidence.md`** and mark the task `[x]` only
   when the check passed. `[x]` without an evidence entry is a claim, not a status.
6. **Commit per task when commits are allowed** (`commit-clean`), using the repo's message
   format and the task key. Never commit with a failing check; never mix two tasks in one
   commit.
7. **Stop on deviation.** A wrong file, a test that cannot pass, a new dependency: stop,
   describe the mismatch in 2–3 lines, and propose a plan edit. Silent improvisation turns
   a plan into a surprise diff. Record the accepted edit in `plan.md`.
8. **Checkpoint after every 3–5 tasks or at the end of a logical block:** a short report —
   done, next, deviations, questions. Inside a block do not stop without a reason; the
   checkpoints are where the person can redirect cheaply.
9. **Keep the tree clean between tasks:** `git status --short` should show only the current
   task's changes; unrelated files are stashed or restored, not committed.
10. **Finish:** all tasks `[x]` → run the plan's whole-feature check and `prove-done` on the
    plan → `review-code` → `finish-branch`. Hand off the final evidence to
    `handoff-session` if another session continues.

## Output

Updated `plan.md` with statuses, `evidence.md` with proof, and the implemented tasks:

```markdown
# Plan: ABC-123 — CSV export
### [x] 1. Failing test for empty export (~10 min)
### [x] 2. CSV writer (~15 min)
### [x] 3. Wire the endpoint (~10 min)
### [~] 4. 10 000-row performance test
```

Evidence entries, one per task:

```markdown
## 2026-11-08 20:55 — task 3: wire the endpoint
$ pytest tests/export -q → 4 passed
$ curl -s -o /tmp/out.csv -H "Authorization: Bearer $TOKEN" "$API/reports/orders.csv" → 200, 12 rows
Conclusion: endpoint returns UTF-8 CSV; task 3 done.
```

Next: `delegate-tasks` if the remaining plan is large, otherwise `prove-done` →
`review-code` → `finish-branch`.

## Check

```bash
grep -c "^### \[x\]" .orbit/task/<id>/plan.md          # every done task ticked
grep -n "^### \[ \]" .orbit/task/<id>/plan.md          # what remains open
git status --short                                      # tree clean or current task only
git diff --stat                                         # diff matches the plan's files
pytest -q                                               # or npm test — full check green
rg -n "^## .* — task" .orbit/task/<id>/evidence.md     # evidence per task
```

Pass rule: every `[x]` task has a matching evidence entry with the command and output; the
full check suite is green; the diff touches only files the plan named; deviations are
written in `plan.md`; the tree is clean at the checkpoints. `prove-done` on the whole plan
is the final gate, not the per-task checks alone.

## Pitfalls

- **Reading only the current task.** Contradictions between task 3 and task 7 appear at the
  worst time; read the whole plan before the first edit.
- **No baseline.** A pre-existing red test gets blamed on the change; run the check first and
  record the result.
- **Marking `[x]` without evidence.** The plan becomes a story; anyone resuming cannot tell
  what was actually proven. Evidence first, tick second.
- **Silent deviation.** A "small" improvisation compounds and the reviewer sees a diff the
  plan never described; stop and edit the plan.
- **Committing broken tasks to keep moving.** One failing commit poisons the branch and
  `finish-branch`; the check must pass before the commit.
- **Context switches without checkpoints.** The person loses visibility and redirects late;
  a 3–5 task checkpoint is cheap.
- **Mixing tasks in one commit.** Review and revert become impossible; one task, one commit.
- **Stopping mid-block without reason.** The plan's rhythm breaks; finish the block or say
  why you stopped.

## Portability

Any agent with shell and file tools can execute a plan this way; there is no subagent or
slash-command dependency. Statuses and evidence live in `.orbit/task/<id>/`, so the work is
resumable in a new session or by a colleague (`handoff-session`). If commits are not allowed,
skip the commit step and keep the evidence — the plan status is the artifact, git is a
convenience.

## What's improved vs the source

- Statuses and evidence go into the shared `plan.md` and `evidence.md` — resumable in another
  session or by someone else (`handoff-session`).
- Explicit rule "deviation from plan = stop and edit the plan", not silent improvisation.
- A baseline gate and a clean-tree rule per task, so review sees only the planned diff.
- Checkpoints are defined by count and block boundary, not by mood.

## Based on

- [Superpowers](https://github.com/obra/superpowers) — method «executing-plans» (MIT). Rewritten in our own words and improved — see "What's improved".

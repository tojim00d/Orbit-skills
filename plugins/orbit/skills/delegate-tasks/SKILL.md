---
name: delegate-tasks
description: '[Orbit 2.4.3 Implementation] Each plan task to a fresh agent, with review between tasks and escalation. Use when: «раздай задачи агентам», «субагенты», «делегируй задачи», «параллельные исполнители»; subagents per task, delegate work.'
---

# delegate-tasks — each plan task to a fresh agent, with review between tasks

> **Orbit · ② Build · step 2.4.3 Implementation**
> **Input:** a plan of independent tasks ← `run-plan`
> **Output:** implementation + reviews → next `run-parallel`
> **Works with:** `request-review`, `plan-steps`
> **Shared rules:** reply in the user's language per `speak-plain`; generated content defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

For long plans the main agent coordinates and does not implement. Each task is done by a
**new** subagent with a clean context and a precise brief, then reviewed by a separate agent.
The main session's context stays small and the quality of the last task matches the first —
the failure mode this prevents is a context that slowly fills with trial and error.

## When to use

- The plan has 5+ tasks and they are mostly independent.
- The main session's context must be preserved for coordination and review.
- Tasks are mechanical enough to brief precisely but numerous enough to exhaust one context.
- Not for small related tasks: `run-plan` in one session is simpler and cheaper — every
  delegation pays a setup cost in brief writing and review.

## Inputs

- `.orbit/task/<id>/plan.md` — tasks with `[ ]` status, files, spec scenario and check
  command. A plan without check commands is not ready for delegation; fix it with
  `plan-steps` first.
- `.orbit/task/<id>/brief.md` — scope, done-criteria, "Not doing", constraints.
- The base commit of the branch: `git rev-parse HEAD` before the first dispatch; write it
  into `plan.md`. Without a recorded base, the reviewer cannot see the right diff.
- The repo's conventions and test commands (`CONTRIBUTING.md`, `Makefile`, `package.json`)
  to put into every brief.
- If a task lacks a spec scenario or a check command, do not dispatch it; ask the person or
  go back to `plan-steps`.

## Procedure

1. **Confirm the plan is delegable.** Each task: one area, clear acceptance criterion, its
   own check command, no dependency on a later task's output. Split or merge tasks until
   this is true; `run-parallel` later handles the ones that can run concurrently.
2. **Record the base commit before any dispatch:** `git rev-parse HEAD >> .orbit/task/<id>/plan.md`
   (with the date and branch). Reviewers diff from this base, not from `HEAD~1`.
3. **Write a self-contained brief per task** using the template below. It must include the
   goal, the exact files, the spec scenario, the check command, constraints (`keep-it-small`,
   `stay-in-scope`), and what the agent must return. The implementer never sees this
   conversation, so a brief that says "the task we discussed" fails.
4. **Choose a model per task:** mechanical (1–2 files, clear spec) → fast model; integration
   and debugging → standard; architecture and review → the strongest available. Record the
   choice; do not send everything to the cheapest model to save time.
5. **Dispatch one implementer per task.** The implementer works by `test-first` and returns:
   what was done, the check command and its output, files changed, and doubts. A return
   without the check output is not a completion.
6. **Review each task with a separate agent.** The reviewer checks spec compliance and code
   quality on `git diff <base>..HEAD` (or the task's commit range), not on `HEAD~1` — a
   multi-commit task would lose commits. Findings go into the review, not into a rewrite.
7. **Loop findings through the same or a new implementer, then re-review.** Track the round
   in `plan.md`. Three rounds without convergence → escalate to the person or a stronger
   model; do not start a fourth silent round.
8. **Update status after each review:** `plan.md` task status, and the check output in
   `.orbit/task/<id>/evidence.md`. The review verdict goes to
   `.orbit/task/<id>/review.md` when it matters for the whole branch.
9. **Coordinator discipline:** do not do a task yourself "because it is faster" (it defeats
   the clean context), and do not stop between tasks without a reason. Stop only on spec
   contradictions, repeated review failures, or a scope exit.
10. **Close the loop:** after the last task, run a whole-branch review (`review-code`) and
    `prove-done` on the branch; only then hand off to `run-parallel` or `finish-branch`.

## Output

Implementation in the repo + the coordination record:

```markdown
# Task brief — T03: CSV export of the orders report
**Goal:** an analyst downloads the report as CSV with UTF-8 headers.
**Base:** 4f2a1c9 (recorded 2026-11-08 19:40 on feat/EXP-42-csv)
**Files:** `services/export/report.ts`, `services/export/report.test.ts`
**Spec scenario:** WHEN the export is requested THEN a file is returned; empty report → header-only file.
**Check:** `pytest tests/export -q` → expected 3 passed
**Constraints:** only `services/export/**`; no schema changes; keep-it-small; stay-in-scope
**Return:** done / files / command + output / doubts
**Model:** standard (integration + formatting)
```

Review record in `.orbit/task/<id>/review.md` per task:

```markdown
## T03 — review round 1
Diff base .. 9c1e07b; spec: CSV headers UTF-8 — pass; empty report — fail (missing header row)
Findings: 1 blocking (empty export), 0 nits. Owner: same implementer → round 2.
```

## Check

```bash
git diff <base>..HEAD --stat                    # review covers the whole task range
grep -c "^### \[\~\]\|^### \[ \]" .orbit/task/<id>/plan.md   # no task silently open
rg -n "round [1-9]|escalat" .orbit/task/<id>/review.md        # review trail exists
pytest -q                                       # or npm test — the branch check is green
git status --short                              # no uncommitted work left by an agent
```

Pass rule: every dispatched task has a brief with a check command; every task has at least
one review against the recorded base; the final diff is green on the repo's check command;
no task is marked done without its output in `evidence.md`; any 3-round failure is escalated
and recorded. The whole-branch review is `review-code`; `prove-done` produces the final
evidence.

## Pitfalls

- **Briefs that reference the conversation.** The subagent has a fresh context; "the endpoint
  we discussed" produces a guess. Spell out goal, files, scenario and check.
- **Reviewing `HEAD~1`.** A task with three commits loses two in the diff; always diff from
  the recorded base commit.
- **Skipping the base commit.** Without it the reviewer cannot tell which changes belong to
  the task, and scope creep hides in the diff.
- **Doing the task yourself.** The coordinator's context fills up and the next brief gets
  worse; delegate, review, coordinate.
- **Silent retry loops.** A task that fails three reviews is a signal, not a fourth round;
  escalate to the person or a stronger model with the review history.
- **Parallel dispatch of dependent tasks.** A task that needs another's output will
  reimplement or conflict; keep it for `run-parallel` only after the independence check.
- **All tasks to the cheapest model.** Mechanical work is fine for it, integration and
  architecture are not; choose per task.
- **No review of the return.** An agent's "done" is a claim, not proof; the check output and
  the diff are what count.

## Portability

Without a subagent tool, run the "implementer" step in a fresh session or a separate
context window seeded with the brief, and keep the same artifacts: briefs in `plan.md`, review
verdicts in `review.md`, evidence in `evidence.md`. Any delegation mechanism works — the
method is the brief + base commit + independent review, not a Claude-specific tool. State
lives in `.orbit/`, so a stalled delegation can be resumed by another agent.

## What's improved vs the source

- No dependency on external scripts: state lives in the shared `plan.md` / `evidence.md`;
  the diff base is recorded explicitly.
- Clear escalation criteria (3 review rounds without convergence).
- Model choice by task type in one rule.
- Briefs and review verdicts are artifacts, so the delegation is auditable after the fact.

## Based on

- [Superpowers](https://github.com/obra/superpowers) — method «subagent-driven-development» (MIT). Rewritten in our own words and improved — see "What's improved".

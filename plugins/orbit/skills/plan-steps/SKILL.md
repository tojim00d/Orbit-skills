---
name: plan-steps
description: '[Orbit 2.1.1 Plan] Implementation plan in small tasks: test, code, check command, status in plan.md. Use when: «составь план», «план реализации», «разбей на шаги», «нужен пошаговый план»; implementation plan, write a plan, step-by-step implementation plan.'
---

# plan-steps — implementation plan in small verifiable steps

> **Orbit · ② Build · step 2.1.1 Plan**
> **Input:** a spec ← `run-spec-loop` (`openspec/changes/<id>/` or `.orbit/task/<id>/spec.md`)
> **Output:** `.orbit/task/<id>/plan.md` → next `slice-tickets`
> **Works with:** `run-plan`, `delegate-tasks`, `test-first`, `prove-done`
> **Shared rules:** reply in the user's language; generated artifacts default to English; stay in scope; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

A spec answers *what*. A plan answers *how, in what order, and how each step is proven*. It is written so that a fresh session, another agent or another person can execute it without guessing: one task = one clear change, the spec scenario it satisfies, an exact check command, a few minutes of work. If a task cannot fail a command, it is not a task yet — it is an intention.

## When to use

- A spec is approved and code work is about to start.
- The change spans more than three files or more than a day, so ordering and checkpoints matter.
- The work will be resumed in a new session, split between people, or delegated (`delegate-tasks`, `run-parallel`).
- A `.orbit/task/<id>/plan.md` already exists but reads like "add validation", "wire the API" — vague verbs with no check.
- The spec covers several independent subsystems — stop and run `slice-tickets` first; then write one plan per slice.

## Inputs

Read before writing a line of the plan:

- the spec: `openspec/changes/<id>/` or `.orbit/task/<id>/spec.md` — scenarios are copied into tasks verbatim;
- design: `design.md`, plus `architecture-design.md` / `data-design.md` for service builds;
- codebase state: `.orbit/knowledge/overview.md`, `.orbit/knowledge/codebase/*.md`, the index from `index-code`;
- the code that will change: `rg -n "<domain word>" src/ | head -40`, then open the hit files;
- build/test commands from `README.md`, `Makefile`, `package.json` / `pyproject.toml`, CI config.

If the spec is missing, run `write-spec` / `run-spec-loop` first — do not plan from chat memory. If a scenario is ambiguous, record it under **Open questions** and ask the person before task 1 starts.

## Procedure

1. **Run the size check.** One plan = one shippable thing. Several independent subsystems in the spec → `slice-tickets` first, then a plan per slice. Write the answer down; do not split silently later.
2. **Collect constraints.** Versions, compatibility with existing clients, migrations that must stay reversible, paths that must not change, who reviews. These become the **Constraints** line.
3. **Map the files.** List every file to create or modify with a one-line reason and the line range where it matters: `src/x/old.ts:40-80`. Files not on this list are out of scope.
4. **Trace spec → task.** For each spec scenario, create the task that makes it pass. Order tasks by dependency: schema → data access → domain logic → API → UI, wiring last.
5. **Write each task in four lines** — Test (file + WHEN/THEN from the spec), Code (what exactly changes), Check (exact command + expected result), Commit (message, if commits are allowed).
6. **Pin the check command.** Copy it from CI or the repo scripts; never write "run the tests". The command must produce a clear pass/fail in under ~2 minutes. If it is slower, narrow the selection (`npm test -- x.test.ts`, `pytest tests/x.py -k name`).
7. **Write the whole-feature check.** One command or scenario that shows the feature working end to end — this is what `prove-done` will re-run later.
8. **Dry-run task 1.** Execute its check before writing code and confirm it fails for the expected reason. A check that is already green proves nothing; a check that cannot run is a missing input.
9. **Eliminate placeholders.** "TODO decide later", "similar to above", "etc." are forbidden. Undecided points go to **Open questions** with an owner; the plan is not executable until they are answered.
10. **Publish and choose the executor.** Save the plan, update statuses as work proceeds (`[ ]` not started, `[~]` in progress, `[x]` done and proven in `evidence.md`), then pick: one session — `run-plan`; many independent tasks — `delegate-tasks` or `run-parallel`; isolation needed — `isolate-branch`.

## Output

`.orbit/task/<id>/plan.md` — the only plan the executors read:

```markdown
# Plan: <id> — <feature>
**Goal:** one sentence.   **Spec:** path.   **Approach:** 2–3 sentences.
**Constraints:** what must not change, compatibility, versions.
**Whole-feature check:** command/scenario.

## Files
- create: `src/x/new.ts` — why
- modify: `src/x/old.ts:40-80` — what changes

## Tasks
### [ ] 1. <name> (~5 min)
- Test: `tests/x.test.ts` — WHEN/THEN scenario from the spec
- Code: what exactly changes
- Check: `npm test -- x.test.ts` → expected: 1 passed
- Commit: `[ABC-123] …` (if commits are allowed)

## Open questions
- <question> — owner, blocks task N.
```

A filled task, as a model:

```markdown
### [ ] 3. Reject an empty email with 400 (~10 min)
- Test: `tests/api/users.test.ts` — WHEN email is "" THEN response is 400 {code:"invalid_email"}
- Code: `src/api/users.ts:52-71` — call `validateEmail()` before `createUser()`
- Check: `npm test -- users.test.ts` → expected: 4 passed
- Commit: `[EXP-42] reject empty email`
```

## Check

The plan is executable when all of these hold — verify with commands, not by reading:

```bash
test -f .orbit/task/<id>/plan.md
grep -c '^### \[ \] [0-9]' .orbit/task/<id>/plan.md        # every task counted
grep -Ln 'Check:' .orbit/task/<id>/plan.md                 # must print nothing
grep -n 'TODO\|decide later\|etc\.' .orbit/task/<id>/plan.md   # must print nothing
grep -n 'Whole-feature check' .orbit/task/<id>/plan.md
```

Pass rule: every task has Test, Code, Check and a traceable spec scenario; every check command is copy-paste runnable and short; dependency order holds (no task needs a later task); no placeholders; every "Open questions" item has an owner. Record the dry-run of task 1 in `.orbit/task/<id>/evidence.md` (command → output → conclusion) so `prove-done` can continue from it.

## Pitfalls

- **Planning from memory instead of the spec.** A plan that invents scenarios produces code nobody asked for. Every task quotes a spec scenario by id.
- **Tasks with uncheckable verbs.** "Refactor the service" cannot pass or fail. Rewrite as observable behaviour plus a command.
- **Hiding decisions in "etc."** A placeholder is an undecided question moved into implementation, where it costs 10×. Decide now or list it as an open question.
- **Wrong order.** Building the API before the schema forces rework. Follow schema → data access → logic → API → UI; if a task cannot be ordered, its inputs are unknown.
- **Giant steps.** A task of ~5–15 minutes keeps the feedback loop short. If a step needs paragraphs to describe, it is two tasks.
- **A plan without a whole-feature check.** Individual green tasks can add up to a broken feature; the end-to-end check is what `prove-done` verifies.
- **Silent scope changes.** Adding a file mid-execution without updating the Files list hides the change from review. Update the plan, then the code.

## Portability

Works with any agent and no Claude-only features: the plan is a Markdown file, statuses are text markers. Without subagents, run the steps inline and use the agent's file tools to edit `.orbit/task/<id>/plan.md`; without `/orbit:*` commands, ask the agent for "an implementation plan" — this skill's description triggers on that. In a tracker-centric team, mirror each task as an issue and keep `plan.md` as the index; the plan id and paths stay the same, so a later session resumes from the file.

## What's improved vs the source

- The plan lives in the shared `.orbit/task/<id>/plan.md` with statuses updated by executors and `prove-done` — resumable in any session.
- Each task carries a spec scenario: direct trace "requirement → test → code".
- Explicit dependency order and a ban on placeholders.
- Added a required whole-feature check, a dry-run of the first task, and machine-checkable plan checks.
- Executor selection is explicit (one session vs delegated vs parallel) with the isolation skill named.

## Based on

- [Superpowers](https://github.com/obra/superpowers) — method «writing-plans» (MIT). Rewritten in our own words and improved — see "What's improved".

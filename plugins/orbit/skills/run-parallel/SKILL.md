---
name: run-parallel
description: '[Orbit 2.4.4 Implementation] Independent tasks with parallel agents after an independence check. Use when: «параллельно», «одновременно несколько», «разгони задачи», «несколько агентов сразу»; parallel agents, run in parallel.'
---

# run-parallel — independent tasks with parallel agents

> **Orbit · ② Build · step 2.4.4 Implementation**
> **Input:** 2+ independent tasks ← `delegate-tasks`
> **Output:** merged result → next `isolate-branch`
> **Works with:** `delegate-tasks`, `prove-done`
> **Shared rules:** reply in the user's language per `speak-plain`; generated content defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

Parallelism is a bet that the tasks cannot affect each other. The bet pays when 2+ tasks
have **no shared files and no shared state**: different failing tests in different modules,
recon of several areas, reviews along different axes. It costs a day when two agents edit
the same file, share a database, or one waits for the other's answer. This skill is the
independence check plus the merge protocol.

## When to use

- Two or more tasks from `plan.md` touch disjoint files and can finish without each other.
- Several independent investigations are needed (one area each) and the answers are small.
- Reviews along different axes: security, performance, correctness — separate reviewers.
- Not when the tasks share a module, a migration, a database/port/cluster, or when one
  result feeds another: run sequentially (or `delegate-tasks` one by one). Unsure → sequential.

## Inputs

- `.orbit/task/<id>/plan.md` — candidate tasks, their files and check commands.
- The current branch and base: `git branch --show-current`, `git rev-parse HEAD`. Each agent
  must know the base, and no agent may commit unless the plan allows it.
- The repo's full check command (`pytest -q`, `npm test`, `make check`) for the merge gate.
- The per-task briefs from `delegate-tasks`; if a brief is missing, write it before
  dispatch — a parallel agent has no context to guess from.
- Missing input: no plan or no check command → do not parallelize; fix the plan first.

## Procedure

1. **Run the three-point independence check, and write the verdict down:**
   - tasks do not change the same files (`git diff --name-only <base>..HEAD` per task area,
     plus the planned file list);
   - one task's result is not needed by another;
   - no shared resource — one database, one port, one cluster, one env file.
   All three pass → parallel. Any doubt → sequential, and say why in `plan.md`.
2. **Reserve write scopes.** For each task name the exact paths it may modify ("only
   `src/billing/**`"); two tasks with overlapping scopes are not independent. Keep the
   scopes in `plan.md` so the merge can check them.
3. **Write one brief per agent** using the format below: one area, exact scope, goal and
   criterion, constraints (what not to touch, no commits, no reformatting), answer format.
4. **Decide how answers return.** Small answers: 5–10 lines with `file:line` references in
   the agent's reply. Large answers: write them to a file under `.orbit/task/<id>/` (for
   example `.orbit/task/<id>/parallel-<area>.md`) and return only the path — this keeps the
   coordinator's context small.
5. **Dispatch all agents at once.** If the agent tool supports parallel calls, issue them in
   one batch; otherwise start them back to back and continue with read-only coordination.
   Do not start a second task while working inside the first one's files.
6. **Read every answer before touching code.** Check that each agent stayed in scope and
   did not touch a sibling's paths; ask for the diff or the file list if it is unclear.
7. **Resolve conflicts yourself or ask the person.** Two answers that disagree on an
   interface are a design decision, not a merge conflict to paper over; record the choice
   in `plan.md`.
8. **Run the full check set after the merge** (`prove-done`): parallel edits can each pass
   alone and break together. Full test run, lint, build — not only the touched tests.
9. **Record the merged result**: per-task status in `plan.md`, the combined command output
   in `.orbit/task/<id>/evidence.md`, and any file written by an agent listed with its path.

## Output

A merged, verified result plus per-agent records:

```markdown
# Parallel run — ABC-123
Base: 8a31f2e · Branch: feature/ABC-123-csv
| Task | Scope            | Agent result                       | Status |
|------|------------------|------------------------------------|--------|
| T1   | src/export/**    | export writes CSV                  | [x]    |
| T2   | src/reports/**   | report query drafted; answer file  | [x]    |
| T3   | docs/api/**      | contract listed, 6 endpoints       | [x]    |
File overlap check: no paths shared between T1/T2/T3.
Merge: interface agreed in plan.md; full suite `pytest -q` → 131 passed.
```

Agent answer file `.orbit/task/<id>/parallel-<area>.md` holds the long version, so the
coordinator imports a path instead of a wall of text. Evidence in
`.orbit/task/<id>/evidence.md` carries the merged check output.

## Check

```bash
git diff --name-only <base>..HEAD                   # no task crossed its write scope
pytest -q                                           # or npm test — full suite after merge
npm run lint                                        # parallel edits often break style checks
rg -n "parallel-.*\.md|scope:" .orbit/task/<id>/plan.md   # scopes recorded
test -s .orbit/task/<id>/evidence.md                # merged output recorded
git status --short                                  # no agent left uncommitted surprises
```

Pass rule: every task's diff stays inside its declared scope; the full check suite passes
after the merge (not only the touched tests); no two tasks touched the same file; each
agent result is either in the reply (small) or in a file under `.orbit/task/<id>/` (large);
the merged state is recorded in `evidence.md`. Any overlap found after the fact means the
independence check was wrong — record the lesson in `plan.md`.

## Pitfalls

- **Parallelizing by hope.** Starting agents before the three-point check is how two edits
  to one file become a lost change; run the check first.
- **Shared state that is not a file.** One database, one port, one cluster, one `.env` —
  agents corrupt each other's runs even with disjoint files.
- **Letting agents commit.** Concurrent commits on one branch create a merge tangle; agents
  leave changes uncommitted (unless the brief says otherwise) and the coordinator commits.
- **Answer walls in the coordinator's context.** Ten long reports defeat the context saving;
  require a file path plus a five-line summary.
- **Skipping the full check after merge.** Each half passes alone, the combination fails;
  the merge gate is the whole suite, lint and build.
- **Cross-task dependency hidden in a brief.** "Use the interface T2 will produce" means the
  tasks are ordered, not parallel; reorder or split.
- **Scope drift.** An agent "helpfully" fixes a neighboring module; the diff now overlaps
  another task. Name the exact paths and check the diff.
- **Too many agents for a small plan.** Coordination overhead exceeds the gain; two or three
  independent tasks is the sweet spot.

## Portability

Any agent platform with a parallel or background delegation mechanism can run this; the
method is the independence check, write scopes and the merge gate, not a specific tool. With
no delegation, run the tasks sequentially and keep the same records — the artifact contract
does not change. Results live in `.orbit/task/<id>/`, so a session restart does not lose the
agent answers.

## What's improved vs the source

- An explicit three-point independence check before parallelizing.
- Large agent results go to files in `.orbit/`, not into the coordinator's context.
- Write scopes are declared before dispatch and verified on the merged diff.
- The merge gate is the full check suite via `prove-done`, not the touched tests only.

## Based on

- [Superpowers](https://github.com/obra/superpowers) — method «dispatching-parallel-agents» (MIT). Rewritten in our own words and improved — see "What's improved".

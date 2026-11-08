---
name: deepen-modules
description: '[Orbit 2.2.6 Architecture & data] Find shallow modules in existing code and propose deepening, protected by tests. Use when: «улучши архитектуру», «рефакторинг структуры», «глубокие модули», «спрячь детали»; improve architecture, deepen modules, reduce coupling.'
---

# deepen-modules — find and deepen shallow modules in existing code

> **Orbit · ② Build · step 2.2.6 Architecture & data**
> **Input:** existing code and its map ← `shape-modules`, `map-knowledge`, `survey-codebase`
> **Output:** `.orbit/task/<id>/deepen.md` → next `plan-rebuild`
> **Works with:** `cut-complexity`, `track-debt`, `test-first`
> **Shared rules:** reply in the user's language; artifacts default to English; stay in scope; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

Architecture refactoring **without changing behaviour**: find places where modules are shallow,
leaky or over-coupled, and propose how to deepen them. Vocabulary comes from `shape-modules`:
a *deep* module hides a lot of complexity behind a small interface; a *shallow* module hides
almost nothing and makes every caller know its implementation.

## When to use

- A feature keeps touching the same 5–10 files for small changes (change amplification).
- Callers know storage formats, HTTP details, retry logic or internal field names.
- A wrapper's interface is as large as the thing it wraps; tests mock internals and break
  on every refactor.
- Architecture review is requested before a rebuild or a large feature (`shape-modules`
  produced a target shape and the gap is real).
- `track-debt` flagged "fragile structure" as the highest-value debt.

Do **not** start a deepening refactor when behaviour is not covered by tests and the task has
a deadline: first add a safety net (`test-first`, characterization tests) or schedule the
refactor separately. Do not use this skill for "clean up formatting" — that is `cut-complexity`.

## Inputs

Read before proposing anything:

- the knowledge map: `.orbit/knowledge/overview.md`, `.orbit/knowledge/graph.json`,
  `.orbit/knowledge/codebase/*.md` — modules, links, concerns;
- the target shape and vocabulary from `shape-modules` (what "deep" means for this repo);
- the change history that shows pain: `git log --oneline -30 -- <path>`,
  `git log --format='%h %s' --name-only -20 | head -80`;
- the test baseline: which tests exist now and how long they take —
  `pytest -q` / `npm test` / `go test ./...` (record the command and time);
- the artifact contract: `.orbit/task/<id>/` and `ARTIFACTS.md`.

If there is no map, spend one short step building a minimal one with `map-knowledge`
(modules + links with `file:line`), not a full survey.

## Procedure

1. **Set the refactor contract.** Write one line: "behaviour must not change; the checks that
   prove it are `<test command>` plus `<characterization scenario>`". Any proposal that
   changes behaviour is a feature, not this skill.
2. **Establish the safety net first.** Run the existing suite and record the baseline
   (`pytest -q 2>&1 | tail -5`, `npm test -- --run`, `go test ./...`). For code without
   tests, add characterization tests around the candidate's public behaviour *before*
   touching it: capture inputs/outputs (`test-first`, `extract-rules` for rules).
3. **Scan for shallow-module signs with commands, not intuition.**
   ```bash
   # pass-through wrappers: functions that only call one other function
   rg -n "return [a-zA-Z_]+\(" src/ | head -40
   # wide interfaces: files with many exported names
   rg -c "^export |^func [A-Z]|^pub fn |^def [a-z]" src/ | sort -t: -k2 -nr | head -15
   # shotgun changes: files most often changed together for one feature
   git log --format='%h' -50 | while read c; do git show --name-only --format= $c; done | sort | uniq -c | sort -rn | head -15
   # leaking storage/protocol details at call sites
   rg -n "SELECT |http://|https://|\.rows\[|JSON\.parse|req\." src/ | head -30
   ```
   Combined with the map, this produces a candidate list, not a guess.
4. **Score each candidate on four axes:** *depth* (how much it hides vs its interface size),
   *locality* (how many call sites it touches), *test coverage* (can it be protected today),
   *risk* (data formats, public APIs, concurrency, migrations). Keep the 3–5 best.
5. **Write a before/after interface for each candidate.** Before: the surface callers use
   today (list signatures/fields). After: the smaller surface that hides the same behaviour
   (2–5 entry points). The diff between them is the deliverable the person approves.
6. **Estimate blast radius, not just benefit.** Count files/call sites that change:
   `rg -l "<old symbol>" src/ | wc -l`. If a candidate touches more than ~15 call sites in
   one step, split it (`plan-steps`, `slice-tickets`).
7. **Order the work:** one candidate at a time, highest benefit/lowest risk first; for each,
   a small plan with a green-test checkpoint before and after. Never mix two candidates in
   one change.
8. **Implement behind the old interface.** Move logic into the deep module, keep the old entry
   point as a thin adapter until all callers are migrated, then delete the adapter. This keeps
   every intermediate commit releasable.
9. **Prove behaviour did not change.** Run the baseline command again, diff the outputs
   (`pytest -q` vs the recorded baseline; API responses via `curl` snapshots), and record the
   evidence in `.orbit/task/<id>/evidence.md`. Then update the map and close the candidate.
10. **Record what was rejected and why** in `deepen.md`; the next session must not re-propose
    the same refactor (`keep-learnings`).

## Output

`.orbit/task/<id>/deepen.md` — a table plus details for the chosen candidates:

```markdown
# Deepen modules — <repo/area>

**Refactor contract:** behaviour unchanged; proof = `pytest -q` + API snapshot `tests/snap/orders.json`.

| # | Place | Sign | Proposal | Benefit | Risk | Call sites |
|---|---|---|---|---|---|---|
| 1 | `services/orders/repo.py` | callers build SQL | `OrderRepo.list()` hides query building | 12 call sites → 1 | low | 12 |
| 2 | `api/export.py` | pass-through 4 layers | merge into `ExportService.run()` | −3 files | medium (public API) | 4 |

## Candidate 1 — `OrderRepo`
**Before:** callers call `.query()`, `.filter()` and know column names.
**After:** `list(filters) -> list[Order]`; SQL stays inside.
**Safety net:** `tests/orders/` (14 tests) + characterization `tests/snap/orders.json`.
**Plan:** 1) move SQL 2) adapter 3) migrate 12 callers 4) delete adapter.
**Evidence:** `pytest -q` 14 passed before and after; snapshot unchanged.
```

## Check

The refactor is done only when all of these hold — paste the outputs into `evidence.md`:

- `git diff --stat` shows changes **inside the module and its call sites only** — no unrelated
  files, no formatting noise.
- The test command from step 1 passes, and the recorded count is the same or higher:
  `pytest -q 2>&1 | tail -3` (or the project's equivalent).
- The public behaviour snapshot is unchanged (API response, CLI output, file output).
- Call-site count for the old symbol is 0 after the adapter is deleted:
  `rg -l "<old symbol>" src/ | wc -l` → `0`.
- `deepen.md` lists every candidate with a decision (done / rejected + reason / deferred).
- No candidate changed behaviour without an explicit new-task decision; if it did, it is a
  feature and needs `write-spec`.

## Pitfalls

- **Refactoring without a safety net.** "It's just moving code" still breaks error handling
  and ordering. No green baseline → add characterization tests first, or do not start.
- **Changing behaviour quietly.** Renaming a field, changing an error type or reordering
  retries is a behaviour change; it needs a spec and `prove-done`, not this skill.
- **Big-bang merge.** Merging five modules in one change makes review impossible and
  bisecting useless. One candidate per change, adapters between steps.
- **Shallow wrapper around a shallow wrapper.** Do not add another pass-through layer as a
  "facade": the goal is a *smaller* surface, not a re-exported one.
- **No call-site accounting.** If you cannot count the affected call sites with `rg`, you are
  guessing the blast radius; count first, then plan.
- **Ignoring the map.** Without `.orbit/knowledge/`, candidates come from vibes and missed
  dependencies; spend 10 minutes on the map instead of a day on a wrong refactor.
- **Refactor and feature in one branch.** Reviewers cannot separate risk; keep the refactor
  landable and green on its own (`finish-branch`).

## Portability

No Claude-only features are required: this is analysis plus ordinary refactoring. Without
subagents or slash commands, run the steps inline; if your agent has no file tools, paste the
`rg`/`git` outputs into the chat and work from them. The artifact (`.orbit/task/<id>/deepen.md`)
and the check commands are tool-agnostic; `map-knowledge` can be replaced by a hand-written
module list, though the quality of candidates depends on it.

## What's improved vs the source

- A concrete list of shallow-module signs, checkable against code and the knowledge graph.
- Mandatory test safety net before refactoring and a "one candidate at a time" order.
- Added blast-radius counting, adapter-based migration, rejection log, and explicit checks
  that distinguish a refactor from a behaviour change.
- Ties the refactor to `prove-done` evidence instead of "the tests looked fine".

## Based on

- [Matt Pocock Skills](https://github.com/mattpocock/skills) — method «improve-codebase-architecture» (MIT). Rewritten in our own words and improved — see "What's improved".

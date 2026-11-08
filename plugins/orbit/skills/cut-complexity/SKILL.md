---
name: cut-complexity
description: "[Orbit 2.6.5 Quality checks] Unnecessary complexity in a change or the whole repo: what to delete, merge, simplify. Use when: «что лишнее», «упрости код», «мёртвый код», «убери лишнее»; simplify, dead code, reduce complexity."
---

# cut-complexity — find unnecessary complexity: in a change or the whole repo

> **Orbit · ② Build · step 2.6.5 Quality checks**
> **Input:** diff / repo ← `keep-it-small`, `review-code`
> **Output:** simplification list in `.orbit/task/<id>/review.md` → next `review-security`
> **Works with:** `keep-it-small`, `track-debt`
> **Shared rules:** reply in the user's language per `speak-plain`; generated content (maps, diagrams, comments, docs, artifacts) defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md` at the pack root).

Two modes: **diff review** (what is unnecessary in this change) and **repo audit** (where code has grown). Goal in both: less code, the same behavior. Complexity is not style — it is code that exists without earning its place, and it is what makes the next change expensive.

## When to use

- A change is about to be reviewed or merged and you want to catch over-engineering before a reviewer does.
- The diff feels bigger than the problem it solves.
- Before starting a refactor, a migration or a rewrite to know what is code and what is scaffolding.
- A module is "scary to touch", has one implementation behind an interface, or a flag nobody remembers.
- Dead code, commented-out blocks and unused exports keep showing up in `grep` results.

Do **not** use it to argue about naming, formatting or taste — the linter and the formatter own that. Do not delete behavior that has an external consumer.

## Inputs

- the change: `git diff <base>...HEAD --stat` and the full diff, with the base recorded before work started;
- the task intent: `.orbit/task/<id>/brief.md` and `.orbit/task/<id>/plan.md` — a thing is "unnecessary" relative to the goal, not in the abstract;
- the repo map: `.orbit/knowledge/overview.md` or a quick `git ls-files` overview in audit mode;
- the test command and its current status — you must know the suite is green **before** deleting anything;
- previous findings: `.orbit/task/<id>/review.md` from `review-code`, and `.orbit/learnings/` for decisions that were already made and rejected.

If there is no test suite, say so and treat every deletion proposal as needing a manual verification, not a green suite.

## Procedure

1. **Choose the mode and say it in one line.** A diff review looks only at changed lines and lets you merge safely this week. A repo audit scans the whole tree and is exploratory. Do not mix them in the same list.
2. **Establish a green baseline.** Run the full suite and record the count:
   ```bash
   pytest -q 2>&1 | tail -3        # or: npm test, go test ./..., cargo test
   git diff <base>...HEAD --stat
   ```
   No baseline = no permission to delete. The baseline also becomes the "before" line of the evidence.
3. **Diff mode: walk the added lines, not the whole file.** For every new branch, abstraction, parameter or config key ask: does the task require it, and is there a second consumer today? A guard for a state that cannot happen is dead code with extra steps.
4. **Repo audit mode: find unreferenced code per stack.**
   ```bash
   npx knip --no-progress                  # TS/JS exports, files, deps (or: npx ts-prune)
   python3 -m vulture src/ --min-confidence 80
   grep -rn "MySymbol" --include='*.go' .   # confirm with a text search too
   ```
   For Java/Kotlin use the IDE's "unused declaration" inspection; for C# enable IDE0051; `deadcode` covers Go. Text search confirms what the analyzer cannot see across dynamic imports.
5. **Check the six complexity shapes.** Dead branches and commented-out code; unused parameters and exports; abstractions with a single implementation (interface, factory for one class); pass-through wrappers that only call another function; duplicates of the same logic in two or more places; home-grown code that the standard library or an existing dependency already provides; config and flags nobody ever changes.
6. **Note side findings separately.** Bugs, security risks, scale problems and risky untested logic found along the way are recorded in their own list — they go to `review-code` / `review-security`, not into the simplification list.
7. **Score each proposal by benefit.** Benefit = lines removed and branches removed; cost = risk to behavior. Rank by benefit ÷ risk and keep the top 10 in audit mode.
8. **Write every proposal in the four-field format** — what, where (`file:line`), how much simpler, and which test protects it. A proposal without a protecting test is a hypothesis, not a task.
9. **Apply only with tests green before and after.** One proposal per change, suite re-run after each; if the suite is red after, revert that single change. An item is closed when the tests pass and the code got simpler — not when it was "rewritten".
10. **Record and hand over.** Append the list to `.orbit/task/<id>/review.md`; accepted items that are not done now become debt in `track-debt`, and the change continues to `review-security`.

## Output

`.orbit/task/<id>/review.md`, section `## Complexity`:

```markdown
## Complexity

### Must
1. **Factory for a single class** (`src/x/factory.ts:1-60`) — delete, construct directly.
   −55 lines, 2 branches. Protected by `tests/x/factory.test.ts`. Risk: low.

### Should
2. **Duplicate date formatting** (`orders/format.py:31`, `reports/format.py:44`) — extract
   one helper. −18 lines. Protected by `tests/orders/test_export.py`. Risk: low.

### Nice to have
3. **Unused flag** `FEATURE_LEGACY_IMPORT` (`config/flags.py:12`) — remove after confirming
   with the flag owner. Protected by: nothing. Risk: medium (ops may still set it).

### Side findings (not complexity)
- `reports/format.py:47` formats money as float — note for `review-code`.
```

## Check

```bash
git diff --stat                    # each accepted proposal is a small diff
pytest -q                          # suite green, count >= baseline
npx knip --no-progress             # audit mode: the reported item is gone
rg -n "FEATURE_LEGACY_IMPORT" .     # no remaining consumers
test -s .orbit/task/<id>/review.md
```

Pass rule: every proposal in the report has file:line, a benefit estimate and a protecting test (or a stated manual check); the suite is green before and after each deletion; no side finding is mixed into the simplification list. Record the suite counts in `.orbit/task/<id>/evidence.md` for `prove-done`.

## Pitfalls

- **Deleting without a baseline.** "Tests pass" after a deletion means nothing if they passed before or were already red. Record both counts.
- **Keeping an abstraction for a future consumer.** An interface with one implementation and no ticket is speculation. Delete it; reintroduce it when the second consumer exists.
- **Removing a public export.** A symbol unused inside the repo may be used by a package consumer. Check `git grep` across the workspace and the published API before deleting.
- **Counting generated or vendored code.** `node_modules`, `vendor/`, migrations and generated clients are not yours to simplify; exclude them from the audit and the numbers.
- **Mixing behavior change with simplification.** A "clean-up" that also fixes a bug is unreviewable. Separate the commits.
- **Treating a framework convention as dead code.** A handler, route or DI registration may be referenced by name in configuration. Confirm with a text search before deleting.
- **Rewriting instead of simplifying.** A rewrite that is shorter but different is not a simplification; the behavior must be identical.

## Portability

The method is git plus the language's dead-code tool plus the project's test command — all of them runnable in any CLI. Without `knip`/`vulture`, `grep -rn "<symbol>"` across the repo and the workspace is the fallback, slower but sufficient. Without a test suite, downgrade every proposal to "requires a manual check" and state that in the report. No Claude-only features are involved; the list is plain Markdown in the shared `review.md`.

## What's improved vs the source

- Diff review and repo audit are one skill with two modes and one format.
- Concrete dead-code tools per stack.
- Every proposal has a benefit and risk estimate.
- A mandatory green baseline before deletion, and side findings routed to the right review skill.

## Based on

- [Ponytail](https://github.com/DietrichGebert/ponytail) — method «ponytail-review, ponytail-audit» (MIT). Rewritten in our own words and improved — see "What's improved".

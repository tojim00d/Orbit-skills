---
name: track-debt
description: "[Orbit 3.4.4 Memory & hand-over] Tech-debt register prioritized by pain × change frequency ÷ cost. Use when: «техдолг», «реестр долга», «что рефакторить первым»; tech debt, debt register, refactor priority."
---

# track-debt — track complexity and tech debt

> **Orbit · ③ Operate · step 3.4.4 Memory & hand-over**
> **Input:** repository ← `run-retro`
> **Output:** debt register `docs/tech-debt.md` + `.orbit/task/<id>/review.md` findings → next `compress-context`
> **Works with:** `cut-complexity`, `survey-codebase`
> **Shared rules:** reply in the user's language per `speak-plain`; generated content (maps, diagrams, comments, docs, artifacts) defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md` at the pack root).

A debt register: where code is more complex than needed, what it costs, and what to pay off first. Debt becomes visible and managed instead of "we'll refactor someday". The register is a ranked list with a formula, not a folder of complaints.

## When to use

- After `run-retro` produced friction whose cause is structural code complexity.
- `cut-complexity` (audit mode), `deepen-modules` or `review-code` produced findings that will not be fixed in the current task.
- The same area keeps causing bugs, slow reviews or slow feature work, and the pattern is visible.
- Before planning a refactor sprint or a migration, to rank candidates by actual pain.
- A person asks "what should we clean up first?" and the answer must be a number.

Do **not** use it as a dumping ground for style preferences or for items nobody intends to fix — an unranked list of 200 entries is not a register.

## Inputs

- findings from the quality skills: `.orbit/task/<id>/review.md` (complexity and code-review sections), `deepen-modules`, `review-code`;
- repository concerns: `CONCERNS.md` from `survey-codebase` if it exists;
- markers in code: `TODO` / `FIXME` / `HACK` / `XXX` with their age and author;
- dependency drift: outdated packages and their pinned versions;
- churn data: which files change most often, and which of those are the painful ones;
- the retro: `.orbit/learnings/retro-<id>.md` for friction that points at code.

If no findings exist yet, run `cut-complexity` in audit mode first — the register is built from evidence, not impressions.

## Procedure

1. **Collect candidates from every source.** Quality-skill findings, concerns, markers, dependency drift — one raw list before any ranking.
2. **Scan the markers and their age.** A three-year-old `HACK` in a file nobody touches is not urgent; one in a hot path is:
   ```bash
   grep -rnE 'TODO|FIXME|HACK|XXX' src/ | wc -l
   grep -rn "FIXME" src/ | head -20
   git blame -L <start>,<end> <file>        # age and author of a specific marker
   ```
3. **Check dependency debt per stack.**
   ```bash
   npm outdated          # or: pip list --outdated
   mvn versions:display-dependency-updates
   dotnet list package --outdated
   ```
4. **Measure pain and change frequency per candidate.** Pain: incidents, review complaints, time lost in the retro, blocked tasks. Frequency: how often the file changes:
   ```bash
   git log --since="6 months ago" --oneline -- <path> | wc -l
   ```
   A painful place that changes weekly outranks a painful place that changes yearly.
5. **Estimate cost to fix.** Lines and files touched, tests that must change, migration risk — a rough "S/M/L" or hours is enough, as long as it is consistent.
6. **Compute priority and sort.** Priority = pain × change frequency ÷ cost to fix. Frequently changed and painful places first; expensive items sink unless the pain is severe.
7. **Write the register** in `docs/tech-debt.md` (or as issues with a label if the team prefers the tracker), one row per item, with every field filled — no blank priorities.
8. **Schedule the paydown.** Pay down little by little: when working nearby, one item per task (`keep-it-small`, level `refactor`). A debt-only branch with ten items is a rewrite in disguise.
9. **Close items honestly.** An item is closed when tests exist for the behaviour and the code got simpler — not when it was "rewritten", and not when a file was renamed.

## Output

`docs/tech-debt.md`:

```markdown
# Tech debt register

Updated: 2026-11-08 · formula: priority = pain × change frequency ÷ cost

| # | Where | What | Cost now (pain) | Cost to fix | Risk if left | Priority |
|---|---|---|---|---|---|---|
| 1 | `billing/close_day.py` | timezone logic duplicated in 3 places | 2 late-billing bugs this quarter | M | wrong invoices | 9 |
| 2 | `api/orders.py:88` | N+1 on order lines under load | p95 1.8 s at 50 lines | S | slow page at peak | 6 |
| 3 | `legacy/report.js` | 600-line function, no tests | blocks every report change | L | regressions per change | 3 |
```

The same rows can become tracker issues with a `tech-debt` label; the register remains the source of the ranking so the order is not lost in the backlog.

## Check

```bash
test -s docs/tech-debt.md
rg -n "Priority|Cost now|change frequency" docs/tech-debt.md
git log --since="6 months ago" --oneline -- <top-item-path> | wc -l   # frequency is real
git diff --stat                          # scheduled paydown is small
```

Pass rule: every item has all seven fields, a non-empty priority, and a frequency number that can be re-derived from `git log`; the top item is the one with the highest formula score; a scheduled paydown touches one item and is protected by tests. If a row cannot be filled, it is not a register item yet — it is a finding.

## Pitfalls

- **A register that becomes a dump.** Fifty items with no ranking = zero decisions. Keep the register short; unresolved raw findings stay in the review artifact.
- **Prioritizing by gut or by loudest voice.** The formula is the defense against recency bias; show the numbers.
- **Ignoring change frequency.** A painful module nobody edits costs little; a mildly painful hot file costs daily.
- **"Closed" by rewrite.** A rewrite without tests is a new risk, not a paid debt. Closure requires the simpler code plus protecting tests.
- **Paying down everything at once.** A giant refactor blocks the roadmap and hides regressions. One item per nearby task.
- **Stale entries.** A row fixed six months ago still ranks first and misleads the next planning session. Re-check dates on update.
- **Counting generated or vendored code.** `vendor/`, generated clients and migrations are not debt you can simplify — exclude them.
- **No owner for decided items.** The register says "should" but nobody is assigned; convert the top items into tasks with owners.

## Portability

The collection is plain `grep`, `git log`/`git blame` and the stack's dependency command; the register is a Markdown table or a tracker project. Without `git blame -L` support, `git log -S "<marker>"` finds when the marker appeared. No subagents are needed; if the team keeps debt in a tracker, the formula still applies and the register links to the issues.

## What's improved vs the source

- A priority formula (pain × change frequency ÷ cost) instead of an unordered list.
- One register fed by all Orbit quality skills.
- Marker age via `git blame` and dependency drift as first-class inputs.
- An explicit closure rule — tests plus simpler code, not a rewrite.

## Based on

- [Ponytail](https://github.com/DietrichGebert/ponytail) — method «ponytail-debt» (MIT). Rewritten in our own words and improved — see "What's improved".

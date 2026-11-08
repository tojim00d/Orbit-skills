---
name: check-parity
description: "[Orbit 2.6.8 Quality checks] Parity with a reference: feature-matrix score, screen diff, parallel run for legacy. Use when: «насколько совпадает», «паритет со старой системой», «сравни со старой версией»; parity check, feature parity, compare with the old system."
---

# check-parity — how closely the new version matches the reference

> **Orbit · ② Build · step 2.6.8 Quality checks**
> **Input:** new system + reference ← `test-flows`
> **Output:** `.orbit/product/<name>/parity.md` → next `finish-branch`
> **Works with:** `rebuild-clean`, `extract-rules`
> **Shared rules:** reply in the user's language per `speak-plain`; generated content (maps, diagrams, comments, docs, artifacts) defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md` at the pack root).

Compare your system with the original: a feature-parity score computed from a matrix, and a screen-layout diff. Used for product rebuilds and legacy migrations, where the new system must do everything the old one did — and for deliberate changes, so the gap is a decision rather than a surprise.

## When to use

- Rebuilding a product or a screen from a reference implementation, a legacy system or a design file.
- Migrating an old service to a new stack: the new one must reproduce the rules, not only the happy path.
- A stakeholder asks "is the new version the same?" and the answer must be a number, not an opinion.
- A rebrand or redesign is expected to differ visually and you need to separate intentional differences from regressions.
- Before `finish-branch`, as a gate: no must-have may be missing.

Do **not** use it when there is no reference to compare against — use `test-flows` for correctness and `review-code` for quality instead.

## Inputs

- the feature matrix: `.orbit/product/<name>/features.csv` — one row per feature with `id`, `name`, `weight` (`must`/`should`/`could`) and `in_ours` status;
- the rule catalog from `extract-rules` and the flows from `test-flows`: the matrix rows come from these, not from memory;
- reference screenshots or the running reference app, taken at the same viewport, locale and data set as yours;
- the brief: `.orbit/task/<id>/brief.md`, especially the "Not doing" list — intentional omissions must not be scored as gaps;
- for a legacy migration: the characterization tests on the new system, one per rule or flow.

If the matrix does not exist, build it first from the rule catalog and the flows; if reference screenshots are missing, capture them now and record the viewport and date.

## Procedure

1. **Build or refresh the feature matrix from the reference.** Walk the reference app's navigation and the rule catalog; every visible capability becomes a row, weighted `must` / `should` / `could`. "Must" means the new system is not shippable without it.
2. **Decide what counts as "in ours".** A row is ticked only when a characterization test — or an explicit, reproducible check — passes on the new system. A manual "looks implemented" tick is a guess and will fail `prove-done`.
3. **Score the matrix.**
   ```bash
   python3 tools/parity.py .orbit/product/<name>/features.csv          # weighted score
   python3 tools/parity.py features.csv --markdown > parity.md         # report
   python3 tools/parity.py features.csv --fail-under 80               # gate for CI
   ```
   Must features must reach **100 %**; the remaining weight is met by decision, and every shortfall needs a recorded reason.
4. **Diff the screens at the same conditions.** Same viewport, same zoom, same locale, same data:
   ```bash
   python3 tools/imgdiff.py original.png ours.png --out diff.png --json
   python3 tools/imgdiff.py original.png ours.png --mode pixel --fail-under 95
   ```
   Layout mode ignores color, so a rebrand is not penalized; pixel mode is for pixel-exact comparisons only.
5. **Read the screen diff by region.** For each changed region decide: regression (missing element, shifted action), intentional (rebrand, copy change from the brief) or noise (animation, font rendering). Record the decision next to the region.
6. **For legacy migrations, prove rules, not pixels.** The matrix row "in ours" is ticked when the characterization test for that rule passes on the new system. Flows without automation get a manual pass with the inputs and outputs written down.
7. **Run critical paths in parallel.** Same inputs into the old and the new system; compare outputs field by field, then the side effects (emails, events, DB rows). A parallel run catches what screenshots and unit tests miss.
8. **Write the report in build order.** Missing items are listed in the order they should be built — must first, then should, each with a `file:line` pointer on the new side.
9. **Gate and hand over.** Keep `--fail-under` in CI so the parity score cannot silently drop. Missing must-haves go back to `build-screens` / `build-backend`; the rest goes to `finish-branch`.

## Output

`.orbit/product/<name>/parity.md`:

```markdown
# Parity: orders portal (reference: legacy 1.9)

**Score:** 78 / 100 weighted · must 12/14 · should 9/11 · could 3/6

## Missing — in build order
1. [must] Bulk status change (`orders/bulk.py`, not implemented) — breaks the dispatcher flow.
2. [must] CSV export encoding (UTF-8 BOM) — parity test fails on non-ASCII names.

## Screen differences
- `orders-list`: row height 44 → 52 px — intentional (design brief p.3).
- `order-detail`: "Print" button missing — regression, ticket ABC-128.

## Decisions
- PDF export stays out of scope (brief "Not doing"); weight downgraded to could.
```

## Check

```bash
python3 tools/parity.py .orbit/product/<name>/features.csv --fail-under 80
python3 tools/imgdiff.py original.png ours.png --mode pixel --fail-under 95
test -s .orbit/product/<name>/parity.md && rg -n "Score|Missing|Differences" .orbit/product/<name>/parity.md
```

Pass rule: the command exits 0, must-have coverage is 100 %, every screen difference has a decision (regression / intentional / noise), and every "in ours" tick maps to a passing check or characterization test. A score without those mappings is not evidence — record the verdict in `.orbit/task/<id>/evidence.md` for `prove-done`.

## Pitfalls

- **Ticking "in ours" from a glance.** A screen that renders is not a feature that works. Only a passing check ticks a row.
- **Penalizing intentional change.** A rebrand judged in pixel mode scores 40 % and hides real regressions. Use layout mode, and keep the pixel gate for unchanged screens only.
- **Comparing different data.** Reference screenshots with production data and yours with a seed database show differences that are not parity gaps.
- **"Must" quietly becoming "should".** Re-weighting a missing must-have to raise the score is a decision that needs the person's sign-off, recorded in the report.
- **Screenshots older than the reference.** A redesign released last week makes the baseline wrong. Capture the reference and yours in the same session.
- **Ignoring side effects in the parallel run.** Outputs can match while emails or events differ; compare both.

## Portability

The method needs only `python3` and the two `tools/` scripts, plus a way to take screenshots (Playwright, a browser, or the reference stand). Without `tools/`, produce the same numbers with a spreadsheet: weighted score = sum of weights met / sum of weights, and a manual side-by-side for screens. No subagents or slash commands are required; the report is plain Markdown that `finish-branch` and a reviewer can read.

## What's improved vs the source

- Applies to migrating your own legacy: parity by rules and characterization tests, plus a parallel run.
- The parity threshold works as a CI gate.
- Screen differences carry an explicit decision (regression / intentional / noise) instead of a raw diff score.
- The report is ordered by build priority, so gaps turn into a backlog directly.

## Based on

- [Replica](https://github.com/Jakeschincariol/replica-skill) — method «replica-diff» (MIT). Rewritten in our own words and improved — see "What's improved".
- Helper files in `tools/` are taken from the source unchanged; licences: `tools/LICENSE.upstream`.

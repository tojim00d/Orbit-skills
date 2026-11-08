---
name: rebuild-clean
description: '[Orbit 2.2.8 Architecture & data] Rebuild a system from analysis: spec as the boundary, new implementation, parity check. Use when: «перепиши систему», «миграция легаси», «clean-room», «пересобери заново»; rewrite, migrate legacy, clean-room rebuild.'
---

# rebuild-clean — rebuild a system from analysis, without copying

> **Orbit · ② Build · step 2.2.8 Architecture & data**
> **Input:** findings + rules ← `extract-rules`, `plan-rebuild`
> **Output:** new system with parity → next `add-code-mode`
> **Works with:** `extract-rules`, `check-parity`, `plan-rebuild`, `prove-done`
> **Shared rules:** reply in the user's language; generated artifacts default to English; stay in scope; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

The Craft Anything and Replica pipeline rewritten inside the pack: **study → describe behaviour → build anew → compare with the original → refine**. Use it for migrating legacy to a new stack, replacing a vendor component with your own, or rebuilding an internal tool. The output is a new system that passes the same observable behaviour — not a copy of the old code.

## When to use

- A legacy system must move to a new stack or platform and its behaviour is the contract.
- A vendor component is being replaced in-house and its API/behaviour is known.
- An internal tool is being rebuilt after analysis (`reverse-app`, `teardown-product`).
- "Rewrite it" keeps appearing in plans without a parity definition.
- **Not** for a refactor where behaviour stays inside one codebase — that is `deepen-modules` plus `plan-steps`, and it keeps the same code, which this skill deliberately does not.

## Inputs

- study: `.orbit/reverse/<target>/findings.md` (observation / inference / unknown), `.orbit/knowledge/rules.md`, the feature matrix `features.csv`;
- behaviour specification: `openspec/changes/<id>/`, recovered API contracts in `docs/api/`, `.orbit/knowledge/rules.md`;
- design from `plan-rebuild`: `.orbit/product/<name>/architecture.md`, schema and slice plan;
- the original system for comparison only: test data, fixtures, captured responses — never source code or assets as a build input;
- the parity definition from `check-parity`: which features are must/should/could and how each is verified.

If the specification is missing, run `extract-rules` / `recover-api-spec` / `write-spec` first — building without the spec breaks the clean-room boundary. If the parity definition is missing, it does not exist: write it before building.

## Procedure

1. **Enforce the clean-room boundary.** The builder works from the specification, not from the original's code, assets or texts. Keep a separate directory and never copy files from the old one. For your own code this stops old bugs and hacks from carrying over; for external products it is the legal boundary (`teardown-product` rules).
2. **Study (stage 1).** Use `reverse-app`, then `map-knowledge`, `teardown-artifact`, `recon-webapp` or `teardown-product` depending on the target. Record every finding as observation, inference or unknown in `.orbit/reverse/<target>/findings.md`. Unknowns are questions, not blanks to fill by guessing.
3. **Describe behaviour (stage 2).** Turn findings into specs: business rules (`extract-rules` → `.orbit/knowledge/rules.md`), API contracts (`recover-api-spec` → `docs/api/`), behaviour specs (`write-spec` → `openspec/changes/<id>/`). A rule is specified by its trigger, effect and edge cases, not by the old code line.
4. **Build the feature matrix (stage 3).** For each feature: must/should/could and one verifiable criterion. `features.csv` is the parity ledger; a row is not done without evidence.
5. **Design (stage 4).** Run `plan-rebuild` with `design-services` and `design-data`: schema, API, and a slice plan with the thin vertical slice first. The design must be traceable to spec sections and matrix rows.
6. **Build (stage 5).** Use `plan-steps` → `test-first` → `build-screens` / `build-backend`. One end-to-end scenario from UI to DB first, then widen. Tests are written against the spec, never against the original implementation.
7. **Compare (stage 6).** Run `check-parity`: feature parity from the matrix and, where visual behaviour matters, a screen diff; add contract tests from `docs/api/`. A mismatch produces a finding, not a silent patch.
8. **Parallel run for critical systems.** Before switching, run old and new on the same inputs and compare outputs for a defined window; record it in `.orbit/task/<id>/evidence.md`.
9. **Refine (stage 7).** Close must-have gaps with `find-root-cause` and `test-flows`, then prove with `prove-done`. Stop when must = 100%; should items close by explicit decision, not by running out of time.

## Output

A new implementation in its own directory plus the parity record.

```markdown
# Rebuild: <target> → <new system>
**Spec boundary:** openspec/changes/<id>/ + docs/api/ + .orbit/knowledge/rules.md
**Build dir:** <new-system>/ (no files copied from the original)
**Matrix:** features.csv — must 18/18, should 6/9 (3 deferred, owners in row notes)
**Parity:**
| feature | criterion | verdict |
|---|---|---|
| F12 cancel unpaid order | POST /orders/{id}/cancel → cancelled; old handler rejects paid | pass (test /tmp/parity.json) |
| F14 export CSV | byte-equal for fixture set A (except column order) | pass |
**Parallel run:** old 10k req vs new 10k req, diff 0 on fixtures; window 2026-11-08 10:00–12:00.
**Deferred should:** F21 bulk import — decision: post-switch, owner @team.```

The feature matrix row that keeps parity honest:

```csv
feature,priority,criterion,evidence
F12 cancel unpaid order,must,POST /orders/{id}/cancel moves new→cancelled and rejects paid,test/api/test_cancel.py
F21 bulk import,should,import 10k rows from CSV,not yet
```

## Check

The rebuild is clean and proven when the matrix is closed and the boundary held:

```bash
rg -n "must" .orbit/product/<name>/features.csv | wc -l
rg -n "not yet|TODO" .orbit/product/<name>/features.csv          # must rows must not match
ls <new-system>/src && rg -n "<original-package-name>" <new-system>/   # no old code copied
python3 -m pytest tests/api -q                                   # contract + behaviour tests
npx playwright test tests/parity                                  # screen diff, where relevant
diff <(curl -s "$OLD/api/orders/1") <(curl -s "$NEW/api/orders/1")
```

Pass rule: the specification exists for every must-have before its code; the build directory contains no copied source/assets from the original; must = 100% with evidence per row; every should is verified or deferred with an owner; contract tests from `docs/api/` pass; critical systems have a recorded parallel-run comparison; differences are explained in the spec, not patched silently. Evidence goes to `.orbit/task/<id>/evidence.md`.

## Pitfalls

- **Copying the old code "for reference".** Once the original is in the build directory, it becomes the implementation and the clean-room boundary is gone. Study produces specs; build reads specs.
- **A rule inferred as a business rule when it is an artifact.** An artefact of the old implementation (a retry, a rounding, a column order) can be deliberately dropped — but the decision goes into the spec (`extract-rules`), otherwise parity tests fail forever.
- **Parity by eye.** "Looks the same" is not a criterion. The matrix row plus a command is the only parity proof.
- **One giant switch-over.** Cutting over everything at once hides regressions under one release. Slice by flow and, for critical systems, parallel-run first.
- **Unknowns treated as known.** `.orbit/reverse/<target>/findings.md` separates observation from inference; building on an unmarked inference produces confident bugs.
- **Finishing at 80% must.** "Almost all" is a failed migration. Must is binary: 100% or the switch does not happen.

## Portability

The pipeline is skill composition, not tooling: any agent can run the stages in order and write the same artifacts. Without `check-parity`, a script comparing old and new outputs on fixtures is a valid parity check; without `teardown-product`, study through `reverse-app` and the docs. No subagents or slash commands are required; the clean-room rule and parity matrix must not be skipped.

## What's improved vs the source

- The pipeline is assembled from Orbit skills, no separate desktop app needed.
- The specification is a mandatory boundary between studying and building.
- Parallel run of old and new for critical systems.
- A parity ledger (`features.csv`) with a per-row criterion — must = 100%, should by decision.
- An explicit rule for differences that are implementation artifacts, recorded in the spec.
- A check that proves no original code leaked into the build directory.

## Based on

- [Craft Anything](https://github.com/storytold/craft-anything) — method «Craft Anything» (MIT/Apache-2.0). Rewritten in our own words and improved — see "What's improved".
- [Replica](https://github.com/Jakeschincariol/replica-skill) — method «пак Replica» (MIT). Rewritten in our own words and improved — see "What's improved".

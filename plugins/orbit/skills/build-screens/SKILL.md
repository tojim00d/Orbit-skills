---
name: build-screens
description: '[Orbit 2.4.7 Implementation] UI screen by screen: shell → vertical slice → all screens and states. Use when: «собери экраны», «сверстай приложение», «построй интерфейс по экранам»; build UI screens, implement screens.'
---

# build-screens — build the UI screen by screen

> **Orbit · ② Build · step 2.4.7 Implementation**
> **Input:** architecture + design ← `code-backend`
> **Output:** a working frontend → next `build-backend`
> **Works with:** `test-flows`, `check-parity`
> **Shared rules:** reply in the user's language per `speak-plain`; generated content defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

Frontend build from the analysis and the design: shell → main flow end to end → the
remaining screens with all their states. Every line is written fresh — the reference's code,
texts and assets are not copied. Order matters: the shell and one vertical slice prove the
architecture; the rest of the screens then follow the feature matrix, not a whim.

## When to use

- The architecture and the design system are ready and screens must become a working app.
- A product rebuild from a reference (`recon-webapp` → `teardown-product`) reaches the
  implementation phase.
- A migration to a new frontend stack needs the old capabilities, screen by screen.
- The shell exists but screens are missing states or are not wired to the API.
- Not for a brand-new screen design where no flow or design system exists: start at
  `pick-ui-style` and `build-design-system`.

## Inputs

- `.orbit/product/<name>/architecture.md` from `plan-rebuild`: routing, state management,
  API boundaries, auth, rendering strategy.
- Screens `S…` and flows `F…` from the analysis; the feature matrix
  `.orbit/product/<name>/features.csv` with `must` / `should` weights.
- The design system: `docs/design/components.md` and the tokens from
  `build-design-system`; the UI kit assembled in `style-ui`.
- The API contract: `docs/api/` or an OpenAPI file from `recover-api-spec`; if the backend
  is not ready, a contract stub is allowed and must be marked as such.
- The reference's texts and assets are **inputs for behaviour only** — not for copying.
  If screenshots or the feature list are missing, stop and get them; do not guess screens.

## Procedure

1. **Read the architecture and list the screens.** Map every `S…` to a route, a flow `F…`
   and the `must` features it serves. The list is the build order unless a dependency says
   otherwise; `rg -n "S0|F0" .orbit/product/<name>/architecture.md` to cross-check ids.
2. **Build the shell first:** routing, layout, navigation, auth guard, error boundary,
   theme switch, and the loading/empty frame. The shell must render with zero screens
   implemented — a route that 404s on refresh is a shell bug, not a screen bug.
3. **Implement the main vertical slice, `F01`, end to end.** First screen → the last step of
   the flow, using the real API or the contract stub from `recover-api-spec`. Commit the
   slice before widening; this is where integration problems surface cheapest.
4. **Then take the remaining screens by feature-matrix priority, `must` → `should`**
   (`.orbit/product/<name>/features.csv`). A `could` screen waits until every `must` row
   has a working screen; skipping order is how a demo ends up with no core flow.
5. **Give every screen all six states:** empty, loading, filled, error, no permission, and
   mobile. A screen with only the filled state is half a screen; the design system's
   component specs define what each state looks like.
6. **Assemble only from the design system.** Components come from
   `docs/design/components.md`; when a screen needs something new, add the component to the
   system first (`build-design-system`) and then use it. No one-off buttons.
7. **Write your own texts.** The reference's labels, marketing copy and error strings are
   not carried over; write copy that fits the product and keep it in one place (the repo's
   i18n or copy module) so it can be reviewed.
8. **After each screen, take a screenshot and run its flow** with `test-flows`
   (`npx playwright test tests/flows/`). A screenshot with no flow run proves appearance,
   not behaviour; a flow with no screenshot misses layout regressions.
9. **Mark progress in two places:** the "in ours" column of
   `.orbit/product/<name>/features.csv` and the task statuses in
   `.orbit/task/<id>/plan.md` (`[ ]`, `[~]`, `[x]`). A screen is only `[x]` with its evidence
   in `.orbit/task/<id>/evidence.md`.
10. **Close with a full build and a flow pass:** `npm run build` exits 0, every `must`
    screen is implemented, and `check-parity` can score the matrix without manual ticks.

## Output

A working frontend in the repo — routes, screens, components wired to the API — plus the
updated matrix and evidence:

```markdown
## 2026-11-08 18:30 — screens S01–S06
$ npx playwright test tests/flows → 6 passed (F01, F02, F03, + 3 state flows)
$ npm run build → exit 0
features.csv "in ours": must 14/14, should 6/8 (2 deferred — see Not doing)
States covered: empty, loading, filled, error, no-permission, mobile (390px)
Screenshots: test-results/S01-orders-empty.png … S06-settings-error.png
Remaining: S07 audit log (must) — blocked by API contract, next task
```

Next: `build-backend` for the server side, `test-flows` for regression walks, then
`check-parity` against the reference.

## Check

```bash
npm run build                                   # exit 0, no type errors
npx playwright test tests/flows/                # every main flow passes
rg -n "empty|loading|error|no-permission" <screens>/   # states are implemented
python3 <skills-dir>/check-parity/tools/parity.py .orbit/product/<name>/features.csv
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/<route>  # 200
```

Pass rule: the build exits 0; every main flow `F…` passes in Playwright; each screen
renders all six states (checked by test or screenshot); no `must` feature row is missing
from the matrix; the "in ours" ticks have evidence. `check-parity` scores the matrix — the
number is the exit condition, not a manual review. Record command → output → conclusion in
`.orbit/task/<id>/evidence.md`.

## Pitfalls

- **Building screens before the shell.** Each screen grows its own layout and navigation;
  the shell is the first deliverable for a reason.
- **Skipping the vertical slice.** Three weeks of screens with no end-to-end flow hides
  integration failures until the end; prove `F01` first.
- **Happy path only.** Empty, error and no-permission states are where most users live; a
  screen without them fails review and support.
- **Copying the reference's texts.** Wording is someone else's product; copy the behaviour,
  write the copy.
- **New component invented inline.** The design system stops being a system; add the
  component first, then use it.
- **Screens not wired to the API.** A static mockup that "looks done" fails the flow test;
  use the real API or a clearly marked stub until the backend lands.
- **Feature-matrix drift.** Ticking "in ours" without evidence makes `check-parity` lie; a
  tick needs a passing check.
- **Testing only desktop.** A screen is not done until the 390 px layout and the mobile
  navigation work.

## Portability

Any agent with file tools and the repo's test runner can run this. Playwright is the
recommended runner (`test-flows`); if absent, use the project's e2e tool and keep the same
screen/flow ids. The design system is Markdown and CSS variables, not a Claude feature. No
subagents or slash commands are involved; if a delegation tool exists, screens can be split
between agents by route, with the matrix and evidence still owned by the coordinator.

## What's improved vs the source

- Works for migrating your own UI to a new stack as well as for a product built from a
  reference.
- Progress is tracked in the shared feature matrix that `check-parity` scores.
- The shell and the vertical slice are explicit gates before breadth, so integration fails
  early and cheaply.
- Six states and mobile are required per screen, and the evidence lives in the shared log.

## Based on

- [Replica](https://github.com/Jakeschincariol/replica-skill) — method «replica-build» (MIT). Rewritten in our own words and improved — see "What's improved".

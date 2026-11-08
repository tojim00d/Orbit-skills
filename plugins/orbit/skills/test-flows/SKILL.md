---
name: test-flows
description: "[Orbit 2.6.7 Quality checks] Walk the app's flows: test plan, Playwright e2e, bug reports with evidence. Use when: «протестируй приложение», «e2e», «playwright», «прогони сценарии»; e2e testing, test flows, browser testing."
---

# test-flows — walk every app flow and find bugs

> **Orbit · ② Build · step 2.6.7 Quality checks**
> **Input:** app + flows ← `review-security`
> **Output:** tests + `.orbit/task/<id>/evidence.md` → next `check-parity`
> **Works with:** `find-root-cause`, `prove-done`
> **Shared rules:** reply in the user's language per `speak-plain`; generated content (maps, diagrams, comments, docs, artifacts) defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md` at the pack root).

Checking a web app through the user's eyes: a test plan from the flows, Playwright e2e tests for the paths worth automating, manual passes where automation does not pay off, and bug reports with evidence. The deliverable is not "I clicked around" — it is a plan, tests, and named bugs.

## When to use

- A build is ready for end-to-end checks and the flows exist in the spec (`WHEN/THEN`), the analysis (`F…`) or `.orbit/knowledge/`.
- A release candidate needs regression coverage on the main user journeys.
- A UI change must be verified as a user sees it, not only as unit tests see it.
- A bug report cannot be reproduced by unit tests and needs a browser-level repro.
- `check-parity` needs evidence that the new flow behaves like the reference.

Do **not** use it for load, penetration or accessibility audits — different tools. Unit-level logic belongs in `test-first`; deep security belongs in `review-security`.

## Inputs

- flows: the spec's WHEN/THEN scenarios, `.orbit/knowledge/overview.md`, or the `F…` list from analysis;
- a running app: local `npm run dev` / `docker compose up`, or a stand URL with test credentials;
- the stable selectors policy: prefer role and accessible name; existing component test ids if the team uses them;
- test tooling already in the repo: `npx playwright --version`, `playwright.config.ts`, CI e2e job;
- previous evidence: `.orbit/task/<id>/evidence.md` for the last known green run and the app version.

If the app cannot be started, state the blocker and produce the test plan plus bug reports from the spec — do not fake a pass.

## Procedure

1. **Write the test plan first** (`tools/test-plan.md`). For every flow list the happy path and the edges that change behavior: empty, server error, no permission, long strings, slow network, mobile viewport, double click. This plan is the review checklist for the flows, not a wish list.
2. **Start the app under test deterministically.** Use the helper so the server and the tests share a lifecycle:
   ```bash
   python3 tools/scripts/with_server.py --server "npm run dev" --port 5173 -- \
     python3 tools/examples/element_discovery.py
   ```
3. **Recon the page before writing selectors.** Screenshot the page and dump the element list (`tools/examples/element_discovery.py`); choose `getByRole` / `getByLabel` selectors from what the user perceives.
4. **Write the Playwright e2e for the main flows** (`tools/e2e.example.spec.ts` as the starting shape):
   ```ts
   await page.getByRole('button', { name: 'Export' }).click();
   await expect(page.getByRole('status')).toHaveText('Export ready');  // wait for a condition
   ```
   Never `waitForTimeout` / `sleep`: wait for an element, a response or a state. A fixed delay is a future flake.
5. **Capture the browser console and network** into the report (`tools/examples/console_logging.py`): an uncaught error is a bug even if the flow "works".
6. **Run the suite and repeat the flaky candidates.** A test that fails once in three runs is flaky; fix the wait or isolate the test, do not merge it.
7. **Manual pass for rare and visual cases.** Screenshots before/after, with the viewport named. Manual findings go into the same bug format as automated ones.
8. **Write bug reports** (`tools/bug-report.md`): title, severity, exact steps, expected vs actual, screenshot, console excerpt, environment (commit, browser, viewport).
9. **Record the result and route the bugs.** Evidence block in `.orbit/task/<id>/evidence.md`; bugs to the tracker or `.orbit/task/<id>/bugs.md`; each bug goes to `find-root-cause` for a cause, not a blind fix.

## Output

- repo: the Playwright spec(s) and any fixed config, committed with the branch;
- `.orbit/task/<id>/evidence.md` — command, app version, run result:

```markdown
## 2026-11-08 15:05 — e2e main flows (commit abc1234)

$ npx playwright test e2e/orders.spec.ts
6 passed, 0 failed in 42s
Covered: create order, edit, export, permission denied, empty cart.
Console: 0 uncaught errors. Bugs found: 1 (export button disabled after retry).
```

- `.orbit/task/<id>/bugs.md` or the tracker:

```markdown
### BUG-1 — Export button stays disabled after a failed export
Severity: high · Steps: create order → Export → simulate 500 → wait 2s → Export.
Expected: button re-enabled. Actual: disabled until reload. Screenshot: ./bugs/export.png
Console: `TypeError: Cannot read properties of undefined (reading 'state')`.
```

## Check

```bash
npx playwright test --reporter=line        # full e2e suite green
npx playwright test --repeat-each=3        # flake check on the changed spec
test -s .orbit/task/<id>/evidence.md
rg -n "passed|failed|bugs" .orbit/task/<id>/evidence.md
```

Pass rule: every flow in the plan has either an automated test or a dated manual pass; the e2e run is green and stable across three repeats; each bug has a reproduction in the report; evidence names the commit and the app version. Record the final run in `evidence.md` so `prove-done` can cite it.

## Pitfalls

- **`sleep` instead of a condition.** A fixed delay passes on a fast laptop and fails in CI. Wait for the element/response the flow actually needs.
- **CSS-class selectors.** They change with every style edit and test the markup, not the user's path. Use role, label, text.
- **Testing implementation details.** "Was `fetch` called twice" is a unit test; the e2e asserts what the user sees.
- **Happy path only.** The bugs live in empty/error/permission/slow edges, which is why the plan lists them explicitly.
- **No console capture.** A flow can "pass" while React logs an uncaught error; capture and report it.
- **A flaky test merged as green.** It will be muted later and stop protecting anything. Fix the wait or quarantine with a ticket.
- **Bug without a repro or evidence.** The developer cannot reproduce "sometimes broken"; a bug report needs steps, expected/actual and a screenshot.

## Portability

Playwright is optional; the method is a flow plan + a browser automation tool + a bug format. Without the `tools/` helpers, start the server in a background shell, wait on the port with a loop, and use Playwright's own `webServer` config. Without Playwright, use any browser automation or a scripted manual pass and record it the same way. No subagents are required; the evidence and bug files are plain Markdown.

## What's improved vs the source

- Two approaches merged: a test plan with bug reports, and Playwright tooling for a local app.
- Rules for stable tests (role-based selectors, waiting for conditions instead of `sleep`).
- Results go to the shared evidence log and straight into debugging.
- Flake handling is part of the procedure, not discovered in CI later.

## Based on

- [Replica](https://github.com/Jakeschincariol/replica-skill) — method «replica-test» (MIT). Rewritten in our own words and improved — see "What's improved".
- [Skills by Anthropic](https://github.com/anthropics/skills) — method «webapp-testing» (Apache-2.0). Rewritten in our own words and improved — see "What's improved".
- Helper files in `tools/` are taken from the source unchanged; licences: `tools/LICENSE.replica`, `tools/LICENSE.upstream`.

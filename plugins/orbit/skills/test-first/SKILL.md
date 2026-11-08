---
name: test-first
description: '[Orbit 2.4.1 Implementation] Red → green → clean; test from a spec scenario; characterization test for old code. Use when: «TDD», «сначала тест», «напиши тесты», «красный-зелёный-рефакторинг»; test first, TDD, write tests before code.'
---

# test-first — test first, then code

> **Orbit · ② Build · step 2.4.1 Implementation**
> **Input:** a plan task ← `build-mcp`, `rebuild-design`
> **Output:** code + tests → next `run-plan`
> **Works with:** `prove-done`, `find-root-cause`
> **Shared rules:** reply in the user's language per `speak-plain`; generated content defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

Red → green → clean for any behaviour change. The main rule: **if you did not watch the
test fail for the right reason, you do not know what it tests.** A test written after the
code passes by construction and proves nothing. This skill turns a spec scenario into a
test, the test into minimal code, and the run into evidence.

## When to use

- Any behaviour change: a new feature, a bug fix, a risky refactor.
- A plan task names a WHEN/THEN scenario — the test is that scenario, named as behaviour.
- Existing code has no tests and must be changed: a characterization test first.
- Exceptions, only with the person's explicit consent: a throwaway prototype
  (`prototype-fast`), pure markup without logic, or config verified by deployment.

## Inputs

- The plan task: `.orbit/task/<id>/plan.md` — files, scenario, check command.
- The spec scenario in WHEN/THEN form: `openspec/changes/<id>/` or the spec named in the
  plan. No scenario → ask for it; a test without one is a guess.
- The module interface from `shape-modules` — tests check behaviour through the interface,
  not internals.
- The test layout and runner: `ls tests/`, the command in `package.json` /
  `pyproject.toml`, and `rg -n "def test_|it\(" tests/ | head -20` for style.
- For old code: the current output for real inputs, so the characterization test records
  what is, not what should be.

## Procedure

1. **Pick one scenario and name the test as behaviour.** `returns_400_when_email_empty`,
   `exports_header_only_for_empty_report`. If the name needs "and", it is two tests; each
   test carries one clear failure message.
2. **Write the test (red).** Assert the WHEN/THEN outcome through the public interface;
   real data where possible, mocks only at seams (database, network, time).
3. **Watch it fail — for the right reason.** Run the test and read the failure. Passes
   immediately → it tests existing behaviour or nothing. Fails on import/compile →
   scaffold until it fails on the assertion.
4. **Write the minimal code to pass (green).** Nothing "while I am here": no extra option,
   no refactor of the neighbourhood, no speculative abstraction. Green means the one test
   plus the suite.
5. **Watch it pass, and all other tests too.** Run the whole file or suite, not only the new
   test. Another test broke → fix it now; a green new test on a red suite is not done.
6. **Clean.** Remove duplication, improve names, extract only what is actually repeated —
   run the tests before and after; both green. Clean is a separate step from green.
7. **Log the evidence.** Append command → output → conclusion to
   `.orbit/task/<id>/evidence.md`, then tick the task in `.orbit/task/<id>/plan.md`.
8. **A bug is a reproducing test first.** Write the test that fails on the bug, watch it
   fail, fix, watch it pass. The test stays in the suite forever — that is the regression
   guard.
9. **Old code without tests: characterization first.** Record input → current output even
   if the current behaviour looks odd (`extract-rules`). It protects the behaviour you do
   not intend to change, and it is the baseline for the refactor.
10. **Pick the level deliberately:** pure logic tests (most), orchestration with stubs
    (fewer), integration with real infrastructure (a few, e.g. Testcontainers). A slow
    integration test for pure logic wastes the suite; mocked-only tests cannot prove the SQL.
11. **Red flags — stop, back to step 1:** "I'll write tests later", "passed on the first
    run — great", "I'll adjust the test so it passes". Each turns the suite into a
    description of the code instead of its requirements.

## Output

Code plus tests in the repo, the evidence entry and the plan tick:

```python
# tests/test_signup.py
def test_returns_400_when_email_empty():
    response = client.post("/signup", json={"email": "", "password": "x" * 12})
    assert response.status_code == 400
    assert response.json()["error"] == "email_required"
```

```markdown
## 2026-11-08 21:20 — task 2: signup validation
$ pytest tests/test_signup.py -q
1 failed  (assert 201 == 400)      ← watched it fail on the assertion
$ pytest tests/test_signup.py -q
1 passed
$ pytest -q
86 passed, 0 failed                ← suite green after the change
Conclusion: empty email → 400 with the spec's error code; task 2 done.
```

Next: `run-plan` continues the plan; `prove-done` re-runs the evidence before review.

## Example

Task from `plan.md`: "reject signup with an empty email; check `pytest tests/test_signup.py`".

1. Spec scenario: **WHEN** email is empty **THEN** the API returns 400 `email_required`.
2. Write `test_returns_400_when_email_empty` and run it:
   `pytest tests/test_signup.py -q` → `1 failed (assert 201 == 400)` — the right assertion.
3. Add the smallest guard in the signup handler (edge validation only):
   `if not payload.email: raise ValidationError("email_required")` mapped to 400.
4. Run `pytest tests/test_signup.py -q` → `1 passed`; then `pytest -q` → `86 passed`.
5. Clean: reuse the existing `ValidationError` mapper instead of a second branch; run the
   suite again → still `86 passed`.
6. Log the three commands and outputs in `.orbit/task/<id>/evidence.md`; mark task `[x]` in
   `.orbit/task/<id>/plan.md`. Later it guards the regression: a refactor that drops the
   guard turns it red before review.

## Check

```bash
pytest tests/test_signup.py -q              # or npm test -- signup
pytest -q                                    # the whole suite, not only the new test
git diff --stat                              # code changed; test was added first
rg -n "def test_returns_400|it\(.returns 400" tests/   # test name states behaviour
rg -n "^## .*task" .orbit/task/<id>/evidence.md        # fail → pass → suite recorded
```

Pass rule: the test was observed failing on the assertion before the code, then passing; the
full suite is green; the name states a behaviour, not an implementation detail; a bug fix
carries the reproducing test; a legacy change carries the characterization test. No
test is adjusted to fit the implementation. Evidence exists per cycle; red-flag phrases mean
the cycle was not followed.

## Pitfalls

- **Writing the test after the code.** It passes immediately and proves nothing; the red
  observation is the whole method.
- **Failing for the wrong reason.** An import error or a typo in the test is not a red test;
  fix until the assertion itself fails.
- **Green with a broken suite.** The new test passes and three old ones fail — broken, not
  progress.
- **Minimal code that is not minimal.** Adding options "for the future" turns TDD into
  speculative design; make only the test pass.
- **Skipping clean.** Duplication stays and the suite documents a mess; refactor with green
  tests on both sides.
- **Mocks everywhere, internals asserted.** Mock only at the seams and test through the
  interface; a test that mocks the subject, or asserts private fields and call order,
  freezes the implementation.
- **A bug fix without the reproducing test.** The bug returns next quarter; the test is the
  fix's proof and its regression guard.
- **"Tests later".** The later never comes, and the plan's check command has nothing to run.

## Portability

Works in any language and agent: the cycle is a discipline, not tooling. Use the repo's
runner (`pytest`, `npm test`, `go test`, `cargo test`) and its test layout; no subagent or
slash command is needed. Evidence in
`.orbit/task/<id>/evidence.md` is plain Markdown read by `prove-done`, reviews and
`handoff-session`, so the red → green history survives a session break.

## What's improved vs the source

- Tests come straight from spec scenarios — trace "requirement → test → code" across the
  pipeline.
- A path for existing code without tests (characterization test) and three test levels.
- Evidence goes into the shared `evidence.md`, read by `prove-done` and reviews.
- "Watch it fail for the right reason" is explicit, including the compile-error trap; red
  flags are named.

## Based on

- [Superpowers](https://github.com/obra/superpowers) — method «test-driven-development» (MIT). Rewritten in our own words and improved — see "What's improved".

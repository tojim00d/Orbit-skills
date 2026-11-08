---
name: find-root-cause
description: '[Orbit 2.5.1 Debugging] Fast reproduction loop first, then the cause, then one fix with a test. Use when: «баг», «не работает», «упал тест», «почему падает», «воспроизведи баг», «найди причину»; debug, root cause, reproduce the bug.'
---

# find-root-cause — find the root cause before fixing

> **Orbit · ② Build · step 2.5.1 Debugging**
> **Input:** a bug, a failing test ← `build-backend`
> **Output:** cause + fix in `.orbit/task/<id>/evidence.md` → next `fix-ci`
> **Works with:** `test-first`, `keep-learnings`
> **Shared rules:** reply in the user's language per `speak-plain`; generated content (maps, diagrams, comments, docs, artifacts) defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md` at the pack root).

Main rule: **cause first, fix second.** Treating a symptom is a failure even if the test turns green. A fix that does not name the cause is a guess — it comes back, and the next person starts from zero.

## When to use

- A user reports "it doesn't work", a test fails, or a pipeline is red in a way the diff does not explain.
- The same bug appears for a second time, or a previous fix did not stick.
- The failure is intermittent: green locally, red in CI, order-dependent.
- You are about to write a fix and cannot finish the sentence "this happens because …".
- A test turns green after a `sleep` or a retry — a symptom is being hidden, not a cause found.

Do **not** use it when the cause is already proven and only the fix remains: go straight to `test-first` and let `prove-done` check the result.

## Inputs

Read before touching the debugger:

- the failing command and its **full** output: stack trace, exit code, the first frame that belongs to your code;
- the reproduction command, if the report has one: `pytest tests/api -k orders`, a `curl`, a UI scenario;
- what changed: `git log --oneline -30`, `git diff <last-good-sha>..HEAD`, lockfile and dependency versions, config and environment variables;
- previous work on the same area: `.orbit/task/<id>/brief.md`, `.orbit/knowledge/overview.md`, `.orbit/learnings/*.md`, `git log -S "<symbol>"`;
- the code around the crash: `rg -n "<symbol>" src/ | head -40`.

If the bug does not reproduce, say so in one line and collect the missing data — logs, inputs, versions, environment — instead of guessing a fix. A missing reproduction is itself the first finding.

## Procedure

1. **Build the fast feedback loop before thinking.** One command that shows the bug in seconds: a single test, a script, a `curl`, a tiny fixture. A slow loop makes debugging slow. Record the command; it becomes the regression test later.
2. **Read the error completely.** Stack, message, code, and the **first** frame in your code — not the last log line. A frame inside a library usually means the value passed to it is wrong.
3. **Establish what changed.** `git log` and `git diff` against the last known-good commit; if the history is long, narrow mechanically:
   ```bash
   git bisect start
   git bisect bad HEAD
   git bisect good <last-good-sha>
   git bisect run pytest tests/api -k orders -x
   git bisect reset
   ```
   Bisect answers "which commit" in minutes; the diff of that commit answers "which line".
4. **Trace the data backwards.** From the crash site to the first place the value became wrong: log the value at the entry and exit of each function on the path. The first divergence is the cause candidate; everything after it is consequence.
5. **Log every boundary in multi-stage systems.** Frontend → API → queue → worker → DB: one run with a correlation id logged at each hop shows where the request stops matching expectations.
6. **Compare with working code.** Find the same scenario that works — an older version, a sibling handler, a passing fixture. Write down **every** difference, including the ones you think are irrelevant; the bug is usually in one of them.
7. **Form one hypothesis.** "Cause X because Y" — one sentence. Design a minimal experiment that varies one thing. If it fails, form a new hypothesis; do not stack a second fix on the first.
8. **Write the failing test before the fix** (`test-first`). It must fail on the bug and pass after; if it cannot fail, it does not test the bug.
9. **Apply one fix of the cause**, then run the failing test and the surrounding suite. Check the test count — a fix that breaks three other tests is not a fix.
10. **Record evidence and save knowledge.** Put command/output/conclusion into `.orbit/task/<id>/evidence.md`. If the cause was non-obvious, write it to `.orbit/learnings/` with `keep-learnings` so the next investigation starts from the answer. Remove temporary logs and debug flags from the diff.

## Output

Two artifacts, both short:

```markdown
# Cause: orders report lands on the wrong day

**Symptom:** `pytest tests/export -k day` fails for orders created after 21:00 MSK.
**Cause:** `billing/close_day.py:47` compares a UTC timestamp with a date computed in
local time, so every order in the last 3h of the day is assigned to the next day.
**Evidence:** before fix — `pytest tests/export -k day` → 1 failed; after → 4 passed.
**Fix:** compute the business date once, in one time zone (`close_day.py:47-52`).
**Test:** `tests/export/test_close_day.py::test_late_order_stays_in_day`.
```

- cause + fix summary above → `.orbit/task/<id>/evidence.md` (read by `prove-done` and `request-review`);
- non-obvious cause → `.orbit/learnings/<slug>.md`: symptom, cause, rejected hypotheses, and the check that catches a regression.

## Check

Run the loop instead of trusting memory:

```bash
git diff --stat                     # fix is small and touches the cause site
pytest tests/export -k day -q       # the regression test is green
pytest -q                           # the rest of the suite is unchanged
```

Pass rule: the new test failed before the fix and passes after it; the full suite has no new failures; `evidence.md` contains command, output and conclusion; no debugging leftovers (`rg -n "print\(|console\.log|breakpoint"`). If the cause cannot be proven, say so and list what would prove it — never report "fixed".

## Pitfalls

- **"Let me quickly try this."** An edit without a hypothesis is a coin flip. State "X because Y" first; the experiment follows from it.
- **Third failed attempt.** After three failed fixes the mental model — or the architecture — is wrong. Stop, write down what was ruled out, and discuss with the person before the fourth.
- **Sleeping a flaky test.** `sleep` makes the failure rarer, not gone. Wait for a condition; `tools/find-polluter.sh` finds a test that pollutes shared state for the next one.
- **Two changes in one experiment.** You will not know which one helped. One variable per run, even if it is slower.
- **A fix with no failing test.** Without the red test you cannot show what was broken, and the bug returns silently. The test is part of the fix.
- **Debug output left in the diff.** Temporary logs and flags end up in review and production. Remove them before `prove-done`.
- **Letting the cause disappear.** A non-obvious cause that lives only in the chat gets investigated twice. One line in `.orbit/learnings/` is enough.

## Portability

No Claude-only features: reproduce, bisect, log and test with the repository's own tools. Without subagents, run the investigation inline; without the `tools/` helpers, replace `find-polluter.sh` with a loop that runs the suite in different orders (the `pytest-randomly` plugin shuffles for you). `git bisect run` works in every git CLI; the evidence file is plain Markdown, readable by any later agent.

## What's improved vs the source

- Two methods merged: four-phase scientific debugging and "fast reproduction loop first".
- `git bisect run` and boundary logging as standard narrowing tools.
- Non-obvious causes are saved to the project's knowledge so the bug is not investigated twice.
- The reproduction command is reused as the regression test, so "fixed" is checkable.

## Based on

- [Superpowers](https://github.com/obra/superpowers) — method «systematic-debugging» (MIT). Rewritten in our own words and improved — see "What's improved".
- [Matt Pocock Skills](https://github.com/mattpocock/skills) — method «diagnosing-bugs» (MIT). Rewritten in our own words and improved — see "What's improved".
- Helper files in `tools/` are taken from the source unchanged; licences: `tools/LICENSE.upstream`.

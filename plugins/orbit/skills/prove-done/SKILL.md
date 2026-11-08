---
name: prove-done
description: "[Orbit 2.6.1 Quality checks] No \"done\" without a fresh check and its output in evidence.md. Use when: «готово?», «проверь, что работает», «докажи, что готово», перед коммитом; verify before done, proof of done."
---

# prove-done — no "done" without proof

> **Orbit · ② Build · step 2.6.1 Quality checks**
> **Input:** "looks done" ← `fix-ci`
> **Output:** `.orbit/task/<id>/evidence.md` → next `request-review`
> **Works with:** `test-first`, `finish-branch`
> **Shared rules:** reply in the user's language per `speak-plain`; generated content (maps, diagrams, comments, docs, artifacts) defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md` at the pack root).

Before saying "done", "fixed", "tests pass", before a commit or an MR — a **fresh** check and its output. Not "should work" but "here is the command, here is the result".

## When to use

- You are about to type "done", "fixed", "works", "tests pass".
- Before a commit, a push, an MR, or any deploy step.
- A subagent, a teammate or another model reports "finished" — their word is not proof.
- Every item in `.orbit/task/<id>/plan.md` is about to be marked `[x]`.
- `finish-branch`, `open-mr` or `handle-review` needs to know whether the work is actually finished.

Do **not** use it as a substitute for a code review — a green check does not mean correct requirements. `review-code` and `check-parity` still apply.

## Inputs

- the **claim** you are about to make, in one sentence, with its scope ("the export endpoint handles 10 000 rows");
- the done-criteria: `.orbit/task/<id>/brief.md` "Done when" items, or the spec scenarios;
- the check commands: test suite, build, type check, linter, `curl` for an endpoint, a browser scenario for UI;
- the existing `.orbit/task/<id>/evidence.md` — append, never overwrite; previous runs are history;
- the diff: `git diff <base>...HEAD --stat`, so you check the right scope and nothing unrelated is hidden in it.

If a done-criterion has no command attached, propose one and write it down; a criterion nobody can check is not a criterion.

## Procedure

1. **Write the claim down before running anything.** "Bug fixed", "feature works", "build green" are different claims with different proofs. Vague claims produce vague checks.
2. **Map each claim to the command that proves it.** Use the table in "Output" as the contract; if no command exists for a claim, the claim is not verifiable yet — fix that first.
3. **Run the check now, fully.** Not from memory, not "it passed last time", not a single test file when the claim is "the suite is green". Capture the exit code explicitly:
   ```bash
   set -o pipefail
   pytest -q 2>&1 | tee /tmp/check.log; echo "exit=$?"
   npm run build 2>&1 | tee /tmp/build.log; echo "exit=$?"
   ```
4. **Read the whole output.** Exit code, test count, skipped/xfail count, warnings that matter, and whether the run covered the code you changed. "142 passed" when 30 were skipped is not a full run.
5. **Compare the result to the claim.** If the check is green but does not exercise the claim, the claim is unproven — pick a check that does. If the run is red, the claim is wrong; say so.
6. **Prove the negative case.** "Bug fixed" means the test that failed on the bug now passes — name that test. A new test that never failed proves nothing.
7. **Check the scope.** `git diff --stat` should match the task; no unrelated files, no debug leftovers (`rg -n "console\.log|print\(|breakpoint|TODO"` in the diff) and no secrets.
8. **Log evidence.** Append a dated block to `.orbit/task/<id>/evidence.md` with the exact command, the relevant output and a one-line conclusion.
9. **Tick the criteria.** For each "Done when" item, record where its proof is. Any unticked item keeps the task `[~]` in `plan.md`, not `[x]`.
10. **If you cannot verify, say it plainly.** "Not verified because <reason>; it can be verified by <command/environment>." Never present unverified work as done — an honest gap is recoverable, a false "done" is not.

## Output

`.orbit/task/<id>/evidence.md` — append-only, one block per check:

```markdown
## 2026-11-08 14:20 — task 3 (export 10k rows)

$ pytest tests/export -q
41 passed, 0 failed in 8.2s   (exit=0)
$ curl -s -o /tmp/out.csv -w "%{http_code}" "$API/reports/orders.csv?rows=10000"
200
Conclusion: 10k-row export returns 200 and the file opens with UTF-8 headers.
Done-criteria: brief#1 covered by `pytest tests/export`; brief#2 by the curl above.
```

What proves what:

| Claim | Proof |
|---|---|
| tests pass | full run, 0 failed, count matches expectation |
| bug fixed | the test that failed on the bug is now green |
| build works | build command exit code 0 |
| requirement met | every brief/spec criterion ticked with its own proof |
| agent finished the task | you checked the diff and ran the check yourself, not the agent's word |

## Check

This skill is done when the evidence artifact itself passes:

```bash
test -s .orbit/task/<id>/evidence.md
rg -n "^\$ |exit=|Conclusion:" .orbit/task/<id>/evidence.md
git diff <base>...HEAD --stat
rg -n "console\.log|breakpoint|password\s*=" $(git diff --name-only <base>...HEAD)
```

Pass rule: the latest evidence block contains the command, its output and a conclusion; the command exits 0 when re-run now; every "Done when" item maps to a proof; the diff scope matches the task. Anything less is a `[~]`, not a `[x]`.

## Example

A teammate says "the export is fixed":

```text
1. Claim: "10k-row CSV export works" (not "everything is done").
2. Proof: pytest tests/export -k csv + curl the endpoint with rows=10000.
3. Run now:
   $ pytest tests/export -k csv -q
   41 passed, 0 failed   (exit=0)
   $ curl -s -o /tmp/out.csv -w "%{http_code}\n" "$API/reports/orders.csv?rows=10000"
   200
5. Compare: claim says 10k rows; test parameterized at 10 000 — matches.
6. Negative case: test_csv_10k was red before the fix (commit abc123, log kept).
7. Scope: git diff --stat shows only services/export/ — matches brief.
8. Evidence block appended to .orbit/task/ABC-42/evidence.md.
9. brief#1 and brief#2 ticked; plan.md task 3 -> [x].
```

## Pitfalls

- **"Should work" / "looks fine".** These are predictions, not checks. Run the command and quote the output.
- **"It passed earlier."** Earlier is not now — the branch moved. Re-run the command in this state.
- **A partial run for a full claim.** Running one test file and reporting "tests pass" overstates. Run the scope the claim names.
- **Trusting the agent's or subagent's summary.** A delegated agent reports success optimistically; run the check yourself.
- **Stale or cherry-picked output.** Quoting a log from before the last commit, or only the lines that look good, is fabrication. Paste the real output.
- **Skipped tests counted as passed.** Check the skip count; a suite that skips the changed area proves nothing.
- **Green but irrelevant.** A passing linter does not prove the feature; match the check to the claim.
- **Overwriting evidence.** Deleting an old block erases the history that makes a claim auditable. Append only.
- **Presenting "can't verify" as done.** Say what is missing and how to verify it; that is a legitimate outcome, a false success is not.

## Portability

Every command here is a normal CLI command; the artifact is plain Markdown. Without subagents, run the check inline — the rule "fresh command, full output, recorded" does not depend on the agent. Without a test suite, use the strongest observable check available (`curl`, a script, a manual scenario with expected result) and write down what was observed.

## What's improved vs the source

- Evidence does not get lost in chat: a shared `evidence.md` read by reviews, the MR and `handoff-session`.
- A "claim → proof" table and an honest path for "can't verify — why and how to verify".
- The negative case is mandatory: a regression test must have been red before it can prove a fix.
- Scope and debug-leftover checks are part of the gate, not an afterthought.

## Based on

- [Superpowers](https://github.com/obra/superpowers) — method «verification-before-completion» (MIT). Rewritten in our own words and improved — see "What's improved".

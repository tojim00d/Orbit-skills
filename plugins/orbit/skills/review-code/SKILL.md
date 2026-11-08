---
name: review-code
description: "[Orbit 2.6.4 Quality checks] Review a change: bugs, security, spec compliance, scale, tests, contracts. Use when: «сделай ревью», «проверь MR», «проверь код»; code review, review MR."
---

# review-code — review a change

> **Orbit · ② Build · step 2.6.4 Quality checks**
> **Input:** diff / MR ← `trace-impact`, `handle-review`
> **Output:** findings in `.orbit/task/<id>/review.md` → next `cut-complexity`
> **Works with:** `trace-impact`, `review-security`
> **Shared rules:** reply in the user's language per `speak-plain`; generated content (maps, diagrams, comments, docs, artifacts) defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md` at the pack root).

Review a diff, a branch or an MR: find what will break before merge. Look for problems — bugs, security, missing spec, scale, untested risk, broken contracts — not for style the linter already catches.

## When to use

- An MR/PR is waiting for review, or you review your own branch before `finish-branch`.
- A diff touches billing, auth, data migration or an external contract — the classes where mistakes are expensive.
- `handle-review` returned findings and you need an independent pass over the same change.
- A refactor claims "behavior unchanged" and you need to verify that claim against the spec.
- After `trace-impact` produced the dependency radius of the change.

Do **not** use it for a formatting argument — the formatter owns style. Complexity-only cleanup goes to `cut-complexity`; a deep security audit of a service goes to `review-security`.

## Inputs

- the goal: `.orbit/task/<id>/brief.md`, the spec, and the MR description — a change can only be reviewed against intent;
- the radius from `trace-impact`: who calls the changed functions, which events/contracts move;
- the diff: `git diff <base>...HEAD`, `glab mr diff <id>`, or `gh pr diff <n>`;
- the surrounding code of every changed hunk — read the whole function, not only the diff;
- the existing `.orbit/task/<id>/review.md` so earlier findings are not re-raised or lost.

If there is no base, ask for it or use `git merge-base <base-branch> HEAD` and state which base you used.

## Procedure

1. **Restate the change in one sentence.** "Adds a CSV export endpoint behind auth, with a 10k-row cap." If the diff does more than that sentence, that is already a finding.
2. **Read the spec and the brief before the code.** Note the scenarios that must be implemented and the "Not doing" list; later, every scenario is either implemented-and-tested or a finding.
3. **Walk the diff in dependency order,** starting where the radius is widest: public handlers, event consumers, schema changes. For each hunk, read the surrounding function.
4. **Hunt bugs first.** Wrong result, crash, and the missed edges: empty input, zero, one element, the last item, time zones and date boundaries, concurrent access, check-then-write races, retries and duplicates, partial failure.
5. **Check security and data.** Authorization on every entry point, IDOR on `/{id}` routes, injection through strings, secrets or tokens in code and logs, data loss, irreversible migrations. A finding here points to `review-security` for detail — but is still reported.
6. **Check spec compliance.** Every WHEN/THEN scenario implemented and covered by a test; nothing added that the spec did not ask for. Missing tests on a scenario is a finding, not a suggestion.
7. **Check scale.** N+1 queries, loading a table into memory, no pagination, no timeouts, unbounded retries, work inside a loop that should be batched. Name the worst expected size and what breaks at it.
8. **Check tests and contracts.** Risky logic without a test; tests that assert implementation instead of behavior; API/event/schema changes backward compatible, with the OpenSpec entry and `docs/project-map/` updated (`run-spec-loop`).
9. **Verify every finding before writing it.** Read the code path again, reproduce with a command or a test where possible. If it is still uncertain, it goes to **Questions**, not to **Must fix**.
10. **Write the report by severity** into `.orbit/task/<id>/review.md`; complexity-only items route to `cut-complexity`, security detail to `review-security`.

## Output

`.orbit/task/<id>/review.md`, section `## Code review <date>`:

```markdown
## Code review 2026-11-08 (base d34f21c)

### Must fix
1. **Orders land on the wrong day** (`billing/close_day.py:40-52`) — the timestamp is
   compared in UTC but the business date is computed in local time; every order after
   21:00 MSK is billed to the next day. Reproduce: `pytest tests/billing -k late_order`.
   Fix: compute the business date once, in the order's time zone.
2. **Export has no authz check** (`api/reports.py:31`) — any authenticated user can read
   another tenant's report. See `review-security` #2.

### Should fix
3. N+1 on order lines (`api/orders.py:88`) — 1 + n queries for a 50-line order.

### Minor
4. Retry interval is a magic number (`orders/retry.py:12`) — reuse `RETRY_DELAY`.

### Questions
5. Is the 10k-row cap per request or per tenant? The spec says "per report".
```

## Check

```bash
BASE=$(git merge-base origin/main HEAD)
git diff "$BASE"...HEAD --stat        # scope matches the sentence from step 1
rg -n "Must fix|Questions|file" .orbit/task/<id>/review.md
pytest -q                               # reproduce a "bug" finding when possible
```

Pass rule: every Must-fix finding names `file:line`, what breaks and a reproduction or a precise reasoning path; every uncertain item is under Questions; spec scenarios are ticked against the diff; the report exists in `.orbit/task/<id>/review.md`. An unconfirmed suspicion written as Must fix is a defect in the review itself.

## Pitfalls

- **Reviewing style.** The linter and formatter already fail the pipeline for that. Spend the review on behavior.
- **Unconfirmed findings.** A plausible bug that was never reproduced may be wrong; write either the exact path or a question.
- **Reading only the diff.** A hunk is meaningful in its function: nulls, locks and callers live outside the changed lines.
- **Skipping the spec loop.** Code that implements nothing the spec asked for is a finding, and so is a spec scenario with no test.
- **Ignoring backward compatibility.** A renamed field or changed event breaks consumers that are not in this repository. Check the radius from `trace-impact` and the published contract.
- **Rubber-stamping because tests are green.** Green tests prove what they cover, not what they miss. The untested risk classes are the point of the review.
- **Severity inflation.** Everything as "Must fix" makes the author fix nothing important first. Reserve Must for merge-blocking issues.

## Portability

Works with any agent and any forge: `git diff` plus the repository's test command is enough; `glab`/`gh` only shorten the reading of MR metadata. Without `trace-impact`, reconstruct the radius with `git grep "<symbol>"` and `git log -L`. The report is plain Markdown in the shared `review.md`, so `handle-review` and `finish-branch` consume it without Claude-specific features.

## What's improved vs the source

- Three review approaches merged into one prioritized order.
- Mandatory check of the "spec → code → map" loop and contract backward compatibility.
- Every finding is confirmed before reporting; doubtful ones go to questions.
- Findings are routed by type: complexity to `cut-complexity`, security detail to `review-security`, so nothing is lost between skills.

## Based on

- [Matt Pocock Skills](https://github.com/mattpocock/skills) — method «code-review» (MIT). Rewritten in our own words and improved — see "What's improved".
- [Ponytail](https://github.com/DietrichGebert/ponytail) — method «ponytail-review» (MIT). Rewritten in our own words and improved — see "What's improved".

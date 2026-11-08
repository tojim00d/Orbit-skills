---
name: handle-review
description: "[Orbit 2.6.3 Quality checks] Take review with verification: fix what's right, push back with facts, add nothing extra. Use when: «ответь на ревью», «замечания ревьюера», «разбери комментарии»; address review comments, respond to review."
---

# handle-review — take review with verification, not blindly

> **Orbit · ② Build · step 2.6.3 Quality checks**
> **Input:** findings ← `request-review`
> **Output:** decisions in `.orbit/task/<id>/review.md` → next `review-code`
> **Works with:** `keep-it-small`
> **Shared rules:** reply in the user's language per `speak-plain`; generated content (maps, diagrams, comments, docs, artifacts) defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md` at the pack root).

A reviewer's comment is a hypothesis, not an order. Verify it against the code, then act — fix it, push back with facts, or defer with a ticket. Automatic agreement and silent ignoring are both failures: the first adds code nobody needed, the second leaves a known problem open.

## When to use

- A review round returns comments on your branch, MR/PR or task.
- An agent reviewer (or a second model) produced findings and you need to decide what is true.
- A person left one urgent remark in chat and the rest is in the tracker — merge the sources before acting.
- You inherited a branch with unresolved threads and need to close them honestly.
- After `request-review`, as the step between findings and the next fix.

Do **not** use it to re-litigate decisions that are already recorded in the brief or an ADR — cite the decision and close the comment instead.

## Inputs

- all comments in one place: MR threads (`glab mr view <id> --comments` / `gh pr view <n> --comments`), `.orbit/task/<id>/review.md`, chat and tracker;
- the change under review: `git diff <base>...HEAD`, plus the files at the commented lines — read the current code, not the diff hunk alone;
- the intent: `.orbit/task/<id>/brief.md`, the spec, and past decisions in `.orbit/learnings/` or ADRs;
- the checks you will re-run: the test command, type check, build;
- severity from the reviewer: blocker / important / minor. If missing, triage it yourself before acting.

If a comment is unreadable (no file, no example), that is a question, not a task — ask for the specific case.

## Procedure

1. **Collect every comment into one list.** Review threads, chat and the review artifact drift apart; one list prevents closing a thread that was never addressed. Number them for the record.
2. **Order by severity: blockers and security first, then important, then minor.** Fixing a naming nit while a data-loss blocker is open wastes the round.
3. **Understand each comment before evaluating it.** If it is unclear, ask **one** concrete question: "Do you mean the retry path in `orders/retry.py:40` or the scheduler?" Guessing the intent produces a fix for the wrong problem.
4. **Verify the claim against the code.** Is it true for this codebase? Can you reproduce it? Does it contradict the spec, the brief, or a recorded decision? Read the surrounding function, not just the line.
5. **Act on the verdict:**
   - **Right** → fix it; if it changes behavior, add or adjust a test. Reply briefly: "Fixed at `orders/retry.py:44` — added a test for the double-submit case."
   - **Wrong** → push back with facts, not opinion: "`tests/orders/test_retry.py:88` already covers this path", "the spec requires 409 here, not 400".
   - **"For the future" / "more professional"** → check `keep-it-small`: if it is not needed for this task, do not add it. Explain why in one line and offer a debt item instead.
6. **Reply in the thread, not only in the artifact.** The reviewer needs to see the decision at the code; a decision that exists only in `.orbit/` looks like silence.
7. **Re-run the checks after each batch.** A review fix touches behavior; a green suite before the fix does not prove the fix. Run the focused test, then the suite, then hand the final verification to `prove-done`.
8. **Close the loop in the artifact.** Update `.orbit/task/<id>/review.md`: comment → decision (fixed / pushed back / deferred with ticket id) → where. Never resolve a thread without a recorded decision.
9. **Ask for a re-review only after all blockers are handled.** A partial batch re-opens the same comments and burns trust.

## Output

`.orbit/task/<id>/review.md` — one table, append-only per round:

```markdown
## Review round 2 — 2026-11-08

| # | Comment (file:line) | Decision | Where / why |
|---|---|---|---|
| 1 | `orders/retry.py:40` retries a 409 — blocker | fixed | `orders/retry.py:44` + test `test_retry_409` |
| 2 | `api/handlers.py:88` should return 400 | pushed back | spec 4.2 requires 409; see `openspec/changes/...` |
| 3 | "use a builder for the response" | deferred | not needed for ABC-123; debt ticket ABC-140 |
| 4 | `export.py:12` unclear — which path? | question asked | waiting on reviewer, round 2 |
```

The same file is read by `review-code` and by `handoff-session`, so a new session knows what was decided without reading threads.

## Check

```bash
git diff <base>...HEAD --stat            # each "fixed" has a matching change
pytest -q                                # suite green after the fixes
rg -n "blocker|pushed back|deferred" .orbit/task/<id>/review.md
```

Pass rule: every collected comment appears in the table with one of `fixed` / `pushed back` / `deferred`; every `fixed` has a `file:line` and a test when behavior changed; every `pushed back` cites a test, spec line or decision; no thread is resolved without a reply. Record the final check in `.orbit/task/<id>/evidence.md` via `prove-done` before calling the round done.

## Pitfalls

- **"Great catch!" with no change.** Politeness is not a decision. The reply says what changed or why not, with a pointer.
- **Fixing without verifying the comment.** Reviewers are sometimes wrong, and an unnecessary rewrite of working code adds risk. Check first.
- **Silently ignoring a comment.** The thread stays open, the reviewer repeats themselves, and the round slows down. A one-line "pushed back because X" closes it.
- **Scope creep through "improvements".** A reviewer's preference is not a task requirement. Decide with `keep-it-small`; a deferred item needs a ticket, not a silent no.
- **Resolving threads to clear the list.** Resolving is a claim that the point is handled; it must be true in code or backed by an argument.
- **Losing the person's priority in a pile of nits.** Comments from the task owner carry priority; clarify the intent rather than being defensive, and ask before overriding.
- **Treating an agent reviewer's finding as a fact.** Agent reviews can be right and specific; verify them exactly like a human comment, reproduce when possible.

## Portability

Works in any agent: collect threads with `glab`/`gh` or copy them from the UI, verify in the code, and write the table into `.orbit/task/<id>/review.md`. Without a review CLI, keep the comment list in a plain file next to the artifact. No subagents or slash commands are needed; the protocol — verify, decide, reply, record — is tool-agnostic and survives a change of reviewer.

## What's improved vs the source

- Every comment gets a recorded decision in the shared `review.md` — nothing is lost between rounds.
- Linked with `keep-it-small` for declining unneeded "improvements".
- Severity ordering is explicit: blockers and security before style nits.
- Replies are required in the thread, so the reviewer sees the decision at the code.

## Based on

- [Superpowers](https://github.com/obra/superpowers) — method «receiving-code-review» (MIT). Rewritten in our own words and improved — see "What's improved".

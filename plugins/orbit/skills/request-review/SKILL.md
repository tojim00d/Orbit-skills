---
name: request-review
description: "[Orbit 2.6.2 Quality checks] Review by an independent agent with a standard package: goal, diff from base, criteria. Use when: «отдай на ревью», «посмотри свежим взглядом», «нужно независимое ревью»; request review, fresh eyes review."
---

# request-review — get a review from an independent agent

> **Orbit · ② Build · step 2.6.2 Quality checks**
> **Input:** a finished task ← `prove-done`
> **Output:** findings → next `handle-review`
> **Works with:** `review-code`, `delegate-tasks`
> **Shared rules:** reply in the user's language per `speak-plain`; generated content (maps, diagrams, comments, docs, artifacts) defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md` at the pack root).

After a task or before a merge — a review with fresh eyes. The reviewer did not see your reasoning, so they see what you missed. The quality of the review is decided before it starts: by the package you hand over and the base you froze.

## When to use

- A task in `delegate-tasks` is finished and needs a second pair of eyes before it joins the branch.
- Before `finish-branch` — review the whole branch, not only the last commit.
- After a tricky fix from `find-root-cause`, where a wrong fix looks plausible.
- Before `open-mr`, when the reviewer's comments should arrive before the MR does.
- When a change touches access, data or network paths and `review-security` must run in parallel.

Do **not** use it as a substitute for running the checks yourself — `prove-done` comes first. A review of unproven work wastes both reviewers.

## Inputs

- the proven state: `.orbit/task/<id>/evidence.md` with fresh checks; if it is missing, run `prove-done` first;
- the **recorded diff base**: the sha or branch recorded in `.orbit/task/<id>/plan.md` before work started, e.g. `git merge-base origin/main HEAD`;
- the goal: `.orbit/task/<id>/brief.md`, the spec, and the MR description if one exists;
- the diff scope: `git diff <base>...HEAD --stat` and the full diff;
- a reviewer who is independent: a subagent, a fresh session, a teammate, or a human. The author cannot be the reviewer.

If the base was never recorded, reconstruct it now with `git merge-base <base-branch> HEAD` and write it down before handing over — a diff against the wrong base is a review of the wrong change.

## Procedure

1. **Freeze the base and the diff.** Recompute and record the exact command and sha so the reviewer and you look at the same change:
   ```bash
   BASE=$(git merge-base origin/main HEAD)
   echo "$BASE" > .orbit/task/<id>/review-base.txt
   git diff "$BASE"...HEAD --stat
   ```
2. **Write the "what and why" in 2–3 lines.** What changed, what problem it solves, and a link to the brief/spec. Without it the reviewer invents intent and reviews their invention.
3. **List the criteria to review against.** At minimum: spec compliance, correctness (bugs and missed edges), tests (behavior, not implementation), security, unnecessary complexity. Add project-specific ones from `CONTRIBUTING.md` or the spec.
4. **State what a finding must contain.** Severity (`blocker` / `important` / `minor`), `file:line`, the concrete problem and a suggested fix. "Refactor this" is not a finding; "this blocks on line 40, use the existing `retry()`" is.
5. **Choose the reviewer and the mode.** For code-checking use `review-code`; add `review-security` when access, data or network changed. Give the reviewer the package, not your reasoning.
6. **Send the package.** Include the base sha, the diff command, the brief link, the criteria, and the instruction to **report, not edit** — the author applies the fixes:
   ```bash
   git diff "$(cat .orbit/task/<id>/review-base.txt)"...HEAD > /tmp/review.diff
   wc -l /tmp/review.diff
   ```
7. **Handle findings, not opinions.** Collect them into `.orbit/task/<id>/review.md` and run `handle-review`: fix, push back with facts, or defer with a ticket. Deduplicate against earlier rounds.
8. **Re-review only the changed scope.** After fixes, the diff may have moved; send the new base or the fix commits. A full second review of an unchanged branch is noise.
9. **Record the round.** In `review.md`: date, reviewer, criteria covered, findings count by severity, and the merge-readiness verdict. `finish-branch` and `open-mr` read this line.

## Output

The package you send (in chat or a file) and the round record in `.orbit/task/<id>/review.md`:

```markdown
# Review package — ABC-123 CSV export

**What:** adds CSV export for the orders report behind `GET /reports/orders.csv`.
**Why:** analysts copy the table by hand; task ABC-123, brief `.orbit/task/ABC-123/brief.md`.
**Base:** `d34f21c` (`git merge-base origin/main HEAD`), diff: `git diff d34f21c...HEAD`.
**Proof:** `.orbit/task/ABC-123/evidence.md` (41 tests green, curl 200 on 10k rows).

## Criteria
1. Spec 3.2: column order, UTF-8 BOM, 10 000-row cap.
2. Correctness: empty result, order without customer, date time zone.
3. Tests: behavior, not the export internals. 4. Security: authz on the endpoint.
5. Complexity: nothing beyond the task.

## Return format
`[severity] file:line — problem — suggested fix`. No edits; findings only.
```

## Check

```bash
BASE=$(cat .orbit/task/<id>/review-base.txt) && git diff "$BASE"...HEAD --stat
git log --oneline "$BASE"..HEAD
test -s .orbit/task/<id>/review.md && rg -n "Review round|merge-readiness" .orbit/task/<id>/review.md
```

Pass rule: the base is recorded and reproducible, the package contains what/why/criteria/return-format, the reviewer is independent of the author, and the round is recorded with a verdict. A review without those is a chat opinion, not a review; record it in `.orbit/task/<id>/evidence.md` so `finish-branch` can cite it.

## Pitfalls

- **Reviewing against an unrecorded base.** "The diff" against a stale `main` includes other people's changes and buries yours. Record the base before the review.
- **Sending the diff without the goal.** The reviewer then flags intentional changes as bugs and misses intent. Two lines of "what/why" prevent a wasted round.
- **A package with no criteria.** Without them the review drifts to style and misses spec gaps. List the criteria explicitly.
- **Letting the reviewer edit the code.** Report-only keeps authorship and accountability with the author; a reviewer who edits hides the reasoning from `handle-review`.
- **A vague finding.** "This is fragile" cannot be verified or closed. Demand `file:line`, the failure case and the fix direction.
- **Reviewing unproven work.** If `prove-done` has not run, the reviewer spends time on things the suite would catch. Prove first, then review.
- **Skipping the spec loop.** If the spec exists, the criteria include "spec scenarios implemented, OpenSpec entry and map updated". A code-only review misses the last mile.

## Portability

A reviewer can be any independent actor: another agent instance, a fresh session with the repository, a teammate or a person. Without subagents, start a fresh session, paste the package and ask for findings in the return format. Without `glab`/`gh`, `git diff <base>...HEAD` writes the diff to a file the reviewer can read. The base file and the `review.md` round are plain text, so the process works in any CLI-only setup.

## What's improved vs the source

- A standard reviewer package built on shared artifacts (spec, brief, recorded diff base).
- Review and response are linked through the shared `review.md`.
- The base sha is frozen and reproducible, so reviewer and author see the same change.
- A required return format makes findings actionable and comparable across rounds.

## Based on

- [Superpowers](https://github.com/obra/superpowers) — method «requesting-code-review» (MIT). Rewritten in our own words and improved — see "What's improved".

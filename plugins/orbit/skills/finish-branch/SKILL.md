---
name: finish-branch
description: "[Orbit 2.7.1 Release] Finish a branch: checks, options (MR/merge/keep), cleanup — with consent. Use when: «заверши ветку», «что дальше с веткой», «закрой ветку»; finish branch, close branch, merge or MR."
---

# finish-branch — finish a branch

> **Orbit · ② Build · step 2.7.1 Release**
> **Input:** a finished branch ← `check-parity`
> **Output:** MR / merge decision, recorded in `.orbit/task/<id>/evidence.md` → next `open-mr`
> **Works with:** `prove-done`, `handoff-session`
> **Shared rules:** reply in the user's language per `speak-plain`; generated content (maps, diagrams, comments, docs, artifacts) defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md` at the pack root).

The work is done — take it to a result. This step is a gate and a menu: checks first, then the person chooses what happens to the branch, and only then does anything get pushed, merged or deleted. No green menu until the branch is green.

## When to use

- Every task in `.orbit/task/<id>/plan.md` is done and proven, and the branch has no more planned work.
- The person asks "what now with the branch?" or a task is being closed.
- Before `open-mr`, to confirm the branch is actually ready to be proposed for merge.
- A branch was abandoned mid-work and its fate (keep, discard, hand over) must be decided.
- After a review round has been handled, as the last step before release.

Do **not** use it to skip checks — if `prove-done` is not green, this skill stops before the menu. Do not merge, push or delete anything without an explicit decision from the person.

## Inputs

- the task state: `.orbit/task/<id>/brief.md` (done-criteria), `.orbit/task/<id>/plan.md` (all tasks `[x]`?), `.orbit/task/<id>/evidence.md` (the proof);
- the branch: `git status`, `git log --oneline <base>..HEAD`, `git diff --stat <base>...HEAD`;
- the repo conventions: `CONTRIBUTING.md`, branch naming, whether the team merges locally or always via MR, whether `.orbit/` is committed;
- OpenSpec/state: `openspec/changes/<id>` and `docs/project-map/` when the repo uses them (`run-spec-loop`);
- the team's release practice: who may merge, protected branches, required checks.

If the base branch is not recorded, recover it with `git merge-base origin/main HEAD` and state it — the summary is meaningless otherwise.

## Procedure

1. **Run the full checks now** (`prove-done`): the whole suite and the build, not a targeted subset. Red → stop, report the failure, and there is **no menu** until it is green.
   ```bash
   set -o pipefail; pytest -q; echo "tests=$?"
   npm run build; echo "build=$?"
   git status --short
   ```
2. **Summarise the branch against the brief and the spec.** What is done, what is intentionally not done ("Not doing" from the brief), and every plan task marked `[x]`. A task still `[~]` means the branch is not finished.
3. **Check the state loop.** If the repo uses OpenSpec, the change entry exists and the map is updated (`run-spec-loop`); if not, say "not used" instead of inventing an entry.
4. **Present the four options — do not choose for the person.** Use the menu template in Output: open an MR/PR, merge locally into the base branch (only if that is the team's practice and allowed), keep the branch as it is, or discard the work by deleting the branch.
5. **Execute only the chosen option.** Push and MR need an explicit "yes" (`commit-clean`, `stay-in-scope`). Discard needs a second explicit confirmation — deleting a branch is irreversible for unmerged work.
6. **Clean up after the outcome.** Worktree: `git worktree list`, then `git worktree remove <path>` after merge or discard. Branch: delete only with consent (`git branch -d`, and `-D` only when the work is intentionally discarded). Remove temp files, debug logs and local scratch data from the working tree.
7. **Record the decision and the evidence.** Append the check results and the chosen option to `.orbit/task/<id>/evidence.md`; `plan.md` stays the source of task status. This is what a later session reads instead of asking again.
8. **Hand over if the work continues later.** If the branch is kept, write the state with `handoff-session` so the next session knows what remains — a kept branch with no note is a future re-investigation.

## Output

The menu (chat), and the decision block in `.orbit/task/<id>/evidence.md`:

```markdown
## Branch finish — ABC-123 feat/ABC-123-csv (2026-11-08)

Checks: `pytest -q` → 41 passed; `npm run build` → exit 0.
Tasks: 6/6 `[x]` in plan.md. Spec: brief#1, brief#2, no OpenSpec used.
Option chosen: open MR (person's reply: "yes, MR to main").
Next: `open-mr` → target `main`; after merge: delete branch + worktree.
```

The menu itself, in the person's language:

```text
Branch feat/ABC-123-csv is green (41 tests, build ok). What should I do?
1. Open an MR/PR to main            → I prepare the description and open it.
2. Merge locally into main          → only if that is our practice.
3. Keep the branch as is            → I write a handoff note.
4. Discard the work (delete branch) → needs a second explicit confirmation.
```

## Check

```bash
git status --short                  # clean: no scratch files, no debug logs
git log --oneline <base>..HEAD      # commits match the summary
git worktree list                   # no orphaned worktree after cleanup
test -s .orbit/task/<id>/evidence.md && rg -n "Branch finish" .orbit/task/<id>/evidence.md
```

Pass rule: the suite and build are green in this state; every plan task is `[x]`; exactly one option is recorded with the person's explicit consent; nothing was pushed, merged or deleted before that consent; the decision block exists. If any check fails, report the branch as not ready instead of offering the menu.

## Pitfalls

- **Choosing the option yourself.** "I opened the MR since it was obviously ready" violates scope for this step. Present, wait, then execute.
- **Deleting the branch on a "yes" to something else.** Discard is a separate, explicit confirmation — the words must name deleting the work.
- **Offering the menu on red checks.** A red branch with options invites a bad merge. Stop, report the failing check, fix it first.
- **Cleaning up before the merge lands.** Removing the worktree or branch while the MR is open leaves nothing to fix review comments in.
- **Force-pushing a shared branch.** Rewriting history on a branch someone else has is destructive; use a normal push unless the team requires otherwise.
- **Forgetting the state loop.** A finished branch with no OpenSpec entry or map update comes back as "the spec does not describe what shipped".
- **A dangling worktree with uncommitted work.** `git worktree remove` refuses or loses changes — check `git status` inside the worktree first.
- **Keeping a branch with no handoff.** Months later nobody knows why it exists. One handoff file closes that gap.

## Portability

Everything is plain git plus the project's test/build commands; the menu is a chat message and the decision is Markdown. Without subagents or slash commands, run the same steps inline and ask the four questions in words. If the forge CLI is unavailable, `open-mr` and merging can be done by the person; this skill only records and executes the choice. No Claude-specific features are required.

## What's improved vs the source

- Checks the "spec → code → map" loop before finishing.
- Push, merge and deletion only with explicit consent, per scope and commit rules.
- A recorded decision block in `evidence.md`, so a later session does not repeat the branch analysis.
- Discard is separated from the other options and needs its own confirmation.

## Based on

- [Superpowers](https://github.com/obra/superpowers) — method «finishing-a-development-branch» (MIT). Rewritten in our own words and improved — see "What's improved".

---
name: isolate-branch
description: '[Orbit 2.4.5 Implementation] An isolated branch or worktree for the task, within scope. Use when: «отдельная ветка», «worktree», «изолируй задачу», «не трогай текущую ветку»; new branch, worktree, isolate work.'
---

# isolate-branch — an isolated branch or worktree for the task

> **Orbit · ② Build · step 2.4.5 Implementation**
> **Input:** feature start ← `run-parallel`
> **Output:** branch / worktree + baseline → next `code-backend`
> **Works with:** `stay-in-scope`, `finish-branch`
> **Shared rules:** reply in the user's language per `speak-plain`; generated content defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

Feature work must not break the current repo state or other tasks. Two isolation tools:
a **branch** for one stream of work on a clean tree, a **worktree** for parallel tasks or when
the current tree must stay untouched. The decision is cheap now and expensive later —
uncommitted experiments in a shared tree are how a task starts with a mystery diff.

## When to use

- The first code change of a task starts and the repo is shared or busy.
- Two tasks must run side by side: separate worktrees, separate branches, no file collisions.
- The current working tree has experiments that must not be mixed into the task.
- An agent will work autonomously and the main tree must stay usable meanwhile.
- Not when the repo forbids branches or the team works trunk-only: `stay-in-scope` wins —
  work on the agreed tree, or ask for consent.

## Inputs

- The task scope: `.orbit/task/<id>/brief.md` — repositories, allowed actions (edit /
  commit / branch / MR), and the branch policy from `stay-in-scope`.
- Repo rules: `CONTRIBUTING.md`, `.github/` templates, `git log --oneline -20` for the
  branch-name and merge conventions, `git branch -a` for the current base.
- The task key (e.g. `ABC-123`) and the base branch (`main`, `master`, `develop`) — confirm
  the base, never assume.
- The repo's install and test commands (`Makefile`, `package.json`, `pyproject.toml`,
  `go.mod`) — the baseline must use the same ones the CI uses.
- If branches are not allowed or the base is unclear, ask before creating anything.

## Procedure

1. **Check the scope gate.** Are branches allowed in this repo for this task
   (`stay-in-scope`)? No consent → work without a branch or ask; never create a branch in a
   repo where the team did not agree to it.
2. **Confirm the base and the tree state.** `git status --porcelain` must be clean before
   creating isolation; a dirty tree means the change is already entangled — commit, stash or
   ask. `git branch --show-current` tells you where you are.
3. **Choose branch or worktree.** Branch: one stream of work, clean tree, no parallel work.
   Worktree: parallel tasks, or the current tree must stay untouched.
4. **Name the branch per the repo's rules** using the task key from `commit-clean`:
   `feature/ABC-123-short` (or the repo's prefix convention). Never invent a key.
5. **Create the branch from a fresh base:**
   ```bash
   git fetch origin
   git switch -c feature/ABC-123-csv-export origin/main
   ```
   Branching from a stale local `main` silently adds other people's commits to the diff.
6. **Create a worktree when needed, outside the repo or in an ignored folder:**
   ```bash
   git worktree add ../<repo>-ABC-123 -b feature/ABC-123-csv-export origin/main
   ```
   If the worktree lives inside the repo, add `.worktrees/` to `.git/info/exclude` (not to
   `.gitignore`) so it never shows in `git status`.
7. **Install dependencies in the new tree** with the repo's command (`npm ci`, `uv sync`,
   `go mod download` — use the one in the repo docs). A worktree without dependencies
   fails the baseline for the wrong reason.
8. **Record the baseline before any change.** Run the repo's full check in the new tree
   (`pytest -q`, `npm test`, `make check`) and save the output. Red before you → report it,
   do not silently fix it; a red baseline changes what "green" can mean later.
9. **Record branch, worktree path and base commit** in `.orbit/task/<id>/plan.md` and the
   baseline output in `.orbit/task/<id>/evidence.md`, so reviews and `finish-branch` use
   the same base.
10. **Clean up only after `finish-branch`:** `git worktree remove <path>`; delete the branch
    only after the merge and with consent. A worktree left behind confuses the next task.

## Output

A branch or worktree plus the baseline record:

```markdown
## Isolation — ABC-123
Branch: feature/ABC-123-csv-export
Worktree: ../<repo>-ABC-123 (excluded via .git/info/exclude: .worktrees/)
Base: origin/main @ 8a31f2e (2026-11-08 20:05)
Baseline: `npm ci` → ok; `pytest -q` → 118 passed, 0 failed
Notes: tree was clean before creation; no experiment branches touched
```

Evidence in `.orbit/task/<id>/evidence.md`:

```markdown
## 2026-11-08 20:10 — baseline on feature/ABC-123-csv-export
$ git status --porcelain → (empty)
$ git merge-base --is-ancestor origin/main HEAD → yes
$ pytest -q → 118 passed (baseline green before edits)
```

## Check

```bash
git worktree list                                # worktree registered, path correct
git branch --show-current                        # expected branch name
git status --porcelain                           # empty before the first edit
git merge-base --is-ancestor origin/main HEAD    # base is fresh
git check-ignore -v .worktrees/ 2>/dev/null       # worktree dir is excluded
pytest -q                                        # baseline recorded (or the repo's check)
```

Pass rule: the current branch has the expected task-key name; the tree is clean before work;
the branch started from the intended fresh base; a worktree is outside the repo or excluded;
the baseline check ran and its output is recorded. Red baseline is reported, not ignored —
`evidence.md` says what was red and why the task can proceed (or the task stops).

## Pitfalls

- **Branching from a stale local base.** The diff includes other people's commits and the
  review blames your task; fetch and branch from `origin/<base>`.
- **Carrying a dirty tree into the branch.** Unrelated edits become part of the task and
  the reviewer cannot separate them; clean or stash first.
- **Worktree inside the repo without an exclude.** `git status` fills with the worktree
  path; `.git/info/exclude` is the right place, not the shared `.gitignore`.
- **Skipping the baseline.** A test that was already red gets blamed on the change; run the
  full check before editing.
- **Deleting the branch too early.** Branch deletion before merge loses the review anchor;
  delete only after merge with consent.
- **Inventing a branch or task key.** Repo tooling links branches to tickets; use the key
  from `commit-clean` or ask.
- **Forgetting dependencies in a fresh worktree.** A failing import in a clean tree looks
  like a code bug; install and rerun the baseline.
- **Parallel agents on one tree.** Two agents editing the same checkout overwrite each
  other; one worktree per task (`run-parallel`).

## Portability

Plain git: no subagents, no slash commands, no CI dependency. Worktrees are a git feature,
so any agent with a shell can use them; if the repo does not allow them (some CI images do
not support multiple worktrees), fall back to a branch and keep the same baseline record.
The state lives in `.orbit/task/<id>/plan.md` and `evidence.md`, so another session can see
where the work lives and what base it started from.

## What's improved vs the source

- Branch creation obeys the scope rule and the task-key format.
- Worktrees don't litter the repo: the directory is excluded via `.git/info/exclude`.
- The base commit and the baseline output are recorded, so review and `finish-branch` share
  one diff anchor.
- Red baseline handling is explicit: report, don't silently repair.

## Based on

- [Superpowers](https://github.com/obra/superpowers) — method «using-git-worktrees» (MIT). Rewritten in our own words and improved — see "What's improved".

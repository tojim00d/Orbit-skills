---
name: open-mr
description: "[Orbit 2.7.2 Release] An MR/PR that's easy to accept: size, description with risks and OpenSpec/map, pre-flight. Use when: «открой MR», «опиши PR», «создай merge request»; open merge request, pull request, write MR description."
---

# open-mr — prepare an MR/PR that's easy to accept

> **Orbit · ② Build · step 2.7.2 Release**
> **Input:** a branch ← `commit-clean`, `finish-branch`
> **Output:** MR / PR URL + description → next `ship-k8s`
> **Works with:** `commit-clean`, `handle-review`
> **Shared rules:** reply in the user's language per `speak-plain`; generated content (maps, diagrams, comments, docs, artifacts) defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md` at the pack root).

Description, splitting, pre-flight check. The goal: the reviewer understands the change in a minute and verifies it in ten. A large, vague MR costs a review round and hides bugs; a small, described one is accepted quickly.

## When to use

- The branch is green and `finish-branch` returned the "open an MR/PR" option.
- A change is ready for review by another team, an open-source project or a platform group.
- A diff has grown past a comfortable review size and must be split into sequential MRs before opening.
- An existing MR description needs a rewrite because reviewers keep asking the same questions.
- Before `ship-k8s`, to record what exactly is being deployed.

Do **not** use it to open an MR before `prove-done` is green, and do not open anything without the person's explicit request — opening publishes the branch.

## Inputs

- the branch: `git log --oneline <base>..HEAD`, `git diff --stat <base>...HEAD`, and the recorded base;
- the proof: `.orbit/task/<id>/evidence.md` with the fresh checks;
- the intent: `.orbit/task/<id>/brief.md`, the spec and the task id (`ABC-123`);
- the repo conventions: `.gitlab/merge_request_templates/`, `.github/pull_request_template.md`, `CONTRIBUTING.md`, commit rules from `commit-clean`;
- the state: `openspec/changes/<id>` and `docs/project-map/` status if the repo uses them.

If the person has not explicitly said to open the MR, prepare the description and the commands but do not execute them.

## Procedure

1. **Run the pre-flight checks.** Green proof, branch up to date with the base, no conflicts:
   ```bash
   git fetch origin
   git rebase origin/<base>          # or: git merge origin/<base>
   git diff --stat origin/<base>...HEAD
   ```
   Conflicts or a stale base make the diff misleading; fix them before writing the description.
2. **Judge the size.** Target ≤ ~400 lines of logic. Larger → split into sequential MRs (`slice-tickets`) that each compile and pass, and open them in dependency order.
3. **Scan the diff for things that do not belong.** Debug code, secrets, stray files, generated noise, unrelated formatting:
   ```bash
   git diff origin/<base>...HEAD --stat
   rg -n "console\.log|debugger|TODO|password\s*=" $(git diff --name-only origin/<base>...HEAD)
   ```
4. **Write the description in the team's language** (by `speak-plain`) using the format below. No AI attribution if the repo's rule says so (`commit-clean`).
5. **Add evidence for the reviewer.** Commands to verify, screenshots or a short recording for UI changes, and a link to `.orbit/task/<id>/evidence.md` when the team reads it.
6. **Open only on the person's explicit request.** Use the forge CLI; both variants are given in the code block. `--description "$(cat mr.md)"` keeps the multi-line body intact.
7. **After opening, answer in the MR threads** — new findings go through `handle-review`; red CI goes to `fix-ci` and the pipeline is fixed, not muted.
8. **Record the MR URL and number** in `.orbit/task/<id>/evidence.md` so `ship-k8s`, `handle-review` and a later session can find the change.

## Output

The MR description draft (a local `mr.md`, not an artifact path) and the URL recorded in evidence:

```markdown
[ABC-123] CSV export of the orders report

## What
Adds `GET /reports/orders.csv` behind the existing auth middleware; 10 000-row cap.

## Why
Analysts copy the table by hand; task ABC-123, spec 3.2 (`.orbit/task/ABC-123/brief.md`).

## How to verify
1. `pytest tests/export -q` → 41 passed.
2. `curl -s -o /tmp/out.csv -H "Authorization: Bearer $TOKEN" "$API/reports/orders.csv?rows=10000"`
3. Open `/tmp/out.csv`: UTF-8 headers, column order per spec 3.2.

## Risks / rollback
Read-only endpoint, no schema change. Rollback: revert this MR; no migration to undo.

## OpenSpec / map
`openspec/changes/orders-csv/` added; `docs/project-map/` updated: yes.
```

```bash
glab mr create --title "[ABC-123] CSV export" --description "$(cat mr.md)" --target-branch <base>
gh pr create --title "[ABC-123] CSV export" --body-file mr.md --base <base>
```

## Check

```bash
git diff --stat origin/<base>...HEAD    # size fits the split rule
rg -n "## What|## Why|## How to verify|## Risks|## OpenSpec" mr.md
glab mr view <id>                       # or: gh pr view <n> — body rendered, base correct
git status --short                      # no stray files left outside the commit
```

Pass rule: the branch is rebased, the description contains all five sections and real verification commands, no debug code or secret is in the diff, and the MR was opened only after an explicit request. Evidence of the open (URL, base, pipeline status) is in `.orbit/task/<id>/evidence.md`.

## Pitfalls

- **A 2 000-line MR.** Reviewers skim, and skimming is how bugs pass. Split before opening; each MR should be reviewable in one sitting.
- **A description that restates the diff.** "Changed orders.py" tells the reviewer nothing. State what changes by meaning and why.
- **No verification steps.** The reviewer re-derives how to test it, or trusts it. Give the commands and the expected result.
- **Opening without request.** Publishing a branch is a visible action; only an explicit yes authorizes it.
- **Debug residue and secrets.** `console.log`, a token in a config file, or a `.env` accidentally staged. Scan before opening.
- **Wrong target branch.** `--target-branch develop` vs `main` changes who reviews and when it ships. Confirm it.
- **Muting CI to get reviews.** A red pipeline is fixed (`fix-ci`), not skipped; reviewers will not accept a red MR anyway.
- **Forgetting OpenSpec/map.** A merged change with no spec entry is undocumented behaviour; reviewers need to see that line.

## Portability

The forge CLI is optional: `glab` and `gh` are interchangeable, and without either the description can be pasted into the web form. `git diff`/`git log` produce the same facts everywhere. No subagents are needed; the description template and the evidence block are plain Markdown. If the repo uses its own MR template, merge its sections with the five above instead of replacing them.

## What's improved vs the source

- The description has "OpenSpec / map" and "Risks / rollback" sections — what reviewers and on-call need.
- Commands for GitLab and GitHub; opening only on explicit request.
- A size rule with splitting instructions, not just advice.
- The MR URL is recorded in evidence, so later steps do not search the forge.

## Based on

- [Matt Pocock Skills](https://github.com/mattpocock/skills) — method «pr» (MIT). Rewritten in our own words and improved — see "What's improved".

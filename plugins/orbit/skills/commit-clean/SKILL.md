---
name: commit-clean
description: '[Orbit 0.2.5 Conventions] Commits and MRs: current project''s task key, no AI attribution, only on request. Use when: «закоммить», «сообщение коммита», «описание MR», «сделай коммит по правилам», «оформи MR»; commit message, merge request, PR description.'
---

# commit-clean — commits and MRs/PRs by team rules

> **Orbit · Always on · step 0.2.5 Conventions**
> **Input:** a finished change ← `stay-in-scope`
> **Output:** commit / MR description → next `open-mr`
> **Works with:** `prove-done`, `run-spec-loop`, `open-mr`
> **Shared rules:** reply in the user's language per `speak-plain`; generated content defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

A commit message is read by teammates, MR reviewers, and the next agent session that
runs `recall-history`. A guessed task key, a stray `Co-Authored-By:` line or an MR
description without verification steps costs review time on every read. This skill
fixes the format once per repository.

## When to use

- The person says «закоммить», asks for a commit message, or asks to prepare an MR/PR.
- A change is finished and proven (`prove-done` passed) and needs to land.
- A reviewer asked for the MR description to be filled in or fixed.
- You are about to run any `git commit`, `git push`, `glab mr create` or `gh pr create`.

Do **not** commit on your own initiative. Without an explicit request, show the diff and propose
the message; don't run `git commit` or `git push`.

## Inputs

Read these before writing the message — the repository answers most format questions:

- the change itself: `git status --short` and `git diff --cached --stat`;
- the repository convention: `git log --oneline -20`, `CONTRIBUTING.md`, `.gitmessage`, and the "Orbit" block in `CLAUDE.md` (`setup-repo`);
- the task key: the branch name (`git rev-parse --abbrev-ref HEAD`), recent history, and `.orbit/task/<id>/brief.md`;
- the proof: `.orbit/task/<id>/evidence.md` from `prove-done` (checks, commands, output);
- whether an OpenSpec change or project map exists: `ls openspec/changes`, `ls docs/project-map`.

If the task key or the team's attribution policy is missing, ask — do not invent either.

## Procedure

1. **Confirm the instruction.** Establish what was asked: message only, commit, commit
   + push, or a full MR. `git status --short` shows what is staged and unstaged; never
   assume everything in the working tree belongs to the task.
2. **Detect the repository's format.** Run `git log --oneline -20` and read
   `CONTRIBUTING.md`. The rule is: `[TASK-123] summary` — tracker key, then what
   changed. If the repo uses another format (Conventional Commits `feat(api): …`, no
   task key), follow the repo: the repo wins over this default.
3. **Find the task key from evidence.** Check the branch name, `git log --oneline -10`,
   and `.orbit/task/<id>/brief.md`. No key visible anywhere → ask. No task in the
   project at all → use the repository's no-key convention. Never invent a number.
4. **Stage only the task's files.** `git add <paths>` for the files named in the brief;
   `git diff --cached` to review exactly what will land. Leave `.orbit/`, generated
   files, and unrelated edits out of the index.
5. **Scan the staged diff for secrets.** `git diff --cached | grep -inE 'token|password|secret|api[_-]?key|BEGIN .*PRIVATE KEY'`.
   Any hit → unstage the file, report it, and ask. Never commit a secret "to fix later".
6. **Write the message.** First line ≤ 72 characters, action form
   (`[TASK-123] add CSV export to orders report`). Body only if needed: **why** the
   change exists, not a retelling of the diff. One commit = one logical unit; a second
   concern gets a second commit or a `slice-tickets` task. If an OpenSpec change exists,
   add the line `openspec: changes/<id>`.
7. **Check attribution policy.** Follow the team: if it does not want `Co-Authored-By:`
   lines or "Generated with…" signatures, do not add them. Record the policy once in the
   repo's `CLAUDE.md` so the next session does not re-ask.
8. **Verify before committing.** Rerun the checks that prove the change:
   `python3 -m pytest -q` (or the repo's `npm test`, `make test`, `go test ./...`), the
   linter, and `git diff --cached --check` for whitespace errors. Their output belongs
   in `.orbit/task/<id>/evidence.md`, not in the commit message.
9. **Commit on request.** `git commit -m '<subject>'` plus a `-m '<why>'` body when
   needed. Do not pass `--no-verify` unless the person explicitly asked; a failing hook
   is information, not an obstacle.
10. **Push and open the MR only when asked.** `git push` on an explicit request; then
    fill the MR description from the template below (`glab mr create` / `gh pr create`).
    Re-read the final text with `speak-plain` and `write-human`.

## Output

A commit and/or an MR description. The verification behind it stays in
`.orbit/task/<id>/evidence.md`; an OpenSpec change is linked as
`openspec/changes/<id>`. MR/PR description template:

```markdown
[TASK-123] Short title

**What**
One or two sentences: what changed and where.

**Why**
The problem this solves; link the brief or ticket.

**How to verify**
1. `<command>` — expected result.
2. `<command>` — expected result.

**Risks / rollback**
What can break, and how to undo it (`git revert <sha>`, feature flag, migration rollback).

**OpenSpec / map**
openspec: changes/<id> (or "none"); project map updated: yes/no.
```

Example commit message:

```
[EXP-42] add CSV export to the orders report

Analysts copied the table by hand; the endpoint serves the same
data with UTF-8 headers. No schema change.
```

## Check

Run these before reporting the commit or MR as done:

```bash
git log -1 --format='%s'
git show --stat --oneline HEAD
git diff --cached | grep -iE 'token|password|secret' || echo 'no secrets in staged diff'
git diff --cached --check && echo 'no whitespace errors'
```

Pass rule: the subject starts with the project's task key (or the repo's documented
no-key format), is ≤ 72 characters and in action form; no secret in the staged diff;
the proving checks passed and their output is in `.orbit/task/<id>/evidence.md`; the MR
description has **What**, **Why**, **How to verify**, **Risks / rollback** and
**OpenSpec / map**. Fix a failing item before the commit, not in a follow-up.

## Pitfalls

- **Inventing a task key.** A made-up `[ABC-999]` breaks traceability and the tracker
  link. Look at the branch, the brief, the history; ask if nothing matches.
- **Adding AI attribution the team forbids.** `Co-Authored-By: Claude` or "Generated
  with…" in a repo whose policy excludes it means rewriting history or a rejected MR.
  Check `CLAUDE.md`; record the policy once.
- **Committing without a request.** "Show me the diff and the message" is not "commit".
  Do only the requested action.
- **Bundling unrelated changes.** A drive-by formatting fix in the same commit makes
  review and revert harder. One logical unit per commit; split the rest.
- **A secret in the staged diff.** A token pasted into a test fixture or a `.env` added
  by mistake becomes public after push. Scan the staged diff before every commit.
- **`--no-verify` as a shortcut.** Skipping the hook hides a failing linter or test that
  the reviewer will see anyway. Fix the cause; skip only on an explicit request.
- **An MR description without verification.** Reviewers cannot accept what they cannot
  check. Every MR names the command and the expected result.

## Portability

Pure git plus Markdown, no Claude-only feature. In any CLI: read the convention with
`git log`, `cat CONTRIBUTING.md`; stage with `git add`; commit with `git commit`; open
an MR with `glab` or `gh` when installed, or paste the description into the tracker by
hand. In a non-interactive run (CI, scripted agent), prepare and print the message and
the MR body, and let a human run the commit — that keeps the "only on request" rule
without a chat. In Claude Code the `/orbit:orbit` router reaches this step when a
change is ready to land.

## What's improved vs the source

- The task key is never guessed: it comes from the branch, the history or a question.
- The MR description has an "OpenSpec / map" section, so `run-spec-loop` is visible to reviewers.
- The checklist catches secrets in the diff and skipped checks before they reach a remote.
- The team's attribution policy is recorded once in `CLAUDE.md` instead of being re-decided per session.
- One explicit action per request: message, commit, push and MR are separate permissions.

## Based on

- Orbit's own skill.

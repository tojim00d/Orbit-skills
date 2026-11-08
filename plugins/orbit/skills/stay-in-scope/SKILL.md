---
name: stay-in-scope
description: '[Orbit 0.2.4 Conventions] Work only in the agreed repositories and actions; anything outside needs explicit consent. Use when: «только этот репо», «можно ли трогать», «границы», «не выходи за рамки», «что мне разрешено»; scope, other repository, permission boundary.'
---

# stay-in-scope — work only inside the agreed boundaries

> **Orbit · Always on · step 0.2.4 Conventions**
> **Input:** task start
> **Output:** a stated scope → next `commit-clean`
> **Works with:** `setup-repo`, `isolate-branch`, `commit-clean`
> **Shared rules:** reply in the user's language per `speak-plain`; generated content defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

Rule: **no branches, commits or pushes in repositories outside the explicitly agreed
scope without explicit consent.** This skill holds that boundary for the whole task — at
the start, before every risky action, and when a tempting "while I'm here" appears. The
scope is a contract, not a mood: it is written down, it is checked, and consent for one
action never widens it.

## When to use

- At the start of any task that could touch more than one repository, service or
  environment.
- Before `git checkout -b`, `git commit`, `git push`, an MR/PR, or a CI variable change.
- Before any action in a shared environment: cluster, Vault, artifact registry, tracker
  settings.
- When the work seems impossible inside the named repository and someone suggests
  reaching into a neighbouring one.
- When a "small related fix" appears in another package of a monorepo.

Skip the ceremony only when the task is read-only in the current directory and clearly
allowed; even then, stating the scope in one line takes ten seconds.

## Inputs

- The agreed task: `.orbit/task/<id>/brief.md` — the **Scope** line names repositories,
  branches and environments; **Not doing** names exclusions.
- The repository layout: `git remote -v`, `git rev-parse --show-toplevel`,
  `git worktree list`, `ls -d packages/* apps/* 2>/dev/null`.
- The current branch and state: `git status --short`, `git branch --show-current`.
- The environment in reach: `kubectl config current-context`,
  `helm list -n <namespace>`, the CI project settings page.
- Any earlier consent: search `.orbit/task/<id>/plan.md` and the chat for explicit
  "yes, you may".

If the brief has no **Scope** line, stop and get one from the person before editing.
Default when nothing is stated: **read and edit in the current working directory only**;
commit, push, MR and deploy only on explicit request.

## Procedure

1. **State the scope in one line at task start:** "Working in `<repo>`; editing files; no
   commit." Put the same line into `.orbit/task/<id>/brief.md` under **Scope** so a new
   session inherits it instead of guessing.
2. **Classify every action before doing it.** Allowed = named in the scope. Out of scope
   is any of: editing a neighbouring repo or an unnamed monorepo package;
   `git checkout -b`, `git commit`, `git push`, opening an MR/PR, changing CI variables;
   anything in shared environments (cluster, Vault, artifact registry, GitLab settings).
3. **Stop at the boundary, do not drift across it.** "While I'm here, I'll fix it in the
   other service too" is the classic creep. No: ask first, even when the fix looks trivial.
4. **Ask one concrete question:** what exactly, where, why, what is at risk. Offer an
   in-scope alternative when one exists — often the same goal is reachable inside the
   named repository with a smaller change.
5. **Record blanket consent narrowly.** Consent covers **one named action**, not
   "everything similar from now on". A yes for `git commit` is not a yes for `git push`.
   Write the granted action and its date into `.orbit/task/<id>/plan.md`.
6. **Confirm dangerous commands even inside the scope.** `git push --force`, branch
   deletion (`git branch -D`), `kubectl delete`, `helm uninstall`, `git reset --hard`:
   always an explicit confirmation, with the target named.
7. **Handle secrets as out of scope by default.** Do not read `.env`, `*.pem` or
   `values-secret*` contents without a stated need; never print a token, never commit a
   secret. If a secret is required to proceed, say which one and why.
8. **When the task cannot be solved in scope,** describe exactly what must happen outside
   — repository, command, owner, risk — and hand it to the person. A clean hand-off
   beats a silent out-of-scope edit.

## Output

A stated scope (one line plus the brief's **Scope** block) and a consent log: the scope
line lives in `.orbit/task/<id>/brief.md`, granted exceptions in `.orbit/task/<id>/plan.md`.
Template for the brief:

```markdown
**Scope:** repos: <repo> only | branches: feat/<ID> allowed | environments: local
Actions allowed: read, edit. NOT allowed without a new yes: commit, push, MR, deploy.
Exceptions granted: <action> — <who> — <date> — <target>.
```

Example:

```markdown
**Scope:** repos: `services/export` only; branch `feat/EXP-42-csv`; environment: local.
Actions allowed: read, edit, run tests.
Exceptions granted: `git commit` on `feat/EXP-42-csv` — PM — 2026-02-03.
```

## Check

Before any boundary-crossing action and at the end of the task:

```bash
git rev-parse --show-toplevel          # must be the named repository
git branch --show-current              # must be the agreed branch (or none)
git status --short                     # only expected files
git remote -v                          # expected remote, no surprise push target
kubectl config current-context         # only if an environment is in scope
```

Pass rule: every modified path sits inside the named repository and directory; no
branch, commit, push, MR or deploy happened without a recorded yes for that exact
action; no secret was read, printed or staged; every out-of-scope need is handed off
with repository, command and owner. If a check fails, undo the action (`git restore`,
`git branch -d` on your own branch) before continuing — never "finish and explain".

## Pitfalls

- **"Nothing bad will happen if I just…"** The scope exists because the neighbour repo
  may be someone else's release. Ask; the answer is often yes, but only after a yes.
- **Consent inflation.** One "go ahead" for a commit becomes a push becomes a deploy. Each
  action has its own permission, recorded with its target.
- **A monorepo loophole.** Editing `packages/shared` "because it's the same repo" is still
  out of scope when the task named `packages/export`. Name the package in the brief.
- **Dangerous commands without confirmation.** `git push --force` and `kubectl delete`
  destroy work or service even when the repository is in scope. Always confirm, always
  name the target.
- **Secrets on screen.** `cat .env` "to check a variable" puts a token into the session
  log. Read the key name, not the value.
- **Silent scope creep in tests.** "I only added a fixture in another service" is still an
  out-of-scope edit. List it under "noticed, not touched".
- **Forgetting the brief.** A long session loses the verbal scope; a new session never had
  it. The one-line **Scope** in `brief.md` is the memory.

## Portability

Pure git and process, no Claude-only feature. In any CLI the checks above are plain
`git`, `kubectl` and `helm`; without a tracker integration, record the consent in
`.orbit/task/<id>/plan.md` instead of a ticket comment. Subagents are not required — when
they exist, give each a copy of the scope line and forbid out-of-scope repositories.
Degrades gracefully: with no `kubectl`, the environment check is "do not touch remote
systems at all". `setup-repo` installs a hook that blocks the most dangerous git commands
as a technical net; the hook does not replace the conversation.

## What's improved vs the source

- The boundary is set in one line at the start and checked before every action, not "by feel".
- Consent covers one action, not "everything similar" — a common cause of scope creep.
- A list of dangerous commands that need confirmation even in scope, plus a technical safety net in `setup-repo`.
- The scope is written into `.orbit/task/<id>/brief.md`, so it survives a new session.
- Secrets get an explicit default: out of scope unless needed, never printed, never staged.

## Based on

- Orbit's own skill.

---
name: setup-repo
description: '[Orbit 0.3.1 Repo setup] Once per repo: tracker and commit format, .orbit/ folder, pre-commit checks, a hook against dangerous git commands. Use when: «настрой репозиторий», «pre-commit», «защити от force push», «подключи orbit к репо», «настрой git-хуки»; set up repo, git hooks.'
---

# setup-repo — prepare a repository for the Orbit pipeline

> **Orbit · Always on · step 0.3.1 Repo setup**
> **Input:** a new repository
> **Output:** CLAUDE.md, hooks, .orbit/ → next `clarify-task`
> **Works with:** `stay-in-scope`, `commit-clean`, `instruct-agents`
> **Shared rules:** reply in the user's language per `speak-plain`; generated content defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

Run once per repository. This step sets up what every later step relies on: where the
task lives in the tracker, which commit format applies, the `.orbit/` work folder, checks
that run before a commit, and a hook that blocks dangerous git commands. Each change is
made **with consent** — the repository is not the agent's to reconfigure silently.

## When to use

- Starting Orbit in a repository that has never used it.
- The task key format or tracker is unknown, so `commit-clean` keeps asking.
- `.orbit/` artifacts pollute `git status`, or the team wants them local only.
- There is no pre-commit check and the first bad commit is the discovery.
- The team wants protection against `git push --force` and `git reset --hard`.
- Onboarding a repo where `docs/project-map/` or `openspec/` may exist.

Do **not** re-run all steps on a configured repo: check the "Orbit" block in `CLAUDE.md`
first and only fill the gaps.

## Inputs

Read-only recon before proposing anything:

```bash
git remote -v; ls -a; ls .claude 2>/dev/null
cat CLAUDE.md AGENTS.md 2>/dev/null | head -50
ls openspec docs/project-map 2>/dev/null
ls .husky .pre-commit-config.yaml 2>/dev/null
git log --oneline -30
```

Also read `.git/info/exclude`, the CI config (`.gitlab-ci.yml`, `.github/workflows/`),
and `CONTRIBUTING.md`. If the repository has no commit history yet, ask for the tracker
and the commit format instead of guessing them from branch names.

## Procedure

1. **Recon, read-only.** Run the block above. Show the person what already exists and
   propose only what is missing. No writes in this step.
2. **Detect the tracker and commit format.** Determine GitHub Issues / GitLab Issues
   (`glab`) / Jira / local files from the remote and the CI config. Derive the task key
   pattern from branch names and `git log --oneline -30`. Confirm the format with the
   person: `[ABC-123] summary` or Conventional Commits `feat(api): …`.
3. **Record the rules once** in the repository's `CLAUDE.md` under an "Orbit" block, so
   later sessions do not re-ask. Template in **Output**.
4. **Create the work folder** and keep it local:

   ```bash
   mkdir -p .orbit
   grep -qx '.orbit/' .git/info/exclude || echo '.orbit/' >> .git/info/exclude
   ```

   `.git/info/exclude`, not `.gitignore`: the team may later decide to commit artifacts,
   and the local exclude is not part of the shared diff.
5. **Choose checks before commit.** JS/TS: husky + lint-staged (formatter on staged
   files) plus `typecheck` and `test` when those scripts exist (`npx husky init`, then
   `npx lint-staged`). Python/Go/other: `pre-commit` (pre-commit.com) with a formatter, a
   linter and fast tests. Keep the hook under ~10 seconds; move slow checks to CI.
6. **Verify the checks** on a scratch branch or with `pre-commit run --all-files`; a hook
   that has never run is not a setup. Show the output to the person.
7. **Install the dangerous-git guard.** The hook `scripts/block-dangerous-git.sh` (next to
   this skill file) blocks `push --force`, `reset --hard`, `clean -f`, `branch -D`,
   `checkout -- .` and `restore .` until a human explicitly asks. Copy it to
   `.claude/hooks/` and wire it in the project's `.claude/settings.json` (template in
   **Output**). The guard complements `stay-in-scope`; it does not replace asking.
8. **Test the guard.** Run the sample below; the exit code must be `2` (blocked).
9. **Report and hand off.** List what was created or changed, then continue with any
   `orbit` route. If the team declined a step, note the decision in `CLAUDE.md`.

## Output

Four things, all consented: the "Orbit" block in `CLAUDE.md`, the `.orbit/` work folder
(excluded), the pre-commit checks, the git guard. `CLAUDE.md` block:

```markdown
**Orbit**
- Tracker: GitLab Issues, key ABC. Commit format: [ABC-123] summary.
- Orbit artifacts: .orbit/ (local, in .git/info/exclude).
- OpenSpec: yes/no. Project map: docs/project-map/ (yes/no).
- Checks before commit: `npm run typecheck && npm test` (husky + lint-staged).
- AI attribution: not added to commits.
```

`.claude/settings.json` guard:

```json
{ "hooks": { "PreToolUse": [ { "matcher": "Bash",
  "hooks": [ { "type": "command", "command": "bash .claude/hooks/block-dangerous-git.sh" } ] } ] } }
```

Verify the work folder is ignored and the guard blocks:

```bash
git check-ignore -v .orbit/          # must print .git/info/exclude:.orbit/
echo '{"tool_input":{"command":"git push --force"}}' | bash .claude/hooks/block-dangerous-git.sh; echo $?   # → 2
```

## Check

Run after setup; every check must pass before the step is reported done:

```bash
test -f CLAUDE.md && grep -A3 'Orbit' CLAUDE.md
git check-ignore -q .orbit/ && echo '.orbit excluded'
pre-commit run --all-files          # Python/Go path; JS/TS: npx lint-staged --allow-empty
bash -n .claude/hooks/block-dangerous-git.sh && echo 'hook syntax ok'
echo '{"tool_input":{"command":"git reset --hard"}}' | bash .claude/hooks/block-dangerous-git.sh; echo $?   # → 2
git status --short                  # no .orbit/ entries, no secrets staged
```

Pass rule: the "Orbit" block names the tracker, the commit format, the artifact folder,
OpenSpec and project-map presence; `.orbit/` is ignored by `.git/info/exclude`; the
pre-commit (or husky) check runs green on the current tree; both dangerous-command
samples exit `2`; each change was explicitly agreed with the person. If a hook is
missing, the repository is not set up — say so instead of "mostly done".

## Pitfalls

- **Reconfiguring the repository without consent.** Renaming hooks, editing CI or adding
  files changes the team's workflow. Propose, show the diff, ask per action
  (`stay-in-scope`).
- **Guessing the tracker or commit format.** A wrong key pattern breaks `commit-clean`
  for every later commit. Read the history, then confirm with the person.
- **Putting `.orbit/` in `.gitignore`.** That changes the shared repository and may
  surface in a diff; the local `.git/info/exclude` is the documented default. Move it
  only if the team decides to commit artifacts.
- **A hook that has never run.** `pre-commit` or husky configured but broken fails on the
  next commit and gets `--no-verify`ed. Run the check during setup.
- **A slow hook.** Formatting the whole tree on every commit drives people to skip it.
  Run only on staged files; leave the full run to CI.
- **Copying the guard without the path.** A `command` pointing at a missing script fails
  silently. Test both samples and check the exit code.
- **Secrets in setup output.** The recon commands can print `.env` values; filter with
  `head -50` and never echo tokens into the transcript.

## Portability

Plain git, shell and the repository's own tooling — no Claude-only feature. On an agent
without `.claude/settings.json` hooks, install the same guard as a native git hook
(`.git/hooks/pre-commit` or `.git/hooks/pre-push`) calling
`scripts/block-dangerous-git.sh`; on Codex/Qwen/DeepSeek/Cursor, copy the "Orbit" block
into the file the agent reads (`AGENTS.md`, `CLAUDE.md`, `.cursor/rules`). If `glab`/`gh`
is absent, record the tracker by name in `CLAUDE.md` instead of querying it. The
`.orbit/` contract is agent-independent.

## What's improved vs the source

- Three separate setup skills (tracker, pre-commit, git hook) merged into one step with shared recon and consent per action.
- Not JS-only: Python/Go path via `pre-commit`.
- Adds the `.orbit/` work folder and records rules in `CLAUDE.md` so later sessions have context.
- The guard is tested during setup with an explicit expected exit code, not just installed.
- The exclusion decision is documented (`.git/info/exclude` vs `.gitignore`) instead of left implicit.

## Based on

- [Matt Pocock Skills](https://github.com/mattpocock/skills) — method «setup-matt-pocock-skills, setup-pre-commit, git-guardrails-claude-code» (MIT). Rewritten in our own words and improved — see "What's improved".

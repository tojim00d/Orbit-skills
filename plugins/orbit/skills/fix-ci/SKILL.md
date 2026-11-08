---
name: fix-ci
description: '[Orbit 2.5.2 Debugging] Red pipeline: failure class, what changed, local reproduction, minimal fix. Use when: «упал пайплайн», «CI красный», «сборка сломалась», «почини CI»; CI failed, fix pipeline, red build.'
---

# fix-ci — triage a failed pipeline

> **Orbit · ② Build · step 2.5.2 Debugging**
> **Input:** a failed CI run ← `find-root-cause`
> **Output:** cause + fix in `.orbit/task/<id>/evidence.md` → next `prove-done`
> **Works with:** `find-root-cause`, `ship-k8s`
> **Shared rules:** reply in the user's language per `speak-plain`; generated content (maps, diagrams, comments, docs, artifacts) defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md` at the pack root).

The pipeline is red. The job is to find the cause, tell a flake from a real break, and fix it minimally — not to click "retry" until it turns green.

## When to use

- A pipeline fails on a branch, on `main`, or on a scheduled run, and the failure is not obviously in the code you just touched.
- The same job alternates between green and red without a relevant diff.
- A CI config change (`.gitlab-ci.yml`, `include:`, `rules:`, workflow file) does not do what you expected.
- The deployment job is blocked by an earlier stage, so `ship-k8s` cannot start.
- You inherit someone else's red pipeline and need a first answer fast.

Do **not** use it for a failing test you can already reproduce locally — that is `find-root-cause`. This skill is for the pipeline as a system: runner, image, cache, secrets, config.

## Inputs

- The failing run and job id: `glab ci status`, `glab ci view <id>`, or `gh run list --limit 10`.
- The **first** error line in the job log: `glab ci trace <job-id>` (GitLab) or `gh run view <run-id> --log-failed` (GitHub).
- The last green pipeline: its commit sha, job log and duration — the comparison baseline.
- CI config and the diff that touched it: `.gitlab-ci.yml`, `.github/workflows/*.yml`, included templates, `rules:`/`when:` changes.
- Runner and image facts: runner tags, image tag and digest, cache keys, resource limits, protected-variable rules.
- The task context: `.orbit/task/<id>/brief.md` and `.orbit/task/<id>/plan.md`, so you know what the branch was supposed to do.
- Previous evidence for the same job in `.orbit/task/<id>/evidence.md`.

If the job log is unavailable or truncated, reproduce locally first and say in the report which input was missing.

## Procedure

1. **Open the failing job log and locate the first error.** Not the last line — the last line is often a downstream "job failed". Find the first stack trace, compile error or non-zero exit.
2. **Classify the failure.** The table below decides the next command:

| Class | Signs | Action |
|---|---|---|
| Code/test | assertion fails, compile error | reproduce locally → `find-root-cause` |
| Flake | passes on retry, timeouts, test order | retry once; repeats → ticket, isolate the test |
| Environment | runner, docker pull, network, disk | check runner/tags, cache, limits |
| Dependencies | 401/403/404 from the package registry, new transitive version | pin the version, check the mirror and token |
| CI config | `.gitlab-ci.yml`, `include`, `rules:` changed | `glab ci lint`, compare with the last green |
| Secrets/access | 403, "variable not set" | protected variables, is the branch protected? |

3. **Compare with the last green run.** Scope the diff to what the job actually builds:
   ```bash
   git log <green-sha>..HEAD --oneline
   git diff <green-sha>..HEAD -- .gitlab-ci.yml .github/workflows/ package.json Dockerfile
   ```
   Then compare the job log of the last green run with the red one — same image, same runner tags, same cache key?
4. **Check the environment the job runs in.** An image that moved, a runner with a different architecture, a cache that serves a stale `node_modules`, or a disk-full runner explains failures that never reproduce locally.
5. **Reproduce locally in the same image.** Mirror the job instead of approximating it:
   ```bash
   docker run --rm -v "$PWD:/w" -w /w <image>:<tag> <cmd>
   ```
   `<cmd>` is the job's `script:` line; `<tag>` is the digest/version pinned in CI, not `latest`.
6. **Fix by class, minimally.** Code/test → the real fix in the code, with a test. Flake → wait for a condition instead of a `sleep`, isolate the polluting test. Dependency → pin the version that worked and note it. Config → the smallest change that restores the previous semantics. Environment → fix runner tags/cache/limits in config, not with a manual rerun.
7. **Never disable a test to get green.** Skipping or `allow_failure: true` hides the signal. Only with a ticket, a reason and a person's consent — and the ticket is referenced in the diff.
8. **Verify with a fresh run of the same job**, not just the retried one; then let the dependent stages finish. A green job that skipped the failing step is not a verification.
9. **Record the evidence.** Cause (one sentence), class, the log line that proves it, the fix, and the prevention in `.orbit/task/<id>/evidence.md`. Prevention is one line: a pin, a cache key change, a test, a lint rule.

## Output

`.orbit/task/<id>/evidence.md` — appended as a new dated block:

```markdown
## 2026-11-08 14:20 — CI: install job on !412

**Class:** dependencies (registry 401 for a private package)
**Evidence:** `npm ERR! 401 Unauthorized - GET https://<registry>/@scope/pkg`
**Cause:** the deploy token was rotated; the old value is still in the protected variable.
**Fix:** updated `NPM_TOKEN` on the protected branch; pinned `@scope/pkg@1.4.2`.
**Verify:** pipeline #8811 install job green, full pipeline green.
**Prevention:** registry auth failure now fails the job with the token name, not a 401.
```

The same block feeds `prove-done` ("CI green" is a claim that needs this proof) and `handoff-session` if the work pauses.

## Check

```bash
glab ci status                     # or gh run list: the target pipeline
glab ci view <id>                  # the failing job must now be green
git diff <green-sha>..HEAD --stat  # fix is minimal, no skip/allow_failure added
rg -n "allow_failure|@Disabled|skip\(" <ci-file> <test-dir>   # no silent disables
```

Pass rule: the previously failing job is green in a new pipeline run, the full pipeline reaches its final stage, the diff adds no skipped test or `allow_failure`, and `evidence.md` contains the class, the proving log line, the fix and the prevention. A retry that passed but no cause was named is **not** a pass — it is an unresolved flake.

## Pitfalls

- **Reading the last log line.** "Job failed: exit code 1" is the symptom at the end. The first error is the one that matters; everything after it is fallout.
- **Rerun until green.** A retry that passes proves the failure is conditional, not gone. Name the condition or open a ticket with the log attached.
- **Disabling the test or setting `allow_failure`.** This converts a real break into a silent one and moves the cost to production.
- **Fixing the CI config instead of the cause.** Changing the command, adding `|| true`, or swallowing an exit code makes the pipeline lie.
- **Approximating the image.** A local `node:20` is not the CI image digest, and a different architecture fails differently. Pin and use the exact image.
- **Cache poisoning.** A stale cache restores yesterday's build; if a clean run (`cache` disabled or a new key) passes, the cache is the bug.
- **Secrets in logs.** Checking a token by echoing it prints it into the log. Check presence only, then rotate if it leaked.

## Portability

Everything here is a pipeline CLI plus git and docker: `glab`/`gh` are interchangeable, and with no CLI you can read the same job log in the web UI. Without `docker`, run the job's `script:` lines in a local shell and state the image difference. No subagents are needed; the classification table works on any CI system, and the evidence block is plain Markdown for any later agent.

## What's improved vs the source

- A table of failure classes (code, flake, environment, dependencies, CI config, access) with an action for each.
- Ban on "disable the test to go green" without a ticket and consent.
- Local reproduction pinned to the exact CI image digest, not an approximate local runtime.
- Verification requires a fresh pipeline run, not a retry.

## Based on

- Orbit's own skill.

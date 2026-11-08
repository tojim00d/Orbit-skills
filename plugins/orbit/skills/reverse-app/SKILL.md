---
name: reverse-app
description: '[Orbit 1.3.1 Reverse engineering] Reverse-engineering entry: scope line "whose and why", route by target type, observation/inference/unknown log. Use when: «реверс», «разбери приложение», «как это устроено без исходников», «с чего начать реверс», «чужой сервис только с разрешения»; reverse engineer, understand a closed system.'
---

# reverse-app — entry point for reverse engineering

> **Orbit · ① Understand · step 1.3.1 Reverse engineering**
> **Input:** an app, an artifact or a repo, and a question about it
> **Output:** `.orbit/reverse/<target>/findings.md` → next `teardown-artifact`
> **Works with:** `analyze-binary`, `recon-webapp`, `extract-rules`, `teardown-artifact`
> **Shared rules:** reply in the user's language; generated artifacts default to English; reverse engineering is for own or authorized targets only; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

Own method in place of REA and Craft Anything. Runs on **standard OS and developer tools**, no external MCP server. Goal: **understand** how a system works and produce verifiable facts — for support, migration, integration, security audit, documentation recovery or a clean-room rebuild.

## When to use

- Sources are gone for a component that runs in production: an old service, a vendor agent, a build with no repository.
- "How does it actually work" is unanswerable from docs and the answer changes a migration or integration plan.
- Two builds behave differently and the diff is the question.
- An audit needs facts about what a binary, image or web app can do.
- Before a clean-room rebuild you need current behavior with evidence.

Do **not** reverse when sources exist — `map-knowledge` and `survey-codebase` are faster. A built artifact goes to `teardown-artifact`; an accessible web app to `recon-webapp`; a public product seen from outside to `teardown-product`.

## Inputs

- the request — the question and why it matters;
- the target, its origin, version and hash (registry, CI job, ticket, vendor);
- `.orbit/reverse/<target>/findings.md` when continuing — same target slug;
- `.orbit/task/<id>/brief.md` when the work belongs to a task;
- lawful basis (ticket, contract, written scope) for anyone else's system.

If the target is unclear, ask one question and continue. If `findings.md` is missing, create it from **Output** before step 1 — never start a private log. If no hash or origin is available, the identity step blocks; findings without a version are guesses.

## Procedure

1. **Write the scope line as the first line of the work.** What the target is, whose it is, why we analyze it. Normal cases: own or company code and artifacts (services, legacy, builds from the internal artifact registry); open source and third-party components in your own delivery (audit, SBOM, licences); compatibility and integration with a system you have lawful access to; authorized security audit (ticket, contract, scope). Not doing: bypassing DRM, licence checks, anti-cheat, paywalls or authentication; extracting others' secrets or user data; building material for malware.
2. **Turn the request into a question checklist.** 3–10 concrete questions; for each, the evidence that would answer it (code, config, command output, traffic capture). No checklist means no definition of done.
3. **Pin the target identity** — everything below is tied to this version and cites this hash:
   ```bash
   file <target> && shasum -a 256 <target> && ls -la <target>
   ```
4. **Route by target type** — do not run all methods on one target:

   | Target | Skill | First commands |
   |---|---|---|
   | Repo with sources | `map-knowledge`, `survey-codebase` | `git ls-files`, manifests |
   | Undocumented / legacy code | `extract-rules` | entry points → rules |
   | JAR/WAR, Docker image, Helm chart, npm/pip, ZIP/APK/IPA, Electron ASAR, PyInstaller | `teardown-artifact` | `file`, `unzip -l`, `docker save`, `helm template` |
   | Native or managed binary (ELF/Mach-O/PE/.NET/JVM class) | `analyze-binary` | `file`, `otool -L`/`ldd`, `nm`, `strings` |
   | Web app / SPA (own or with access) | `recon-webapp` | routes, bundles, HAR of your own session |
   | API or protocol without a spec | `recover-api-spec` | HAR/logs → OpenAPI |
   | Someone else's public product (features, UX) | `teardown-product` | public sources only, clean-room |
   | Rebuild your own system from the analysis | `rebuild-clean` | spec → new implementation → parity check |

5. **Overview before depth.** Inventory → structure → only the needed parts. Do not decompile everything.
6. **Configs and resources count as much as code.** Answers live in `application.yml`, a manifest, a plist, `values.yaml` — grep them before disassembling.
7. **Static before dynamic.** Run only if static analysis cannot answer, and only in isolation (container without network, or a dev stand); log the command that produced the observation.
8. **Parallelize independent questions** (`run-parallel`). Each agent gets one narrow question and writes rows into the same findings log; without delegation, answer in order.
9. **Write the findings log** — table below. Type is exactly one of **observation** (seen directly), **inference** (follows from observations), **unknown**. Static analysis never "observed execution".
10. **Finish against the checklist.** Answered / partial / open; a plain summary (`speak-plain`) of 5–10 lines plus the table. Preserve knowledge with `project-map`, `keep-learnings`, `run-spec-loop` (a spec of current behavior before a rewrite).

## Output

`.orbit/reverse/<target>/findings.md` — scope line plus typed table; every later reverse skill appends here:

```markdown
# <target> — sha256:<hash> — <version / date>
**Scope:** whose target, why we analyze it, what we will not do.

| # | Question | Conclusion | Type | Evidence | Confidence |
|---|---|---|---|---|---|
| 1 | Where do payments go? | POST /api/v2/pay to billing-svc | observation | app.js:1123, HAR #14 | high |
| 2 | Are there retries? | 3 attempts, exponential | inference | RetryPolicy.class (javap) | medium |
| 3 | Who triggers the cron job? | unknown | unknown | grep over the chart — empty | — |
```

One row per question; `Evidence` is `file:line`, a command or an artifact path; `unknown` beats a guess. Scratch output stays in `.orbit/reverse/<target>/work/`.

## Check

```bash
test -f .orbit/reverse/<target>/findings.md && echo "log ok"
grep -cE '^\| [0-9]+ \|' .orbit/reverse/<target>/findings.md          # rows vs checklist
grep -E '^\| [0-9]+ \|' .orbit/reverse/<target>/findings.md | grep -vE '\| (observation|inference|unknown) \|' || echo "all typed"
grep -n 'sha256:' .orbit/reverse/<target>/findings.md | head -1      # identity recorded
git status --short | grep reverse || echo "work dir not staged"
```

Pass rule: scope line present; hash recorded; every question has a row; every row has exactly one type; at least one observation carries a concrete `file:line` or command; open questions are `unknown`, not guesses. Copy the conclusion into `.orbit/task/<id>/evidence.md` when it supports a task (`prove-done`).

## Example

```text
Task: "the vendor agent stopped starting on the new base image — find out why".
1. Scope: own build-server agent from the internal registry; fix an upgrade, not extract data.
2. Questions: which libc, startup calls, config read, what the new base lacks, what differs.
3. Identity: agent 2.4.1, sha256:9f2c…, ELF x86-64.
4. Route: native binary → analyze-binary.
5. Overview: one 12 MB binary, config in /etc/agent/agent.yml.
6. Findings: libssl 1.1 import, missing on the new image → observation; startup reads agent.yml
   and exits without the section → observation from strace in a clean container.
7. Rows: libc mismatch inference medium; config path observation high; crash reason inference.
8. Summary: two candidate causes, one confirmed by a controlled run in isolation.
9. Next: extract-rules for the config format; the fix stays in the image, not in the agent.
```

## Pitfalls

- **Reversing a target you are not allowed to.** A public binary is not automatically authorized; without the scope line, stop and ask.
- **Depth before overview.** Decompiling a 200 MB binary function by function answers nothing. Inventory first, then the smallest function set the questions require.
- **Confusing inference with observation.** "The string contains a URL" is an observation; "it uploads telemetry" is an inference until a code path or traffic shows it. Wrong type destroys trust in the log.
- **Running the target on your workstation.** Even `--help` can write files or phone home. Use an isolated container without network; without isolation, report static findings as incomplete.
- **Losing the version.** Findings from build A get cited while everyone stares at build B. One hash per log; a new build starts a new section.
- **Printing a secret found in the artifact.** Report `secret found in <file>, rotation needed` and the path only — never the value, not even in an example.

## Portability

Any agent and model can run this: checklist, shell commands and one Markdown file. Without subagents, answer questions sequentially — the findings log stays the same. The tools are OS-standard (POSIX shell, `file`, `shasum`, `grep`, platform equivalents on Windows); nothing needs Claude Code, a slash command or an MCP server.

## What's improved vs the source

- Runs on standard OS and developer tools, no external MCP server, with any capable agent.
- A scope line "whose target and why" first, plus an explicit "not doing" list — analysis stays within lawful limits.
- Kept the strong parts: question checklist, overview first, static before dynamic, observation / inference / unknown log.
- A routing table sends the target to the right specialist skill instead of one generic method.
- A machine-checkable finish: hash recorded, every question has a row, every row typed, `unknown` allowed.

## Based on

- [REA](https://github.com/morluto/rea) — method «reverse-engineer-anything» (MIT). Rewritten in our own words and improved — see "What's improved".
- [Craft Anything](https://github.com/storytold/craft-anything) — method «Craft Anything» (MIT/Apache-2.0). Rewritten in our own words and improved — see "What's improved".

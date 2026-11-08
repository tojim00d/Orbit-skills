---
name: survey-codebase
description: '[Orbit 1.2.3 Code recon] Codebase state in 7 documents: stack, integrations, architecture, structure, conventions, tests, concerns. Use when: «оцени кодовую базу», «состояние проекта», «техдолг и стек», «проведи аудит репозитория», «что тут происходит»; codebase audit, map codebase.'
---

# survey-codebase — codebase state in 7 documents

> **Orbit · ① Understand · step 1.2.3 Code recon**
> **Input:** repository
> **Output:** `.orbit/knowledge/codebase/*.md` → next `scan-risks`
> **Works with:** `map-knowledge`, `track-debt`, `plan-steps`, `run-parallel`
> **Shared rules:** reply in the user's language per `speak-plain`; generated content defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

Method of GSD «map-codebase», rewritten without `gsd-tools`. Parallel agents study the
code along four focuses and write documents straight to `.orbit/knowledge/codebase/`.
The coordinator only receives confirmations — its context stays small. The result is the
**state** of the codebase (stack, quality, debt), which `map-knowledge` does not cover:
that skill maps structure and links.

## When to use

- Before planning a big feature or migration in existing code.
- A team inherits a service and needs one honest picture: what runs, what is fragile.
- `scan-risks`, `track-debt` or `plan-steps` need input about the current state.
- An estimate is requested and nobody can say how the code is tested or built.
- Onboarding needs more than a structure map: conventions, test strategy, known debt.

Not a substitute for `map-knowledge`: if you need modules and their links, run that
first; this survey describes condition, not topology. For a one-week-old prototype, a
single fast pass is enough — do not run the full four-agent mode.

## Inputs

- The repository root and size: `git rev-parse --show-toplevel`, `git ls-files | wc -l`.
- Manifests and build files: `package.json`, `pom.xml`, `build.gradle*`, `go.mod`,
  `pyproject.toml`, `*.csproj`, `Dockerfile`, `Chart.yaml`.
- CI and environment: `.gitlab-ci.yml`, `.github/workflows/`, `.env.example`.
- Test setup: `pytest.ini`/`pyproject.toml` test config, `jest.config.*`, `Makefile` targets.
- Any existing map: `.orbit/knowledge/overview.md`, `.orbit/knowledge/graph.json` — reuse
  them as cross-references instead of duplicating.
- The four focus definitions (below), so each agent writes in the same shape.

If the repository is empty or a skeleton, say so and reduce to a single `tech+arch` pass.

## Procedure

1. **Choose the mode.** *Full*: four agents in parallel via `run-parallel`, one per
   focus. *Fast*: one agent with focus `tech+arch`. Use fast for a small repo or a quick
   estimate; full before a migration.
2. **Prepare the output folder.** `mkdir -p .orbit/knowledge/codebase`; confirm it is
   ignored (`git check-ignore -q .orbit/` — see `setup-repo`).
3. **Assign the focuses.** Each agent owns its files and writes them itself:

   | Agent | Writes | Contents |
   |---|---|---|
   | tech | `STACK.md`, `INTEGRATIONS.md` | languages and versions, frameworks, build, external APIs/DBs/queues and how they connect |
   | arch | `ARCHITECTURE.md`, `STRUCTURE.md` | layers, modules, data flows, where things live, entry points |
   | quality | `CONVENTIONS.md`, `TESTING.md` | style, patterns, linters, how and with what it is tested, coverage, how to run |
   | concerns | `CONCERNS.md` | tech debt, fragile spots, TODO/FIXME, outdated deps, security risks |

4. **Give each agent the same prompt template** (below). The prompt is the contract: only
   facts proven by code, a `file:line` or the command that proved each one, no secrets.
5. **Agents write files and return 2–3 lines.** The coordinator must not receive the
   research itself — only "what I wrote and the main finding". That is what keeps the
   coordinator's context small.
6. **Verify before summarizing.** Check that every expected file exists and spot-check
   one fact per file: does the cited line resolve? `sed -n '<line>p' <file>`.
7. **Write the 10-line summary** to `.orbit/knowledge/codebase/SUMMARY.md`: what the
   system is, what hurts, where to be careful. This is the part a person actually reads.
8. **Hand off.** Point `plan-steps`, `write-spec`, `model-threats` and `track-debt` at the
   seven documents; for a human audience use `project-map` or `publish-design-docs`.

### Agent prompt

```text
Study the repository with focus `<focus>`. Write only facts proven by code, with paths.
Write to `.orbit/knowledge/codebase/<FILE>.md`. Return 3 lines: what you wrote and the
main finding. Don't read secrets (.env, *.pem, values-secret*).
```

## Output

Seven documents under `.orbit/knowledge/codebase/`, each with evidence on every claim,
plus the human summary. Template per document:

```markdown
# <FILE>: <area>
Scope: <what this covers>
**Facts**
- <fact> — `<file:line>` (or: command `<cmd>` → <output summary>)
**Risks / open questions**
- <risk> — evidence
```

Summary shape:

```markdown
# SUMMARY (10 lines max)
System: <what it is, main entry point>
Runs on: <runtime, platform>
Main flows: <2–3 lines>
Tests: <framework, how to run, rough coverage>
Hurt: <top 3 concerns with file:line>
Careful: <top 3 fragile spots>
```

## Check

```bash
ls .orbit/knowledge/codebase/{STACK,INTEGRATIONS,ARCHITECTURE,STRUCTURE,CONVENTIONS,TESTING,CONCERNS}.md
wc -l .orbit/knowledge/codebase/SUMMARY.md        # ≤ 12 lines
rg -L ':[0-9]+' .orbit/knowledge/codebase/*.md    # files with no file:line evidence
rg -n 'TODO|TBD' .orbit/knowledge/codebase/*.md
git status --short .orbit/                        # artifacts not staged by accident
```

Pass rule: all seven files exist and are non-empty; every fact carries a `file:line` or a
proving command; `SUMMARY.md` is at most ~12 lines and names the top hurts and fragile
spots; no agent read a secret file (the prompt forbids it, and the coordinator
spot-check does not find secret values); the coordinator's own context contains only the
2–3 line confirmations, not the full research. A missing file means the focus did not
run — rerun it, do not write the section yourself from memory.

## Pitfalls

- **Agents returning prose instead of files.** The point is that the coordinator stays
  small. If an agent replies with a 500-word analysis, ask it to write the file and
  return three lines.
- **Facts without evidence.** "Uses PostgreSQL" with no `docker-compose.yml:14` or
  `package.json` line is a guess; it will mislead `plan-steps`.
- **Secrets in the survey.** `INTEGRATIONS.md` easily collects tokens and hostnames from
  `.env` or `values-secret*`. The prompt forbids reading them; verify the output.
- **Duplicating `map-knowledge`.** Seven documents are state, not a second graph. If
  `ARCHITECTURE.md` turns into a module graph, link `.orbit/knowledge/graph.json` instead.
- **Running the full mode for a tiny repo.** Four agents on a 40-file service cost more
  than they return. Choose fast mode deliberately.
- **Forgetting the human summary.** Seven files nobody reads is not a survey. The
  10-line `SUMMARY.md` is the deliverable a person sees.
- **Stale output after a migration.** The documents age; note the commit or date at the
  top of each file so a reader knows when it was true.

## Portability

No Claude-only feature. Without subagents or `run-parallel`, run the four focuses
sequentially in one session and write the same seven files — slower, identical output.
Any CLI with `git`, `rg`/`grep`, `jq`, `cat` and `find` can gather the facts. On
Codex/Qwen/DeepSeek/Cursor, the focus table is the prompt skeleton; the coordinator rule
("only 3 lines back") applies whenever the agent has delegation. The artifacts stay under
`.orbit/knowledge/codebase/`, readable by every later skill.

## What's improved vs the source

- No dependency on `gsd-tools` and GSD config: the four focuses go to ordinary parallel agents.
- Every fact comes with a path or a verifying command.
- A 10-line human summary and direct exits to planning, spec and threat modeling.
- Secret files are excluded by the prompt, not only by convention.
- A date/commit stamp on each document keeps a survey from being read as current forever.

## Based on

- [GSD (Get Shit Done)](https://github.com/gsd-build/get-shit-done) — method «map-codebase» (MIT). Rewritten in our own words and improved — see "What's improved".

---
name: orbit
description: '[Orbit 0.1.1 Entry] Entry point: sizes the task, proposes a 3–7 step route through the pipeline and walks it. Use when: «с чего начать», «что умеет пак», «проведи задачу от начала до конца», «какой скилл взять», «что делать дальше», «проведи по пайплайну»; where to start, run end-to-end, which skill.'
---

# orbit — pack router

> **Orbit · Always on · step 0.1.1 Entry**
> **Input:** any task ← `triage-issues`
> **Output:** a route of steps → next `clarify-task`
> **Works with:** `speak-plain`, `stay-in-scope`
> **Shared rules:** reply in the user's language per `speak-plain`; generated content defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

Orbit is a full-lifecycle pack: **① Understand → ② Build → ③ Operate → ↺ next loop**.
89 skills of its own form one pipeline: each has an input and an output, and all write
results into the shared `.orbit/` folder. Instructions are in English to save tokens;
always reply in the user's language; generated content defaults to English. The router's
job is to buy the smallest route that finishes the task, not the longest one that looks
thorough.

## When to use

- A task is bigger than a question or a small edit: feature, migration, legacy analysis,
  incident, product rebuild.
- The person asks «с чего начать?», «какой скилл взять?», «проведи задачу от начала до
  конца».
- A task spans intake → build → release and it is unclear which step comes next.
- Continuing work in a new session: the artifacts are in `.orbit/` and the next step must
  be chosen, not guessed.

Do **not** use the router for a question or a one-line edit: answer or do it directly.
Running `clarify-task → map-knowledge → write-spec` for a typo wastes more than it saves.

## Inputs

- The request or ticket, including the thread around it (`glab issue view <id>` /
  `gh issue view <id>` when a tracker is configured).
- Repository state: `git status --short`, `git log --oneline -10`, and
  `ls .orbit/task/` for earlier work on the same task.
- The artifacts already written: `ls .orbit/task/<id>/` — `brief.md`,
  `requirements.md`, `design.md`, `plan.md`, `evidence.md`, `review.md`, `handoff.md`.
- Repository signals that change the route: `ls openspec docs/project-map .orbit/knowledge 2>/dev/null`
  and the "Orbit" block in `CLAUDE.md` (installed by `setup-repo`).
- The catalog below: the eight ready routes and the full 89-step order.

If an input for a step is missing, the route starts one step earlier rather than
improvising the artifact: no `brief.md` → `clarify-task`; no `requirements.md` → do not
start `write-spec`.

## Procedure

1. **Size the task.** Question, explanation or small edit → answer directly, no route.
   Feature, migration, integration, incident, unfamiliar code → the pipeline. Decide the
   route length up front: 3–7 steps, never the whole catalog.
2. **Check the repository is set up.** `test -f CLAUDE.md && grep -A3 'Orbit' CLAUDE.md`;
   `git check-ignore -q .orbit/ && echo ok`. Missing setup (no tracker format, no
   `.orbit/` exclude) → run `setup-repo` first, then continue.
3. **Match a ready route** from the table below. No match → assemble a route from "All
   steps in order" by following each step's output into the next step's input
   (the → column). A route that skips an input either starts earlier or declares the
   input `[assumed]`.
4. **Propose the route and get a "yes".** Numbered 3–7 steps, one line each: what the
   step produces and where. A route the person did not agree to is a plan they will
   discover halfway through.
5. **Enter the first step and read before writing.** `cat .orbit/task/<id>/brief.md` if it
   exists; otherwise start with `clarify-task`. Create `.orbit/task/<id>/` early — every
   later step reads it.
6. **Walk one step at a time.** Each step reads the previous artifact and writes its own;
   `test -f` the promised path before moving on. Do not skip a step because "it is
   obvious" — the artifact is the point, not the ceremony.
7. **Re-route when the facts change.** A new finding can add or remove steps (for example
   `scan-risks` surfaces a data migration → add `design-data`). Say that the route changed
   and why; never silently run extra steps.
8. **Finish with proof.** `prove-done` (a fresh command and its output in
   `.orbit/task/<id>/evidence.md`). In a repo with OpenSpec or a project map —
   `run-spec-loop` (OpenSpec entry + map update). No "done" on the strength of the diff.
9. **Hand off if the session ends.** Record goal, state, what was tried and the next step
   in `.orbit/task/<id>/handoff.md` (`handoff-session`), so the next session resumes from
   the artifact instead of re-discovering the route.

## Output

A route: 3–7 numbered steps, the artifact each one produces, and the finish condition.
Template:

```markdown
**Route:** <task, one line>
1. `<skill>` — produces `.orbit/task/<id>/<artifact>` → why it is needed now
2. `<skill>` — produces ...
...
Finish: `prove-done` (+ `run-spec-loop` if OpenSpec or a map exists).
Not doing: <out of scope / later loop>
```

### Ready routes

| Task | Route |
|---|---|
| New feature | `clarify-task` → `map-knowledge` → `scan-risks` → `write-spec` → `run-spec-loop` → `plan-steps` → `test-first` → `review-code` → `prove-done` → `open-mr` → `project-map` |
| New backend service | `capture-requirements` → `design-backend` → `design-data` → `design-services` → `choose-stack` → `publish-design-docs` → `plan-steps` → `delegate-tasks` → `review-security` → `ship-k8s` |
| Unfamiliar / legacy code | `recall-history` → `map-knowledge` → `survey-codebase` → `explain-code` → `extract-rules` → `onboard-people` → `project-map` |
| Reverse an app / artifact | `reverse-app` → `teardown-artifact` → `analyze-binary` → `recon-webapp` → `recover-api-spec` → `extract-rules` → `rebuild-clean` → `check-parity` |
| Product from a reference | `teardown-product` → `mine-user-pain` → `plan-rebuild` → `rebuild-design` → `build-screens` → `build-backend` → `test-flows` → `check-parity` |
| Bug / red CI | `find-root-cause` → `fix-ci` → `test-first` → `prove-done` → `keep-learnings` |
| Incident | `handle-incident` → `ship-k8s` → `write-runbook` → `review-observability` → `keep-learnings` |
| Explain / hand over | `map-knowledge` → `project-map` → `project-diagram` → `onboard-people` → `teach-topic` → `handoff-session` |

### All steps in order

### ① Understand

| Step | Skill | What it does | Output → next |
|---|---|---|---|
| 1.1.1 Intake | `clarify-task` | Make the task unambiguous: one question at a time with a proposed answer; emergency brake on a mid-work mismatch. | brief.md → `capture-requirements` |
| 1.1.2 Intake | `capture-requirements` | Business request or PRD → requirements (LD/UC/R/NF) with acceptance criteria and measurable non-functionals. | requirements.md → `shape-idea` |
| 1.1.3 Intake | `shape-idea` | Idea → agreed design: talk about why, 2–3 approaches, design in chunks before code. | design.md → `map-knowledge` |
| 1.2.1 Code recon | `map-knowledge` | Knowledge graph of the codebase: modules and links with file:line evidence + system overview. | .orbit/knowledge/graph.json + overview.md → `explain-code` |
| 1.2.2 Code recon | `index-code` | Working code index: index first, then targeted reading — fewer tokens and calls. | .orbit/knowledge/index/ → `explain-code` |
| 1.2.3 Code recon | `survey-codebase` | Codebase state in 7 documents: stack, integrations, architecture, structure, conventions, tests, concerns. | .orbit/knowledge/codebase/*.md → `scan-risks` |
| 1.2.4 Code recon | `explain-code` | Explain a module/file/function in levels: what it does, callers, flow, risks. | an explanation → `trace-impact` |
| 1.2.5 Code recon | `trace-impact` | What a change touches: affected modules, consumers, external contracts, risk level. | blast radius → `review-code` |
| 1.2.6 Code recon | `recall-history` | Recall past work: memory, .orbit/learnings, ADRs, git, past sessions, MRs. | findings with sources → `keep-learnings` |
| 1.3.1 Reverse engineering | `reverse-app` | Reverse-engineering entry: scope line "whose and why", route by target type, observation/inference/unknown log. | .orbit/reverse/<target>/findings.md → `teardown-artifact` |
| 1.3.2 Reverse engineering | `teardown-artifact` | Take apart an artifact: JAR, Docker image, Helm chart, npm/pip/NuGet, APK/IPA, Electron, PyInstaller. | contents, versions, configs, risks → `review-security` |
| 1.3.3 Reverse engineering | `analyze-binary` | Take apart a binary ELF/Mach-O/PE/.NET/JVM: dependencies, capabilities, logic, version diff. | capability map and answers → `extract-rules` |
| 1.3.4 Reverse engineering | `recon-webapp` | Own web app from the inside: routes, bundles, APIs from your session's HAR, auth, flags. | web-recon.md → `recover-api-spec` |
| 1.3.5 Reverse engineering | `recover-api-spec` | Recover OpenAPI/AsyncAPI from traffic, logs and client code + contract tests. | docs/api/*.yaml → `write-spec` |
| 1.3.6 Reverse engineering | `extract-rules` | Business rules from legacy as Given/When/Then with sources and characterization tests. | .orbit/knowledge/rules.md → `rebuild-clean` |
| 1.4.1 Product & domain | `teardown-product` | Map someone else's product from public sources: screens, flows, data model, feature matrix. | recon.md + features.csv → `mine-user-pain` |
| 1.4.2 Product & domain | `mine-user-pain` | User pains from real reviews and tickets: hate, missing, unsolved — with quotes. | pain.md → `model-domain` |
| 1.4.3 Product & domain | `research-sources` | Research from primary sources: every fact with a link and version, saved in the repo. | docs/research/*.md → `model-domain` |
| 1.4.4 Product & domain | `model-domain` | Glossary and domain model: terms tied to code, what-if scenarios, ADRs where they matter. | GLOSSARY.md, ADRs → `scan-risks` |
| 1.5.1 Risks | `scan-risks` | Fast risk scan: data, contracts, dependencies, rollback, observability, people. | risks.md → `model-threats` |
| 1.5.2 Risks | `model-threats` | STRIDE threat model over data flows before code; controls → spec requirements. | risks.md (threats) → `write-spec` |
| 1.6.1 Specification | `write-spec` | Brief, requirements and design → a spec with WHEN/THEN scenarios, decisions and risks. | a spec → `run-spec-loop` |
| 1.6.2 Specification | `run-spec-loop` | OpenSpec loop: proposal → delta → code → map → archive; switched on by repository signals. | openspec/changes/<id> → `plan-steps` |

### ② Build

| Step | Skill | What it does | Output → next |
|---|---|---|---|
| 2.1.1 Plan | `plan-steps` | Implementation plan in small tasks: test, code, check command, status in plan.md. | plan.md → `slice-tickets` |
| 2.1.2 Plan | `slice-tickets` | Split work into vertical-slice tickets with dependencies and acceptance criteria. | tickets → `prototype-fast` |
| 2.1.3 Plan | `prototype-fast` | A throwaway prototype for one question: logic or look, in an hour or two. | answer in design.md → `design-backend` |
| 2.2.1 Architecture & data | `design-backend` | Service orchestrator: requirements → data → architecture → stack → slices, with approval gates. | design docs + service → `design-data` |
| 2.2.2 Architecture & data | `design-data` | Data: entities, store, DDL, idempotency, indexes from access patterns, schema evolution. | data-design.md + ddl/ → `design-services` |
| 2.2.3 Architecture & data | `design-services` | Architecture: boundaries, state, sync/async, events, cache, runtime. | architecture-design.md → `choose-stack` |
| 2.2.4 Architecture & data | `choose-stack` | Choose/confirm the stack: existing stack by default, ecosystem, platform, pinned versions. | stack-selection.md → `shape-modules` |
| 2.2.5 Architecture & data | `shape-modules` | Deep modules: small interface, clean seam, tests through the interface; design it twice. | module structure → `deepen-modules` |
| 2.2.6 Architecture & data | `deepen-modules` | Find shallow modules in existing code and propose deepening, protected by tests. | deepen.md → `plan-rebuild` |
| 2.2.7 Architecture & data | `plan-rebuild` | Stack, schema and API for a rebuild from analysis; thin vertical slice first. | architecture.md → `rebuild-clean` |
| 2.2.8 Architecture & data | `rebuild-clean` | Rebuild a system from analysis: spec as the boundary, new implementation, parity check. | new system with parity → `add-code-mode` |
| 2.2.9 Architecture & data | `add-code-mode` | Code mode for an MCP server: a sandboxed script against a big response; only the result enters context. | execute tool + sandbox → `build-mcp` |
| 2.2.10 Architecture & data | `build-mcp` | MCP server for an integration: agent-task tools, security, evaluations. | an MCP server → `test-first` |
| 2.3.1 UI | `pick-ui-style` | Style, palette, fonts and UX rules for the product type from a decision database. | ui-direction.md → `build-design-system` |
| 2.3.2 UI | `build-design-system` | Three-level tokens and component specs with all states. | tokens + components.md → `style-ui` |
| 2.3.3 UI | `style-ui` | UI on shadcn/ui + Tailwind on top of tokens; accessibility and responsiveness. | UI components → `craft-frontend` |
| 2.3.4 UI | `craft-frontend` | Expressive UI without the template look: direction before code, typography, composition. | pages and components → `rebuild-design` |
| 2.3.5 UI | `rebuild-design` | Recover a design system from a reference (migration or analysis) with own assets and a contrast check. | tokens.json + components.md → `test-first` |
| 2.4.1 Implementation | `test-first` | Red → green → clean; test from a spec scenario; characterization test for old code. | code + tests → `run-plan` |
| 2.4.2 Implementation | `run-plan` | Execute plan.md in one session with checkpoints and statuses. | implemented tasks → `delegate-tasks` |
| 2.4.3 Implementation | `delegate-tasks` | Each plan task to a fresh agent, with review between tasks and escalation. | implementation + reviews → `run-parallel` |
| 2.4.4 Implementation | `run-parallel` | Independent tasks with parallel agents after an independence check. | merged result → `isolate-branch` |
| 2.4.5 Implementation | `isolate-branch` | An isolated branch or worktree for the task, within scope. | branch / worktree + baseline → `code-backend` |
| 2.4.6 Implementation | `code-backend` | How to write backend code: layers, named steps, one error owner, logs without secrets, three test levels. | consistent code → `build-screens` |
| 2.4.7 Implementation | `build-screens` | UI screen by screen: shell → vertical slice → all screens and states. | a working frontend → `build-backend` |
| 2.4.8 Implementation | `build-backend` | Backend: permissions on every request, migrations, background jobs, integrations through approved gateways. | a backend → `find-root-cause` |
| 2.5.1 Debugging | `find-root-cause` | Fast reproduction loop first, then the cause, then one fix with a test. | cause + fix → `fix-ci` |
| 2.5.2 Debugging | `fix-ci` | Red pipeline: failure class, what changed, local reproduction, minimal fix. | cause + fix → `prove-done` |
| 2.6.1 Quality checks | `prove-done` | No "done" without a fresh check and its output in evidence.md. | evidence.md → `request-review` |
| 2.6.2 Quality checks | `request-review` | Review by an independent agent with a standard package: goal, diff from base, criteria. | findings → `handle-review` |
| 2.6.3 Quality checks | `handle-review` | Take review with verification: fix what's right, push back with facts, add nothing extra. | review.md → `review-code` |
| 2.6.4 Quality checks | `review-code` | Review a change: bugs, security, spec compliance, scale, tests, contracts. | review report → `cut-complexity` |
| 2.6.5 Quality checks | `cut-complexity` | Unnecessary complexity in a change or the whole repo: what to delete, merge, simplify. | simplification list → `review-security` |
| 2.6.6 Quality checks | `review-security` | Security review: OWASP/CWE, secrets, dependencies, image, Kubernetes, CI. | findings with fixes → `test-flows` |
| 2.6.7 Quality checks | `test-flows` | Walk the app's flows: test plan, Playwright e2e, bug reports with evidence. | tests + bug reports → `check-parity` |
| 2.6.8 Quality checks | `check-parity` | Parity with a reference: feature-matrix score, screen diff, parallel run for legacy. | parity.md → `finish-branch` |
| 2.7.1 Release | `finish-branch` | Finish a branch: checks, options (MR/merge/keep), cleanup — with consent. | MR / merge → `open-mr` |
| 2.7.2 Release | `open-mr` | An MR/PR that's easy to accept: size, description with risks and OpenSpec/map, pre-flight. | MR / PR → `ship-k8s` |
| 2.7.3 Release | `ship-k8s` | Kubernetes, Helm, GitOps: render and diff, deploy via git, pod diagnostics. | verified manifest / release → `project-map` |

### ③ Operate

| Step | Skill | What it does | Output → next |
|---|---|---|---|
| 3.1.1 Maps & diagrams | `project-map` | Interactive project map in one HTML: phases, steps in reading order, transitions, links to code. | docs/project-map/project.html → `project-diagram` |
| 3.1.2 Maps & diagrams | `project-diagram` | Static diagram of phases and steps (SVG/PNG) for slides and READMEs; blueprint and paper themes. | docs/diagrams/*.svg / *.png → `draw-stack` |
| 3.1.3 Maps & diagrams | `draw-stack` | Stack diagram with logos and groups, HTML/PNG; never published externally. | a diagram → `publish-design-docs` |
| 3.1.4 Maps & diagrams | `publish-design-docs` | Design docs as one HTML page for human review, with a "what we decide" block. | review.html → `onboard-people` |
| 3.2.1 Explaining | `onboard-people` | Guide for a newcomer: what it is, map, run, end-to-end flow, careful spots, first tasks. | docs/ONBOARDING.md → `teach-topic` |
| 3.2.2 Explaining | `teach-topic` | Teach a topic in small steps with examples from the project and understanding checks. | the person can do it → `cowrite-doc` |
| 3.3.1 Docs & writing | `cowrite-doc` | Write a document with the person: context → sections → fresh-reader test. | a document → `instruct-agents` |
| 3.3.2 Docs & writing | `instruct-agents` | Instructions for agents: CLAUDE.md, prompts, skill descriptions — without contradictions. | text for an agent → `create-skill` |
| 3.3.3 Docs & writing | `create-skill` | Create or improve a skill and wire it into the Orbit pipeline. | a new skill → `write-update` |
| 3.3.4 Docs & writing | `write-update` | Internal messages: status, update, announcement, FAQ, incident update. | message / post → `keep-learnings` |
| 3.4.1 Memory & hand-over | `keep-learnings` | Learnings next to code: bug causes, rejected approaches, decisions — read before, write after. | .orbit/learnings/ → `handoff-session` |
| 3.4.2 Memory & hand-over | `handoff-session` | Hand-over to the next session: goal, state, what was tried, next steps, which skills to use. | handoff.md → `run-retro` |
| 3.4.3 Memory & hand-over | `run-retro` | Retro from artifacts: worked / hindered / try → rules, learnings, skill edits. | conclusions + process edits → `track-debt` |
| 3.4.4 Memory & hand-over | `track-debt` | Tech-debt register prioritized by pain × change frequency ÷ cost. | debt register → `compress-context` |
| 3.4.5 Memory & hand-over | `compress-context` | Shrink large responses and history in your LLM apps: library, own trimmer or code mode. | compression with measurement → `review-observability` |
| 3.5.1 Operations | `review-observability` | Will we see it break: RED/USE, logs, traces, symptom alerts, dashboard, probes. | gap list → `write-runbook` |
| 3.5.2 Operations | `write-runbook` | On-call runbook: check → fix → escalate → roll back, full commands. | docs/runbooks/*.md → `handle-incident` |
| 3.5.3 Operations | `handle-incident` | Incident: mitigate, timeline, diagnosis, communication, postmortem. | restoration + postmortem → `triage-issues` |
| 3.5.4 Operations | `triage-issues` | Triage incoming issues and bugs: type, severity, labels, next step, a brief for the pipeline. | labeled backlog + briefs → `orbit` |

### Always on

| Step | Skill | What it does | Output → next |
|---|---|---|---|
| 0.1.1 Entry | `orbit` | Entry point: sizes the task, proposes a 3–7 step route through the pipeline and walks it. | a route of steps → `clarify-task` |
| 0.2.1 Conventions | `speak-plain` | Answer style: answer first, short sentences, exact names, natural speech (ASD-STE100 at 65–70 %), in the user's language. | clear short text → `write-human` |
| 0.2.2 Conventions | `think-first` | Think before coding: name assumptions, minimum code, surgical edits, a verifiable goal. | disciplined edits → `keep-it-small` |
| 0.2.3 Conventions | `keep-it-small` | The smallest complete change: reuse, no speculative complexity, three strictness levels. | a small complete diff → `cut-complexity` |
| 0.2.4 Conventions | `stay-in-scope` | Work only in the agreed repositories and actions; anything outside needs explicit consent. | a stated scope → `commit-clean` |
| 0.2.5 Conventions | `commit-clean` | Commits and MRs: current project's task key, no AI attribution, only on request. | commit / MR description → `open-mr` |
| 0.2.6 Conventions | `write-human` | Remove the machine-written feel from outbound texts without changing facts. | natural text → `write-update` |
| 0.3.1 Repo setup | `setup-repo` | Once per repo: tracker and commit format, .orbit/ folder, pre-commit checks, a hook against dangerous git commands. | CLAUDE.md, hooks, .orbit/ → `clarify-task` |

### Always-on conventions

- `speak-plain` — answer style, in the user's language; `write-human` — outbound texts.
- `think-first` + `keep-it-small` — think before coding, small complete changes.
- `stay-in-scope` — only agreed repositories; `commit-clean` — team commit format and attribution policy.
- Model: any model available in Claude Code (Claude, GLM, Qwen, DeepSeek, ...). No offensive security in the pack; reverse engineering within the `reverse-app` scope.

## Check

Before starting the walk, and again at the end:

```bash
ls .orbit/task/<id>/                          # artifacts promised by the route exist
test -f .orbit/task/<id>/brief.md              # or the route starts with clarify-task
ls openspec docs/project-map .orbit/knowledge 2>/dev/null
git status --short
git log --oneline -1
```

Pass rule: the route has 3–7 steps; each step's output path is the next step's input per
`ARTIFACTS.md`; the first step matches the task (ambiguous task → `clarify-task`, existing
spec → `plan-steps`); the route ends with `prove-done` and, where the repository has
OpenSpec or a map, `run-spec-loop`; the person confirmed the route; every promised
artifact exists when its step is reported done; the final claim cites a command and its
output. If a check fails, fix the route or the artifact — not the wording of the report.

## Example

```text
User: «CSV-экспорт сломался после вчерашнего релиза, почини и открой MR».

1. Size → a bug with an unknown cause; pipeline, 5 steps.
2. Setup: `.orbit/` exists, `CLAUDE.md` has the Orbit block → no setup-repo.
3. Route: recall-history → find-root-cause → test-first → prove-done → open-mr.
4. recall-history: commit a1b2c3d (MR !214) changed src/reports/query.ts last week.
5. find-root-cause: reproduces in tests/export; cause — the row limit is applied twice.
6. test-first: failing test first, then one-line fix; `pytest tests/export -q` → 8 passed.
7. prove-done: command + output into .orbit/task/EXP-42/evidence.md.
8. open-mr: description with What / Why / How to verify / Risks / OpenSpec: none.
9. project-map: a bug fix does not change the system map — skipped and said so.
Finish: MR opened; no run-spec-loop (repo has no OpenSpec directory).
```

## Pitfalls

- **Routing a trivial task.** A typo fix does not need five skills. Size first; the
  catalog is not a checklist to complete.
- **Proposing 15 steps.** A route longer than seven steps will not be followed. Pick the
  shortest chain that ends in proof; push the rest to the next loop.
- **Skipping artifacts because "it's obvious".** The artifact is what survives the
  session; without it the next step re-derives and contradicts the first.
- **Changing the route silently.** If new facts add a step, say so. A route that grows
  without notice is how a small fix becomes a two-week migration.
- **Starting at the wrong entry.** `write-spec` without requirements, `plan-steps`
  without a spec — the step produces confident garbage. Start one step earlier instead.
- **Finishing without `prove-done`.** "It works on my machine" is not a route outcome.
  The route is done when a command proves it and the path is in `evidence.md`.
- **Ignoring repository signals.** A repo with `openspec/` or `docs/project-map/` expects
  the loop and the map update; skipping them breaks the team's process.

## Portability

Native to Claude Code, but not Claude-only: the router triggers on natural language in
any agent. Slash commands (`/orbit:orbit`, `/orbit:understand`) are Claude components —
elsewhere just describe the task in words. "Delegate to a subagent" → use your agent's
delegation tool or do the work inline; `${CLAUDE_PLUGIN_ROOT}` → the skill directory
(`plugins/orbit/skills/` or wherever `install.sh --skills-dir` copied it);
TodoWrite/AskUserQuestion → the agent's planning and question tools. Without a skills
directory, read the relevant `SKILL.md` into context. The artifacts under `.orbit/` keep
the route reproducible in every agent.

## What's improved vs the source

- One entry point that sizes the task and routes it, instead of guessing a skill by name.
- Eight ready routes for common task shapes, plus the full 89-step order with outputs and next steps.
- Every route starts from artifacts and ends with `prove-done` (and `run-spec-loop` where OpenSpec or a map exists).
- The route is 3–7 steps, explicit and confirmed — not a catalog dump.
- Re-routing on new facts is an explicit step, so the plan stays honest as the task changes.

## Based on

- Orbit's own skill.

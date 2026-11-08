# Orbit catalog: every skill in pipeline order (89)

[Русский](CATALOG.ru.md)

Step number — `phase.micro.order`. A step's output is the next step's input; results live in `.orbit/` (see `ARTIFACTS.md`). Interactive version — `map/index.html`.

## ① Understand — understand the task, the system and the risks; agree on a spec before code

### 1.1 Intake

| Step | Skill | What it does | Output → next | Based on |
|---|---|---|---|---|
| 1.1.1 | `clarify-task` | Make the task unambiguous: one question at a time with a proposed answer; emergency brake on a mid-work mismatch. | brief.md → `capture-requirements` | Matt Pocock Skills «grill-me, wait-what» |
| 1.1.2 | `capture-requirements` | Business request or PRD → requirements (LD/UC/R/NF) with acceptance criteria and measurable non-functionals. | requirements.md → `shape-idea` | backend-skills «writing-business-requirements» |
| 1.1.3 | `shape-idea` | Idea → agreed design: talk about why, 2–3 approaches, design in chunks before code. | design.md → `map-knowledge` | Superpowers «brainstorming» |

### 1.2 Code recon

| Step | Skill | What it does | Output → next | Based on |
|---|---|---|---|---|
| 1.2.1 | `map-knowledge` | Knowledge graph of the codebase: modules and links with file:line evidence + system overview. | .orbit/knowledge/graph.json + overview.md → `explain-code` | Understand Anything «understand» |
| 1.2.2 | `index-code` | Working code index: index first, then targeted reading — fewer tokens and calls. | .orbit/knowledge/index/ → `explain-code` | Graft / Trail-code «graft» |
| 1.2.3 | `survey-codebase` | Codebase state in 7 documents: stack, integrations, architecture, structure, conventions, tests, concerns. | .orbit/knowledge/codebase/*.md → `scan-risks` | GSD (Get Shit Done) «map-codebase» |
| 1.2.4 | `explain-code` | Explain a module/file/function in levels: what it does, callers, flow, risks. | an explanation → `trace-impact` | Understand Anything «understand-explain» |
| 1.2.5 | `trace-impact` | What a change touches: affected modules, consumers, external contracts, risk level. | blast radius → `review-code` | Understand Anything «understand-diff» |
| 1.2.6 | `recall-history` | Recall past work: memory, .orbit/learnings, ADRs, git, past sessions, MRs. | findings with sources → `keep-learnings` | claude-mem «mem-search» |

### 1.3 Reverse engineering

| Step | Skill | What it does | Output → next | Based on |
|---|---|---|---|---|
| 1.3.1 | `reverse-app` | Reverse-engineering entry: scope line "whose and why", route by target type, observation/inference/unknown log. | .orbit/reverse/<target>/findings.md → `teardown-artifact` | REA «reverse-engineer-anything», Craft Anything «Craft Anything» |
| 1.3.2 | `teardown-artifact` | Take apart an artifact: JAR, Docker image, Helm chart, npm/pip/NuGet, APK/IPA, Electron, PyInstaller. | contents, versions, configs, risks → `review-security` | REA «reverse-engineer-anything» |
| 1.3.3 | `analyze-binary` | Take apart a binary ELF/Mach-O/PE/.NET/JVM: dependencies, capabilities, logic, version diff. | capability map and answers → `extract-rules` | REA «reverse-engineer-anything» |
| 1.3.4 | `recon-webapp` | Own web app from the inside: routes, bundles, APIs from your session's HAR, auth, flags. | web-recon.md → `recover-api-spec` | Craft Anything «Craft Anything», REA «reverse-engineer-anything» |
| 1.3.5 | `recover-api-spec` | Recover OpenAPI/AsyncAPI from traffic, logs and client code + contract tests. | docs/api/*.yaml → `write-spec` | REA «reverse-engineer-anything» |
| 1.3.6 | `extract-rules` | Business rules from legacy as Given/When/Then with sources and characterization tests. | .orbit/knowledge/rules.md → `rebuild-clean` | REA «reverse-engineer-anything» |

### 1.4 Product & domain

| Step | Skill | What it does | Output → next | Based on |
|---|---|---|---|---|
| 1.4.1 | `teardown-product` | Map someone else's product from public sources: screens, flows, data model, feature matrix. | recon.md + features.csv → `mine-user-pain` | Replica «replica-recon» |
| 1.4.2 | `mine-user-pain` | User pains from real reviews and tickets: hate, missing, unsolved — with quotes. | pain.md → `model-domain` | Replica «replica-entrepreneur» |
| 1.4.3 | `research-sources` | Research from primary sources: every fact with a link and version, saved in the repo. | docs/research/*.md → `model-domain` | Matt Pocock Skills «research» |
| 1.4.4 | `model-domain` | Glossary and domain model: terms tied to code, what-if scenarios, ADRs where they matter. | GLOSSARY.md, ADRs → `scan-risks` | Matt Pocock Skills «domain-modeling» |

### 1.5 Risks

| Step | Skill | What it does | Output → next | Based on |
|---|---|---|---|---|
| 1.5.1 | `scan-risks` | Fast risk scan: data, contracts, dependencies, rollback, observability, people. | risks.md → `model-threats` | own |
| 1.5.2 | `model-threats` | STRIDE threat model over data flows before code; controls → spec requirements. | risks.md (threats) → `write-spec` | own |

### 1.6 Specification

| Step | Skill | What it does | Output → next | Based on |
|---|---|---|---|---|
| 1.6.1 | `write-spec` | Brief, requirements and design → a spec with WHEN/THEN scenarios, decisions and risks. | a spec → `run-spec-loop` | Matt Pocock Skills «to-spec» |
| 1.6.2 | `run-spec-loop` | OpenSpec loop: proposal → delta → code → map → archive; switched on by repository signals. | openspec/changes/<id> → `plan-steps` | own |

## ② Build — plan → architecture → code with tests → verification → release

### 2.1 Plan

| Step | Skill | What it does | Output → next | Based on |
|---|---|---|---|---|
| 2.1.1 | `plan-steps` | Implementation plan in small tasks: test, code, check command, status in plan.md. | plan.md → `slice-tickets` | Superpowers «writing-plans» |
| 2.1.2 | `slice-tickets` | Split work into vertical-slice tickets with dependencies and acceptance criteria. | tickets → `prototype-fast` | Matt Pocock Skills «to-tickets» |
| 2.1.3 | `prototype-fast` | A throwaway prototype for one question: logic or look, in an hour or two. | answer in design.md → `design-backend` | Matt Pocock Skills «prototype» |

### 2.2 Architecture & data

| Step | Skill | What it does | Output → next | Based on |
|---|---|---|---|---|
| 2.2.1 | `design-backend` | Service orchestrator: requirements → data → architecture → stack → slices, with approval gates. | design docs + service → `design-data` | backend-skills «building-backend-services» |
| 2.2.2 | `design-data` | Data: entities, store, DDL, idempotency, indexes from access patterns, schema evolution. | data-design.md + ddl/ → `design-services` | backend-skills «backend-design-by-data» |
| 2.2.3 | `design-services` | Architecture: boundaries, state, sync/async, events, cache, runtime. | architecture-design.md → `choose-stack` | backend-skills «backend-architecture» |
| 2.2.4 | `choose-stack` | Choose/confirm the stack: existing stack by default, ecosystem, platform, pinned versions. | stack-selection.md → `shape-modules` | backend-skills «backend-stack-selection» |
| 2.2.5 | `shape-modules` | Deep modules: small interface, clean seam, tests through the interface; design it twice. | module structure → `deepen-modules` | Matt Pocock Skills «codebase-design» |
| 2.2.6 | `deepen-modules` | Find shallow modules in existing code and propose deepening, protected by tests. | deepen.md → `plan-rebuild` | Matt Pocock Skills «improve-codebase-architecture» |
| 2.2.7 | `plan-rebuild` | Stack, schema and API for a rebuild from analysis; thin vertical slice first. | architecture.md → `rebuild-clean` | Replica «replica-architect» |
| 2.2.8 | `rebuild-clean` | Rebuild a system from analysis: spec as the boundary, new implementation, parity check. | new system with parity → `add-code-mode` | Craft Anything «Craft Anything», Replica «пак Replica» |
| 2.2.9 | `add-code-mode` | Code mode for an MCP server: a sandboxed script against a big response; only the result enters context. | execute tool + sandbox → `build-mcp` | code-mode «code-mode» |
| 2.2.10 | `build-mcp` | MCP server for an integration: agent-task tools, security, evaluations. | an MCP server → `test-first` | Skills by Anthropic «mcp-builder» |

### 2.3 UI

| Step | Skill | What it does | Output → next | Based on |
|---|---|---|---|---|
| 2.3.1 | `pick-ui-style` | Style, palette, fonts and UX rules for the product type from a decision database. | ui-direction.md → `build-design-system` | UI UX Pro Max «ui-ux-pro-max» |
| 2.3.2 | `build-design-system` | Three-level tokens and component specs with all states. | tokens + components.md → `style-ui` | UI UX Pro Max «design-system» |
| 2.3.3 | `style-ui` | UI on shadcn/ui + Tailwind on top of tokens; accessibility and responsiveness. | UI components → `craft-frontend` | UI UX Pro Max «ui-styling» |
| 2.3.4 | `craft-frontend` | Expressive UI without the template look: direction before code, typography, composition. | pages and components → `rebuild-design` | Skills by Anthropic «frontend-design» |
| 2.3.5 | `rebuild-design` | Recover a design system from a reference (migration or analysis) with own assets and a contrast check. | tokens.json + components.md → `test-first` | Replica «replica-design» |

### 2.4 Implementation

| Step | Skill | What it does | Output → next | Based on |
|---|---|---|---|---|
| 2.4.1 | `test-first` | Red → green → clean; test from a spec scenario; characterization test for old code. | code + tests → `run-plan` | Superpowers «test-driven-development» |
| 2.4.2 | `run-plan` | Execute plan.md in one session with checkpoints and statuses. | implemented tasks → `delegate-tasks` | Superpowers «executing-plans» |
| 2.4.3 | `delegate-tasks` | Each plan task to a fresh agent, with review between tasks and escalation. | implementation + reviews → `run-parallel` | Superpowers «subagent-driven-development» |
| 2.4.4 | `run-parallel` | Independent tasks with parallel agents after an independence check. | merged result → `isolate-branch` | Superpowers «dispatching-parallel-agents» |
| 2.4.5 | `isolate-branch` | An isolated branch or worktree for the task, within scope. | branch / worktree + baseline → `code-backend` | Superpowers «using-git-worktrees» |
| 2.4.6 | `code-backend` | How to write backend code: layers, named steps, one error owner, logs without secrets, three test levels. | consistent code → `build-screens` | backend-skills «backend-code-conventions» |
| 2.4.7 | `build-screens` | UI screen by screen: shell → vertical slice → all screens and states. | a working frontend → `build-backend` | Replica «replica-build» |
| 2.4.8 | `build-backend` | Backend: permissions on every request, migrations, background jobs, integrations through approved gateways. | a backend → `find-root-cause` | Replica «replica-backend» |

### 2.5 Debugging

| Step | Skill | What it does | Output → next | Based on |
|---|---|---|---|---|
| 2.5.1 | `find-root-cause` | Fast reproduction loop first, then the cause, then one fix with a test. | cause + fix → `fix-ci` | Superpowers «systematic-debugging», Matt Pocock Skills «diagnosing-bugs» |
| 2.5.2 | `fix-ci` | Red pipeline: failure class, what changed, local reproduction, minimal fix. | cause + fix → `prove-done` | own |

### 2.6 Quality checks

| Step | Skill | What it does | Output → next | Based on |
|---|---|---|---|---|
| 2.6.1 | `prove-done` | No "done" without a fresh check and its output in evidence.md. | evidence.md → `request-review` | Superpowers «verification-before-completion» |
| 2.6.2 | `request-review` | Review by an independent agent with a standard package: goal, diff from base, criteria. | findings → `handle-review` | Superpowers «requesting-code-review» |
| 2.6.3 | `handle-review` | Take review with verification: fix what's right, push back with facts, add nothing extra. | review.md → `review-code` | Superpowers «receiving-code-review» |
| 2.6.4 | `review-code` | Review a change: bugs, security, spec compliance, scale, tests, contracts. | review report → `cut-complexity` | Matt Pocock Skills «code-review», Ponytail «ponytail-review» |
| 2.6.5 | `cut-complexity` | Unnecessary complexity in a change or the whole repo: what to delete, merge, simplify. | simplification list → `review-security` | Ponytail «ponytail-review, ponytail-audit» |
| 2.6.6 | `review-security` | Security review: OWASP/CWE, secrets, dependencies, image, Kubernetes, CI. | findings with fixes → `test-flows` | own |
| 2.6.7 | `test-flows` | Walk the app's flows: test plan, Playwright e2e, bug reports with evidence. | tests + bug reports → `check-parity` | Replica «replica-test», Skills by Anthropic «webapp-testing» |
| 2.6.8 | `check-parity` | Parity with a reference: feature-matrix score, screen diff, parallel run for legacy. | parity.md → `finish-branch` | Replica «replica-diff» |

### 2.7 Release

| Step | Skill | What it does | Output → next | Based on |
|---|---|---|---|---|
| 2.7.1 | `finish-branch` | Finish a branch: checks, options (MR/merge/keep), cleanup — with consent. | MR / merge → `open-mr` | Superpowers «finishing-a-development-branch» |
| 2.7.2 | `open-mr` | An MR/PR that's easy to accept: size, description with risks and OpenSpec/map, pre-flight. | MR / PR → `ship-k8s` | Matt Pocock Skills «pr» |
| 2.7.3 | `ship-k8s` | Kubernetes, Helm, GitOps: render and diff, deploy via git, pod diagnostics. | verified manifest / release → `project-map` | own |

## ③ Operate — map, explanation, docs, memory, operations

### 3.1 Maps & diagrams

| Step | Skill | What it does | Output → next | Based on |
|---|---|---|---|---|
| 3.1.1 | `project-map` | Interactive project map in one HTML: phases, steps in reading order, transitions, links to code. | docs/project-map/project.html → `project-diagram` | own |
| 3.1.2 | `project-diagram` | Static diagram of phases and steps (SVG/PNG) for slides and READMEs; blueprint and paper themes. | docs/diagrams/*.svg / *.png → `draw-stack` | own |
| 3.1.3 | `draw-stack` | Stack diagram with logos and groups, HTML/PNG; never published externally. | a diagram → `publish-design-docs` | stack-diagram «stack-diagram» |
| 3.1.4 | `publish-design-docs` | Design docs as one HTML page for human review, with a "what we decide" block. | review.html → `onboard-people` | backend-skills «rendering-design-docs» |

### 3.2 Explaining

| Step | Skill | What it does | Output → next | Based on |
|---|---|---|---|---|
| 3.2.1 | `onboard-people` | Guide for a newcomer: what it is, map, run, end-to-end flow, careful spots, first tasks. | docs/ONBOARDING.md → `teach-topic` | Understand Anything «understand-onboard» |
| 3.2.2 | `teach-topic` | Teach a topic in small steps with examples from the project and understanding checks. | the person can do it → `cowrite-doc` | Matt Pocock Skills «teach» |

### 3.3 Docs & writing

| Step | Skill | What it does | Output → next | Based on |
|---|---|---|---|---|
| 3.3.1 | `cowrite-doc` | Write a document with the person: context → sections → fresh-reader test. | a document → `instruct-agents` | Skills by Anthropic «doc-coauthoring» |
| 3.3.2 | `instruct-agents` | Instructions for agents: CLAUDE.md, prompts, skill descriptions — without contradictions. | text for an agent → `create-skill` | Matt Pocock Skills «writing-for-agents» |
| 3.3.3 | `create-skill` | Create or improve a skill and wire it into the Orbit pipeline. | a new skill → `write-update` | Skills by Anthropic «skill-creator» |
| 3.3.4 | `write-update` | Internal messages: status, update, announcement, FAQ, incident update. | message / post → `keep-learnings` | Skills by Anthropic «internal-comms» |

### 3.4 Memory & hand-over

| Step | Skill | What it does | Output → next | Based on |
|---|---|---|---|---|
| 3.4.1 | `keep-learnings` | Learnings next to code: bug causes, rejected approaches, decisions — read before, write after. | .orbit/learnings/ → `handoff-session` | Graft / Trail-code «trail» |
| 3.4.2 | `handoff-session` | Hand-over to the next session: goal, state, what was tried, next steps, which skills to use. | handoff.md → `run-retro` | claude-mem «handoff», Matt Pocock Skills «handoff» |
| 3.4.3 | `run-retro` | Retro from artifacts: worked / hindered / try → rules, learnings, skill edits. | conclusions + process edits → `track-debt` | Matt Pocock Skills «retro» |
| 3.4.4 | `track-debt` | Tech-debt register prioritized by pain × change frequency ÷ cost. | debt register → `compress-context` | Ponytail «ponytail-debt» |
| 3.4.5 | `compress-context` | Shrink large responses and history in your LLM apps: library, own trimmer or code mode. | compression with measurement → `review-observability` | Headroom «headroom» |

### 3.5 Operations

| Step | Skill | What it does | Output → next | Based on |
|---|---|---|---|---|
| 3.5.1 | `review-observability` | Will we see it break: RED/USE, logs, traces, symptom alerts, dashboard, probes. | gap list → `write-runbook` | own |
| 3.5.2 | `write-runbook` | On-call runbook: check → fix → escalate → roll back, full commands. | docs/runbooks/*.md → `handle-incident` | own |
| 3.5.3 | `handle-incident` | Incident: mitigate, timeline, diagnosis, communication, postmortem. | restoration + postmortem → `triage-issues` | own |
| 3.5.4 | `triage-issues` | Triage incoming issues and bugs: type, severity, labels, next step, a brief for the pipeline. | labeled backlog + briefs → `orbit` | Matt Pocock Skills «triage» |

## Always on — always on: entry, style, discipline, scope, repo setup

### 0.1 Entry

| Step | Skill | What it does | Output → next | Based on |
|---|---|---|---|---|
| 0.1.1 | `orbit` | Entry point: sizes the task, proposes a 3–7 step route through the pipeline and walks it. | a route of steps → `clarify-task` | own |

### 0.2 Conventions

| Step | Skill | What it does | Output → next | Based on |
|---|---|---|---|---|
| 0.2.1 | `speak-plain` | Answer style: answer first, short sentences, exact names, natural speech (ASD-STE100 at 65–70 %), in the user's language. | clear short text → `write-human` | ASD-STE100 «ASD-STE100» |
| 0.2.2 | `think-first` | Think before coding: name assumptions, minimum code, surgical edits, a verifiable goal. | disciplined edits → `keep-it-small` | Karpathy Skills «karpathy-guidelines» |
| 0.2.3 | `keep-it-small` | The smallest complete change: reuse, no speculative complexity, three strictness levels. | a small complete diff → `cut-complexity` | Ponytail «ponytail» |
| 0.2.4 | `stay-in-scope` | Work only in the agreed repositories and actions; anything outside needs explicit consent. | a stated scope → `commit-clean` | own |
| 0.2.5 | `commit-clean` | Commits and MRs: current project's task key, no AI attribution, only on request. | commit / MR description → `open-mr` | own |
| 0.2.6 | `write-human` | Remove the machine-written feel from outbound texts without changing facts. | natural text → `write-update` | Humanizer «humanizer» |

### 0.3 Repo setup

| Step | Skill | What it does | Output → next | Based on |
|---|---|---|---|---|
| 0.3.1 | `setup-repo` | Once per repo: tracker and commit format, .orbit/ folder, pre-commit checks, a hook against dangerous git commands. | CLAUDE.md, hooks, .orbit/ → `clarify-task` | Matt Pocock Skills «setup-matt-pocock-skills, setup-pre-commit, git-guardrails-claude-code» |

## Routes

- **New feature:** `clarify-task` → `map-knowledge` → `scan-risks` → `write-spec` → `run-spec-loop` → `plan-steps` → `test-first` → `review-code` → `prove-done` → `open-mr` → `project-map`
- **New backend service:** `capture-requirements` → `design-backend` → `design-data` → `design-services` → `choose-stack` → `publish-design-docs` → `plan-steps` → `delegate-tasks` → `review-security` → `ship-k8s`
- **Unfamiliar / legacy code:** `recall-history` → `map-knowledge` → `survey-codebase` → `explain-code` → `extract-rules` → `onboard-people` → `project-map`
- **Reverse an app / artifact:** `reverse-app` → `teardown-artifact` → `analyze-binary` → `recon-webapp` → `recover-api-spec` → `extract-rules` → `rebuild-clean` → `check-parity`
- **Product from a reference:** `teardown-product` → `mine-user-pain` → `plan-rebuild` → `rebuild-design` → `build-screens` → `build-backend` → `test-flows` → `check-parity`
- **Bug / red CI:** `find-root-cause` → `fix-ci` → `test-first` → `prove-done` → `keep-learnings`
- **Incident:** `handle-incident` → `ship-k8s` → `write-runbook` → `review-observability` → `keep-learnings`
- **Explain / hand over:** `map-knowledge` → `project-map` → `project-diagram` → `onboard-people` → `teach-topic` → `handoff-session`

## Not included and why

- **claude-red** — offensive content; Claude safety-tuned models refuse it. The defensive side is covered by `review-security` and `model-threats`.
- **REA** and **Craft Anything** as tools — the model won't work with them; their method is rewritten into block 1.3 Reverse engineering and `rebuild-clean`.
- Internal maintenance skills of the source packs, clone rebranding and app-store launch — out of the pack's scope.
- Anthropic docx/pdf/pptx/xlsx — their licence doesn't allow redistribution.

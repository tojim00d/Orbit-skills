---
name: design-backend
description: '[Orbit 2.2.1 Architecture & data] Service orchestrator: requirements → data → architecture → stack → slices, with approval gates. Use when: «спроектируй сервис», «новый бэкенд с нуля», «спроектируй бэкенд»; design backend service, service design from scratch.'
---

# design-backend — a backend service from requirements to code, by phases

> **Orbit · ② Build · step 2.2.1 Architecture & data**
> **Input:** requirements ← `prototype-fast`
> **Output:** design docs + service → next `design-data`
> **Works with:** `capture-requirements`, `publish-design-docs`, `design-data`, `design-services`
> **Shared rules:** reply in the user's language; generated artifacts default to English; stay in scope; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

Orchestrator for designing a service. Each phase produces a document and ends at an approval gate; nothing starts the next phase before the person says yes. Phases are executed by the shared Orbit skills (`capture-requirements`, `design-data`, `design-services`, `choose-stack`); implementation is `plan-steps` → `test-first` → `review-code`.

## When to use

- A new backend service is starting and the team wants the design before code.
- An existing service is being substantially redesigned (new domain, new data store, new boundaries).
- A design exists in chats and diagrams but no document a reviewer or a future session can read.
- The service must integrate into an existing landscape, where the "as-is" constraints matter as much as the "to-be".
- **Not** for a small endpoint added to an existing service: that goes straight to `plan-steps`.

## Inputs

- requirements: `.orbit/task/<id>/brief.md`, `requirements.md`, or `openspec/changes/<id>/` — with requirement ids (`UC…`, `NF…`, `R…`);
- environment facts when the service joins an existing landscape: live contracts, auth schemes, network zones, naming conventions;
- the codebase and platform state: `.orbit/knowledge/overview.md`, `README.md`, existing design docs in `docs/design/`;
- the people who approve: names/roles, and what each gate needs from them;
- the design folder convention — documents live in `docs/design/<service>/` once approved and in `.orbit/task/<id>/design/` while in review.

If requirements are missing, run `capture-requirements` first. A design started from "we need a service" without requirement ids will fail the consistency check at phase 2 anyway.

## Procedure

1. **Open the design record.** Create `.orbit/task/<id>/design/` and `open-items.md`; list every phase with its owner and gate. This file is the design's index for the whole route.
2. **Phase 0 — requirements.** Run `capture-requirements`: goal, actors, use cases with ids, non-functional constraints, definition of done. Self-check: every requirement is testable or bounded.
3. **Phase 0+ — environment context (only if joining a landscape).** Write `context.md` describing what **is**, not what is "right": constraints to interoperate with, conventions to follow, and bad practices that must not be copied — listed explicitly with file/endpoint references.
4. **Phase 1 — data.** Run `design-data`: entities, store family, DDL, idempotency, indexes. Self-check that every use case has the reads and writes it needs, and every entity id has an owner.
5. **Phase 2 — architecture.** Run `design-services`: boundaries, state, sync/async, events, cache, runtime, observability. Require an OpenAPI draft if a consumer needs it now. Update the diagram (`project-diagram` or `draw-stack`).
6. **Phase 3 — stack.** Run `choose-stack`: current stack assessment, pinned versions checked in the registry, platform support. `stack-selection.md` links to the architecture decisions it enables.
7. **Self-check each document against its phase checklist and against earlier documents.** Consistent terms (one name per entity), all requirement ids covered, no entity/route that contradicts the data design. `rg -n "UC-|NF-|R-" .orbit/task/<id>/design/` and cross-read.
8. **Run an independent review.** Hand the document and the requirements to a separate reviewer (a second agent or a colleague) who did not write it; ask for gaps, contradictions and missing failure modes. Record findings in `review.md`.
9. **Close open items.** Every finding becomes an entry in `open-items.md` with an owner and a decision; nothing stays "to discuss later" at a gate.
10. **Gate.** Send a short message: what is decided, what is debatable, what is needed from the person. Get an explicit "yes". No yes — no next phase; revise and re-send.
11. **Phase 4 — implement in slices.** Create a branch (`isolate-branch`). Each slice: `plan-steps` → `test-first` → `review-code` → `prove-done`; update the phase 1–3 documents when the code deviates ("as built").
12. **Publish for people.** Once approved, move documents to `docs/design/<service>/` and run `publish-design-docs` so the design is readable outside the agent session.

## Output

`.orbit/task/<id>/design/` (approved → `docs/design/<service>/`):

```text
design/
  requirements.md          # phase 0
  context.md                # phase 0+
  data-design.md + ddl/     # phase 1
  architecture-design.md    # phase 2 (+ docs/api/<service>.openapi.yaml)
  stack-selection.md        # phase 3
  open-items.md             # every gate: item, owner, decision
```

`open-items.md` format, the file that makes gates honest:

```markdown
| # | item | phase | owner | status | decision |
|---|------|-------|-------|--------|----------|
| 1 | auth: session cookie vs bearer | 2 | @anna | open | — |
| 2 | orders table partitioned by month | 1 | @ivan | decided | partition now, key (created_at, id) |
```

A gate message, the whole approval protocol in five lines:

```text
Decided: event-driven billing, PostgreSQL 16, one service per bounded context.
Debatable: whether the outbox is in the same schema (a separate table is safer).
Needed from you: confirm the retry budget (3 attempts, 5 min) — blocks phase 2.
```

## Check

The route is on track when documents exist and line up:

```bash
ls .orbit/task/<id>/design/open-items.md .orbit/task/<id>/design/*.md
rg -n "UC-|NF-|R-" .orbit/task/<id>/design/ | wc -l    # requirements referenced
rg -n "open" .orbit/task/<id>/design/open-items.md     # open items have owners
test -f docs/api/<service>.openapi.yaml || echo "no consumer contract needed"
```

Pass rule: every phase document exists before its gate; every `UC/NF` requirement id appears in at least one component or decision; the data, architecture and stack documents agree on terms and entities; `review.md` lists the independent review findings and their resolution; `open-items.md` has no item without an owner; each gate has an explicit approval recorded (message or `evidence.md`). Only then move the approved set to `docs/design/<service>/`.

## Pitfalls

- **Skipping the gate.** A design approved by silence is not approved. The short "decided / debatable / needed" message is the protocol; record the yes.
- **Writing documents that contradict each other.** Terms drift (`order` vs `purchase`), ids disappear, routes assume fields the schema lacks. Cross-read after every phase, not at the end.
- **Copying the environment's bad practices.** The as-is context is not a template. `context.md` must name what not to copy, or the new service inherits old hacks.
- **Self-review only.** The author misses their own gaps; the independent reviewer is the cheapest defect filter in the whole route.
- **Open items that never close.** They accumulate and turn the gate into a fiction. Each has an owner and a decision before the gate.
- **Phase 4 drifting from the design.** Code diverges and the documents become history. Update them "as built" at the end of each slice.
- **Design docs trapped in `.orbit/`.** If people cannot find them, the design cannot be reviewed or approved. Publish after the gate.

## Portability

The orchestrator is a set of Markdown documents plus gates, so it works in any agent: run the phases inline, ask for approval in chat, write files with the agent's tools. Without subagents, the independent review becomes a fresh session or a colleague reading the documents against the requirements. Without `publish-design-docs`, committing the approved files to `docs/design/<service>/` is enough. The route and artifact names stay the same, so a design can be resumed by anyone.

## What's improved vs the source

- Design phases are wired into the rest of the Orbit pipeline: requirements, spec, plan, review and proof use the same skills as any task.
- Gates with a short "decided / debatable / needed" message instead of long reports.
- An explicit "bad practices of the environment" section so the agent doesn't copy existing hacks.
- An index file with open items, owners and decisions, so gates are verifiable rather than ritual.
- A consistency check across documents (terms, requirement ids, entities) after every phase.
- Approved documents move to `docs/design/` and reach people through `publish-design-docs`.

## Based on

- [backend-skills](https://github.com/si1verwind17/backend-skills) — method «building-backend-services» (MIT). Rewritten in our own words and improved — see "What's improved".

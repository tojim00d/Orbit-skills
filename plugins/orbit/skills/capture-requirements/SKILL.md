---
name: capture-requirements
description: '[Orbit 1.1.2 Intake] Business request or PRD → requirements (LD/UC/R/NF) with acceptance criteria and measurable non-functionals. Use when: «собери требования», «разбери PRD», «требования к сервису», «оформи бизнес-требования», «что нужно системе»; requirements, PRD, business rules.'
---

# capture-requirements — requirements you can design from

> **Orbit · ① Understand · step 1.1.2 Intake**
> **Input:** idea, PRD, email ← `clarify-task`
> **Output:** requirements.md → next `shape-idea`
> **Works with:** `clarify-task`, `write-spec`, `design-backend`, `extract-rules`
> **Shared rules:** reply in the user's language per `speak-plain`; generated content defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

A business request, email or PRD → requirements an engineer or agent can design from
without constant questions. Use it for a service, multi-week feature or integration;
a small task needs only a brief (`clarify-task`).

## When to use

- A PRD, email or meeting notes arrived and someone must turn them into requirements.
- A new service or integration is starting and the business rules live in people's heads.
- The request keeps changing because nobody wrote the locked decisions (LD) down.
- Acceptance criteria are verbal ("it should work") and tests cannot be written from them.
- Rewriting an old system: the rules must be recovered before the rebuild (`extract-rules`).

Not for a well-scoped bug fix — a `brief.md` from `clarify-task` is enough.

## Inputs

- The source material: PRD, email thread, meeting notes, ticket text.
- `.orbit/task/<id>/brief.md` from `clarify-task` — goal, done criteria, scope.
- The existing system, if any: `git log --oneline -20`, endpoints
  (`rg -n 'router\.(get|post)' src/`), current DB schema, `.orbit/knowledge/rules.md`.
- The tracker item, when a tracker is configured: `glab issue view <id>` or
  `gh issue view <id>`.
- The team's non-negotiables: `.orbit/learnings/`, `docs/adr/`, security policy.

If the source is only a verbal idea, run the **interview** mode; if a document exists,
run **digest** mode and list the gaps instead of inventing answers.

## Procedure

1. **Pick the mode.** *Interview:* only an idea exists → ask in the order below.
   *Digest:* a document exists → convert it to the format below and list what it does not
   say. Both modes end with the same file.
2. **Write the business goal first.** Two or three sentences: who is in pain, what changes
   for them, why now. If the goal names a solution ("we need Kafka"), restate the need and
   record the choice under LD.
3. **Freeze the locked decisions `LD1…`.** Already-decided items: stack, deadline,
   platform, buy-vs-build, contracts. Each gets a number and a source; design does not reopen them.
4. **List actors and roles.** Who interacts, what each wants, and what they must not see.
5. **Write use cases `UC1…` in Given/When/Then.** Each: actor, goal, main flow, and
   **acceptance criteria** that a test can be written from. Empty result, error and
   permission-denied are separate criteria, not an afterthought.
6. **Write business rules `R1…`.** One testable statement each, with its source: document,
   person, date, or code (`extract-rules` for a legacy system). A rule without a source is
   an assumption — label it.
7. **Map integrations.** External system, direction (in/out/both), payload or contract,
   protocol, owner. An integration without an owner is a risk; record it as an open item.
8. **Make non-functionals measurable `NF1…`.** Numbers or an explicit "not required":
   load (rps, records), availability, latency (p50/p95), data retention, security and
   personal-data handling, backups.
9. **State the environment and the exclusions.** Where it runs (Kubernetes, cloud,
   on-prem, a laptop), platform limits, and **out of scope** one line per exclusion. An
   empty "out of scope" means the scope has not been thought through.
10. **Run the stop rule and hand over.** Read the file once as a designer: can every
    section be turned into a data model, an API and a test? Then record open items with
    an owner and a date, and hand over to `shape-idea` or `write-spec`.

### Business words → measurable requirements

| Was | Becomes |
|---|---|
| "fast" | "p95 < 300 ms at 50 rps" |
| "reliable" | "99.9 % availability in business hours; RPO 15 min" |
| "convenient" | a concrete scenario with steps and a criterion |
| "like the old system" | a rule from `extract-rules` or a question |

## Output

`.orbit/task/<id>/requirements.md` — the ten numbered sections:

```markdown
# requirements: <id>
**1. Summary & business goal**
**2. Locked decisions (LD1…)**
**3. Actors & roles**
**4. Use cases (UC1…) — actor, goal, main flow, acceptance criteria (Given/When/Then)**
**5. Business rules (R1…) — testable statement + source**
**6. Integrations — system, direction, payload, owner**
**7. Non-functionals (NF1…) — load, availability, latency, retention, security**
**8. Environment — runtime, platform limits**
**9. Out of scope — one line each**
**10. Open items — owner and date**
```

Filled example (short):

```markdown
# requirements: EXP-42
**1. Goal**
Analysts copy order tables by hand; they need a CSV they can open in Excel.
**2. Locked decisions**
LD1 — export runs on the existing API, no new service (source: CTO, 2026-01-10).
**4. Use cases**
UC1 — analyst downloads the orders report.
  Given a logged-in analyst and a date range,
  When they GET /reports/orders.csv,
  Then the response is UTF-8 CSV, one row per order.
  AC: empty range → header only; 10 000 rows → < 5 s.
**7. Non-functionals**
NF1 — p95 < 2 s at 20 rps; NF2 — no PII beyond customer id; retention 30 days.
```

## Check

Before handing the file on:

```bash
test -f .orbit/task/<id>/requirements.md && grep -n '^## ' .orbit/task/<id>/requirements.md
rg -c '^### UC' .orbit/task/<id>/requirements.md     # every UC has a block
rg -n 'Given|When|Then' .orbit/task/<id>/requirements.md | wc -l
rg -niE 'fast|reliable|convenient|many|soon|significantly' .orbit/task/<id>/requirements.md
rg -n 'TODO|TBD|\?\?\?' .orbit/task/<id>/requirements.md
```

Pass rule: all ten sections exist; every `UC` has a Given/When/Then criterion plus
error/empty/permission paths; every `R` is testable and sourced; every `NF` has a number
or "not required"; the vague-word search returns no hit in requirement text; **out of
scope** is non-empty; open items have an owner and a date. Fix a failing check in the
file, not the test.

## Pitfalls

- **Keeping business words.** "Fast" and "reliable" are not requirements until they are
  "p95 < 300 ms at 50 rps" and "99.9 % availability, RPO 15 min". Convert them in step 8.
- **A questionnaire instead of an interview.** Ten questions get one answer. Ask one,
  with a proposed answer: goal → done → boundaries → constraints → edges.
- **Rules you cannot test.** "The system must be user-friendly" cannot fail a test, so it
  will be ignored. One rule = one observable check, plus its source.
- **Inventing numbers.** A made-up "10 000 rps" becomes a design constraint and a cost.
  Mark an unknown as an open item with an owner, never as a fact.
- **Empty "out of scope".** Without exclusions the next reader assumes everything is
  included, and the project grows. One line per exclusion.
- **Integrations without an owner.** "It calls the billing API" — who owns the contract,
  what is the payload, who do we call when it changes? Ask or record it as a gap.
- **Interviewing forever.** The stop rule is the exit: when every UC has criteria and
  every NF has a number, stop asking and write the file.

## Portability

No Claude-only feature — a document conversion plus a short interview. In any CLI, read
the PRD, ask in the chat, write the Markdown, run the `rg` checks. Without a tracker CLI
(`glab`/`gh`), paste the ticket text. In a non-interactive run, switch to digest mode:
write from the available documents, put unanswered points under **Open items** with
`[assumed]`, let a human confirm. The artifact under `.orbit/task/<id>/` is read by
`shape-idea`, `write-spec` and `design-backend` regardless of the agent.

## What's improved vs the source

- Ten numbered sections (LD/UC/R/NF) that the spec and tests reference later in the pipeline.
- A "business word → measurable requirement" table.
- An explicit stop rule so the interview doesn't drag on, plus `extract-rules` for "like the old system".
- Two explicit modes (interview, digest) with the same output and a gap list.
- Source and owner are required for rules and integrations, so assumptions are visible.

## Based on

- [backend-skills](https://github.com/si1verwind17/backend-skills) — method «writing-business-requirements» (MIT). Rewritten in our own words and improved — see "What's improved".

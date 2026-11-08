---
name: write-spec
description: '[Orbit 1.6.1 Specification] Brief, requirements and design → a spec with WHEN/THEN scenarios, decisions and risks. Use when: «напиши спеку», «оформи требования», «сделай спеку из брифа», «зафиксируй решение»; write spec.'
---

# write-spec — turn agreements into a specification

> **Orbit · ① Understand · step 1.6.1 Specification**
> **Input:** brief, requirements, design, risks — from `recover-api-spec`, `model-threats`, `scan-risks`
> **Output:** `openspec/changes/<id>/` or `.orbit/task/<id>/spec.md` → next `run-spec-loop`
> **Works with:** `plan-steps`, `test-first`, `run-spec-loop`
> **Shared rules:** reply in the user's language; generated artifacts default to English; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

Brief, requirements and design → a spec that code and tests are written from. In a repo with OpenSpec the spec becomes an OpenSpec change right away (`run-spec-loop`); without it — a file or an issue.

## When to use

- `clarify-task` and `capture-requirements` produced a brief and requirements and the next step is code.
- A behavior or contract changes and the change must be agreed before implementation.
- A recovered spec (`recover-api-spec`) must become a requirements document for the rebuild.
- A team keeps re-litigating what "done" means on the same feature.
- Before `plan-steps`, so tasks come from scenarios rather than from vibes.

Do **not** write a spec for a change that no scenario can distinguish from the current behavior; that is a refactor, and `plan-steps` is enough.

## Inputs

Read everything that already exists; do not re-ask decided questions:

- `.orbit/task/<id>/brief.md` — goal, done-criteria, scope, non-goals;
- `requirements.md`, `design.md`, `.orbit/task/<id>/risks.md` — whatever exists;
- `.orbit/knowledge/rules.md` and `GLOSSARY.md` — vocabulary and business rules;
- `openspec/specs/` — current requirements for the affected capability, when OpenSpec is in use;
- the affected code and API (`recover-api-spec` output) when behavior changes.

If an artifact is missing, write the spec from what exists and mark the gap as an open question with an owner; never fabricate the missing decision. If `brief.md` is missing, run `clarify-task` first.

## Procedure

1. **Collect the inputs and mark the gaps.** One line per input: present / missing. A spec built on an unread brief is a guess.
2. **Write the Problem** from the user's point of view, 2–4 sentences. No implementation nouns; a reader should recognize the pain.
3. **Write the Solution** — what changes, without implementation details. One paragraph; if it needs a diagram, link `project-diagram`.
4. **Number the scenarios** as "as <role> I want <action> so that <value>", each with WHEN/THEN criteria. One scenario = one testable behaviour.
5. **List the implementation decisions** — modules, contracts, schemas affected, no code. Keep them at module/contract level so the spec survives refactoring.
6. **Map the testing** — which scenario is covered at which level (unit/contract/e2e) and what is checked by hand. Every scenario needs a home.
7. **Carry in the risks and controls** from `risks.md` (both scans), so a control cannot get lost between analysis and code.
8. **State the out-of-scope list** explicitly — the cheapest defence against scope creep later.
9. **List open questions** with an owner and a deadline; a spec with unanswered plan-changing questions is not approved.
10. **Choose the destination and validate.** `openspec/` exists → `openspec/changes/<id>/` (proposal + requirement delta) via `run-spec-loop`. Otherwise → `.orbit/task/<id>/spec.md` or an issue in the tracker (per `setup-repo`). A long spec means the task should be split (`slice-tickets`).

## Output

The spec body; when OpenSpec is present it is split into `proposal.md` and the delta in `specs/<capability>/spec.md`:

```markdown
# Spec: <change-id> — <one line>
## Problem
Analysts copy the orders table by hand; the export takes a day and has typos.
## Solution
The report endpoint returns CSV; the UI adds a download button.
## Scenarios
### S1 — download an orders report
As an analyst I want the report as CSV so that I stop copying by hand.
- **WHEN** the analyst clicks "Download CSV" for the last 30 days
- **THEN** the response is `text/csv` with UTF-8 headers and 10 000 rows max
### S2 — empty result
- **WHEN** there are no orders in the range
- **THEN** the file has only the header row and the UI shows "no data"
## Decisions
- `GET /reports/orders.csv` in `services/export`, reusing the auth middleware.
## Testing
S1: contract test; S2: unit test; 10 000-row case: e2e with seeded data.
## Out of scope
PDF export, scheduled emails.
## Risks and controls
T2 card ref must not appear in logs (masking); migration is reversible.
## Open questions
none
```

## Check

```bash
test -f .orbit/task/<id>/spec.md || test -f openspec/changes/<id>/proposal.md
grep -cE '^- \*\*WHEN\*\*' .orbit/task/<id>/spec.md          # scenarios with WHEN
grep -c '^## ' .orbit/task/<id>/spec.md                      # required sections present
grep -n 'Out of scope\|Open questions' .orbit/task/<id>/spec.md
# OpenSpec path:
openspec validate <id> --strict
```

Pass rule: every scenario has at least one WHEN/THEN pair; no scenario is "works correctly" or "fast" without a number; every scenario appears in the testing map; decisions stay at module/contract level; out-of-scope and open questions are present; in an OpenSpec repo `openspec validate <id> --strict` passes. Attach the spec path to the task and record validation output in `.orbit/task/<id>/evidence.md`.

## Pitfalls

- **Chat memory instead of artifacts.** The spec must quote the brief and requirements; if the spec disagrees with the brief, resolve it before approval.
- **A spec written as code.** Class names and function signatures go stale on refactoring; keep decisions at module/contract level.
- **Untestable scenarios.** "Fast" without a number, "convenient" without a user check — these cannot become tests and will be argued at review.
- **A giant spec.** One spec covering five features gets approved by nobody and tested by nothing; split it with `slice-tickets`.
- **Dropping the risks.** Controls not carried from `risks.md` vanish between analysis and code; the spec is the last place they are visible.
- **Skipping OpenSpec validation.** A malformed delta is rejected at archive time, after the code is written; validate before implementation starts.

## Portability

Markdown plus the OpenSpec CLI when the repo uses it — any agent and model can run it. Without OpenSpec, `.orbit/task/<id>/spec.md` is the same content in one file; without subagents, write it in one pass. If the team works in a tracker, paste the same sections into the issue and keep the file as the source of truth. No Claude Code features are required.

## What's improved vs the source

- The spec is assembled from earlier artifacts (brief, requirements, design, risks), not from chat memory.
- Mandatory WHEN/THEN criteria match the OpenSpec format and become tests in `test-first`.
- Risks are carried over from `scan-risks` / `model-threats` so controls aren't lost.
- A testing map ties every scenario to a test level, so coverage is planned, not hoped for.
- The destination is explicit (OpenSpec change vs task spec vs issue), with validation before code.

## Based on

- [Matt Pocock Skills](https://github.com/mattpocock/skills) — method «to-spec» (MIT). Rewritten in our own words and improved — see "What's improved".

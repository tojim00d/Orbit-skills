---
name: model-domain
description: '[Orbit 1.4.4 Product & domain] Glossary and domain model: terms tied to code, what-if scenarios, ADRs where they matter. Use when: «глоссарий», «модель домена», «ADR», «договоримся о терминах», «что такое клиент»; domain model, ubiquitous language.'
---

# model-domain — shared language and domain model

> **Orbit · ① Understand · step 1.4.4 Product & domain**
> **Input:** requirements, code, recon — from `mine-user-pain`, `research-sources`, `extract-rules`
> **Output:** `GLOSSARY.md`, `docs/adr/NNNN-*.md` → next `scan-risks`
> **Works with:** `capture-requirements`, `extract-rules`, `design-data`, `write-spec`
> **Shared rules:** reply in the user's language; generated artifacts default to English; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

A glossary, entities and context boundaries, plus decision records (ADRs) only where they matter. This removes the main source of business-logic bugs: different people meaning different things by one word.

## When to use

- Two teams or a team and the business use the same word differently ("client" is a person here, an account there).
- A new domain enters the spec: payments, billing, scheduling, permissions — terms before code.
- A rewrite or migration needs stable names for entities, states and transitions.
- A decision keeps resurfacing in review and nobody remembers why it was made.
- Before `write-spec` or `design-data` the vocabulary must be fixed, or the spec encodes ambiguity.

Do **not** use it for a one-file change with an established vocabulary; and do not write an ADR for a reversible choice.

## Inputs

- `.orbit/task/<id>/brief.md`, `requirements.md`, `design.md` if they exist;
- `.orbit/knowledge/overview.md` and `.orbit/knowledge/graph.json` from `map-knowledge` — the code-side names;
- `.orbit/knowledge/rules.md` from `extract-rules` — where business terms already appear;
- the code itself: class names, table names, API fields;
- an existing `GLOSSARY.md` or `docs/adr/` if the repo already has one.

If there is no code map, grep the names in the code area named by the task. If an input is missing, record the gap in the glossary as an open question — do not invent a definition.

## Procedure

1. **Collect candidate terms** from the brief, requirements, code and conversations: nouns that carry business meaning, states, roles, documents. Skip framework vocabulary.
   ```bash
   grep -rnE 'class |interface |CREATE TABLE|@Entity|enum ' src/ | head -80
   ```
2. **Define each term in one sentence**, with an example and where it lives in code. A definition that cannot name its code location is a guess — mark it open.
3. **Check against the glossary during work.** A new word in conversation or code → is it in `GLOSSARY.md`? Present with another meaning → stop and resolve before continuing.
4. **Sharpen fuzzy words.** "Client" — person, company, account, device? One word, one meaning. Put synonyms in a "not to be confused with" line rather than renaming everything.
5. **Test the model with concrete what-if scenarios.** "The client closed the account while a payment is in flight — what happens?" "Two users edit the same record — who wins?" Scenarios reveal missing states before code.
6. **Cross-check with the code.** What is the entity called in classes, tables, API? A mismatch is a rename candidate or a "synonyms" entry in the glossary.
7. **Update the glossary at once**, not "at the end". A vocabulary captured after implementation describes the bug, not the intent.
8. **Write ADRs sparingly.** Only if the decision is hard to reverse, surprising without context, and a real trade-off between alternatives.
9. **Hand off:** terms and rules feed `write-spec`, `extract-rules` and `design-data`; scenarios become test cases in `test-first`.

## Output

Two files, both versioned with the code:

```markdown
# GLOSSARY
## Client
**Definition:** a person who books services; may belong to one company.
**Example:** "a client reschedules a booking".
**In code:** Client.java, table clients, field client_id in bookings.
**Not to be confused with:** Account (billing entity), User (login identity).
**Open:** is a client of an agency also a client of the platform? owner: <name>
```

```markdown
# ADR-0007: bookings store time in UTC, display in the client's zone
**Context:** clients and providers are in different time zones; a stored local time is ambiguous twice a year.
**Decision:** store instants in UTC; render in the viewer's zone.
**Alternatives:** store local time + zone id (rejected: every query handles zone math); store epoch millis (rejected: opaque in SQL).
**Consequences:** reports need a zone parameter; DST bugs move to the display layer.
```

Monorepo: one glossary file per context plus `GLOSSARY-MAP.md` with links. Glossary rows can link to `.orbit/knowledge/overview.md` domain nodes.

## Check

```bash
test -f GLOSSARY.md && echo "glossary ok"
grep -c '^## ' GLOSSARY.md                              # terms
grep -c 'In code:' GLOSSARY.md                          # terms tied to code
ls docs/adr/NNNN-*.md 2>/dev/null | wc -l               # ADRs, when any
grep -rn 'TODO\|open:' GLOSSARY.md | head               # open definitions have owners
```

Pass rule: every term has a definition, an example and a code location; no two terms share a definition; fuzzy words carry a "not to be confused with" line; every ADR has Context / Decision / Alternatives / Consequences on one page; open questions have an owner. Link the glossary path in `.orbit/task/<id>/brief.md` so later steps read it.

## Pitfalls

- **A glossary nobody reads.** If it is not linked from the brief and the spec, it becomes decoration. Link it and check new terms during review.
- **Definitions without code evidence.** "Client means customer" is circular; name the class, table or API field, or mark the term open.
- **Renaming everything.** A glossary aligns meaning; it is not a refactor mandate. Record synonyms first, rename only with a migration plan.
- **ADR inflation.** A page per small decision buries the three decisions that matter. Use the three tests: hard to reverse, surprising, real alternative.
- **Skipping what-if scenarios.** Without them the model is a noun list and missing states appear in production. Run at least three edge scenarios per core entity.
- **Updating the glossary at the end.** A vocabulary written after code documents current names, not agreed meaning — the ambiguity survives.

## Portability

Markdown files plus `grep` — any agent and model can do it. Without subagents, interview the same person in one pass, or collect candidate terms from the repo and confirm them in a single review. If the team uses a wiki, publish `GLOSSARY.md` there and keep the file as the source of truth. No Claude Code features are required.

## What's improved vs the source

- Every term points to its place in code — the glossary is verifiable.
- "What if…" scenarios are a mandatory step; they find missing states before code.
- Terms and rules feed `write-spec`, `extract-rules` and `design-data`.
- ADRs get explicit admission tests (hard to reverse, surprising, real alternative) instead of being written for every choice.
- A monorepo layout with `GLOSSARY-MAP.md` keeps contexts separable without duplicating definitions.

## Based on

- [Matt Pocock Skills](https://github.com/mattpocock/skills) — method «domain-modeling» (MIT). Rewritten in our own words and improved — see "What's improved".

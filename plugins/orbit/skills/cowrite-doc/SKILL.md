---
name: cowrite-doc
description: '[Orbit 3.3.1 Docs & writing] Write a document with the person: context → sections → fresh-reader test. Use when: «напиши документ», «RFC», «дизайн-док», «помоги написать RFC», «соавторь документ»; co-author document, write an RFC with me.'
---

# cowrite-doc — write a document together with the person

> **Orbit · ③ Operate · step 3.3.1 Docs & writing**  
> **Input:** a document topic ← `teach-topic`  
> **Output:** a document → next `instruct-agents`  
> **Works with:** `speak-plain`, `write-human`  
> **Shared rules:** reply in the user's language per `speak-plain`; generated content defaults to English; stay in scope; artifacts go to `.orbit/` (contract: `ARTIFACTS.md` at the pack root).

Design doc, RFC, guide, proposal — a document people will read and decide on. Three stages: gather context → write by sections → test with a fresh reader. The person owns the content; the agent owns structure, completeness and the reader's experience.

## When to use

- A decision needs a written rationale before code: RFC, design doc, proposal, ADR.
- A guide or process doc must be written that other people will actually follow.
- A draft exists but is disorganized or buries the decision; co-writing is faster than a rewrite.
- Not for a message to the team about status (`write-update`), and not for polishing a finished text (`write-human`).

## Inputs

- the audience and the decision: who reads it and what they must do or decide after reading;
- the task context: `.orbit/task/<id>/brief.md` (goal, done-criteria, scope) and `.orbit/knowledge/overview.md`;
- existing material: `.orbit/knowledge/`, `openspec/` specs and changes, ADRs, tickets, chat threads, benchmark data, `docs/`;
- the person's head: ask them to dump everything they know as unstructured text, not to answer a questionnaire.

If an input is missing, say which one in one line and either ask for it or mark the gap as a `[TBD]` with an owner and a date.

## Procedure

1. **Fix the audience and the decision in one sentence.** "This RFC is for the platform team; it must decide whether we move auth to the edge." If the sentence cannot be written, that is the first question.
2. **Collect context before drafting.** Read the artifacts above and ask the person for a free-text brain dump. One message, unstructured is fine; the agent sorts it.
3. **Agree the skeleton.** Section headings with a one-line gist each. Get a yes on the skeleton before writing prose — moving a heading later costs ten times more than agreeing now.

   ```bash
   git log --oneline -20 -- docs/         # what the docs area already says
   rg -n "RFC|TBD|TODO" docs/ openspec/   # open questions and prior drafts
   ls docs/rfc docs/design 2>/dev/null
   ```

4. **Write section by section, not the whole document at once.** After each section, ask at most 2–3 clarifying questions if facts are missing; otherwise keep moving. Mark unresolved facts `[TBD: owner, date]`.
5. **Put the main point first.** The conclusion or decision opens the document and each section (BLUF). A reader who stops after five lines must still know what is being decided.
6. **Make comparisons concrete.** Numbers instead of "many", tables instead of prose for options, and a diagram from `project-diagram` when structure beats words. Every claim about the system cites a file or a measurement.
7. **Draft in the document's target language.** Usually the team's language; keep the Orbit artifacts' working notes in English. Style: `speak-plain` — short sentences, defined terms, no filler.
8. **Run the fresh-reader test.** Give the draft to a context-free agent or person and ask exactly: "What is unclear, and what would you do after reading?" Their answer locates the gaps; record each gap and fix it.
9. **Polish and hand over.** Fix the gaps, then run `write-human` for the final pass. State where the document lives and who must approve it.
10. **Record the decision.** When the document is part of a tracked task, note the final decision and its link in `.orbit/task/<id>/review.md` or append the ADR under `docs/adr/`.

## Output

The document at the path agreed with the person — e.g. `docs/rfc/<id>-<topic>.md`, `docs/design/<service>/README.md`, or `docs/adr/<n>-<title>.md`:

```markdown
# <Title>

**Status:** draft | for review | accepted  ·  **Owner:** <name>  ·  **Reviewers:** <names>

## Decision (with context)
One paragraph a busy reader can act on.

## Problem / motivation
What hurts today, with numbers or evidence.

## Options
| Option | Cost | Risk | Why not chosen |
|---|---|---|---|
| A | … | … | … |

## Proposed design
Description, diagram (project-diagram), interfaces, data changes.

## Open questions
[TBD: owner, date] — each one with a deadline.

## Rollout and verification
Steps, metrics, rollback.
```

Keep the source in the repo's docs area and link it from `.orbit/task/<id>/brief.md` when the task produced it.

## Check

```bash
test -f docs/rfc/<id>-<topic>.md
grep -n '^## ' docs/rfc/<id>-<topic>.md          # sections match the agreed skeleton
grep -n '\[TBD' docs/rfc/<id>-<topic>.md         # each TBD has an owner and a date
grep -n 'Option' docs/rfc/<id>-<topic>.md        # options are comparable, not prose-only
wc -w docs/rfc/<id>-<topic>.md
```

Pass rule: the decision appears in the first five lines of the document and of each section; every `[TBD]` has an owner and a date; the fresh-reader test was run and its gaps are fixed; every factual claim cites a file, a measurement or a source; the document is in the audience's language and contains no secrets. If the reader cannot say what to do next, the document is not done.

## Pitfalls

- **Drafting before the skeleton is agreed.** Prose written against the wrong structure gets deleted; agree headings and gists first.
- **Burying the decision.** A decision on page four is a decision nobody makes. Main point first, always.
- **`[TBD]` without an owner.** It becomes permanent. Every open question needs a name and a date, or it is not tracked.
- **Writing from the chat instead of from artifacts.** The document must reflect the brief and the code, not the last thread.
- **Comparing options in prose.** Readers cannot weigh paragraphs. Use a table with the same columns per option.
- **Polishing before the reader test.** `write-human` makes a confusing draft sound better; test the logic first, polish last.
- **Mixing languages.** One language per document, chosen for the audience; a half-translated draft reads as machine output.
- **Inventing facts.** Numbers, dates and commitments come from the artifacts or the person, never from plausibility.

## Portability

Markdown plus the repo's tools. No Claude-only features: the fresh-reader test can be a second agent, a colleague, or — in a single-agent run — a deliberate "read as a stranger" pass with the question written down and answered honestly. Without `project-diagram`, use a table or ASCII sketch. No subagents or slash commands required; "help me write an RFC" in the user's language starts the same three stages.

## What's improved vs the source

- Reader test by a fresh agent with a concrete question about the reader's actions.
- The document builds on shared `.orbit/` artifacts and is finally cleaned by `write-human`.
- An explicit skeleton gate before prose, and tracked `[TBD]` owners so open questions cannot vanish.
- A document template that forces options, decision and rollout into the same structure.

## Based on

- [Skills by Anthropic](https://github.com/anthropics/skills) — method «doc-coauthoring» (Apache-2.0). Rewritten in our own words and improved — see "What's improved".

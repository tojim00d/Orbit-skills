---
name: triage-issues
description: "[Orbit 3.5.4 Operations] Triage incoming issues and bugs: type, severity, labels, next step, a brief for the pipeline. Use when: «разбери бэклог», «триаж», «новые баги», «разбери очередь»; triage, issue triage, backlog grooming."
---

# triage-issues — triage incoming issues and bugs

> **Orbit · ③ Operate · step 3.5.4 Operations**
> **Input:** new issues ← `handle-incident`
> **Output:** labeled backlog + `.orbit/task/<id>/brief.md` → next `orbit`
> **Works with:** `clarify-task`, `handle-incident`
> **Shared rules:** reply in the user's language per `speak-plain`; generated content (maps, diagrams, comments, docs, artifacts) defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md` at the pack root).

New issues, requests and alerts become classified, labeled, and given a clear next step. The backlog must not turn into a dump: every item leaves triage with an owner, a label and a decision about what happens next.

## When to use

- New issues, bug reports or feature requests landed in the tracker and nobody has looked at them.
- The queue has items older than a week with no label or assignee — a sign the backlog is a dump.
- After an incident (`handle-incident`), the postmortem actions need to become tracked issues.
- Before planning a sprint, so priorities reflect impact rather than the loudest reporter.
- An agent is about to be assigned work and the item first needs done-criteria and a reproduction.

Do **not** use it to investigate a live outage — that is `handle-incident`. Do not start fixing during triage; classification first, work after.

## Inputs

- the intake queue: the tracker's unlabeled/new issues (`gh issue list --search "no:label"`, `glab issue list --unlabeled`), or the team's intake channel copy;
- the label vocabulary set in `setup-repo`: `needs info`, `ready for agent`, `ready for human`, `won't do`, `duplicate`, plus type labels (bug, feature, question, debt);
- the existing backlog — for duplicate detection and for linking related work;
- project context: `.orbit/task/<id>/brief.md`, `openspec/`, and `.orbit/knowledge/overview.md` to judge whether a request is already planned;
- for incident follow-ups: `.orbit/task/<id>/incident.md` with the actions and owners from the postmortem.

If the tracker is not reachable, triage from the copied queue and record it in the same artifact paths.

## Procedure

1. **Pull the queue and count it.** A visible number ("17 new items") makes the triage finite:
   ```bash
   gh issue list --search "no:label" --state open --limit 100
   glab issue list --unlabeled --state opened
   ```
2. **Understand each item before classifying it.** What happened, to whom, how often, and is there a reproduction? Missing data → one concrete question to the author, not a questionnaire.
3. **Classify the type:** bug, feature, question, tech debt, duplicate, or not ours. The type decides the label and the route.
4. **Rate severity and urgency by impact × reach.** Production down, money or personal data → escalate immediately to `handle-incident`; a visual nit in an internal tool waits.
5. **Check for duplicates and linked tickets.** Search the tracker for the symptom, then link both ways. A duplicate is closed with a pointer to the canonical issue, not deleted.
6. **Apply the vocabulary labels.** Use only labels that exist in `setup-repo` — an invented label is invisible to every query the team runs.
7. **Decide the next step for every item: who does what.** `ready for agent` only when the item has testable done-criteria **and** a reproduction; otherwise it goes to `needs info` or `ready for human`.
8. **Write the brief for `ready for agent`** in the `clarify-task` format (`Goal`, `Done when`, `Scope`, `Not doing`, `Edges`) at `.orbit/task/<id>/brief.md`, so the pipeline can start without re-interviewing the reporter.
9. **Close "won't do" with a reason.** Post the reason in the thread and add the out-of-scope label, so the same request does not return next month without context.
10. **Leave the queue empty and the record visible.** Every processed item has a label, an owner and a next step; the triage summary links the briefs and escalated incidents.

## Output

The labeled backlog, plus a brief per `ready for agent` item:

```markdown
# ABC-140: CSV export drops rows with non-ASCII names

**Goal:** every order appears in the exported CSV, including names with diacritics.
**Done when:**
1. `pytest tests/export -k unicode` passes and the file opens with UTF-8 BOM.
2. `curl` of the endpoint on the reported order returns a row, not a skipped line.
**Scope:** `services/export/` only; no schema changes.
**Not doing:** changing the report UI; encoding for other formats.
**Edges:** order without customer, 10 000 rows, empty result.
```

The triage summary in chat or the tracker says: processed, duplicates merged, escalated to an incident, and which items are now `ready for agent`.

## Check

```bash
gh issue list --search "no:label" --state open | wc -l      # 0 unlabeled after triage
gh issue list --label "needs info" | wc -l                  # each has a question + a date
git status --short                                          # no code changed during triage
test -s .orbit/task/<id>/brief.md && rg -n "Done when|Scope" .orbit/task/<id>/brief.md
```

Pass rule: every open item has a type label, a severity or urgency note, an owner and a next step; `ready for agent` items have both testable done-criteria and a reproduction; duplicates are linked; `won't do` has a posted reason. A queue with unlabeled items is not triaged, whatever the spreadsheet says.

## Pitfalls

- **Labeling without a next step.** A label is a sort, not a decision. Each item needs "who does what, by when".
- **`ready for agent` on a vague report.** An agent cannot reproduce "it's broken sometimes". No repro and no done-criteria → `needs info`.
- **The needs-info black hole.** Without a question and a date, the item sits forever. Add both, and revisit after the date.
- **Deleting duplicates.** The reporter loses context and files again. Close with a link instead.
- **Silent "won't do".** No reason means the request returns. Post the reason and the label.
- **Severity by the reporter's tone.** An all-caps message is not a P1. Rate by impact × reach, and let production/money/data escalate.
- **Triage turning into development.** Fixing one item mid-triage means the rest of the queue waits and the labels are never applied.
- **Invented labels.** A label outside the `setup-repo` vocabulary breaks filters and reports. Use the existing set.

## Portability

The commands are optional: `gh`/`glab`, or the tracker's web UI, produce the same queue. Without a tracker, keep the queue in a Markdown file and apply the same fields. The brief follows the `clarify-task` format, so it feeds `orbit` identically in any agent. No subagents are required; the labels and decisions are plain text in `.orbit/` and the tracker.

## What's improved vs the source

- Triage ends with a brief in the pipeline format — the item is ready for `orbit` at once.
- Links to incidents for urgent items and to label setup in `setup-repo`.
- A mandatory next step (owner + action) for every item, not just a label.
- The needs-info path has a question and a date instead of an indefinite wait.

## Based on

- [Matt Pocock Skills](https://github.com/mattpocock/skills) — method «triage» (MIT). Rewritten in our own words and improved — see "What's improved".

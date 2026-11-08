---
name: clarify-task
description: '[Orbit 1.1.1 Intake] Make the task unambiguous: one question at a time with a proposed answer; emergency brake on a mid-work mismatch. Use when: «уточни задачу», «допроси меня», «подожди, что-то не сходится», «непонятно, что делать»; grill me, clarify requirements, wait what.'
---

# clarify-task — make the task unambiguous

> **Orbit · ① Understand · step 1.1.1 Intake**
> **Input:** a fuzzy task from the user or a ticket
> **Output:** `.orbit/task/<id>/brief.md` → next `capture-requirements`
> **Works with:** `recall-history`, `shape-idea`, `scan-risks`
> **Shared rules:** reply in the user's language; generated artifacts default to English; stay in scope; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

The first step of almost any work, and the cheapest place to prevent rework. Goal: the
person who asks and the person who does understand the same thing — **what to do, why,
how we will know it is done, and what must not be touched.** This skill also installs an
emergency brake: if something stops adding up mid-work, come back here instead of
guessing forward.

## When to use

- The request is under three lines, or reads two ways ("make it faster", "fix the import").
- The cost of a wrong guess is high: production, money, customer data, someone else's code.
- Several people are involved and the request arrived through a chat, a ticket or a meeting.
- Mid-work: "wait, this doesn't add up" — a test fails in an unexpected place, the change
  drags in a third module, the code contradicts the brief. Stop and re-clarify.
- An agent is about to start a big route and the done-criteria are still verbal.

Do **not** use it for a genuinely trivial, unambiguous change ("fix a typo in README"):
ask zero questions and do it. Interrogation has a cost; the skill exists to remove
ambiguity, not to perform thoroughness.

## Inputs

Read before asking anything — never make the person repeat what the repository says:

- the original request, ticket or chat message, including the thread around it;
- `README.md`, `CONTRIBUTING.md`, `AGENTS.md` and the run/test instructions;
- past decisions: `.orbit/learnings/`, `.orbit/knowledge/overview.md`, ADRs, `git log --oneline -30`;
- when a tracker is configured: the ticket, its comments and linked tickets (see `setup-repo`);
- the code area named in the request: `rg -n "<domain word>" src/ | head -40`.

If an input is missing, say so in one line and ask for it as one of the questions — do
not silently invent a substitution.

## Procedure

1. **Restate the request in one sentence.** "You want X, because Y, and done means Z."
   If you cannot write it in one sentence, the ambiguity is the task. Send the sentence
   to the person as the first check.
2. **Find what the repository already answers.** Read the inputs above. Anything the code
   or docs already state is not a question — it is a fact you cite back ("I see the
   endpoint already validates the token — is the bug about the refresh path?").
3. **List the unknowns, then sort them.** Put the unknown that changes the plan first:
   goal/audience → definition of done → boundaries → constraints → edge cases. Do not
   ask about edge cases before the goal is clear.
4. **Ask one question at a time, with a proposed answer.** "I suggest X because Y — ok, or
   should it be Z?" One-word replies must be enough. Never send a questionnaire of ten
   questions; the person will answer the easiest one and ignore the rest.
5. **Pin the definition of done to something testable.** "Done when `pytest tests/api`
   passes and the export file opens in Excel" beats "works correctly". If the person
   cannot name a check, propose one and get a yes.
6. **Name the boundaries explicitly.** Repositories, branches, environments, data,
   services. Phrase it as a question: "I will touch only `services/export/` and will not
   change the shared schema — correct?" Record the answer verbatim in the brief.
7. **Capture constraints.** Deadline, compatibility (versions, API contract), stack,
   security/compliance requirements, who reviews, whether a release is needed.
8. **Probe the edges that change the design** — one round, not an interrogation: empty
   input, error path, permission denied, 10 000 records, retry/duplicate, timezone,
   locale. Ask only the edges that would change the implementation.
9. **Write the brief and read it back.** Create `.orbit/task/<id>/brief.md` using the
   template below. Reply to the person with a 5-line summary and the open questions.
   This read-back is the approval gate: the route starts only after "yes".
10. **Set the brake rule.** Tell the person: "If I find a mismatch I will stop and ask,
    not guess." Keep the id and the brief path; later steps read the brief, not the chat.

## Output

`.orbit/task/<id>/brief.md` — the single source of truth for the task:

```markdown
# <id>: <one-line task>

**Goal:** why and for whom. One sentence.
**Done when:**
1. <testable check — command, test, observable behaviour>
2. <testable check>
**Scope:** repos …, branches …, environments …; actions allowed: edit / commit / MR / deploy.
**Not doing:** explicit non-goals.
**Constraints:** deadline, compatibility, stack, security, reviewers.
**Edges:** the specific edge cases agreed above.
**Open questions:** owner and the date they must be answered.
```

Example of a filled brief:

```markdown
# EXP-42: CSV export of the orders report

**Goal:** an analyst can download the orders report as CSV instead of copying the table.
**Done when:**
1. `pytest tests/export` passes, including a 10 000-row case.
2. `curl -s -o /tmp/out.csv -H "Authorization: Bearer $TOKEN" "$API/reports/orders.csv"` returns a file that opens in Excel with UTF-8 headers.
**Scope:** `services/export/` only, branch `feat/EXP-42-csv`; no schema changes, no deploy.
**Not doing:** PDF export, scheduled emails.
**Constraints:** Node 20, existing auth middleware, review by the platform team.
**Edges:** empty result set, order without a customer, timezone in dates.
**Open questions:** none.
```

## Check

Clarification is done when all of these are true — verify before calling the step complete:

- `test -f .orbit/task/<id>/brief.md` and the brief contains a non-empty **Goal**,
  at least two testable **Done when** items, and a **Scope** line.
- Every "Done when" item can be checked by a command, a test or an observable behaviour;
  no item is "works correctly" or "no bugs".
- The **Not doing** list is explicit; no scope word is ambiguous ("related changes").
- No open question can change the plan — if one can, it is still an open question and the
  route waits for the answer.
- The person has replied "yes" to the read-back summary; record the date in the brief.

Record the verdict in `.orbit/task/<id>/evidence.md` (command → output → conclusion)
when this step feeds `prove-done`.

## Pitfalls

- **Asking what the repository already answers.** Reads as "the agent did not look".
  Read first, then ask only the real unknown; cite code and docs in the question.
- **A questionnaire instead of a conversation.** Ten questions get one answer. One
  question with a proposed answer gets a decision in one line.
- **Stopping too early.** "I'll figure it out" is how a task grows 3×. If done-criteria
  are not testable, the route will fail later at `prove-done`.
- **Interrogating a trivial task.** Ambiguity is the trigger, not the size of the change.
  A typo fix needs zero questions.
- **Silent scope creep.** A "small related fix" not listed in **Not doing** becomes a
  surprise in review. Every extra file goes through a one-line scope update.
- **Answering for the person.** Writing the brief from your own assumptions and skipping
  the read-back turns the brief into a guess. The read-back is mandatory.
- **Losing the brake mid-work.** When the code contradicts the brief, "push on somehow"
  is the expensive failure mode: stop, quote the mismatch, ask one question.

## Portability

Works in any agent and with any model: it is a conversation protocol plus one Markdown
artifact. Without subagents or slash commands, run it inline: read the inputs with the
agent's file tools, ask questions in the chat, write the brief with the file tools. In a
non-interactive run, replace questions with a short list of assumptions and mark each one
`[assumed]` in the brief so a human can veto them. No Claude-only features are required;
in Claude Code the `/orbit:orbit` router usually enters this skill at step 1.1.1.

## What's improved vs the source

- "Grill me" and the "wait, what?" brake merged: clarifying at the start and on a mid-work mismatch.
- Every question carries a proposed answer — less load on the person, faster result.
- Explicit stop rule and a written brief that later steps read, instead of chat history.
- Done-criteria pinned to commands/tests, so `prove-done` and `request-review` have something to verify.
- Added an explicit read-back gate, a filled example, and a brake rule that survives agent restarts.

## Based on

- [Matt Pocock Skills](https://github.com/mattpocock/skills) — method «grill-me, wait-what» (MIT). Rewritten in our own words and improved — see "What's improved".

---
name: keep-learnings
description: '[Orbit 3.4.1 Memory & hand-over] Learnings next to code: bug causes, rejected approaches, decisions — read before, write after. Use when: «запомни для проекта», «зафиксируй вывод», «почему так сделано», «больше не пробуй»; learnings.'
---

# keep-learnings — learnings next to the code

> **Orbit · ③ Operate · step 3.4.1 Memory & hand-over**
> **Input:** something learned — from `recall-history`, `write-update`, `find-root-cause`
> **Output:** `.orbit/learnings/<topic>.md` → next `handoff-session`
> **Works with:** `recall-history`, `find-root-cause`, `project-map`
> **Shared rules:** reply in the user's language; generated artifacts default to English; no secrets or personal data; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

Method of Trail-code: what **the code won't tell the next person** is written into the repo and read **before** starting work. A bug's cause after three failed attempts, a rejected approach, a "why we did it this way", a user's correction "that's not how we do it here". If the `trail` CLI is installed (`npm i -g @trailhq/trail-code`), use `trail ask` — it searches code and learnings together. Below is the method without the CLI.

## When to use

- A bug took several failed attempts and the cause is not obvious from the diff.
- An approach was tried and rejected — the next person will try it again otherwise.
- A non-obvious decision was made ("why 120 s and not 60 s").
- A user or teammate corrected "that is not how we do it here".
- Before starting work: read the learnings that touch the area — then do recon.

Do **not** write what the code, `git log`, the README or the issue tracker already says; do not write temporary task state (that is `handoff.md`).

## Inputs

- the experience itself: the bug, the rejected approach, the decision, the correction;
- the affected files and lines (`file:line`), so the entry can be found and trusted;
- `.orbit/learnings/` — existing entries to update instead of duplicating;
- `.orbit/task/<id>/brief.md` and the branch context, for the "when" and "why";
- `recall-history` output when the learning came from a past session.

If the file or line cannot be named, the learning is probably a general preference — say so and keep it short. If an existing entry conflicts, update it rather than adding a second contradictory one.

## Procedure

1. **Read before writing.** At task start, list and search the learnings before code recon:
   ```bash
   ls .orbit/learnings/ 2>/dev/null
   grep -ril '<topic>' .orbit/learnings/ 2>/dev/null | head
   ```
   With the CLI: `trail ask "<question>"` searches code and learnings together.
2. **Capture the learning in the moment** — after the failed attempts, not at the end of the sprint. The cause and the wrong paths are freshest right then.
3. **Write the entry** at `.orbit/learnings/<topic>.md` with frontmatter and four fields: Learning, Why, Tried and rejected, How to apply. One learning per entry; the topic is a file name, not a category.
4. **Name the files.** `files: [path/to/file:line]` makes the entry findable and verifiable; the next reader lands in the right place.
5. **Separate fact from preference.** "nginx cuts at 60 s" is a fact with evidence; "we prefer separate ingresses" is a team convention — label whichever it is.
6. **Update instead of duplicating.** A newer finding on the same topic rewrites the entry and keeps the date; an outdated entry is updated or deleted, not left to rot.
7. **Hand the entry to the workflow.** A learning that changes a rule goes into `GLOSSARY.md` or `.orbit/knowledge/rules.md`; a learning that changes the spec goes to `write-spec`. Link the file in the task's `handoff.md`.
8. **Decide the storage policy.** `.orbit/learnings/` is committed with the change (per `commit-clean`) if the team agrees; otherwise keep it local and say which. Never store secrets, tokens or personal data.

## Output

`.orbit/learnings/<topic>.md`:

```markdown
---
topic: ingress-timeouts
date: 2026-11-08
files: [chart/templates/ingress.yaml:12, values-prod.yaml:40]
---
**Learning:** proxy-read timeout under 60 s breaks report export.
**Why:** a report takes up to 90 s; nginx cuts at 60 by default.
**Tried and rejected:** raising the timeout in the app — no effect, ingress cuts it.
**How to apply:** long endpoints get a separate ingress with timeout 120.
```

## Check

```bash
test -d .orbit/learnings && echo "dir ok"
ls .orbit/learnings/*.md | wc -l                     # entries, and none empty
grep -L 'Learning:\|Why:\|How to apply:' .orbit/learnings/*.md   # entries missing fields
grep -rl 'files:' .orbit/learnings/ | wc -l          # findable entries
grep -rniE 'password|token|secret|@' .orbit/learnings/ || echo "no secrets"
```

Pass rule: every entry has topic, date, files, and the four fields; no entry duplicates an existing topic; no secrets or personal data; every entry is either committed per the team policy or explicitly marked local; learnings read at the start of the work are cited in the task or `handoff.md`.

## Pitfalls

- **Writing what the code already shows.** A learnings file that narrates the diff is noise; write only what the code cannot tell.
- **A vague entry.** "Be careful with timeouts" helps nobody. Name the limit, the file and the rejected fix.
- **Never reading.** The value is read-before-work; without the start-of-task `grep`, the method is a diary.
- **Contradictory entries.** Two notes on the same topic with different advice will be resolved by guessing. Update the entry.
- **Task state in learnings.** "Waiting for review" belongs in `handoff.md`; learnings are durable knowledge.
- **Secrets in the entry.** Logs and commands pasted into learnings may contain tokens; scrub before writing, and never store credentials.

## Portability

Markdown files plus `grep` — any agent and model can do it; the `trail` CLI is optional and `trail ask` degrades to `grep -ril`. Without subagents, read and write in the same session. If the team prefers a wiki, keep `.orbit/learnings/` as the source of truth and mirror entries there. No Claude Code features are required.

## What's improved vs the source

- Works without a CLI or cloud: entries are markdown files in `.orbit/learnings/`.
- Clear rules for what to write and what not (no duplicating code or git log).
- Four required fields — Learning, Why, Tried and rejected, How to apply — make every entry actionable.
- Read-before-work is a concrete `ls`/`grep` step, not an aspiration.
- Storage policy (committed or local) is explicit, so the team knows where memory lives.

## Based on

- [Graft / Trail-code](https://github.com/trailhq/Graft) — method «trail» (MIT). Rewritten in our own words and improved — see "What's improved".

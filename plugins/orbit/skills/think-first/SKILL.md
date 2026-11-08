---
name: think-first
description: '[Orbit 0.2.2 Conventions] Think before coding: name assumptions, minimum code, surgical edits, a verifiable goal. Use when: «не усложняй», «подумай сначала», «только нужное», «сначала план», «не трогай лишнего»; think before coding, surgical changes.'
---

# think-first — think before coding

> **Orbit · Always on · step 0.2.2 Conventions**
> **Input:** any coding work
> **Output:** disciplined edits → next `keep-it-small`
> **Works with:** `clarify-task`, `prove-done`, `keep-it-small`
> **Shared rules:** reply in the user's language per `speak-plain`; generated content defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

Four habits remove most agent errors: silent assumptions, extra complexity, drive-by
edits, and "done" without proof. This skill makes each habit an explicit, checkable step
before and after the code is written. Always on; for a trivial task use judgment and
skip the ceremony, not the rule.

## When to use

- Before writing any code that changes behaviour, structure or configuration.
- When the request is short and could be read two ways.
- When the change reaches a module you do not fully understand yet.
- When you are about to say "done" and cannot name the command that proves it.
- When tempted to "improve" a nearby function while doing the task.

Skip when the change is a genuine one-liner with an obvious check ("fix the typo in
README"); the four habits still apply, but there is nothing to schedule.

## Inputs

- The task: `.orbit/task/<id>/brief.md` — goal, **Done when**, **Scope**.
- The plan, if present: `.orbit/task/<id>/plan.md` — the task row and its check command.
- The code around the change: read the target file and its callers (`rg -n '<symbol>' src/`),
  not just the line you plan to touch.
- The repository's checks: `package.json` scripts, `Makefile`, `pyproject.toml`,
  `go.mod`, CI config — the exact command that proves the result.
- Prior decisions: `.orbit/learnings/`, `docs/adr/`, `git log --oneline -20`.

If the **Done when** criteria are missing, that is the first task: run `clarify-task` and
get one, or propose a command and get a yes. Do not start coding against a guess.

## Procedure

1. **Write the verifiable goal first.** One sentence plus the command that proves it:
   "The export endpoint returns UTF-8 CSV; proof: `python3 -m pytest tests/export -q`".
   No command and no observable behaviour means no goal yet.
2. **Name assumptions with evidence.** "I assume the token is validated in middleware
   because I see `auth.ts:42`." Cannot point to the line? Then it is a hypothesis, label
   it `hypothesis` — never let it silently become the design.
3. **Resolve ambiguity with one question.** If the request reads two ways, ask one
   question with a proposed answer (`clarify-task`), do not silently pick the convenient
   reading. One reply must be enough to proceed.
4. **Show two reasonable paths when both exist.** One line each, with the trade-off; then
   briefly recommend one and say why. Two paths in the answer is cheap; two rewrites of the diff
   are not.
5. **Define the minimum that solves it.** No parameters, abstractions or flags "for the
   future"; no shared helper until something repeats three times. Size rules and the
   strictness levels live in `keep-it-small`.
6. **Edit surgically.** Touch only what the task needs. No reformatting, renames or
   "improvements" of nearby code. Clean up only your own mess — temp logs, debug code,
   stray files; leave existing debris alone.
7. **Run the change → check loop.** After each meaningful edit, run the proving command.
   Keep changing until it passes; a failing check is the next instruction, not noise.
8. **Report with evidence.** Summary = goal, what changed, the command and its output
   (`.orbit/task/<id>/evidence.md`), plus a "noticed, not touched" list of nearby
   problems. "Done" only with a fresh check, never from memory (`prove-done`).

## Output

Disciplined edits plus a working note in `.orbit/task/<id>/plan.md` (proof in
`.orbit/task/<id>/evidence.md`), so the next session sees the reasoning, not only the
diff:

```markdown
**Working note: <task>**
Goal: <one sentence>; proof: `<command>` → <expected>
Assumptions:
- <X> — verified at <file:line>
- <Y> — hypothesis, unverified
Path: A (chosen) vs B — chose A because <reason>
Diff: <N files, what changed>
Noticed, not touched: <file:line> — <problem> (reported, not fixed)
```

Example:

```markdown
**Working note: EXP-42**
Goal: serve the orders report as UTF-8 CSV; proof: `npm test -- export` → 7 passing
Assumptions:
- The report query already paginates — verified at src/reports/query.ts:88
- The CSV helper tolerates CRLF — hypothesis, unverified
Path: reuse `sendFile` (A) vs add a formatter (B) — chose A: one call, no new module
Noticed, not touched: duplicate auth check in src/reports/router.ts:88 (report to review)
```

## Check

Before replying "done", verify each habit against a command:

```bash
git status --short                  # only expected files are touched
git diff --check                    # no whitespace noise / accidental reformat
git diff --stat
rg -n 'console\.log|print\(|dbg!|TODO|FIXME' <changed files>   # no debug leftovers
python3 -m pytest -q                # or: npm test / make test / go test ./...
```

Pass rule: all four answers are "yes" — every assumption is backed by a `file:line` or
labelled a hypothesis; nothing in the diff was not asked for; the proving command exits
0 and its output is saved in `.orbit/task/<id>/evidence.md`; the "noticed, not touched"
list is in the working note. A "no" means fix it before reporting, not explain it.

## Pitfalls

- **Assumption dressed as fact.** "The cache is invalidated on write" with no line to
  point at is a hypothesis; if it is wrong, the whole design is wrong. Label it.
- **Two questions at once.** A short request answered with a questionnaire stalls. One
  question, one proposed answer, one reply.
- **Bonus refactor.** Renaming a variable or moving a function "while here" enlarges the
  diff and hides the real change. Report it under "noticed, not touched".
- **Debug leftovers.** A `console.log` or `print` that "helps just for now" ships to
  production. Search the changed files before reporting.
- **Proof from memory.** "Tests passed earlier" is not evidence; run the command again
  after the last edit and save the output.
- **Fixing the symptom.** If the failing check points at a different cause than assumed,
  stop and re-read the code; do not patch the check or the test.
- **Silent scope choice.** Picking the reading of the task that is easiest to implement
  and not saying so turns a clarification into a surprise at review.

## Portability

No Claude-only feature. Any agent can name assumptions, ask one question, make surgical
edits and run a command — in a non-interactive run, replace the question with a labelled
assumption and a proposed choice, and mark it `[assumed]` in the working note. The
checks are plain `git`, `rg` and the repo's test runner. Without subagents, everything is
done inline; the artifacts (`plan.md`, `evidence.md`) stay under `.orbit/`.

## What's improved vs the source

- Each rule has a concrete action and check ("show `file:line`", "list under noticed").
- "Noticed, not touched" format instead of silent nearby fixes.
- Rules link to pipeline skills: questions → `clarify-task`, size → `keep-it-small`, proof → `prove-done`.
- A working note template that carries assumptions, chosen path and evidence across sessions.
- The self-check is expressed as commands, so "done" has an exit code.

## Based on

- [Karpathy Skills](https://github.com/multica-ai/andrej-karpathy-skills) — method «karpathy-guidelines» (MIT). Rewritten in our own words and improved — see "What's improved".

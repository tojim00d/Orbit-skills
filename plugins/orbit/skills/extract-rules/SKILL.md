---
name: extract-rules
description: '[Orbit 1.3.6 Reverse engineering] Business rules from legacy as Given/When/Then with sources and characterization tests. Use when: «какая логика зашита», «бизнес-правила из кода», «легаси», «вытащи правила», «что здесь считается нормой»; business rules, legacy.'
---

# extract-rules — pull business rules out of code

> **Orbit · ① Understand · step 1.3.6 Reverse engineering**
> **Input:** legacy code, plus findings from `reverse-app`/`analyze-binary`
> **Output:** `.orbit/knowledge/rules.md` (rules + tests + status) → next `rebuild-clean`
> **Works with:** `test-first`, `model-domain`, `check-parity`, `write-spec`
> **Shared rules:** reply in the user's language; generated artifacts default to English; own or authorized targets only; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

Code has run for years, no docs, the author left. The job is to separate **what the business requires** from **how it happened to be implemented**. Output: Given/When/Then rules tied to code, plus characterization tests. That output is the input to migration, rewrite and OpenSpec.

## When to use

- A legacy module must be rewritten or replaced and the current behavior is undocumented.
- A support ticket says "the system does X" but the code seems to say Y — find the real rule.
- A migration team asks which validations, limits and rounding rules must survive.
- The domain model (`model-domain`) needs the real states and transitions, not the ones in a slide.
- Before `check-parity` you need a rule list to compare old and new behavior.

Do **not** use it when the code is small and the rules are already in `openspec/specs/` — read the spec and verify it instead.

## Inputs

- the legacy code and its entry points; `.orbit/reverse/<target>/findings.md` for the target map;
- `.orbit/knowledge/graph.json` and `.orbit/knowledge/overview.md` from `map-knowledge` when they exist, otherwise run `survey-codebase` first;
- test infrastructure: where tests live, how they run (`pytest`, `npm test`, Maven/Gradle);
- business contacts who can confirm intent.

If there is no map, the entry-point step builds a minimal one with `grep`; do not read the whole tree. If no business contact exists, every rule stays `question` — never promote a guess to `confirmed`.

## Procedure

1. **Find the entry points.** Controllers, queue handlers, cron/jobs, stored procedures, batches, CLI commands, exposed endpoints. A rule you cannot reach is not worth cataloging.
   ```bash
   grep -rnE '(@(Get|Post|Put|Delete)Mapping|@RestController|@Scheduled|def (run|handle|process)|func (Run|Handle)|cron|CREATE PROCEDURE)' src/ | head -60
   ```
2. **Find the branches with business meaning.** Amounts, limits, dates, statuses, roles, percentages, rounding, taxes, thresholds. Skip plumbing (`null` checks on dependencies, retries of HTTP clients) unless it changes what the customer sees.
   ```bash
   grep -rnE 'if .*(amount|limit|status|role|rate|date|days|percent)|BigDecimal|decimal|ROUND|CASE WHEN' src/ | head -100
   ```
3. **Write each rule as Given/When/Then with a source.** One rule, one decision. The source is `file:line` plus the DB object; the type is `observation` when read from code, `inference` when reconstructed from behavior, `question` when intent is unclear.
4. **Separate accidental from intended.** Magic numbers without explanation, bug workarounds, dead branches, copies of the same check in three places → "looks like an implementation artifact, confirm". Keep them in the catalog as candidates, not as requirements.
5. **Pin every key rule with a characterization test.** Input → current output, even if odd. The test protects behavior during the rewrite: it must pass on the old code and, after the rewrite, on the new code with the same expectations.
   ```bash
   pytest tests/characterization -q --disable-warnings
   ```
6. **Cover the state machine.** Statuses and transitions are rules too: which statuses can move to which, who may trigger the move, what happens on a duplicate request. A missing transition is a future production bug.
7. **Catalog** `.orbit/knowledge/rules.md` — ID, rule, source, test, status (confirmed by business / question), plus the rules your tests cover.
8. **Read it back with the business owner.** Walk the open questions in one pass; every answer either confirms, corrects or kills a rule. Record the date and the person.
9. **Hand off.** Rules → `run-spec-loop` (requirements spec), → `rebuild-clean` or `plan-steps` (migration), → `project-map` (domain nodes), → `check-parity` (rules as the parity matrix).

## Output

`.orbit/knowledge/rules.md` — the catalog, one block per rule:

```markdown
### R-012 Transfer limit without confirmation
Given a client with verification level BASIC
When the transfer amount > 100 000 RUB per day
Then the transfer goes to manual confirmation
Source: TransferService.java:212-240, LIMITS.sql:14
Type: observation (code) | Confidence: high
Question for business: calendar day or rolling 24 h?
Test: tests/characterization/test_transfer_limits.py::test_basic_limit
Status: confirmed 2026-11-08 (owner: risk team)
```

Header of the file: target, version/hash, date, and the number of rules per status. A rule without a source or a test is flagged in the catalog, not silently accepted.

## Check

```bash
test -f .orbit/knowledge/rules.md && echo "catalog ok"
grep -c '^### R-' .orbit/knowledge/rules.md                    # rule count
grep -c '^Status: confirmed' .orbit/knowledge/rules.md         # confirmed vs question
grep -nE '^Source: .*:[0-9]+' .orbit/knowledge/rules.md | wc -l  # every rule sourced
pytest tests/characterization -q                               # tests green on the old code
```

Pass rule: every rule has `Given/When/Then`, a `file:line` source, a type and a status; every rule marked `confirmed` has a passing characterization test or a documented reason it cannot be tested; no rule block without a source; open questions are listed with an owner in the catalog. Copy the "all tests green on the old code" line into `.orbit/task/<id>/evidence.md` (`prove-done`).

## Pitfalls

- **Cataloging implementation, not business.** "There is a `Thread.sleep(200)` before the call" is not a rule. Ask what the customer observes; keep the sleep as an artifact note, not a requirement.
- **No characterization test.** Rules without tests are opinions; the rewrite will silently change behavior and nobody will notice until finance does.
- **One rule per branch.** Twenty branches of one guard clause are one rule with twenty conditions; splitting them buries the requirement in noise.
- **Trusting code as intent.** Code may encode a bug that became policy. Mark it `question` and ask the business — do not bless it as a requirement by default.
- **Ignoring stored procedures and jobs.** The most important rules often live in SQL and cron, outside the service the team reads.
- **A catalog that grows forever.** Rules with no owner and no test for months should be marked stale or removed; a 900-rule document is read by nobody.

## Portability

Plain Markdown plus shell and the project's own test runner — any agent can do it. Without subagents, work through entry points sequentially; the catalog is the shared state. If the repo has no test framework, write a small script with `python3` that feeds inputs and compares outputs; record its command as the characterization test. No Claude Code features are needed.

## What's improved vs the source

- Separates "what the business requires" from "how it was accidentally implemented", marking implementation artifacts.
- Every rule is pinned by a characterization test before any rewrite.
- Rules carry a status (`confirmed` / `question`) and a business owner, so open intent cannot hide.
- State machines and stored procedures are explicitly in scope; both are common hiding places for rules.
- The catalog format matches `check-parity`, so the same rules become the parity matrix.

## Based on

- [REA](https://github.com/morluto/rea) — method «reverse-engineer-anything» (MIT). Rewritten in our own words and improved — see "What's improved".

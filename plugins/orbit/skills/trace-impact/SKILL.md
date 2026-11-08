---
name: trace-impact
description: '[Orbit 1.2.5 Code recon] What a change touches: affected modules, consumers, external contracts, risk level. Use when: «что сломается», «радиус изменения», «на что влияет MR», «кто это использует», «оцени риск изменения»; impact analysis, blast radius.'
---

# trace-impact — what a change touches

> **Orbit · ① Understand · step 1.2.5 Code recon**
> **Input:** diff / branch / MR ← `explain-code`
> **Output:** blast radius → next `review-code`
> **Works with:** `index-code`, `map-knowledge`, `run-spec-loop`, `review-code`
> **Shared rules:** reply in the user's language per `speak-plain`; generated content defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

Method of Understand Anything «understand-diff»: from a diff, branch or MR — affected
modules, their consumers, and risk. Use it before review, before merge, and when
analyzing "what broke after the release". The output is a blast radius, not a summary of
the diff: the diff says what changed, this says what the change can reach.

## When to use

- An MR/PR is open and you need to know what it can break before review.
- A release happened and one service misbehaves — find what changed near it.
- Before merging a change whose consumers are not obvious from the file.
- A reviewer asked «на что это влияет?» or «что сломается?».
- Before a schema, API or config change, to enumerate every consumer.

Skip for a docs-only or test-only diff with no code path touched; say so in one line and
hand it to review. Not a replacement for `review-code`: this maps reach, review judges
quality.

## Inputs

- The change and its base: `git merge-base HEAD origin/main`,
  `git diff --stat <base>...HEAD`; for an MR, `glab mr diff <id>` or `gh pr diff <n>`.
- The graph and index, if they exist: `.orbit/knowledge/graph.json`,
  `.orbit/knowledge/index/wiring.md`, `.orbit/knowledge/index/nodes/`.
- The task context: `.orbit/task/<id>/brief.md` (what was intended), `.orbit/task/<id>/plan.md`
  (files expected to change).
- Contract surfaces: OpenAPI files, `proto/`, event schemas, DB migrations
  (`ls migrations db/migrate`), published package metadata (`package.json` `name`).
- The spec link: `openspec/changes/<id>/` when the repo uses OpenSpec.

If the base is unclear, use the branch point from `git log --oneline --graph -10` and
state which base you used; a wrong base produces a wrong radius.

## Procedure

1. **Fix the base and get the change.** `git merge-base HEAD origin/main` (or the release
   tag); then `git diff --stat <base>...HEAD` and `git diff <base>...HEAD`. For an MR:
   `glab mr diff <id>` / `gh pr diff <n>`. Note the file count and the areas.
2. **Inventory the changed symbols per file.** For each changed hunk, name what actually
   changed and at which level: function signature, class/interface, module boundary,
   config key, env var, DB schema, API contract, chart value, CI job.
3. **Find direct consumers (level 1).** For every changed symbol:
   `grep -rn '\b<Name>\b' src/` or the graph's incoming edges
   (`jq '.edges[] | select(.to=="<node>")' .orbit/knowledge/graph.json`). Record each
   consumer with `file:line`.
4. **Go two levels up (level 2).** For each consumer, find its consumers. Two levels is
   the working default: it catches the common "helper → service → API" chain without
   expanding into the whole repository.
5. **Treat external contracts separately.** HTTP APIs, topics/events, DB schemas and
   published packages have consumers **that may live in other repositories**. List the
   contract, its version/format, and the known or likely consumers; a breaking contract
   change is high risk even when the diff is small.
6. **Classify the risk** by signs, not by file count:

   | Level | Signs |
   |---|---|
   | high | contract change (API, DB schema, event format), security, money, data migration |
   | medium | logic with many consumers, deploy config, dependencies |
   | low | local logic with tests, docs, behavior-preserving refactor |
7. **List what is missing.** No tests on the touched path? No migration for the schema
   change? No rollback? No OpenSpec entry or project-map update (`run-spec-loop`)? Missing
   safeguards belong in the report next to the risk level.
8. **Write the blast radius and hand it to review.** The report goes to `review-code` /
   `request-review` as the context package; accepted findings land in
   `.orbit/task/<id>/review.md`, and the proof of the touched path in
   `.orbit/task/<id>/evidence.md` via `prove-done`.

## Output

Blast radius report, delivered in the user's language; `review-code` records accepted
findings in `.orbit/task/<id>/review.md` and `prove-done` the touched path in
`.orbit/task/<id>/evidence.md`. Template:

```markdown
Change: <branch/MR>, <N> files, base <sha>
| Touched | How | Consumers | Risk |
|---|---|---|---|
| <symbol/contract> | <signature/schema/config> | <file:line, module> | low/medium/high |

External contracts: <API/topic/schema> — consumers: <repo or unknown>
Check by hand: <paths a human must inspect>
Missing: <tests, migration, rollback, OpenSpec entry, map update>
Verdict: <risk level + one line why>
```

Filled example:

```markdown
Change: feat/EXP-42-csv, 4 files, base a1b2c3d
| Touched | How | Consumers | Risk |
|---|---|---|---|
| ordersQuery | new optional limit param | src/reports/router.ts:31 | low |
| GET /reports/orders | new format=csv branch | web client, mobile app | medium |
External contracts: HTTP response gains a format — mobile app calls the endpoint.
Missing: no test for format=csv on the mobile path; no OpenSpec entry.
Verdict: medium — additive, but a shared HTTP contract is touched.
```

## Check

```bash
git diff --stat <base>...HEAD
git diff --name-only <base>...HEAD | wc -l
grep -rn '\b<ChangedName>\b' src/ | wc -l     # consumers found
jq -e '.edges[] | select(.to=="<node>")' .orbit/knowledge/graph.json > /dev/null
rg -n 'format=csv|/reports/orders' --glob '!*.lock' .
git status --short                              # no stray files in the base comparison
```

Pass rule: every changed symbol in the inventory is classified; every listed consumer has
a `file:line`; external contracts are named separately even when no consumer repo is known;
the risk level follows the table's signs; the "missing" list is explicit (or says "none");
the base is stated. If a consumer cannot be determined, write "unknown — needs owner" in
the table rather than omitting the row.

## Pitfalls

- **Counting files instead of reach.** A one-line change to a shared helper can be high
  risk; a 40-file docs rename is low. Classify by contract and consumers, not by size.
- **Missing external consumers.** The mobile app or a neighbouring service is not in this
  repository. A response field change is a contract change; say who may consume it.
- **Stopping at direct callers.** Two levels catch the helper → service → API chain; one
  level reports "safe" too early.
- **A wrong base.** Diffing against a stale `origin/main` includes unrelated commits and
  inflates the radius. Resolve `git merge-base` and state it.
- **Dynamic calls and reflection.** `grep` misses calls by string, DI config, reflection
  or generated clients. Search the string form too and say what the tool cannot see.
- **Ignoring config and schema.** Env vars, chart values and migrations have consumers
  outside the code path; they belong in the table.
- **No "missing" list.** The most useful part of a blast radius is what the change forgot:
  a test, a migration, a rollback or an OpenSpec entry.

## Portability

No Claude-only feature: `git`, `grep`/`rg`, `jq` and the tracker CLI do the work. Without
the Orbit graph or index, build the consumer list from `grep -rn` — the report shape is
the same. Without `glab`/`gh`, use `git diff` on the fetched branch. Subagents are not
required; on a large diff, split the inventory per area manually and merge the tables. The
report is text; the artifacts it references (`.orbit/knowledge/graph.json`,
`.orbit/task/<id>/review.md`) are agent-independent.

## What's improved vs the source

- External contracts are called out separately — their consumers may be in other repositories.
- Risk classification by signs, plus a "what's missing" list (tests, migration, OpenSpec entry).
- Two-level consumer walk with a stated default, so "safe" is not declared too early.
- The base commit is named, so the radius can be reproduced.
- Unknown consumers are recorded as unknown with an owner, not silently dropped.

## Based on

- [Understand Anything](https://github.com/Egonex-AI/Understand-Anything) — method «understand-diff» (MIT). Rewritten in our own words and improved — see "What's improved".

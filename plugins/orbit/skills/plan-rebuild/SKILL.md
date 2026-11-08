---
name: plan-rebuild
description: '[Orbit 2.2.7 Architecture & data] Stack, schema and API for a rebuild from analysis; thin vertical slice first. Use when: «спланируй пересборку», «как переписать систему», «план ребилда»; rebuild plan, rewrite plan, reimplementation architecture.'
---

# plan-rebuild — plan a rebuild from analysis

> **Orbit · ② Build · step 2.2.7 Architecture & data**
> **Input:** recon / findings ← `deepen-modules`
> **Output:** `.orbit/product/<name>/architecture.md` → next `rebuild-clean`
> **Works with:** `teardown-product`, `design-data`, `choose-stack`, `rebuild-clean`
> **Shared rules:** reply in the user's language; generated artifacts default to English; stay in scope; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

From a product map (`teardown-product`) or reverse-engineering findings (`reverse-app`) this skill produces the stack, data schema, API and build order for your own version. It is the bridge between understanding and building: the analysis becomes decisions, and the thin vertical slice goes first.

## When to use

- A feature/product analysis exists (`.orbit/product/<name>/` or `.orbit/reverse/<target>/`) and a rebuild is being planned.
- A legacy system will be replaced and the new version needs an architecture before code.
- A vendor component must be reimplemented in-house and its contract is known.
- Someone keeps describing the rebuild as "same but cleaner" with no schema, API or order written down.
- **Not** for a small refactor: if behaviour stays and only internals move, `deepen-modules` + `plan-steps` is cheaper.

## Inputs

- analysis: `.orbit/product/<name>/recon.md` + `features.csv`, or `.orbit/reverse/<target>/findings.md` + `.orbit/knowledge/rules.md`;
- the feature matrix: feature, must/should/could, acceptance criterion — the build order follows it;
- flows: the `F…` flows/screens from the analysis, each mapped to behaviour;
- target environment constraints: approved stack, platform, data residency, integrations (from `setup-repo` / platform docs);
- the template `tools/architecture.md` shipped with this skill — the output structure follows it.

If the analysis is missing, run `teardown-product` or `reverse-app` first: an architecture written from memory of the old product is a guess. If the matrix has no must/should/could column, build it with `teardown-product` first.

## Procedure

1. **Confirm scope from the feature matrix.** List the must-haves that will be rebuilt and the ones that will not. If "not carried over" was decided during analysis, copy that section — do not re-open it silently.
2. **Choose a boring, managed stack.** Default to the team and platform stack via `choose-stack`; anything new needs a written reason. Managed services (managed DB, managed queue) beat self-hosted for a rebuild unless the analysis shows a hard constraint.
3. **Derive the data schema from the inferred model.** Entities → tables with types, keys, indexes and access rules (`design-data`). Every field links to the screen or flow it came from (`F…` or `recon.md` section); a field with no source is speculation.
4. **Design the API by flows.** For each flow `F…`: routes, caller, authorization, request/response shape. Reuse the observed contract where parity is the goal; mark deliberate deviations.
5. **Map integrations and jobs.** Inbound/outbound webhooks, scheduled jobs, auth providers, payment/email providers — each with owner and failure behaviour. The template's "parts that bite" section collects time zones, idempotency and races.
6. **Choose the build order.** App shell → main flow end to end (vertical slice) → remaining must → should. Order follows feature-matrix priorities, not layer convenience.
7. **Cut the first vertical slice.** Name the screens, tables and routes it touches; it must be demonstrable end to end with a real user action and a real row in the database.
8. **Write the "not carried over" section.** Explicitly list old behaviours that will not be rebuilt (legacy hacks, dead features, features recognized as implementation artifacts) with a one-line reason each.
9. **Check consistency with the analysis.** Every feature id in the matrix appears in the schema or the API or the "not carried over" list; no invented capability. Cross-read `recon.md`, `findings.md`, `rules.md`.
10. **Hand over.** Point the next steps: `rebuild-clean` executes the plan; `rebuild-design` and `build-screens` / `build-backend` build the slices.

## Output

`.orbit/product/<name>/architecture.md`, following `tools/architecture.md`:

```markdown
# Architecture: <our name> (a rebuild of <product>'s core features)

## Stack
| layer | choice | why |
| web | <framework> | team stack, SSR needed |
| database | PostgreSQL 16 | relations + reporting |
| auth | <platform SSO> | company requirement |
| jobs | platform queue | managed, no ops |

## Schema
Tables: <n>. Access rules: <RLS | data-layer checks>.
See `ddl/001_init.sql`; every table links to a flow.

## API
| method path | does | who | input | output | flow |
|---|---|---|---|---|---|
| GET /orders/{id} | order detail | customer | id | order | F2 |

Webhooks in: <...>   Webhooks out: <...>
Jobs: <name, schedule, what it does>

## The parts that bite
- time zones: <...>
- idempotency: <...>
- races: <...>

## Build order
1. Vertical slice: <screens, tables, routes>
2. Must-haves: <ordered list>
3. Should-haves: <ordered list>

## Not carried over
- <old behaviour> — <reason: hack / dead / implementation artifact>
```

The slice plan, as a short table that `rebuild-clean` can execute:

```markdown
| # | slice | screens | tables | routes | feature ids |
|---|-------|---------|--------|--------|-------------|
| 1 | see own orders | Orders, OrderDetail | orders | GET /orders, GET /orders/{id} | F1, F2 |
| 2 | cancel unpaid order | OrderDetail | orders | POST /orders/{id}/cancel | F3 |
```

## Check

The rebuild is plannable when the analysis is fully used and the first slice is demonstrable:

```bash
ls .orbit/product/<name>/recon.md .orbit/product/<name>/features.csv
rg -n "F[0-9]+" .orbit/product/<name>/architecture.md | wc -l
python3 - <<'EOF'
import csv
rows = list(csv.DictReader(open('.orbit/product/<name>/features.csv')))
print(len(rows), 'features', sum(r.get('priority','').startswith('must') for r in rows), 'must')
EOF
rg -n "Not carried over" -A5 .orbit/product/<name>/architecture.md
```

Pass rule: stack rows cite a reason and come from the team/platform stack unless justified; every schema field traces to a screen or flow; every `F…` flow in the matrix is served by a route, a table or the "not carried over" list; the build order starts with a demonstrable vertical slice; integration parts (webhooks, jobs, auth) are written down; no feature appears that the analysis never showed. Save the consistency check output in `.orbit/task/<id>/evidence.md`.

## Pitfalls

- **Architecting from memory.** Writing the new schema from what you remember of the product skips observed behaviour. Every entity and route cites the analysis.
- **Building all layers first.** "Schema in sprint 1, API in sprint 2, screens in sprint 3" ships nothing until the end. Start with an end-to-end slice.
- **Reinventing the stack.** A rebuild is the worst moment to switch to a new framework; use the team stack and spend the novelty budget on the product.
- **Silent scope creep.** Adding "while we are at it" features inflates the rebuild and delays parity. New features go to the matrix with an owner, not into the plan.
- **Forgetting integrations.** Auth, payments, email, webhooks and jobs are where rebuilds fail; list them with failure behaviour.
- **No "not carried over" list.** Without it, reviewers assume every old behaviour is required, and scoping repeats. Write it explicitly.
- **A slice with no data.** A vertical slice that only renders a screen proves the UI, not the rebuild. It must write and read a real row.

## Portability

The output is a Markdown architecture plus SQL/API artifacts, so any agent can produce and consume it. Without `teardown-product` / `reverse-app`, work from whatever analysis exists in `.orbit/` and mark gaps as open questions. The `tools/architecture.md` template ships with this skill and can be filled manually; no subagents, trackers or slash commands are required. If the team uses a design-doc system, copy the content there — the `.orbit/` file remains the working copy.

## What's improved vs the source

- Works from two inputs: analysis of someone else's product and reverse engineering of your own legacy.
- Stack and schema are designed with shared Orbit skills (`choose-stack`, `design-data`), not separate rules.
- Every field and route traces to an observed screen/flow; speculation is marked.
- A mandatory "not carried over" list and an explicit vertical-slice-first build order.
- Integration surfaces (webhooks, jobs, auth) collected in "the parts that bite".
- A check that cross-reads the feature matrix so no analysed flow is dropped.

## Based on

- [Replica](https://github.com/Jakeschincariol/replica-skill) — method «replica-architect» (MIT). Rewritten in our own words and improved — see "What's improved".
- Helper files in `tools/` are taken from the source unchanged; licences: `tools/LICENSE.upstream`.

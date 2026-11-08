---
name: design-data
description: '[Orbit 2.2.2 Architecture & data] Data: entities, store, DDL, idempotency, indexes from access patterns, schema evolution. Use when: «схема БД», «модель данных», «миграции», «какие таблицы»; data model, schema, database design, migrations.'
---

# design-data — design the service's data

> **Orbit · ② Build · step 2.2.2 Architecture & data**
> **Input:** requirements ← `design-backend`
> **Output:** `.orbit/task/<id>/design/data-design.md` + `ddl/` → next `design-services`
> **Works with:** `model-domain`, `build-backend`, `design-services`
> **Shared rules:** reply in the user's language; generated artifacts default to English; stay in scope; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

The data model is the most expensive part of a service to change: code can be refactored in days, a live schema with data cannot. Design it from requirements and access patterns, before architecture and code — and write the physical DDL in the same pass, because a model that cannot be expressed in constraints and indexes is not a design.

## When to use

- A new service needs its schema before the API is designed.
- An existing schema must be changed and the migration path is not obvious.
- Requirements mention entities, reports or invariants and nobody has listed the access patterns yet.
- A service crosses several stores and the consistency rules must be written down.
- **Not** for a throwaway prototype or a purely in-memory component — there is no schema to protect.

## Inputs

- requirements and use cases with ids: `.orbit/task/<id>/brief.md`, `requirements.md`, `openspec/changes/<id>/` (`UC…`, `R…`);
- the domain model if it exists: `.orbit/knowledge/` (`model-domain`, `map-knowledge`);
- read/write estimates from the product or SLOs — if absent, state the assumption and mark it;
- company-approved store family and version; platform backup/restore rules;
- existing schemas when changing them: `psql "$DATABASE_URL" -c "\d+ <table>"` or `pg_dump --schema-only <db>`.

If requirements lack use-case ids, run `capture-requirements` first: entities without requirements are invented. If access patterns are unknown, write the assumption in the document and flag it as the first thing to measure.

## Procedure

1. **Extract entities from requirements.** For each entity note the use case ids `UC…` and rules `R…` it serves. An entity with no requirement behind it is a guess — remove it or ask.
2. **Define identifiers.** For every id: global or local to the service, who issues it (client, DB sequence, UUID, external system), and whether it is mutable. Never use a mutable natural key as the primary key.
3. **List access patterns.** Every read and write with frequency and shape: "client's orders for a month, 50 rps", "order by id, single row, 200 rps", "daily report by status, one scan". This list drives store choice and indexes.
4. **Choose the store family and pin the product/version.** Relational (PostgreSQL) when entities have relations, multi-row invariants or reporting; document when the whole aggregate is read together and relations are rare; key-value/wide-column when all access patterns are known up front and volume is huge. Pin the version (e.g. PostgreSQL 16) considering what the company approves and provides.
5. **Write the schema with meaningful types.** Relational rules: `timestamptz` for instants, `numeric(18,2)` for money (never `float`), `NOT NULL` by default, encoded-value formats documented next to the column, enums as `CHECK` or reference tables. Add FK/UNIQUE/CHECK deliberately — weigh the write cost and lock behaviour, don't put them everywhere by reflex.
6. **Design idempotency into the query.** Create by client key: `INSERT … ON CONFLICT (client_key) DO NOTHING RETURNING id`. Updates carry a version check (`UPDATE … WHERE id = $1 AND version = $2`) so retries don't double-apply.
7. **Close the transaction boundary.** One business step = one transaction; minimise round-trips to the database. A step that needs several writes must be expressible in one commit, or its failure handling must be written down.
8. **Handle several systems.** For DB + queue + external API, use an outbox/queue — never "two writes in a row" with no recovery path. Document which side is the source of truth and how a replay is detected.
9. **Derive indexes from access patterns.** Every listed pattern gets the index or key that serves it, including the columns order and partiality. No "just in case" indexes; no access pattern without an index.
10. **Plan schema evolution.** Forward-only migrations compatible with the previous code version: expand (add nullable column/index) → migrate (backfill, dual-write if needed) → contract (drop old column after the old app is gone). Store DDL as numbered migration files.
11. **Verify with EXPLAIN and a clean apply.** Apply the DDL on a scratch database with representative data and `EXPLAIN (ANALYZE, BUFFERS)` the hot queries.

## Output

`.orbit/task/<id>/design/data-design.md` (≤ ~3,000 words) + `ddl/*.sql` for relational, or key/document schemas otherwise. Example DDL:

```sql
-- ddl/001_init.sql
CREATE TABLE orders (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_key   text NOT NULL UNIQUE,          -- idempotency key from the client
  customer_id  uuid NOT NULL REFERENCES customers(id),
  status       text NOT NULL CHECK (status IN ('new','paid','cancelled')),
  amount       numeric(18,2) NOT NULL CHECK (amount >= 0),
  created_at   timestamptz NOT NULL DEFAULT now(),
  version      integer NOT NULL DEFAULT 1
);
CREATE INDEX orders_customer_created ON orders (customer_id, created_at DESC);
-- access pattern: "client's orders for a month" → (customer_id, created_at DESC)
```

Document skeleton:

```markdown
# Data design: <service>
## Entities and ids
| entity | id | issued by | mutable | UC/R |
## Access patterns
| operation | shape | freq | served by |
## Store
family + product/version + why | alternatives rejected
## Consistency and multi-system
transaction boundaries, outbox, source of truth
## Schema evolution
expand → migrate → contract steps for each change
## Open assumptions
unmeasured estimates, owner
```

## Check

The model is done when every pattern is served and the DDL applies cleanly:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f .orbit/task/<id>/design/ddl/001_init.sql
psql "$DATABASE_URL" -c "\d+ orders"
psql "$DATABASE_URL" -c "EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM orders WHERE customer_id = '...' ORDER BY created_at DESC LIMIT 50;"
rg -n "float|timestamp(?!tz)|money\b" .orbit/task/<id>/design/ddl/   # no money as float
rg -n "access pattern|UC-" .orbit/task/<id>/design/data-design.md | wc -l
```

Pass rule: every access pattern has an index or key named for it; money/time/ids use correct types; every identifier has an owner and mutability; every change to an existing schema has an expand → migrate → contract plan; the DDL applies on an empty database with `ON_ERROR_STOP=1`; `EXPLAIN` shows an index scan for the hot pattern. Save the `EXPLAIN` output in `.orbit/task/<id>/evidence.md` for `review-code` and `prove-done`.

## Pitfalls

- **Schema-first from imagination.** Entities that no requirement needs create tables nobody reads. Every entity points to a `UC`/`R` id.
- **Money and time as `float`/`timestamp`.** Rounding and timezone bugs surface only in production. Use `numeric` and `timestamptz`.
- **Nullable by accident.** Optional by default invites null-handling code everywhere. `NOT NULL` first, nullable only with a reason.
- **"Two writes in a row".** DB then queue, DB then API — a crash between them loses work. Outbox/queue with a replay path.
- **Mutable primary keys.** Renaming an id breaks every reference and every log. Use an immutable internal id and a separate natural key.
- **Migration that only works for the new code.** The old version runs during rollout. Expand → migrate → contract, forward-only.

## Portability

The method is database-agnostic: any agent with a shell can inspect and apply DDL (`psql`, `sqlite3`, `mysql`, or the store's CLI). The document and migration files are the artifacts, so a reviewer without database access can still check types, indexes and evolution. Without companion skills, read requirements directly and keep the `UC`/`R` links. No Claude-specific features are required; the agent needs only the DDL runner and a scratch database.

## What's improved vs the source

- Store family and version account for the company-approved stack and availability.
- An "expand → migrate → contract" template for changing a live schema without downtime.
- A short exit checklist that `review-code` also checks.
- Access patterns become an explicit table and every one must name its index — no "just in case" indexes.
- Idempotency and transaction boundaries are written as queries, not advice.
- Verification with DDL apply + `EXPLAIN`, recorded as evidence.

## Based on

- [backend-skills](https://github.com/si1verwind17/backend-skills) — method «backend-design-by-data» (MIT). Rewritten in our own words and improved — see "What's improved".

---
name: build-backend
description: '[Orbit 2.4.8 Implementation] Backend: permissions on every request, migrations, background jobs, integrations through approved gateways. Use when: «авторизация», «миграции», «интеграция с API», «бэкенд сервиса»; backend auth, integrations, background jobs.'
---

# build-backend — backend: access, data, integrations

> **Orbit · ② Build · step 2.4.8 Implementation**
> **Input:** architecture ← `build-screens`
> **Output:** a backend → next `find-root-cause`
> **Works with:** `design-data`, `review-security`
> **Shared rules:** reply in the user's language per `speak-plain`; generated content defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

The server side built to the agreed architecture: authentication, migrations and data access
rights, background jobs, mail and payments, integrations — through official APIs and
company-approved gateways. The order matters: access control and data shape before
features, integrations last, because everything else depends on them.

## When to use

- The architecture and the data design exist (`plan-rebuild`, `design-data`) and server
  work starts.
- An existing service gets a new endpoint, migration, job or integration.
- A rebuild must reproduce the reference's backend capabilities on your own stack.
- Before release, to run the access-control and secrets gate.
- Not for a pure UI task with a contract stub: use the stub and go to `build-screens`.

## Inputs

- `.orbit/product/<name>/architecture.md` (or the architecture from `design-services`):
  components, data flows, sync/async boundaries, auth model.
- The data design: schema, migrations folder, access rules (`design-data`).
- The API contract: `docs/api/` — endpoints, request/response shapes, error codes.
- Repo conventions: `README.md`, `CONTRIBUTING.md`, `Makefile`, `package.json` scripts —
  the real test, lint, migrate and run commands live there.
- Infrastructure facts: how secrets are supplied (vault/environment), which providers are
  company-approved, which gateways exist for mail, payments and notifications.
- If an input is missing — no architecture, no contract, no approved provider list — ask;
  do not choose a provider or invent an endpoint on your own.

## Procedure

1. **Inventory before coding.** List every endpoint, job and integration from
   `architecture.md` and `docs/api/`, and mark which exist already:
   `rg -n "route|handler|controller|endpoint" <src>/ | head -60`.
   The diff is your scope; anything not in the architecture goes back to the plan.
2. **Auth and sessions first.** Use corporate OIDC/SSO if available; store sessions per the
   architecture. Roles and permissions are checked on **every** request, in the handler or
   a middleware that cannot be skipped — not in the UI, not on the route client-side.
3. **Close IDOR explicitly.** For every resource by id, the handler verifies the caller owns
   it: `/orders/{id}` checks owner or an explicit admin grant. Write a test that
   authenticates as user A and requests user B's resource, expecting 403/404.
4. **Migrations from the data design, forward-only.** One migration per logical change,
   committed with the code; never edit an applied migration. Run the repo's command
   (`<migrate-command>`, e.g. `npm run migrate` or `alembic upgrade head`) against a fresh
   database and against the current one.
5. **Push access rights to the database where possible.** Row-level security (RLS), separate
   roles for read/write/admin, least-privilege credentials per service. The app check is a
   second layer, not the only one.
6. **API by the architecture's flows.** Validate input at the edge (shape, size, types),
   map to domain types, return the status codes and error bodies in `docs/api/`. Keep
   transport DTOs separate from domain types (see `code-backend`).
7. **Background jobs: idempotent, retryable, observable.** Every job can run twice without
   duplicating side effects; retries are bounded with backoff; failures land in a
   dead-letter queue; each job emits a metric and a structured log line.
8. **Integrations through official APIs and approved gateways only.** No scraping, no
   unofficial endpoints, no public SaaS where the company has a gateway. Secrets come from
   the vault or environment — never code, config committed to git, or request values.
   Apply timeouts and a bounded retry at the integration edge.
9. **Mail, payments and notifications through company-approved providers** and internal
   gateways. Payments require idempotency keys and a reconciliation path; mail requires a
   suppression list and a test mode.
10. **Run the security gate and record evidence.** Permissions test, secret scan, input
    validation, request-size and rate limits. Append command → output → conclusion to
    `.orbit/task/<id>/evidence.md`, tick the items in `.orbit/task/<id>/plan.md`, and hand
    the full check to `review-security`.

## Output

Code in the repo (handlers, services, migrations, jobs, integration adapters) plus:

- `docs/api/` — the endpoint contract kept in sync with the implementation: method, path,
  auth, request, response, error codes.
- `.orbit/task/<id>/evidence.md` — the release-gate proof:

```markdown
## 2026-11-08 17:20 — backend gate (orders service)
$ pytest tests/api -q → 42 passed
IDOR: GET /orders/7 as user B → 403 (test_orders.py::test_other_user_forbidden)
$ git diff --cached | grep -iE 'token|password|secret' → no matches
Migrations: <migrate-command> applied 3 on fresh DB; re-run → "already at head"
Jobs: order.charge retried 3× then DLQ; metric jobs.dlq.count present
Integrations: payment provider via <gateway>; timeout 5s; retry 2 with backoff
Review: full security pass delegated to review-security
```

## Check

```bash
pytest tests/api -q                          # or: go test ./... , npm test -- api
<app-test> -k idor                           # caller cannot read another user's resource
<app-test> -k migration                      # fresh DB migrates cleanly
git diff --cached | grep -iE 'token|password|secret'   # must be empty
curl -s -o /dev/null -w "%{http_code}" <app-url>/healthz   # 200
docker compose up -d <db-service>            # integration tests have a database
```

Pass rule: the full API suite passes; the IDOR test fails for a foreign resource and passes
for the owner; a fresh database migrates to head with no manual step; the staged diff
contains no secrets; request-size and rate limits are configured and tested; every
integration uses an approved provider or gateway with a timeout. The full security review is
`review-security` — this checklist is the pre-release gate, not a replacement.

## Pitfalls

- **Permissions checked in the UI only.** A hidden button is not authorization; every
  endpoint enforces the same rule, and a direct request proves it.
- **IDOR by omission.** `find(id)` without an owner filter leaks other users' data; write
  the foreign-resource test for every id-based endpoint.
- **Editing an applied migration.** Environments diverge and the fix ships as a new
  migration, not an edited file; forward-only means forward.
- **Retries without idempotency.** A retried job charges twice or sends the mail twice;
  idempotency keys or a dedupe table first, retries second.
- **Secrets in code or logs.** Tokens, connection strings and webhook secrets end up in
  logs and error reports; read them from the vault/env at startup.
- **Public SaaS where a gateway exists.** Data leaves the approved boundary; use the
  company gateway even when the public API is easier.
- **Validation only on the client.** Server-side shape/size validation at the edge is the
  contract; client validation is UX.
- **Integration without timeouts.** A hanging third party pins workers; timeouts and
  bounded retries at the edge keep the service responsive.

## Portability

Language- and framework-neutral: the sequence (access → data → API → jobs → integrations)
and the gate commands map to any stack. The test runner, migration and run commands come
from the repo, so the skill names tools generically (git, grep, curl, docker, pytest/go/npm)
and never a specific framework. No subagents or slash commands; if a delegation tool exists,
the security review can be delegated to another agent with the same evidence contract.

## What's improved vs the source

- Integrations and payments go through company-approved providers and gateways, not public
  SaaS by default.
- A test on someone else's resource (IDOR) is mandatory, not a suggestion.
- Jobs must be idempotent with a DLQ and metrics, and migrations are forward-only with a
  fresh-DB check.
- The release gate produces `evidence.md` and hands the full check to `review-security`.

## Based on

- [Replica](https://github.com/Jakeschincariol/replica-skill) — method «replica-backend» (MIT). Rewritten in our own words and improved — see "What's improved".

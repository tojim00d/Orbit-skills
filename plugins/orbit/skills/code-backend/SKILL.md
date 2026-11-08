---
name: code-backend
description: '[Orbit 2.4.6 Implementation] How to write backend code: layers, named steps, one error owner, logs without secrets, three test levels. Use when: «как писать сервис», «соглашения кода», «структура бэкенда», «логи без секретов»; backend conventions, service structure, logging.'
---

# code-backend — how to write backend service code

> **Orbit · ② Build · step 2.4.6 Implementation**
> **Input:** service code ← `isolate-branch`
> **Output:** consistent code → next `build-screens`
> **Works with:** `shape-modules`, `review-code`
> **Shared rules:** reply in the user's language per `speak-plain`; generated content defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

Language-neutral conventions for service code. The repo's own rules win: `CONTRIBUTING.md`,
the linter, and the neighboring modules describe more than this skill can. This skill covers
what the repo does not describe — layers, named steps, error ownership, logging, config and
test levels — so a reader of the code can predict where a change goes.

## When to use

- Starting a service or a module whose structure is not yet decided.
- A new endpoint, job or adapter must fit an existing service without inventing a pattern.
- Reviewing code and the disagreement is about structure, not style.
- A log or error incident shows the conventions were never written down.
- Not when the repo already has explicit conventions in `CONTRIBUTING.md` or an
  architecture doc — read and follow those instead, and use this skill only for gaps.

## Inputs

- The service code and its neighbors: `ls <service>/`, `rg -n "func |def |class " <service>/src | head -40`.
- `CONTRIBUTING.md`, linter config, `Makefile`, `package.json` / `pyproject.toml` /
  `go.mod` — the actual scripts and rules.
- `.orbit/task/<id>/plan.md` — the task's files, check commands and scope.
- The module shape from `shape-modules`: interfaces, boundaries and ownership.
- Existing logs and error handling: `rg -n "logger\.|log\.|raise |throw " <service>/src | head`.
- Missing input: if there are no neighboring modules and no repo rules, ask before
  introducing a structure; a new structure needs consent.

## Procedure

1. **Read the neighbors before writing a line.** The existing module layout is the
   convention. Repeat its structure; propose a new one only with explicit consent, and
   record the decision in `.orbit/task/<id>/plan.md`.
2. **Place code by responsibility, not by file type:**
   - **Edge** (HTTP handler, queue consumer, CLI): parse and validate the **shape** of the
     input, map it to domain types, choose response codes. No business rules here.
   - **Core** (domain): business rules and validation of **meaning**; no framework, ORM or
     transport imports. This layer is testable without a server.
   - **Adapters** (DB, external API, queue): behind interfaces from `shape-modules`; the
     core depends on the interface, never on the client library.
   ```
   src/
     edge/http/orders_handler.ts      parse → map → call core → response code
     core/order/place_order.ts        named steps; pure business rules
     core/order/ports.ts              interfaces the core needs
     adapters/db/order_repository.ts  implements the port; SQL here
     adapters/payments/gateway.ts     timeout + bounded retry live here
   ```
3. **Keep domain types and transport DTOs separate.** The DTO at the edge may have string
   dates and nullable fields; the domain type is strict. A mapper converts between them, so
   a transport change never ripples into business rules.
4. **Write a business flow as a chain of named steps:**
   `ValidateOrder → ReserveStock → ChargePayment → PublishOrderCreated`. Each step is a
   function with an obvious input and output; the flow function reads top to bottom with no
   hidden branching. A step that fails returns a result, it does not throw across layers.
5. **Keep SQL in one place.** Either `.sql` files or one data-access layer — never string
   concatenation spread through handlers. Parameterized queries only.
6. **Give every error one owner.** Handle it where it can actually be handled; otherwise
   propagate with context. Expected business outcomes ("no free mailboxes") are returned
   results, not exceptions. Retries: one shared bounded helper at the integration edge, not
   a retry loop in each caller.
7. **Log events for the person on call at 3 am:** structured fields, `trace_id`, and a clear
   event name — `order.charge.failed reason=timeout attempt=3`. Levels: Error — a human
   must act; Warning — degradation; Info — business events; Debug — local only.
8. **Ban secrets and personal data from logs:** never tokens, passwords, URLs containing
   tokens, email bodies or personal data. Debug logs reach production whenever the level is
   not overridden, so the ban applies to Debug too.
9. **Treat configuration as validated input.** A constant becomes a setting only if it
   really differs between environments; validate all config at startup and fail fast with a
   clear message, never at first use.
10. **Test at three levels:** pure unit tests on core logic (most), unit tests with stubs on
    orchestration (fewer), a thin layer of integration tests on real infrastructure (a few,
    e.g. Testcontainers). Run lint and the suite before handing off; append the output to
    `.orbit/task/<id>/evidence.md`.

## Output

Consistent service code in the repo (edge / core / adapters / config / tests), plus the
evidence entry:

```markdown
## 2026-11-08 19:05 — orders module conventions
$ npm run lint → 0 errors
$ npm test -- orders → 28 passed (24 unit, 3 orchestration, 1 integration)
Structure: edge/http/orders_handler.ts → core/order/place_order.ts (named steps)
Logs: `order.charge.failed reason=timeout attempt=3` with trace_id; no token/email fields
Config: 3 new settings validated at startup; no env read outside config module
```

Next: `build-screens` for the UI that consumes the API; `review-code` checks the diff.

## Check

```bash
npm run lint                                  # or ruff, golangci-lint — exit 0
npm test -- <module>                          # or pytest -q, go test ./... — all green
rg -n "token|password|secret|Authorization" <service>/src --glob '*log*'   # must be empty
rg -n "SELECT .*\+|query\(.*\+" <service>/src | head                        # no string-built SQL
rg -n "trace_id|reason=|attempt=" <service>/src | head                      # structured events
rg -n "process\.env|os\.environ" <service>/src --glob '!**/config*'        # config read once
```

Pass rule: lint and tests pass; no secret or personal-data field appears on a log path; SQL
is parameterized and lives in one layer; every business flow is a named-step chain; config
is read and validated in one place; the three test levels are present and the evidence entry
records them. `review-code` reads the same diff and the same evidence.

## Pitfalls

- **Framework types leaking into the core.** A domain function importing an HTTP request or
  an ORM session cannot be tested without a server; keep the core transport-free.
- **Fat handlers.** Validation, business rules and persistence in one function: no test can
  isolate the rule. Edge parses, core decides, adapter saves.
- **`catch (e) {}` in every layer.** An error with three owners is handled nowhere;
  one owner, propagated with context elsewhere.
- **Retry loops sprinkled around.** Three different retry policies and one infinite loop;
  a single bounded helper at the integration edge.
- **Secrets and email bodies in logs.** The classic leak: a debug log of the request object
  contains the token; log the event and ids, not the payload.
- **Config read at call sites.** `process.env` scattered across the code fails late and
  differently per environment; read and validate once at startup.
- **Only integration tests.** Slow, flaky and unable to localize a failure; the majority
  belongs at the pure unit level.
- **Copying a structure from a blog.** If the neighbors use another shape, the new module
  becomes a foreign body; repeat the local convention.

## Portability

Language-neutral by design; the commands map to npm, pytest, go test, ruff, golangci-lint
and friends — use what the repo uses. No subagents or slash commands. The artifacts are the
code plus `.orbit/task/<id>/evidence.md`, so a review or another session can verify the
conventions without reading this skill.

## What's improved vs the source

- An explicit ban on secrets, tokens, token-bearing links and email bodies in logs, Debug
  included — a common real leak (found when testing the pack on a live service).
- Rule "neighboring code and repo rules beat this skill".
- Named-step flows, error ownership and retry locality are checkable rules, not style tips.
- Evidence records structure, log shape and config so `review-code` can verify the
  conventions instead of re-litigating them.

## Based on

- [backend-skills](https://github.com/si1verwind17/backend-skills) — method «backend-code-conventions» (MIT). Rewritten in our own words and improved — see "What's improved".

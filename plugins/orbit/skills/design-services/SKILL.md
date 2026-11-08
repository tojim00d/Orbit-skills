---
name: design-services
description: '[Orbit 2.2.3 Architecture & data] Architecture: boundaries, state, sync/async, events, cache, runtime. Use when: «архитектура», «границы сервисов», «очередь или REST», «как связать сервисы»; service architecture, boundaries, sync vs async.'
---

# design-services — service architecture: boundaries, state, interactions

> **Orbit · ② Build · step 2.2.3 Architecture & data**
> **Input:** data design ← `design-data`
> **Output:** `.orbit/task/<id>/design/architecture-design.md` → next `choose-stack`
> **Works with:** `model-threats`, `draw-stack`, `review-observability`, `project-diagram`
> **Shared rules:** reply in the user's language; generated artifacts default to English; stay in scope; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

Architecture is the set of decisions that are hard to change later: where service boundaries run, where state lives, how services talk, where caching sits, what we run on. This skill fixes them in an order — most expensive to change first — and writes the result as a document plus a diagram, not a whiteboard memory.

## When to use

- A service design has data and requirements but no decision on boundaries, communication or runtime.
- Two teams disagree about "one service or five", "REST or queue", "cache or not".
- A new system must integrate with existing ones and the interaction style is undecided.
- An existing architecture needs a documented decision before a rebuild (`plan-rebuild`) or a review.
- **Not** for a single endpoint or a library: there are no service boundaries to decide.

## Inputs

- data design: `.orbit/task/<id>/design/data-design.md` — entities, store family, transaction boundaries;
- requirements with ids: `UC…`, `NF…` — the source of scale, latency, availability and compliance constraints;
- the existing landscape when relevant: live services, contracts, auth, network zones;
- the platform capabilities: Kubernetes vs serverless, message broker availability, cache, vault, tracing;
- the team's ownership map — who can own which capability.

If the data design is missing, run `design-data` first; boundaries drawn without entities and transactions are fiction. If non-functional requirements are missing, state assumptions explicitly in the document and flag them.

## Procedure

1. **Start stateless.** Default to stateless services with state in DB/cache/queue. The exception is a single writer per entity (actor, sharded worker) when concurrent updates cannot be held otherwise — justify it in the document and name the consistency guarantee.
2. **Draw boundaries.** Split only if the parts differ in owners, pace of change, scale or reliability needs. One owner per capability; a boundary that nobody owns is not a boundary. Never share one DB between independently deployed services.
3. **Decide sync or async from the requirement's meaning.** Answer needed now → REST/gRPC; "do it eventually" or many consumers → queue/topic. Retries are a design decision: where they happen, how many, and what idempotency makes them safe.
4. **Define events.** Publish every business-state transition of core entities. Events carry meaningful data (not bare ids) and are versioned; consumers must tolerate unknown fields.
5. **Choose push or pull consumption.** Push when latency matters; pull/batches when resilience to spikes matters. Write the choice and the reason next to each consumer.
6. **Place the cache only with an invalidation strategy.** State the TTL, the invalidation trigger, and what staleness affects. A cache without this line is a bug source, not an optimisation.
7. **Pick the runtime.** Kubernetes for long-running services with steady load and the platform stack; serverless for rare events and spiky load. In a company, whatever the platform supports wins — record the constraint.
8. **Design observability and security from day one.** RED metrics, tracing, service-to-service auth, secrets from a vault (`review-observability`, `model-threats`). "Later" means "never, until the first incident".
9. **Write contract drafts only where a consumer needs them now.** REST/HTTP → OpenAPI in `docs/api/<service>.openapi.yaml`; events → AsyncAPI. Drafts are versioned with the service; validate them with the repo's linter.
10. **Check coverage and draw it.** Map every `UC/NF` requirement to a component or decision; update the diagram (`project-diagram` or `draw-stack`) so the document and the picture agree.
11. **Record the decisions with their alternatives.** For each significant choice, one line: chosen, rejected, why. This is what a reviewer and `plan-rebuild` will read.

## Output

`.orbit/task/<id>/design/architecture-design.md` + contract drafts in `docs/api/` when a consumer needs them now.

```markdown
# Architecture: <service>

## Components
| component | responsibility | state | owner |
|---|---|---|---|
| api | HTTP edge, auth, validation | stateless | team-a |
| orders | order lifecycle, outbox | DB (orders) | team-a |
| billing-worker | consumes `order.paid`, charges | DB (billing) | team-b |

## Interactions
| from → to | style | sync/async | retries | idempotency |
|---|---|---|---|---|
| api → orders | gRPC | sync | 2, 200 ms | request id |
| orders → queue | event `order.paid` v1 | async | consumer retries ×3 | event id |

## State and consistency
Uniqueness of `client_key` owned by orders; outbox table in the orders schema; eventual consistency window ≤ 5 s.

## Cache
`GET /orders/:id` cached 30 s, invalidated on `order.updated`; staleness affects the order page only.

## Runtime and platform
Kubernetes, 2 replicas, HPA on CPU; broker: existing platform queue; secrets: platform vault.

## Decisions
- Event-driven billing (rejected: sync call from orders) — billing must not block checkout.
- No shared DB between api and billing (rejected: "one database is simpler") — independent deploys.
```

OpenAPI draft, only the part that matters for the boundary:

```yaml
# docs/api/orders.openapi.yaml
openapi: 3.0.3
info: { title: orders, version: 1.0.0 }
paths:
  /orders/{id}:
    get:
      parameters: [{ name: id, in: path, required: true, schema: { type: string, format: uuid } }]
      responses: { "200": { description: ok }, "404": { description: not found } }
```

## Check

The architecture is decided when every requirement is covered and the interactions are safe:

```bash
rg -n "UC-|NF-" .orbit/task/<id>/design/architecture-design.md | wc -l
rg -n "shared DB|same database" .orbit/task/<id>/design/architecture-design.md
npx @redocly/cli lint docs/api/<service>.openapi.yaml
test -f docs/diagrams/<service>.svg || echo "diagram missing"
rg -n "retries|idempoten" .orbit/task/<id>/design/architecture-design.md
```

Pass rule: every `UC/NF` requirement maps to a component or a decision; no DB is shared between independently deployed services; every async interaction names retries, idempotency and ordering; every cache has TTL, invalidation and staleness impact; the contract validates with the linter; the diagram exists and matches the component table. Record the check output in `.orbit/task/<id>/evidence.md`.

## Pitfalls

- **Boundaries by org chart or by habit.** A service split with no difference in owners, pace, scale or reliability buys distributed complexity for nothing. Split only on those criteria.
- **A shared database between services.** It looks simple and turns every schema change into a cross-team deploy. One store per service, contracts between them.
- **Async without idempotency.** At-least-once delivery is the normal default; a consumer that charges a card per delivery is a money bug. Event id + dedup store.
- **Bare-id events.** Consumers must then call back to learn anything, recreating the coupling events were meant to remove. Carry the meaningful payload.
- **Cache by reflex.** Without TTL and invalidation, the cache becomes the source of truth and the bug is invisible until decode.
- **"Add observability later".** Later arrives after the first outage. RED metrics, tracing and service auth belong to the design.
- **Diagram and document drift.** A picture that disagrees with the component table will be read instead of the document. Update both in the same commit.

## Portability

The method is a document and a diagram, so it runs in any agent: read the inputs, make the decisions in order, write Markdown. `npx`-based OpenAPI linting is optional — any OpenAPI linter or the platform's API gateway validator works. Without `draw-stack`, a Mermaid block inside the document is an acceptable diagram; without subagents, do the threat and observability passes inline with `model-threats` and `review-observability` as checklists.

## What's improved vs the source

- Decisions ordered from most to least expensive to change.
- Observability and threats are part of architecture, not "later".
- The output is drawn as a diagram and becomes the project map.
- Explicit boundaries rule (owners, pace, scale, reliability) and a hard ban on a shared DB between independently deployed services.
- Every async interaction must name retries, idempotency and ordering; every cache names TTL, invalidation and staleness.
- Contract drafts are validated by a linter, and decisions record rejected alternatives.

## Based on

- [backend-skills](https://github.com/si1verwind17/backend-skills) — method «backend-architecture» (MIT). Rewritten in our own words and improved — see "What's improved".

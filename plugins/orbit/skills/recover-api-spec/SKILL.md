---
name: recover-api-spec
description: '[Orbit 1.3.5 Reverse engineering] Recover OpenAPI/AsyncAPI from traffic, logs and client code + contract tests. Use when: «нет документации API», «восстанови openapi», «спека по трафику», «какой контракт у сервиса»; recover API spec.'
---

# recover-api-spec — recover an API spec from observations

> **Orbit · ① Understand · step 1.3.5 Reverse engineering**
> **Input:** HAR, logs, message dumps, client code — from `recon-webapp`
> **Output:** `docs/api/<service>.openapi.yaml` or `.asyncapi.yaml` → next `write-spec`
> **Works with:** `recon-webapp`, `test-first`, `run-spec-loop`
> **Shared rules:** reply in the user's language; generated artifacts default to English; own or authorized targets only; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

A working API or queue without docs (legacy service, internal integration, vendor component in your own perimeter). Input: HAR, gateway logs, message dumps, client code. Output: **OpenAPI 3** (HTTP) or **AsyncAPI** (Kafka/RabbitMQ) plus contract tests. Scope — as in `reverse-app`: own perimeter and lawful access. Strip tokens and personal data from examples before anything is written.

## When to use

- An integration must be built against a service whose documentation is missing or stale.
- A legacy endpoint list exists but nobody knows the payloads, status codes or limits.
- A queue contract (Kafka/RabbitMQ) must be described before a consumer is rewritten.
- A client SDK or mobile app calls an internal API and the server code is unavailable.
- After `recon-webapp` you have a HAR and need a machine-readable contract, not screenshots.

Do **not** guess a contract from a single call: one example is an anecdote. If the service is yours and has code, read the code first — a spec recovered from behavior can be wrong.

## Inputs

- `session.har` from `recon-webapp` (tokens stripped), or ingress/gateway access logs, or service logs;
- 50+ request/response pairs covering the endpoints that matter, including errors;
- client code that calls the API (`grep -rn '/api/' src/`);
- message dumps from a dev topic (`kcat -C -t <topic> -c 50`) for queues;
- `.orbit/reverse/<target>/findings.md` for the target slug and open questions.

If there are too few observations, say which operations are unproven and mark them `x-confidence: low`; do not invent fields to fill the shape. If logs are unavailable and only code exists, note that the spec is derived from the client's expectation, not the server's behavior.

## Procedure

1. **Collect observations.** Combine the HAR of your session, ingress/gateway access logs, service logs, client calls and dev-topic messages. One file per source in `.orbit/reverse/<target>/work/`.
2. **Normalize paths.** `/users/123/orders/9` → `/users/{userId}/orders/{orderId}`; group by `method + path template` and count how often each pair appears:
   ```bash
   jq -r '.log.entries[] | "\(.request.method) \(.request.url|sub("\\?.*";"")) \(.response.status)"' session.har \
     | sed -E 's#/[0-9]+(/|$)#/{id}\1#g; s#/[0-9a-f-]{36}#/{uuid}#g' | sort | uniq -c | sort -rn
   ```
3. **Infer schemas from several examples.** Field present in all → required; `null` seen → nullable; small closed set of values → enum (mark it "inference"); array shapes need at least three samples to claim the item type.
4. **Collect errors and edges.** Which statuses actually occur, the error body format, pagination (`limit`/`cursor`), idempotency (repeat a POST), limits (`429`, `RateLimit-*` headers), auth failures. An undocumented 500 pattern is more valuable than a happy path.
5. **Write the spec** at `docs/api/<service>.openapi.yaml` (or `.asyncapi.yaml` for queues). Every operation gets `x-evidence` links to the observations and `x-confidence: high|medium|low`. Use the template below.
6. **Lint and verify.** `npx --yes @redocly/cli lint docs/api/<service>.openapi.yaml`. Then replay recorded requests against the spec with Schemathesis/Prism if available, or write contract tests for 3–5 key operations that validate responses against the schema.
   ```bash
   npx --yes @redocly/cli lint docs/api/<service>.openapi.yaml
   pytest tests/contract -q    # or the project's runner
   ```
7. **Record provenance and hand off.** Note in the spec header: "recovered from behavior of version X, date". Result → `run-spec-loop` (a spec of current behavior) and `project-map` (API node with links).

## Output

`docs/api/<service>.openapi.yaml` — a working spec, not a sketch; every operation carries its evidence and confidence:

```yaml
openapi: 3.0.3
info:
  title: orders-svc (recovered 2026-11-08, v1.4.2)
  version: 1.4.2
paths:
  /users/{userId}/orders:
    get:
      summary: list orders
      parameters: [{name: userId, in: path, required: true, schema: {type: string}}]
      responses:
        '200': {description: ok, content: {application/json: {schema: {$ref: '#/components/schemas/OrderPage'}}}}
        '401': {description: unauthenticated}
      x-evidence: [session.har#14, session.har#15]
      x-confidence: high
```

Rules: don't invent fields that were not observed; no example of a 500 → don't describe its schema; mark inferred enums and nullable fields in `description`. Observation ≠ contract: a behavior at version X is not a promise.

## Check

```bash
test -f docs/api/<service>.openapi.yaml && echo "spec ok"
npx --yes @redocly/cli lint docs/api/<service>.openapi.yaml     # zero errors
grep -c 'x-evidence:' docs/api/<service>.openapi.yaml           # per-operation provenance
grep -c 'x-confidence:' docs/api/<service>.openapi.yaml
pytest tests/contract -q                                        # contract tests green
```

Pass rule: lint has no errors (warnings allowed if listed); every operation has `x-evidence` and `x-confidence`; every schema comes from at least three observations or is marked low confidence; error responses cover what was actually seen; examples contain no tokens, cookies or personal data. Put the lint result and test output into `.orbit/task/<id>/evidence.md` (`prove-done`).

## Pitfalls

- **Writing the spec from the client instead of the server.** A client that sends `foo` does not prove the server accepts it. Prefer server-generated logs; where only client code exists, label the source.
- **One sample per endpoint.** Required/optional, enums and nullability are invisible in one request. Collect several, including an error case.
- **Beautiful spec, no verification.** Lint checks structure, not truth. Contract tests against recorded traffic or the live dev stand catch wrong paths and schemas.
- **Leaking secrets in examples.** A HAR contains `Authorization` headers and cookies; copy payloads, never headers. Personal data in examples must be replaced, not merely noted.
- **Describing a version as the contract.** The spec is a snapshot of behavior at version X. If the consumer builds to it, write the version and date into `info` and tell them.
- **Queue contracts treated like HTTP.** AsyncAPI needs channel names, message headers, schema versions and delivery guarantees; do not flatten it into a REST document.

## Portability

Shell, `jq`, `sed` and a YAML editor — any agent and model can run it. Without subagents, process the observations sequentially and write the spec in one pass. If `@redocly/cli` or Schemathesis cannot be installed, validate by hand against the OpenAPI 3 schema and record that as a limitation rather than claiming a clean lint. No Claude Code features are required.

## What's improved vs the source

- The spec is built only from observations: every operation carries `x-evidence` and `x-confidence`.
- Mandatory lint and contract tests for the recovered spec.
- Path normalization is a concrete `jq`/`sed` recipe instead of an instruction to "group similar endpoints".
- Provenance (version + date) is part of the spec header, so consumers can see it is behavior, not a promise.
- Clean split: HTTP → OpenAPI 3, queues → AsyncAPI, with examples for both.

## Based on

- [REA](https://github.com/morluto/rea) — method «reverse-engineer-anything» (MIT). Rewritten in our own words and improved — see "What's improved".

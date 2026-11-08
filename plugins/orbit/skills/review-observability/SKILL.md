---
name: review-observability
description: "[Orbit 3.5.1 Operations] Will we see it break: RED/USE, logs, traces, symptom alerts, dashboard, probes. Use when: «мониторинг», «алерты», «увидим ли поломку», «настрой observability»; observability review, monitoring, alerts."
---

# review-observability — will we see it break?

> **Orbit · ③ Operate · step 3.5.1 Operations**
> **Input:** a service ← `compress-context`
> **Output:** gap list in `.orbit/task/<id>/review.md` → next `write-runbook`
> **Works with:** `design-services`, `handle-incident`
> **Shared rules:** reply in the user's language per `speak-plain`; generated content (maps, diagrams, comments, docs, artifacts) defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md` at the pack root).

Review a service's observability: metrics, logs, traces, alerts, dashboards. One question drives the whole review: **if this breaks tomorrow, who learns about it, and how fast?** Everything that does not contribute to an answer is a gap.

## When to use

- A new service, endpoint or background job is about to ship and nobody has asked how it will be watched.
- An incident took too long to detect, or was found by a user instead of an alert (`handle-incident`).
- A dashboard has not been reviewed since the architecture changed.
- Alerts are noisy: the team ignores the channel, which is the same as having no alerts.
- Before `write-runbook`: a runbook needs signals and alert names to attach to.

Do **not** use it to pick a vendor or to build a full monitoring platform. This is a review of signals that should already exist, with a concrete gap list as output.

## Inputs

- the service and its critical flows: `.orbit/knowledge/overview.md`, the spec, or the flow list used by `test-flows`;
- the metrics endpoint and its names: `curl -s localhost:8080/metrics | head`;
- the logger config: format (JSON or text), level, fields (`trace_id`), redaction rules;
- the alert rules: `PrometheusRule` manifests or the monitoring repo, including `for:` and annotations;
- the dashboards and probes: the service-health dashboard, `livenessProbe`/`readinessProbe`/`startupProbe` in the chart;
- existing runbooks in `docs/runbooks/` so every critical alert can link one.

If the service cannot be reached, review the manifests, configs and alert rules and mark the runtime checks "not verified".

## Procedure

1. **List the critical flows first.** Checkout, login, export, the consumer lag path — whatever makes the service money or blocks users. Signals are judged per flow, not in the abstract.
2. **Inspect the metrics surface.** Does `/metrics` expose rate, errors and duration per endpoint (RED), and saturation signals (USE: CPU, memory, GC/heap for JVM/.NET, DB pool, consumer lag)?
   ```bash
   curl -s localhost:8080/metrics | grep -E '^http_.*(count|sum|bucket)' | head
   grep -rn "prometheus" config/ deploy/ | head
   ```
   Missing latency histograms mean no p95/p99 — a gap.
3. **Check the logs.** Structured (JSON), a level, a `trace_id`, no personal data or tokens, and rotation. A log line that cannot be correlated to a request is half a signal:
   ```bash
   grep -rn "trace_id\|request_id" src/ config/ | head
   grep -rnE "log.*(password|token|email|card)" src/ | head
   ```
4. **Check traces.** End-to-end `traceparent` propagation and spans on external calls (DB, HTTP, queue). Without propagation, the trace stops at the first service boundary.
5. **Check the alerts.** They must fire on **symptoms** (error rate, SLO latency) rather than only on causes (CPU high); each needs a runbook link and an owner. A cause-only alert page without a user-visible symptom is a gap in the alert set.
6. **Check the dashboard.** One "service health" view: traffic, errors, latency, saturation, and deploy markers. Without deploy markers a spike cannot be correlated with a release.
7. **Check the probes.** Liveness, readiness and startup must reflect real health, not "the process is alive". A readiness probe that only checks the port returns 200 while the app cannot reach its DB.
8. **Ask the filter question for every critical flow.** Which single signal shows that this flow is broken? No signal → gap. A signal that fires constantly → gap as well.
9. **Write the gap table and proposals** (template in Output). Alerts get a `for:` duration and thresholds derived from actual data, not guesses; each proposal names the metric, the log field or the probe.

## Output

`.orbit/task/<id>/review.md`, section `## Observability review`:

```markdown
| Flow | Missing signal | Proposal | Priority |
|---|---|---|---|
| checkout | p99 latency, no histogram on `POST /checkout` | `http_request_duration_seconds` histogram + panel | P1 |
| payout consumer | consumer lag (no metric) | export queue lag + alert `> 1000 for 5m` | P1 |
| login | no `trace_id` in logs | add correlation id to logger + span | P2 |
```

Alert proposals use the same file, one YAML block per rule:

```yaml
- alert: CheckoutP99High
  expr: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket{route="/checkout"}[5m])) > 1.5
  for: 5m
  annotations:
    runbook_url: docs/runbooks/checkout-p99.md
    owner: payments-team
```

The `runbook_url` lines are the hand-off to `write-runbook`; the priority column says what to fix first.

## Check

```bash
curl -s -o /dev/null -w "%{http_code}\n" localhost:8080/metrics   # metrics reachable
promtool check rules alerts.yaml                                  # proposed rules parse
rg -n "Observability review|runbook_url" .orbit/task/<id>/review.md
rg -l "livenessProbe|readinessProbe|startupProbe" deploy/ chart/ | head
```

Pass rule: every critical flow has at least one signal named that would reveal its failure; every proposed alert has a `for:`, a threshold with a data basis and a `runbook_url`; noisy alerts are listed as gaps; the gap table stands in `review.md`. If a runtime check could not be done, the report says which and why.

## Pitfalls

- **Reviewing only the dashboards that exist.** The question is what is missing, not whether the current panel looks nice. Walk the critical flows first.
- **Alerts on causes only.** "CPU > 90 %" can be normal during a deployment. Alert on error rate and SLO latency, and keep cause metrics for diagnosis.
- **An alert with no runbook or owner.** The pager fires and nobody knows the next step. Bind them in the rule.
- **Noisy alerts treated as coverage.** An alert that fires daily without action trains people to ignore the channel — a gap, not a strength.
- **Probes that test liveness only.** A port check passes while the app is broken. Check dependencies in readiness.
- **Personal data in logs.** An observability improvement that leaks emails or tokens is an incident multiplier; redact before adding fields.
- **Invented thresholds.** A `0.1` error-rate threshold with no data produces noise. Base the number on the last weeks of traffic.
- **Forgetting deploy markers.** A latency spike that matches a release is a different incident from a gradual leak; the dashboard must show both.

## Portability

The method needs `curl`, `grep` and access to config files; Prometheus/Grafana/OTel are illustrative — the same review works with any metrics, logging and tracing stack. Without `promtool`, validate alert syntax by review and by applying to a dev monitoring stack. No subagents are needed; the gap table is plain Markdown in the shared `review.md`, ready for `write-runbook`.

## What's improved vs the source

- One filter question — "who learns about the failure, and how fast" — with a RED/USE checklist under it.
- Noisy alerts count as gaps just like missing ones.
- Every proposed alert carries `for:`, a data-based threshold and a `runbook_url` for the next step.
- Probes and deploy markers are reviewed as part of the signal set, not as an afterthought.

## Based on

- Orbit's own skill.

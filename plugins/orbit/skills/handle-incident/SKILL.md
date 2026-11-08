---
name: handle-incident
description: "[Orbit 3.5.3 Operations] Incident: mitigate, timeline, diagnosis, communication, postmortem. Use when: «инцидент», «прод упал», «авария», «сайт лежит»; incident, outage, production down."
---

# handle-incident — production incident

> **Orbit · ③ Operate · step 3.5.3 Operations**
> **Input:** an incident ← `write-runbook`
> **Output:** restoration + postmortem in `.orbit/task/<id>/incident.md` → next `triage-issues`
> **Works with:** `ship-k8s`, `write-update`, `keep-learnings`
> **Shared rules:** reply in the user's language per `speak-plain`; generated content (maps, diagrams, comments, docs, artifacts) defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md` at the pack root).

**Restore service first**, look for the cause second. Work calmly, keep a timeline. An incident is judged by time-to-restore and by what the postmortem changes — not by how deep the diagnosis was while users were down.

## When to use

- An alert fires on production and users are affected (or may be), or the on-call rotation paged you.
- A dashboard shows errors or latency out of SLO, a health check fails, or support reports a sudden pattern.
- A deploy, a config change or a feature flag is followed by a visible break.
- A dependency (DB, queue, external API) degrades and your service shows the symptoms.
- A near miss was caught by one signal only — treat it as an incident rehearsal and fix the detection.

Do **not** use it for a planned maintenance window or a single failed request with no user impact. Do not start a root-cause investigation on an unstable system — mitigate first.

## Inputs

- the alert or the report: what fired, when, and which dashboard shows it;
- the timeline file: `.orbit/task/<id>/incident.md` — create it on the first action, append every entry;
- recent changes: deploys, configs, feature flags and infrastructure in the last 2–24 hours;
- the runbook: `docs/runbooks/<alert-or-task>.md` from `write-runbook`, if it exists;
- access and authority: namespace, role, VPN, and who the incident lead is (prod actions need that person's agreement — `stay-in-scope`);
- prior context: `.orbit/task/<id>/evidence.md` from the last deploy and `.orbit/learnings/` for a previous occurrence of the same symptom.

If the runbook is missing, proceed with the safest known mitigation and note the gap for `write-runbook`.

## Procedure

1. **Acknowledge and open the timeline.** Start `.orbit/task/<id>/incident.md` with the time, the alert and the first observation before doing anything else. A timeline reconstructed later is fiction.
2. **Scope it: what is broken, for whom, since when.** Dashboards, alerts, 5xx rate, complaints. Write the numbers — "checkout fails for EU users since 14:02, 38 % of requests" is scope; "the site is broken" is not.
3. **Find what changed in the last 2–24 hours.**
   ```bash
   kubectl rollout history deploy/<name> -n <ns>
   argocd app history <app>          # or the CI release log
   git log --since="24 hours ago" --oneline -- <config-or-chart-path>
   ```
   Most incidents are recent changes; the timeline tells you whether to roll back.
4. **Mitigate in the safest way available.** Roll back the last release (`kubectl rollout undo deploy/<name> -n <ns>` or revert the GitOps commit), turn off the flag, add replicas, or switch traffic. Any production action needs the incident lead's agreement — and is recorded in the timeline.
5. **Send the first update within minutes, then every 15–30 minutes.** Format: **status → impact → what we're doing → next update at HH:MM** (`write-update`). Plain language; no guesses presented as facts.
6. **Keep the timeline as you go.** Every entry: time — observed — done — result. Even "rolled back api 1.4.2, error rate unchanged" is an entry: it rules something out.
7. **Diagnose once stable, or in parallel with a second pair of hands.** Logs around the start time, metrics (latency, errors, saturation — RED/USE), traces, dependencies (DB, queues, external APIs). Use `ship-k8s` for pod-level facts and `find-root-cause` for hypotheses — one at a time.
8. **Confirm restoration with at least two independent signals.** Error rate back in SLO, latency normal, health check green, the user-facing scenario works. One green signal is not recovery.
9. **Tell users it is over** in the same channel, with the residual risk and what to watch; keep monitoring for 15–30 minutes before standing down.
10. **Write the blameless postmortem.** Timeline, cause, why it was not caught earlier, and actions with owners and dates. Route the durable results: learnings → `keep-learnings`, procedure fixes → `write-runbook`, missing alerts → `review-observability`, follow-up issues → `triage-issues`.

## Output

`.orbit/task/<id>/incident.md`:

```markdown
# Incident 2026-11-08 — checkout 5xx for EU

**Status:** resolved 15:40 · **Impact:** ~38 % of EU checkout for 38 min · **Lead:** @oncall

## Timeline
| Time | Observed | Done | Result |
|---|---|---|---|
| 14:04 | alert Checkout5xxRate > 5 % | acked; scoped to EU | confirmed 38 % |
| 14:09 | deploy orders-api 1.4.2 at 13:55 | `kubectl rollout undo` | 5xx down to 4 % |
| 14:20 | rollback stable | watching; update sent | 0.4 % by 14:25 |

## Cause
`orders-api` 1.4.2 switched the tax lookup to a EU-only endpoint with a 2 s timeout.

## Why not caught earlier
No canary on the tax path; alert threshold 5 % fired only after 9 minutes.

## Actions
1. Canary the tax path before full rollout — owner: platform, 2026-11-15.
2. Alert on p95 latency of the tax call at 500 ms — owner: SRE, 2026-11-12.
```

The updates in the incident channel follow the same structure: `status / impact / doing / next update at HH:MM`.

## Check

```bash
kubectl rollout status deploy/<name> -n <ns>
argocd app get <app>                  # Synced / Healthy
curl -s -o /dev/null -w "%{http_code}\n" "$API/health"
test -s .orbit/task/<id>/incident.md && rg -n "Timeline|Cause|Actions" .orbit/task/<id>/incident.md
```

Pass rule: service is restored and confirmed by at least two signals; the timeline has one entry per action with a result; every postmortem action has an owner and a date; the last update told users the status. An incident without a postmortem is still open.

## Pitfalls

- **Hunting the cause while users are down.** Diagnosis can wait; a rollback or flag flip cannot. Mitigate, then investigate.
- **Unilateral production changes.** A well-meant hotfix during an incident is how a second incident starts. Incident lead approves, timeline records.
- **No timeline.** The postmortem turns into competing memories. Write entries as things happen.
- **Guesses in status updates.** "It's probably the DB" later becomes "you said it was the DB". Say what is observed and what is being tried.
- **Declaring recovery on one signal.** Error rate can drop while queues back up. Two independent signals, then watch.
- **Rolling back into an irreversible migration.** A DB migration cannot be undone by a pod rollback; check before rolling back.
- **Silence between updates.** Users and stakeholders assume the worst. Even "no change yet" is an update.
- **Blaming a person in the postmortem.** It hides the system cause and stops honest reporting. Fix the system.
- **Closing without follow-ups.** Actions with no owner and date are decoration; they belong in the tracker.

## Portability

The commands are standard `kubectl`/`argocd`/`curl`; without a cluster CLI, the dashboard and the deploy history in the GitOps repo give the same facts. The timeline and the postmortem are plain Markdown in `.orbit/`, so a second session can take over mid-incident. No subagents are needed; communication is chat plus the update template.

## What's improved vs the source

- "Restore first, then find the cause" with the first 15 minutes laid out step by step.
- An update template for communication and a blameless postmortem.
- Recovery requires two independent signals, and the timeline is written during the incident.
- Follow-ups route to the skills that make them permanent (`keep-learnings`, `write-runbook`, `review-observability`).

## Based on

- Orbit's own skill.

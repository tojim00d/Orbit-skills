---
name: review-security
description: "[Orbit 2.6.6 Quality checks] Security review: OWASP/CWE, secrets, dependencies, image, Kubernetes, CI. Use when: «проверь безопасность», «уязвимости», «секреты в коде», «аудит безопасности»; security review, vulnerability scan, secrets check."
---

# review-security — security review of a change or service

> **Orbit · ② Build · step 2.6.6 Quality checks**
> **Input:** diff / service ← `teardown-artifact`, `cut-complexity`
> **Output:** confirmed findings in `.orbit/task/<id>/review.md` → next `test-flows`
> **Works with:** `model-threats`, `teardown-artifact`
> **Shared rules:** reply in the user's language per `speak-plain`; generated content (maps, diagrams, comments, docs, artifacts) defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md` at the pack root).

Defensive review of code, configs and dependencies. Complements `review-code` (general quality) and `model-threats` (threats before code). The output is a list of **confirmed** exploitable problems with a fix each.

## When to use

- A change touches authentication, authorization, personal data, file uploads, external URLs, crypto or secrets.
- Before a release or an MR to a protected branch, when the service is internet-facing or handles money.
- An incident review or `teardown-artifact` flagged a possible reachable vulnerability.

Do **not** use it to replace `model-threats` before code exists, and do not report unverified scanner hits as findings.

## Inputs

- scope: the branch/MR diff (`git diff <base>...HEAD`) for a **change**, or the whole repo + `Dockerfile` + chart for a **service**;
- the intent: `.orbit/task/<id>/brief.md`, the spec, and `.orbit/task/<id>/risks.md` from `model-threats` (threats and controls to check);
- the attack surface: entry points (HTTP routes, consumers), data stores, outbound calls, file and URL inputs;
- the tooling the repo already has: `gitleaks`, `trivy`, the language's audit command, `kubectl`/`helm` for manifests;
- previous findings in `.orbit/task/<id>/review.md` so a re-run does not re-report a fixed issue.

For a service-scope review, split areas across people or agents (code, dependencies, image, Kubernetes, CI) — one reviewer reading everything will skim the last area.

## Procedure

1. **Fix the scope in one line.** "Change: MR !412, auth + export" or "Service: `orders-api`, whole repo + image + chart".
2. **Map the attack surface before grepping.** List entry points, what data crosses them, and where user input reaches a sink. Checks without a path to real input are noise.
3. **Run the code checklist** (OWASP Top 10 + CWE), adapting the grep to the stack:
   ```bash
   # injection surfaces
   grep -rnE 'execute\(.+ \+|f"SELECT|Runtime\.exec|subprocess.*shell=True|os\.system' .
   # auth, IDOR, crypto, diagnostics
   grep -rnE 'verify=False|alg.*none|decode\(|MD5|SHA1|ECB|Math\.random|ShowPII|DEBUG\s*=\s*True'
   # personal data and tokens in logs
   grep -rnE 'log.*(password|token|card|passport|secret)'
   ```
4. **Walk the table row by row** — Injection, Access (permission check on every endpoint, IDOR on `/{id}` without an owner check), Authentication (JWT signature/expiry/audience, bcrypt/argon2 storage), Data (PII and tokens in logs, responses, errors, URLs), Crypto, Input (validation, body limits, uploads, deserialization), SSRF/redirects (URLs from user input), TLS (disabled certificate checks), Diagnostics (debug/PII switches left on in production).
5. **Scan for secrets without printing them.** `gitleaks detect --no-git -s .` for the working tree and `gitleaks detect` for history; fall back to `grep -rnE '(api[_-]?key|secret|token|password)\s*[:=]'` when gitleaks is absent. A hit is reported by **path**, never by value; a leaked secret needs rotation, not only deletion.
6. **Scan dependencies and the image.** Stack-specific audit plus the image:
   ```bash
   npm audit --omit=dev          # or pip-audit, mvn dependency-check:check
   dotnet list package --vulnerable
   trivy fs .                    # filesystem/lockfile findings
   trivy image <registry>/<app>:<tag>
   ```
   A CVE with no reachable path is a "to check", not a confirmed finding.
7. **Check the delivery config.** Image: non-root user, minimal base, no shell/curl in production without need, `readOnlyRootFilesystem`. Kubernetes: `securityContext`, `runAsNonRoot`, `allowPrivilegeEscalation: false`, NetworkPolicy, least-privilege RBAC, secrets from a vault rather than values. CI: no secrets in logs, protected variables only on protected branches.
8. **Confirm and rate each finding.** Reproduce the exploit on a local or dev instance where possible; rate `critical` / `high` / `medium` / `low` by impact × reachability. Unconfirmed scanner output goes to a separate "to check" list.
9. **Fix small and prove it.** Each fix is one small change (`keep-it-small`) with a test for the vulnerable scenario: an access check test, an injection payload test, a config assertion. Never fix a secret by editing history and calling it done.
10. **Write the report and hand over.** Findings table in `.orbit/task/<id>/review.md`; bugs found by the fixes go to `test-flows`.

## Output

`.orbit/task/<id>/review.md`, section `## Security review <date>`:

```markdown
| # | Severity | Where | Problem | How it's exploited | Fix |
|---|---|---|---|---|---|
| 1 | critical | `api/reports.py:31` | no tenant check on `GET /reports/{id}` | any user reads another tenant's report | owner check + test `test_report_foreign_tenant` |
| 2 | high | `config/db.yaml:12` | DB password committed | read from repo history | rotate secret, move to vault |
| 3 | medium | `Dockerfile:14` | runs as root | container escape widens blast radius | `USER app` + `securityContext` |

## To check
- `trivy image` CVE-2026-1234 in `openssl` — reachability not proven; blocked by TLS-only egress.

## Verdict
2 confirmed blockers fixed; none open. Reviewed at base `d34f21c`.
```

## Check

```bash
gitleaks detect --no-git -s .            # 0 new leaks
trivy fs . --exit-code 1                 # no new high/critical in the change
rg -n "critical|high|Verdict" .orbit/task/<id>/review.md
rg -n "password\s*[:=]\s*\S+" .orbit/task/<id>/review.md   # report must not quote values
```

Pass rule: every `critical`/`high` finding names `file:line`, the exploitation path and a fix; every "to check" item is listed separately; no secret value appears in the report; the fix tests pass and the scan is re-run clean. Record the scan command and output in `.orbit/task/<id>/evidence.md` for `prove-done`.

## Example

An MR adds a tenant-scoped export endpoint. A 20-line review walk-through:

```text
1. Scope: change MR !412, files api/reports.py, services/export/, Dockerfile.
2. Surface: GET /reports/{id}.csv, user input = path id + date range.
3. Code grep: no `execute(... +` hits; auth middleware present on the router.
4. Access row: handler loads report by id — no owner/tenant predicate. Finding #1.
5. Data row: grep for token logging hits `log.info("export ok", headers)` — finding #2.
6. Secrets: gitleaks clean in tree; history scan finds no new secret.
7. Deps: trivy fs reports nothing high in changed lockfile entries.
8. Image: Dockerfile adds `USER 1001`, readOnlyRootFilesystem in the chart.
9. Reproduce #1 with a second tenant token -> 200 with foreign data. Confirmed critical.
10. Fix: add `WHERE tenant_id = :tenant` + `test_report_foreign_tenant`.
11. Re-scan: clean; evidence block written; verdict: 1 critical fixed, 1 medium deferred.
```

## Pitfalls

- **Printing a secret while "proving" it.** The report, the chat and the log now contain the secret. Report the path and rotate; check presence only.
- **Reporting raw scanner output.** A CVE with no reachable path or a grep false positive is not a confirmed finding. Verify first or move it to "to check".
- **Code-only review.** Most real breaches in this pack's scope come from delivery: root image, over-broad RBAC, secrets in values, unprotected CI variables.
- **Fixing a leak without rotation.** Removing the secret from the current commit leaves it in history and in every clone. Rotate, then clean.
- **Severity by feeling.** Rate by impact × reachability; a test-only config issue and an unauthenticated data read are not both "high".
- **Dropping "to check" items.** They disappear from the record and reappear as an incident. Keep the list with the reason it is unconfirmed.

## Portability

All commands are standard CLI: `grep`, `gitleaks`, `trivy`, the stack's audit tool, `kubectl`/`helm`. Without `gitleaks` or `trivy`, use the grep fallbacks above and state which scanner was unavailable — coverage is lower, the method is the same. No subagents are required; service-scope reviews can be split by area across sessions, and the report is plain Markdown in the shared `review.md`.

## What's improved vs the source

- Report contains only confirmed findings; doubtful ones go to a "to check" list.
- Covers code and delivery: image, Kubernetes, CI, secrets; plus diagnostic switches left on in prod.
- Secrets policy is explicit: path only, then rotation.

## Based on

- Orbit's own skill.

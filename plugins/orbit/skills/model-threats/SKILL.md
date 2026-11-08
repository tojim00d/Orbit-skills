---
name: model-threats
description: '[Orbit 1.5.2 Risks] STRIDE threat model over data flows before code; controls → spec requirements. Use when: «модель угроз», «STRIDE», «безопасность до кода», «что может пойти не так с безопасностью»; threat model.'
---

# model-threats — threat model before code

> **Orbit · ① Understand · step 1.5.2 Risks**
> **Input:** design, diagram or data flows — from `scan-risks`
> **Output:** `.orbit/task/<id>/risks.md` (threat section) → next `write-spec`
> **Works with:** `review-security`, `design-services`, `scan-risks`
> **Shared rules:** reply in the user's language; generated artifacts default to English; own or authorized systems only; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

Find what can go wrong security-wise **before** implementation, when fixing is cheapest. Method: STRIDE over data flows, light enough for one feature or service.

## When to use

- A new integration or a new public endpoint is being designed.
- The feature touches personal data, money, secrets or credentials.
- Authentication, authorization or network policies change.
- A new trust boundary is introduced: internet → ingress, namespace → namespace, company → partner.
- Before `write-spec`, so controls become requirements instead of afterthoughts.

Do **not** run a full enterprise threat-model workshop for a README change; do use it even for a "small" endpoint that exposes user data.

## Inputs

- the design or data-flow sketch (from `shape-idea` / `draw-stack` / `project-diagram`);
- `.orbit/task/<id>/risks.md` from `scan-risks` — threats are appended there, not in a new file;
- `.orbit/task/<id>/brief.md` for scope and data classification;
- `.orbit/knowledge/overview.md` and `graph.json` for the real services and call edges;
- compliance constraints (data residency, retention) if the project has them.

If there is no diagram, build a minimal one in the output: actors, services, stores, queues, external APIs and the boundaries crossed. If a data classification is missing, ask one question — the asset list cannot be guessed.

## Procedure

1. **Draw the data-flow diagram.** Actors (user, services, DBs, queues, external APIs), data flows, **trust boundaries** (internet → ingress, namespace → namespace, company → partner). Use `project-diagram` or `draw-stack`; a text sketch in the artifact is acceptable if the diagram tool is unavailable.
2. **List the assets.** What we protect: personal data, tokens, money, availability, log integrity. For each, where it is stored and which flow carries it.
3. **Run STRIDE for every flow that crosses a boundary.** One row per threat, not per component:

   | Threat | Question | Typical control |
   |---|---|---|
   | **S**poofing | Can someone pose as another? | mTLS, OIDC, JWT signature and audience checks |
   | **T**ampering | Can data be changed in transit or at rest? | TLS, signatures, integrity checks, write permissions |
   | **R**epudiation | Can someone deny an action? | audit log with user and time, immutable storage |
   | **I**nformation disclosure | Will too much leak? | minimal fields, masking in logs, encryption |
   | **D**enial of service | Can it be brought down? | limits, timeouts, quotas, HPA, circuit breaker |
   | **E**levation of privilege | Can someone gain more rights? | RBAC, least privilege, per-request permission checks (IDOR) |

4. **Check the code for existing controls.** Before proposing a new control, grep the service for the one that may already exist; a duplicate control is a review finding, a missing one is a risk.
   ```bash
   grep -rnE 'authorize|hasRole|@PreAuthorize|permission|rateLimit|jwt|mTLS' src/ | head -60
   ```
5. **Rate and decide.** Likelihood × impact (low/med/high) → eliminate / reduce / accept (with an owner) / transfer. "Accept" without an owner and a date is not a decision — it is a risk you forgot.
6. **Turn controls into spec requirements.** Each control becomes a WHEN/THEN scenario in `run-spec-loop` (`write-spec`) and a review item for `review-security`, so the check survives into code review.
7. **Write the threat section** into `.orbit/task/<id>/risks.md` and re-read it against the diagram: every boundary has at least one evaluated threat, including the ones rated low.

## Output

The threat section of `.orbit/task/<id>/risks.md` (shared with `scan-risks`):

```markdown
## Threats — <feature> — <date>
Assets: session token (Redis), order (Postgres), payment card ref (billing-svc only)
| # | Flow | STRIDE | Risk | Likelihood | Impact | Control / decision | Status | Owner |
|---|---|---|---|---|---|---|---|---|
| T1 | browser -> api /orders | S | stolen token replayed | M | H | short-lived JWT + audience check | reduce | @auth-team |
| T2 | api -> billing | I | card ref in logs | M | H | masking in logger, no PII in traces | reduce | @payments |
| T3 | partner webhook | T | unsigned callback accepted | L | H | HMAC over body, reject mismatch | eliminate | @integrations |
Accepted: none. Open questions: who owns the WAF rule for T4?
```

Status is one of `eliminate` / `reduce` / `accept` / `transfer`; accepted risks carry an owner and a review date.

## Check

```bash
test -f .orbit/task/<id>/risks.md && echo "artifact ok"
grep -cE '^\| T[0-9]+ ' .orbit/task/<id>/risks.md          # threats
grep -cE '\| (eliminate|reduce|accept|transfer) \|' .orbit/task/<id>/risks.md
grep -nE '^\| T[0-9]+ .*\| (S|T|R|I|D|E) \|' .orbit/task/<id>/risks.md | wc -l   # STRIDE letters used
grep -n 'owner\|@' .orbit/task/<id>/risks.md | head -10
```

Pass rule: every flow across a trust boundary has at least one threat row; every row has a STRIDE letter, a rating, a decision status and an owner (for accept/reduce); every control named in the table appears as a scenario in the spec or a `review-security` item; no accepted risk lacks an owner and a review date. Link the section from `.orbit/task/<id>/brief.md` and carry it into `write-spec`.

## Pitfalls

- **Threat modeling the whole company.** Scope to one feature or service. A 200-row table is not read and therefore not implemented.
- **Skipping trust boundaries.** The interesting threats live where data crosses from one trust zone to another; inside a single boundary the model is mostly noise.
- **Controls without a spec scenario.** "Use mTLS" in a table is a wish; the WHEN/THEN scenario is what the test and review check.
- **Accepting risks silently.** "We'll live with it" without an owner and date disappears at the next release. Record who accepted and when it will be revisited.
- **Inventing controls the platform cannot do.** Check what the stack and platform actually support (`grep` the config, ask `ship-k8s`); a control that cannot be built is a new risk.
- **Rating everything high.** Everything-high equals nothing-high; calibrate likelihood against real exposure and note the assumption.

## Portability

Markdown plus the project's existing diagram tool — any agent and model can run it. Without subagents, run STRIDE in one pass per flow; the table is the shared state. If no diagram tool exists, a text sketch with arrows in a code block is enough. No Claude Code features are required.

## What's improved vs the source

- STRIDE lightened to one feature or service: a "threat → question → typical control" table instead of a long process.
- Controls become spec scenarios and `review-security` items — threats don't get lost between stages.
- Every accepted risk carries an owner and a review date, so acceptance is a decision, not silence.
- The model starts from actual data flows and assets, with the existing controls checked before new ones are proposed.

## Based on

- Orbit's own skill.

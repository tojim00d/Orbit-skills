---
name: write-runbook
description: "[Orbit 3.5.2 Operations] On-call runbook: check → fix → escalate → roll back, full commands. Use when: «runbook», «инструкция для дежурного», «напиши ранбук»; runbook, on-call guide, escalation procedure."
---

# write-runbook — instructions for the on-call engineer

> **Orbit · ③ Operate · step 3.5.2 Operations**
> **Input:** alert / procedure ← `review-observability`
> **Output:** `docs/runbooks/<alert-or-task>.md` + verification in `.orbit/task/<id>/evidence.md` → next `handle-incident`
> **Works with:** `speak-plain`, `review-observability`
> **Shared rules:** reply in the user's language per `speak-plain`; generated content (maps, diagrams, comments, docs, artifacts) defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md` at the pack root).

A runbook is a step-by-step guide that lets someone without context handle a typical situation at night. Written per `speak-plain`: imperative, one action per step, full commands. Written in the on-call team's language, not in the language of the person who built the system.

## When to use

- `review-observability` proposed an alert and the rule now needs a `runbook_url`.
- A postmortem (`handle-incident`) produced an action "write/update the runbook for this symptom".
- An alert exists with no linked procedure, or its runbook is older than the service's architecture.
- A new on-call rotation starts and the typical situations are undocumented.
- The same manual procedure was executed twice from memory — it should be written down.

Do **not** write a runbook for a hypothesis nobody has tested: every command must be runnable and, where possible, verified. A runbook that does not work at 3 a.m. is worse than none.

## Inputs

- the alert or symptom and its name: `.orbit/task/<id>/review.md` (the gap list from `review-observability`), or the alert rule itself;
- the real commands: from the deploy scripts, the chart, the CI config and the last incident notes in `.orbit/task/<id>/incident.md`;
- access requirements: namespace, role, VPN, dashboard URL, the channel where changes are announced;
- escalation contacts: the owning team, the platform/SRE on-call, and the incident lead process;
- existing runbooks in `docs/runbooks/` — match their format, links and naming instead of inventing a new style;
- the dev stand where each command can be tested before it is published.

If the access or the dev stand is missing, write the runbook with the unverified steps marked "not verified" and say why.

## Procedure

1. **Name the situation, not the component.** "Checkout 5xx above 5 %" is a runbook; "the orders service" is not. The name must match the alert name so the link is obvious.
2. **Define the audience and the goal.** Someone on call who has never seen this service must be able to get from the alert to a safe state using only this file.
3. **Gather and verify the commands.** Run each one on the dev stand before publishing. Record the expected result after each check — exact text or an exit code, not "should be fine":
   ```bash
   kubectl get po -n <ns> -l app=<name>          # Expected: all Running, READY 1/1
   kubectl rollout status deploy/<name> -n <ns>  # Expected: successfully rolled out
   ```
4. **Write the structure** in the order the responder needs it: When to use → Impact → Access needed → Check → Fix → If it didn't help → Rollback. A template is in Output.
5. **Put warnings before the dangerous step**, never after: if step 2 restarts pods, the line `> ⚠ Before step 2, warn in channel #<channel>` goes above step 2.
6. **Keep one action per numbered step, with the full command and the expected result.** "Restart the deployment" is not a step; `kubectl rollout restart deploy/<name> -n <ns>` with the expected output is.
7. **Add the escalation path.**
   Include who to contact, through which channel, and what to attach: logs, the start time, what was already tried.
8. **Link the runbook from the alert** so the pager has a button, not a memory test:
   ```yaml
   annotations:
     runbook_url: docs/runbooks/<alert-name>.md
   ```
9. **Review with the on-call engineer** and walk it top to bottom. A runbook nobody has walked through is a draft.
10. **Update after every incident.** Replace "what should work" with "what actually helped", and bump the date at the top. Record the verification in `.orbit/task/<id>/evidence.md`.

## Output

`docs/runbooks/<alert-or-task>.md`:

```markdown
# Checkout 5xx above 5 %

**When to use:** alert `Checkout5xxRate` or users report failed checkout.
**Impact:** EU checkout fails; revenue lost per minute. **Access needed:** `prod` namespace, `payments` role, VPN.
**Dashboard:** <link to the checkout health view>

## Check
1. Open the dashboard. Normal: 5xx < 1 %. Bad: > 5 % for 5 min.
2. Run:
   kubectl get po -n prod -l app=orders-api
   Expected: all `Running`, READY `1/1`.

## Fix
> ⚠ Before step 2, warn in channel #payments-oncall.
1. Check the last deploy: `kubectl rollout history deploy/orders-api -n prod`.
2. Roll back: `kubectl rollout undo deploy/orders-api -n prod`.
3. Confirm: `kubectl rollout status deploy/orders-api -n prod` → "successfully rolled out".

## If it didn't help
Escalate to `<team/on-call>`, attach: the timeline, the log excerpt, and what was already tried.

## Rollback
`argocd app rollback orders-api <previous-revision>`; re-sync if GitOps reverts it.
```

## Check

```bash
rg -n "When to use|Impact|Access needed|Check|Fix|If it didn't help|Rollback" docs/runbooks/<name>.md
rg -n "runbook_url" alerts/ deploy/          # the alert links this file
rg -n "not verified" docs/runbooks/<name>.md  # unverified steps are explicit
git status --short                            # runbook is committed with the alert change
```

Pass rule: every command was executed on the dev stand (or is marked "not verified" with a reason); every check states the expected result; warnings precede the dangerous step; the escalation path and the rollback exist; the alert's `runbook_url` points at this file. Record the verification commands and output in `.orbit/task/<id>/evidence.md`.

## Pitfalls

- **Commands nobody ran.** A typo or a missing flag is discovered during an incident. Verify on a dev stand; mark what you could not.
- **Warning after the dangerous step.** The reader acts before seeing the warning. Put it above the step, in a blockquote.
- **No expected result.** "Check the pods" leaves the responder guessing whether what they see is normal. State the expected output.
- **Missing rollback.** A procedure that can only go forward is how a small incident becomes a long one. Always include the way back.
- **Assumed context.** Jargon, internal names and "obviously the right cluster" exclude the actual reader. Spell out the namespace, the role and the links.
- **A wall of text.** The on-call reads under pressure. Numbered steps with one action each survive; paragraphs do not.
- **Not linked from the alert.** An unlinked runbook is invisible when the pager fires. Set `runbook_url` in the annotation.
- **Never updated after an incident.** The procedure that actually worked is the one to publish. Update it while the incident is fresh.

## Portability

The runbook is a Markdown file plus the team's own CLI commands; `kubectl`, `argocd`, `curl` are illustrative of what goes inside. Without a dev stand, verify what can be verified locally and mark the rest. No subagents or slash commands are needed; the alert annotation and the file live in the repository, so any on-call tooling can link them.

## What's improved vs the source

- Template follows `speak-plain`: imperative, one action per step, expected result after each check.
- Warnings always come before the dangerous step.
- Every command is verified on a dev stand or explicitly marked, and the alert links the file.
- Post-incident updates are part of the procedure, so the runbook reflects what worked.

## Based on

- Orbit's own skill.

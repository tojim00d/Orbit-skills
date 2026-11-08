---
name: scan-risks
description: '[Orbit 1.5.1 Risks] Fast risk scan: data, contracts, dependencies, rollback, observability, people. Use when: «какие риски», «что может пойти не так», «оцени риски перед стартом»; risk assessment.'
---

# scan-risks — fast risk scan of a task

> **Orbit · ① Understand · step 1.5.1 Risks**
> **Input:** the task and recon — from `survey-codebase`, `model-domain`, `clarify-task`
> **Output:** `.orbit/task/<id>/risks.md` → next `model-threats`
> **Works with:** `clarify-task`, `write-spec`, `plan-steps`
> **Shared rules:** reply in the user's language; generated artifacts default to English; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

Fifteen minutes before work that save days. Not only security (that is `model-threats`) — all risks: technical, data, deadlines, people, operations.

## When to use

- A task is about to start and the blast radius is not written down.
- A schema change, API change or deploy is planned and rollback is unproven.
- Dependencies, quotas or access rights are unclear and could block the work.
- Another team's release window, freeze or on-call rotation can affect delivery.
- Before `write-spec` or `plan-steps`, so risks become tasks instead of surprises.

Do **not** turn it into a security review (that is `model-threats`) and do not produce a risk register for a typo fix.

## Inputs

- `.orbit/task/<id>/brief.md` — goal, done-criteria, scope;
- `.orbit/knowledge/overview.md`, codebase state, the project map — what the change touches;
- `git log --oneline -20` and the current branch state — recent churn and in-flight work;
- deploy and infra files: Dockerfile, Helm values, CI workflows, migrations;
- `.orbit/task/<id>/risks.md` if the scan continues — append, do not replace.

If the recon is missing, read the five files the change touches and say the scan is partial. If the owner of a risk is unknown, that is itself a risk to record.

## Procedure

1. **Restate the change in one line** and the system area it touches. The scan is about that change, not about the codebase.
2. **Walk the checklist below and mark only real risks** — one line per area that is genuinely affected. Empty areas are skipped, not filled with "no risk".
3. **Check data risk in the migrations.** Schema change? Backfill? Reversible? Volume? Personal data?
   ```bash
   find . -path '*/migrations/*' -newer .orbit/task/<id>/brief.md | head
   grep -rnE 'ALTER TABLE|DROP COLUMN|ADD COLUMN .*NOT NULL' db/ migrations/ 2>/dev/null | head
   ```
4. **Check contracts.** API, event or file-format change — who consumes it? Is there versioning? A contract change without a consumer list is the highest-impact risk.
   ```bash
   grep -rn '<endpoint-or-event>' --include='*.ts' --include='*.py' --include='*.go' . | grep -v node_modules | head -20
   ```
5. **Check dependencies.** New library or service: licence, maintenance, availability in the internal registry. A new dependency is a supply-chain and an approval risk.
6. **Check infrastructure.** Resources, quotas, network policies, secrets in the vault, access rights. In k8s, render the chart before assuming the values.
   ```bash
   helm template <release> ./chart -f values-prod.yaml > /tmp/rendered.yaml && grep -nE 'resources:|limits:|replicas:' /tmp/rendered.yaml | head
   ```
7. **Check rollback and observability.** One-command rollback? What happens to data on rollback? Will a failure be seen — metrics, alerts, logs?
   ```bash
   git log --oneline -10 -- <deploy-dir>
   grep -rn 'health\|readiness\|metrics' <deploy-dir> | head
   ```
8. **Check unknowns and people.** What did we assume instead of checking in code? Who is needed from other teams, change windows and freezes?
9. **Rate and rank.** Likelihood (low/med/high) × impact (low/med/high); sort by score. Top 3 risks get an action and an owner.
10. **Write the artifact and wire it in.** Top 3 risks go into `proposal.md` (`run-spec-loop`) and into the plan (`plan-steps`) as separate tasks: "check X before starting", "prepare rollback". A risk that is an unchecked assumption → ask now (`clarify-task`, `think-first`).

| Area | Questions |
|---|---|
| Data | Schema change? Migration? Reversible? Volume? Personal data? |
| Contracts | API/event/format change? Who consumes it? Versioning? |
| Dependencies | New library/service? Licence? Maintained? Available in the internal registry? |
| Infrastructure | Resources, quotas, network policies, secrets in the vault, access rights? |
| Rollback | One-command rollback? What happens to data on rollback? |
| Observability | Will we see a failure? Metrics, alerts, logs? |
| Unknowns | What did we assume instead of checking in code? |
| People and time | Who's needed from other teams? Change windows, freezes? |

## Output

`.orbit/task/<id>/risks.md` (shared with `model-threats`):

```markdown
# Risks — <task> — <date>
## Scan
| Risk | Likelihood | Impact | Score | Action | Owner |
|---|---|---|---|---|---|
| backfill on 40M rows locks orders | M | H | 6 | batch backfill + dry run | @data |
| report consumer breaks on new field | M | M | 4 | add field, keep old one | @export |
| no rollback for migration 007 | L | H | 6 | reversible down + tested restore | @platform |
## Assumptions to check
- [ ] retention policy covers the new column — owner @legal
## Top 3 → plan tasks / proposal
1. …
```

## Check

```bash
test -f .orbit/task/<id>/risks.md && echo "artifact ok"
grep -cE '^\| .* \| (L|M|H) \| (L|M|H) \|' .orbit/task/<id>/risks.md   # rated risks
grep -n 'Top 3' .orbit/task/<id>/risks.md
grep -cE '^- \[ \]' .orbit/task/<id>/risks.md                          # unchecked assumptions
git status --short | grep -E 'risks|plan' || true
```

Pass rule: only real risks are listed (no filler rows); each has likelihood, impact and an owner; the top 3 appear as tasks in `plan.md` or items in `proposal.md`; unchecked assumptions have a checkbox and an owner; the scan names which inputs were missing. Link the file from `brief.md` so later steps read it.

## Pitfalls

- **A risk list nobody acts on.** A row without an owner or a plan task is decoration; the top 3 must exist in `plan.md`.
- **Scanning security twice.** That is `model-threats`; this scan covers data, contracts, dependencies, rollback, observability, people — security is just one row if relevant.
- **Assuming the rollback works.** "We can revert the deploy" ignores data migrations. Test the down path or record the gap as a top risk.
- **Missing the consumer list.** A contract change discovered after release is the most expensive version of this scan; grep for consumers before rating it.
- **Filling empty areas.** "No risks in people" adds noise and hides the real ones. Skip unaffected areas.
- **One-time scan.** Re-run at plan review and before deploy; the risk set changes when the design does.

## Portability

Markdown, `git` and `grep` — any agent and model can do it, and it fits in a 15-minute timebox. Without subagents, walk the areas in order; the artifact is the shared state. If `helm` or the deploy tooling is unavailable, inspect the manifests directly and note the fallback. No Claude Code features are required.

## What's improved vs the source

- Not only security: data, contracts, rollback, observability, people and change windows in one 15-minute checklist.
- Top 3 risks become plan tasks and proposal items, not a forgotten note.
- Every risk has an owner, and unchecked assumptions are explicit checkboxes.
- The scan starts from the change and its blast radius (`trace-impact`), not from a generic questionnaire.

## Based on

- Orbit's own skill.

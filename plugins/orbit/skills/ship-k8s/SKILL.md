---
name: ship-k8s
description: "[Orbit 2.7.3 Release] Kubernetes, Helm, GitOps: render and diff, deploy via git, pod diagnostics. Use when: «helm», «деплой», «под не стартует», «argocd», «обнови чарт»; kubernetes, helm, deploy, gitops."
---

# ship-k8s — Kubernetes, Helm and GitOps without surprises

> **Orbit · ② Build · step 2.7.3 Release**
> **Input:** a deploy change ← `open-mr`
> **Output:** verified manifest / release + `.orbit/task/<id>/evidence.md` → next `project-map`
> **Works with:** `fix-ci`, `handle-incident`
> **Shared rules:** reply in the user's language per `speak-plain`; generated content (maps, diagrams, comments, docs, artifacts) defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md` at the pack root).

Daily DevOps work: charts, values, GitOps deploys (Argo CD / Flux), pod diagnostics. Rule: **render and diff first, apply after.**

## When to use

- A chart, a values file or a template must change for an environment.
- A GitOps repo (Argo CD, Flux) needs a new image tag or a manifest update.
- A pod does not start, a rollout does not finish, or a deployment reports `ProgressDeadlineExceeded`.
- An MR touches Kubernetes manifests.

Do **not** use it to hand-edit a resource on a shared cluster — changes go through git. Diagnostic-only work on someone else's namespace also needs consent.

## Inputs

- the chart: `helm show values <chart>`, `templates/`, `_helpers.tpl`, `Chart.yaml`;
- the environment values and the GitOps repo state: `values-<env>.yaml`, the MR that changes them;
- the current cluster context: `kubectl config current-context`, namespace,;
- the task: `.orbit/task/<id>/brief.md` (what the deploy should change) and `.orbit/task/<id>/evidence.md` (the proof so far);
- the team's release rules: chart version bump policy, allowed sync windows, who owns the cluster.

If the `helm`/`kubectl` context is not the intended cluster, stop and fix the context before rendering anything.

## Procedure

1. **Read the chart before editing.** Find where the field comes from: `helm show values ./chart`, the template that renders it, and `_helpers.tpl` for naming and labels. Editing values without knowing the template is how a "small" change breaks another environment.
2. **Change values, not templates, for per-environment differences.** A template with an `if <env>` branch is a future incident; the difference belongs in `values-<env>.yaml`.
3. **Lint the chart.** `helm lint ./chart -f values-<env>.yaml` must pass before you compare renders.
4. **Render the new manifest.**
   ```bash
   helm template rel ./chart -f values-<env>.yaml > /tmp/new.yaml
   ```
5. **Render the old manifest for a real diff.** The diff is the change, not the file:
   ```bash
   git stash && helm template rel ./chart -f values-<env>.yaml > /tmp/old.yaml && git stash pop
   diff -u /tmp/old.yaml /tmp/new.yaml
   # with the helm-diff plugin: helm diff upgrade rel ./chart -f values-<env>.yaml
   # helmwave: helmwave diff
   ```
6. **Validate the result.** `kubeconform -strict /tmp/new.yaml` or `kubectl apply --dry-run=server -f /tmp/new.yaml` (needs dev access). Dry-run catches schema errors that `helm template` does not.
7. **Bump the chart version** in `Chart.yaml: version` when the repo's rules require it.
8. **Apply through git, not through the cluster.** Open an MR to the environment repo and let Argo CD or Flux reconcile. For Argo CD: `argocd app diff <app>` before the merge and `argocd app get <app>` after; for Flux: `flux diff kustomization <name>` and `flux get kustomizations`. Manual cluster actions only with the person's consent (`stay-in-scope`), and record exactly what was done.
9. **Verify the rollout.** `kubectl rollout status deploy/<name> -n <namespace>`, then `kubectl get po -n <namespace> -l app=<name>`. A merge is not a deploy until the pods report ready.
10. **Record the evidence and the rollback.** Append the diff summary, the validation output, the sync result and the rollback command to `.orbit/task/<id>/evidence.md`; 

### Pod diagnostics (top-down)

```bash
kubectl get deploy,rs,po -n <ns> -l app=<name> -o wide
kubectl describe po <pod> -n <ns> | sed -n '/Events/,$p'   # ImagePullBackOff, OOMKilled, probes
kubectl logs <pod> -n <ns> --previous --tail=200
kubectl get events -n <ns> --sort-by=.lastTimestamp | tail -30
kubectl top po -n <ns>
```

| Symptom | Common cause |
|---|---|
| ImagePullBackOff | tag missing, no pull secret, registry unreachable |
| CrashLoopBackOff | the app crashes — check `--previous` |
| OOMKilled | memory limit below real usage; JVM without `-XX:MaxRAMPercentage` |
| Readiness fail | wrong probe path/port, slow start → `startupProbe` |
| Pending | no resources, nodeSelector/taints, unbound PVC |
| Config/secret missing at start | the app reads ConfigMap/Secret via the API and lacks RBAC get/list/watch |

Good chart practice while you are in there: requests/limits, three probes, `securityContext` (non-root, read-only FS), PDB, HPA under load, `podAntiAffinity` for replicas, config via ConfigMap, secrets via a vault / ExternalSecrets, `app.kubernetes.io/*` labels, and a container port that matches the app's listen port.

## Output

`/tmp/new.yaml` (reviewed, then committed by the GitOps MR) and this evidence block:

```markdown
## 2026-11-08 16:10 — deploy orders-api 1.4.2 → staging

`helm lint` ok; `helm template` diff: image tag 1.4.1→1.4.2, replicas 2→3.
`kubeconform -strict` ok. MR env-staging!87 merged; `argocd app get orders-api` Synced.
`kubectl rollout status deploy/orders-api -n staging` → successfully rolled out.
Rollback: `argocd app rollback orders-api <previous-revision>`.
```

## Check

```bash
helm lint ./chart -f values-<env>.yaml
helm template rel ./chart -f values-<env>.yaml | kubeconform -strict -
git diff --stat                      # the only intended change, nothing stray
kubectl rollout status deploy/<name> -n <namespace>
argocd app get <app>                 # or: flux get kustomizations
```

Pass rule: lint and strict validation pass, the rendered diff contains only the intended change, the GitOps app is `Synced`/`Healthy` (or the Flux kustomization is `Ready`), and the rollout finished. Evidence includes the diff summary, the sync state and the rollback command.

## Example

A release asks for a new image tag in staging. The 12-line loop:

```text
1. Read: helm show values ./chart -> image.tag is in values-staging.yaml.
2. Edit values-staging.yaml: image.tag 1.4.1 -> 1.4.2 (no template change).
3. helm lint ./chart -f values-staging.yaml -> 1 chart(s) linted, 0 failed.
4. helm template rel ./chart -f values-staging.yaml > /tmp/new.yaml
5. git stash, render old, git stash pop; diff -u shows one image line.
6. kubeconform -strict /tmp/new.yaml -> 0 errors.
7. Bump Chart.yaml version 0.8.0 -> 0.8.1 per repo rule.
8. MR env-staging!87 -> merge; Argo CD auto-sync.
9. argocd app get orders-api -> Synced / Healthy; kubectl rollout status -> done.
10. 11. Rollback command recorded: argocd app rollback orders-api <rev>.
12. Evidence block appended to .orbit/task/ABC-77/evidence.md.
```

## Pitfalls

- **`helm upgrade` before a render diff.** The diff is the only safe review of a deploy. Render old and new, read the unified diff, then apply.
- **Hardcoding per-environment differences in templates.** `if .Values.env == "prod"` breaks the environment nobody tests. Values files exist for this.
- **Skipping server dry-run when the CRD is new.** `helm template` does not know the cluster's CRD schema; `--dry-run=server` does.
- **Manual `kubectl apply` on a shared cluster.** Reconcile will revert it, or it will drift silently. Change git.
- **Diagnosing by `describe` alone.** Events show the symptom; `logs --previous` and `top` show the cause. Use both.
- **Ignoring RBAC for config-reading apps.** An app that reads a ConfigMap through the API can be healthy in one namespace and fail in another without `get/list/watch`.
- **No rollback command in the evidence.** At 3 a.m. nobody wants to reconstruct the revision. Record it at deploy time.

## Portability

`helm`, `kubectl`, `argocd`/`flux` are standard CLIs; `kubeconform` and the `helm-diff` plugin are optional — `diff -u` between two renders is the fallback, and `--dry-run=server` replaces `kubeconform`. Without cluster access, render, diff and validate locally and mark the rollout as "not verified".

## What's improved vs the source

- The "render and diff first" rule with ready `helm template` / `helm diff` / `helmwave diff` commands.
- Symptom → common cause table, including RBAC for apps that read config via the Kubernetes API (found in the pack test).
- Validation with `kubeconform -strict` / server dry-run before merge.
- The rollback command is recorded with the deploy, not reconstructed during an incident.

## Based on

- Orbit's own skill.

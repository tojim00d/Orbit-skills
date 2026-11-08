---
name: run-spec-loop
description: '[Orbit 1.6.2 Specification] OpenSpec loop: proposal → delta → code → map → archive; switched on by repository signals. Use when: «openspec», «спека раньше кода», «оформи изменение», «обнови спеку и карту», «spec-driven»; spec-driven development.'
---

# run-spec-loop — the "spec → code → map" loop on OpenSpec

> **Orbit · ① Understand · step 1.6.2 Specification**
> **Input:** an agreed spec — from `write-spec`
> **Output:** `openspec/changes/<id>/` merged after archive → next `plan-steps`
> **Works with:** `project-map`, `commit-clean`, `trace-impact`, `prove-done`
> **Shared rules:** reply in the user's language; generated artifacts default to English; artifacts go to `.orbit/` and `openspec/` (contract: `ARTIFACTS.md`).

The backbone of the pack: links **Understand** (spec) with **Build** (code) and **Operate** (map). Principle: **spec before code, map right after code.**

## When to use

- A behavior, contract, deploy config or module structure changes.
- The repo already has `openspec/`, a project map, or a rule in `AGENTS.md`/`CLAUDE.md` — then the loop is mandatory.
- A change was agreed in a spec and must be turned into tasks, code and a map update.
- Someone asks "where is the spec for this?" or the map is visibly stale.
- Before `plan-steps`, so tasks are derived from the delta rather than from chat.

Do **not** use the ceremony for typos, formatting, comments or behavior-preserving renames — but still check that the map isn't stale.

## Inputs

- the spec from `write-spec`; `.orbit/task/<id>/brief.md` and `requirements.md`;
- `openspec/project.md` and `openspec/specs/` — conventions and current truth;
- the project map directory (where `project-data.js` lives, often `docs/project-map/`);
- `.orbit/task/<id>/risks.md` and `plan.md` if they exist;
- the repo rules in `AGENTS.md` / `CLAUDE.md` / `CONTRIBUTING.md`.

If `openspec/` is missing and the work is significant, offer once to set it up (`openspec init` with consent). No consent → work without it and do not ask again. If the spec is missing, run `write-spec` first.

## Procedure

1. **Decide whether the loop is on**, by looking at the repository — not at the project name.
   ```bash
   ls -d openspec 2>/dev/null                                                         # OpenSpec
   find . -name project-data.js -not -path '*/node_modules/*' -not -path '*/.git/*'   # project map
   grep -il "openspec\|project-map\|карт" AGENTS.md CLAUDE.md CONTRIBUTING.md 2>/dev/null   # repo rules
   ```

   | Found | Action |
   |---|---|
   | `openspec/` **or** a map **or** a rule in AGENTS.md/CLAUDE.md | The loop rule is **mandatory** (below) |
   | Nothing, work is significant (feature, behavior, contract, migration) | Offer once to set up OpenSpec and a map. No consent → work without them, don't ask again |
   | Nothing, small edit | No ceremony, just do it |

2. **Write the proposal** `openspec/changes/<id>/proposal.md`: Why (1–3 sentences), What changes, Impact. No OpenSpec in the repo → `openspec init` (with consent, `stay-in-scope`). No CLI → create the files by hand.
3. **Write the spec delta and tasks.** `specs/<capability>/spec.md` with ADDED / MODIFIED / REMOVED, and a numbered `tasks.md`. Every requirement needs at least one WHEN/THEN scenario:
   ```markdown
   ### Requirement: Ingress timeout comes from values
   The chart SHALL take the ingress timeout from `ingress.timeoutSeconds`.

   #### Scenario: value set
   - **WHEN** `ingress.timeoutSeconds: 120`
   - **THEN** annotation `nginx.ingress.kubernetes.io/proxy-read-timeout` equals `"120"`
   ```
   **Check:** `openspec validate <id> --strict` before showing it.
4. **Get agreement.** Show the proposal and the delta. Code starts after "yes"; questions go back to `write-spec`.
5. **Code to the spec.** `plan-steps` → `test-first` → `run-plan`. A test is a spec scenario. If code diverges, fix the spec first — never let code and spec drift.
6. **Update the map in the same change.** Add nodes, links, scenarios and files; edit `project-data.js`, rebuild, and include the built `project.html` in the change. The map directory is where `project-data.js` was found.
   ```bash
   python3 <map-dir>/build.py
   ```
7. **Verify and archive.** `prove-done` → `openspec archive <id>` (the delta merges into `specs/`). Unfinished items (plans, operational steps, another team's work) stay as open items in `tasks.md` — never silently skipped.
8. **Keep the loop rule.** **Every change → OpenSpec entry + project map update**, in the same commit or right after, before push. "Every change" = any change of behavior, contract (API, event, DB schema), deploy config, module structure, or what the map shows. Only typos, formatting, comments and behavior-preserving renames may skip the OpenSpec entry — and they still need the map checked for staleness.

## Output

```
openspec/
  project.md                    project context, conventions
  specs/<capability>/spec.md    current requirements (truth "as is")
  changes/<change-id>/
    proposal.md                 why and what changes
    tasks.md                    work checklist
    design.md                   (opt.) technical decisions
    specs/<capability>/spec.md  requirement delta: ADDED / MODIFIED / REMOVED
```

The change directory is the artifact; the archived delta is the durable result. The diagram is the loop in one picture:

```
proposal + spec delta      ① Understand — agreed what changes
        ↓
code + tests by scenario   ② Build — small steps, verified
        ↓
map + validate + archive   ③ Operate — recorded and explained
```

## Check

```bash
test -d openspec/changes/<id> && ls openspec/changes/<id>
openspec validate <id> --strict            # zero errors
grep -c '^### Requirement:' openspec/changes/<id>/specs/*/spec.md
grep -c '^- \*\*WHEN\*\*' openspec/changes/<id>/specs/*/spec.md
grep -n 'ADDED\|MODIFIED\|REMOVED' openspec/changes/<id>/specs/*/spec.md | head
git status --short                          # change dir + map + code together
```

Pass rule: `openspec validate <id> --strict` passes; every requirement has at least one WHEN/THEN; `tasks.md` has no silently dropped item; the map was rebuilt in the same change when it exists; after archive, `openspec/specs/` contains the merged requirement. Record the validation output in `.orbit/task/<id>/evidence.md` (`prove-done`).

## Example

```text
Repo has openspec/ and docs/project-map/project-data.js → loop is mandatory.
Task: ingress timeout must come from Helm values.
1. proposal.md: why (prod timeout hardcoded at 60 s), what (new value), impact (chart only).
2. delta: ### Requirement … SHALL take from ingress.timeoutSeconds + one WHEN/THEN scenario.
3. openspec validate change-142 --strict → ok; show proposal to the platform owner.
4. "yes" → plan-steps; test-first writes the scenario as a helm template assertion.
5. Code: values.yaml + ingress template; run-plan; test green.
6. Map: edit docs/project-map/project-data.js (chart node → values link), python3 build.py,
   built project.html added to the same change.
7. prove-done records: validate ok, test output, rendered annotation 120.
8. openspec archive change-142; delta merged into specs/networking/spec.md; commit per commit-clean.
```

## Pitfalls

- **Deciding by project name.** The loop switches on repository signals (`openspec/`, a map, a rule), not on what the project is called; run the three probes first.
- **Code first, spec later.** A retroactive spec describes what was built, including its bugs. Write the delta before the code.
- **A stale map.** Updating nodes weeks later loses the edge that motivated the change. Rebuild the map in the same change.
- **`openspec validate` skipped.** Validation errors surface at archive time, after code review — run it before showing the proposal.
- **Silently dropped tasks.** Remaining tasks go into `tasks.md` as open items; an archive with hidden work is a lie.
- **Upgrading dependencies or touching prod "while here".** Out of scope by `stay-in-scope`; a separate change, a separate loop.

## Portability

Markdown plus the OpenSpec CLI when available — any agent and model can run it. Without the CLI, create `openspec/` files by hand and treat `validate` as a manual checklist against the same rules; map rebuild is a plain `python3 build.py`. Without subagents, do proposal → delta → code → map → archive inline; the artifacts are the state. No Claude Code features are required.

## What's improved vs the source

- The loop rule switches on by repository signals (`openspec/`, a map, or a rule in AGENTS.md), not by project name.
- "Every change" is defined precisely, along with what may skip an OpenSpec entry.
- The map is updated in the same change as the code — spec, code and diagram don't drift.
- Validation is part of the flow before agreement, not a surprise at archive time.
- The loop is drawn as one picture, so a new team member sees "understand → build → operate" in the artifact.

## Based on

- Orbit's own skill.

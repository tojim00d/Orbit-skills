---
name: slice-tickets
description: '[Orbit 2.1.2 Plan] Split work into vertical-slice tickets with dependencies and acceptance criteria. Use when: «разбей на задачи», «тикеты», «декомпозиция», «нарежь на слайсы»; break into tickets, vertical slices, split the feature.'
---

# slice-tickets — split work into vertical slices

> **Orbit · ② Build · step 2.1.2 Plan**
> **Input:** plan / spec ← `plan-steps`
> **Output:** tickets in the tracker or `.orbit/task/<id>/tickets/` → next `prototype-fast`
> **Works with:** `plan-steps`, `keep-it-small`, `setup-repo`
> **Shared rules:** reply in the user's language; generated artifacts default to English; stay in scope; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

A big feature becomes independent tickets, each delivering working behaviour from the user's entry point down to the data. Vertical slicing is what lets work be shared between people and agents and shipped in parts: every ticket is demonstrable on its own, so review, testing and rollback stay small.

## When to use

- A plan or spec exists but the feature is too large for one session or one person.
- Work must be parallelised between agents/people and the pieces need clean boundaries.
- The last release was one giant branch — the next one should ship in parts.
- The backlog is written as layers ("build the DB layer", "write the API") and nothing can be demoed until everything is done.
- A ticket list already exists but has no dependencies or acceptance criteria, so ordering is guesswork.

## Inputs

- the spec and plan: `openspec/changes/<id>/`, `.orbit/task/<id>/spec.md`, `.orbit/task/<id>/plan.md`;
- the codebase map: `.orbit/knowledge/overview.md` and `.orbit/knowledge/codebase/*.md` — see where each slice will run through the code;
- how the team tracks work (from `setup-repo`): GitLab/GitHub/Jira, labels, board columns, ticket template;
- existing open tickets for the same area — do not create a duplicate slice: `gh issue list --search "<feature>"`, `glab issue list --search "<feature>"`;
- the run/test commands each ticket's acceptance will use.

If the plan is missing, run `plan-steps` first: slicing an unsized spec produces tickets that cannot be ordered. If the tracker is not configured, fall back to files under `.orbit/task/<id>/tickets/` and say so.

## Procedure

1. **Read the feature end to end.** Write one sentence for the user-visible outcome. If the spec has several unrelated outcomes, this is several features — split at that level first.
2. **Draw the vertical path.** For each user action, list the layers it crosses: UI → API → domain logic → storage. A slice is one path, not one layer.
3. **Slice to "the user can X".** Title every ticket with a user-visible capability: "a customer can cancel an unpaid order", not "add cancel_order()". A ticket that cannot be shown to a user or checked by an acceptance test is a layer ticket — re-cut it.
4. **Handle the wide mechanical refactor.** Exception to vertical slicing: a rename across the whole codebase, a shared symbol retype, a framework migration in one move. Make it **one** ticket that touches all layers, mark it "mechanical, no behaviour change", and place it **first** so later slices build on a stable base.
5. **Make the thinnest slice first.** The first ticket must go end to end with the least behaviour: one route, one table, one read. That proves the architecture before the feature grows.
6. **Set dependencies.** Every ticket lists `Blocked by:` ticket numbers, or `none`. A ticket is ready only when all its blockers are closed; the dependency graph must be acyclic — check before publishing.
7. **Write acceptance criteria from the spec.** Copy the WHEN/THEN scenario; do not paraphrase it into a wish. One or two scenarios per ticket, each checkable by the test or command the ticket names.
8. **Add hints, not a design.** Files to change, risks, open questions. Hints guide the implementer; a ticket is not a re-written plan.
9. **Confirm the list and order with the person** before publishing. Read the titles, the dependency chain and the first slice out loud; collect corrections.
10. **Publish where the team works** (`setup-repo`): tracker issues in dependency order, or files `.orbit/task/<id>/tickets/NN-<slug>.md`. Update statuses as tickets move; the ticket, not a chat thread, is the state.

## Output

One ticket file per slice — `.orbit/task/<id>/tickets/NN-<slug>.md`:

```markdown
# NN: <title>
**Works after:** behavior from the user's point of view.
**Acceptance:** WHEN/THEN from the spec.
**Blocked by:** NN, NN | none.
**Hints:** files to change; risks.
**Status:** ready
```

Example:

```markdown
# 03: a customer can cancel an unpaid order
**Works after:** on the order page, "Cancel" is shown for status `new`; pressing it moves the order to `cancelled` and hides the button.
**Acceptance:** WHEN order.status = new AND user clicks Cancel THEN status becomes cancelled and `GET /orders/<id>` returns `cancelled`.
**Blocked by:** 01 (order table + read endpoint), 02 (status transitions).
**Hints:** `web/src/orders/OrderPage.tsx`, `src/api/orders.ts`; risk — race with payment webhook.
**Status:** ready
```

When published to a tracker, the same fields become issue body sections; `Blocked by:` becomes issue links or the task board's dependency feature.

## Check

The slicing is good when the list is executable and independent:

```bash
ls .orbit/task/<id>/tickets/
grep -L 'Blocked by:' .orbit/task/<id>/tickets/*.md      # must print nothing
grep -n 'WHO\|THEN\|WHEN' .orbit/task/<id>/tickets/*.md   # every ticket has a scenario
gh issue list --search "<feature>" --json number,title,state | jq 'length'
```

Pass rule: every ticket names a user-visible outcome and at least one WHEN/THEN acceptance; the dependency graph is acyclic and the thin slice is first; no ticket is a bare layer ("data layer"); every ticket except the first has a blocker or a stated reason to stand alone; no two tickets modify the same file in the same way. Record the published ticket ids in `.orbit/task/<id>/plan.md` so `run-plan` / `delegate-tasks` can consume them.

## Pitfalls

- **Layer tickets.** "Build the data layer" cannot be demonstrated and blocks everything; it is a task inside a slice, not a slice.
- **A "do everything else" last ticket.** It hides unknowns and becomes the project's second half. Re-cut it until it disappears.
- **Two tickets fight over one file.** Parallel work then serialises in review. Merge the slices or separate them by clear file ownership in Hints.
- **Publishing before agreeing.** Tickets in a tracker are visible commitments; confirm titles, order and scope with the person first, then publish.
- **Acceptance paraphrased.** "Works correctly" cannot be tested; copy the WHEN/THEN from the spec so the ticket and the code are checked by the same scenario.
- **Ignoring the mechanical refactor.** Spreading a rename across ten slices creates ten merge conflicts. One mechanical ticket first, behaviour frozen.
- **Dependency cycles.** A → B → A means the split is wrong: find the shared piece, extract it as a ticket, then re-link.
- **Too fine.** Twenty micro-tickets create coordination cost; if a ticket is under ~30 minutes of work, merge it into its neighbour.

## Portability

Pure planning method: Markdown files plus the team's tracker. Without `gh`/`glab`, create the same issues through the tracker UI or the team's CLI; without a tracker at all, the `.orbit/task/<id>/tickets/` files stay the source of truth and `run-plan` executes them in id order. No subagents or slash commands are required; the dependency and acceptance rules are what matter, not the medium.

## What's improved vs the source

- Publishes to the team's tracker per `setup-repo` (GitLab/Jira/GitHub) or to the shared `.orbit/`.
- Acceptance criteria come straight from the spec — the ticket is checked by the same scenario as the code.
- A self-check list of bad-slicing signs.
- Explicit mechanical-refactor exception and a "thinnest slice first" rule.
- Machine-checkable ticket contract (blocked-by, scenario present, acyclic graph) and a confirmation gate before publishing.

## Based on

- [Matt Pocock Skills](https://github.com/mattpocock/skills) — method «to-tickets» (MIT). Rewritten in our own words and improved — see "What's improved".

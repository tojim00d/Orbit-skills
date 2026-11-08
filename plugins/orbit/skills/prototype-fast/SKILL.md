---
name: prototype-fast
description: '[Orbit 2.1.3 Plan] A throwaway prototype for one question: logic or look, in an hour or two. Use when: «прототип», «проверим идею», «набросай вариант», «быстрый прототип»; prototype, spike, quick mockup, test the idea.'
---

# prototype-fast — a fast throwaway prototype to test an idea

> **Orbit · ② Build · step 2.1.3 Plan**
> **Input:** a disputed question ← `slice-tickets`
> **Output:** answer recorded in `design.md` → next `design-backend`
> **Works with:** `shape-idea`, `craft-frontend`, `plan-steps`
> **Shared rules:** reply in the user's language; generated artifacts default to English; stay in scope; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

Some questions are cheaper to answer with running code than with talk: "will this be convenient to use", "does the state model hold under real actions", "how does it actually look". A prototype is a deliberate one-question experiment, built in an hour or two and **thrown away**. If it becomes a half-product, it was not a prototype — it was unplanned production code.

## When to use

- The team argues about a UI flow or a state model and both sides are guessing.
- A requirement is understandable in prose but not verifiable until someone touches it.
- A look must be chosen between options that sound alike in a document.
- A technical assumption needs a quick probe: "does this library allow X", "is this interaction feasible".
- **Not** for shipping a feature. The output is a decision, not code: production work continues in `plan-steps` / `test-first`.

## Inputs

- the disputed question, written as one sentence with a yes/no or A/B shape ("Can a user undo an action after leaving the screen?");
- the relevant spec/design: `.orbit/task/<id>/`, `openspec/changes/<id>/`, or `.orbit/task/<id>/design.md`;
- the real code the prototype imitates — folder layout, state shape, API signatures: `rg -n "<entity>" src/ | head -30`;
- the run commands the repo already has: `README.md`, `package.json` scripts;
- the people who will judge the answer, and the timebox.

If the question is missing, do not build anything: ask one question and get it in writing. A prototype without a question becomes a demo nobody can decide on.

## Procedure

1. **Write the question down.** One sentence: what is being tested, what counts as "yes", what counts as "no". Put it at the top of the prototype file and in the task notes.
2. **Pick the kind.**
   - **Logic / state model** → one HTML file or script: buttons for actions, full state shown after each step, 2–3 guided scenarios that walk the disputed paths.
   - **Look** → several **radically different** variants of one screen on one route with a switch (`?v=1`, `?v=2`, `?v=3`). Variants that differ only in spacing are one variant.
3. **Choose the location.** `prototypes/<question>/` next to where real code will live, e.g. `prototypes/undo-flow/` or `app/prototypes/order-status/`. Never inside `src/` production paths.
4. **Label it loudly.** First line of every file: `PROTOTYPE, not for prod`. Use a name that cannot be mistaken for a feature (`proto-undo-flow.html`).
5. **Build the smallest thing that answers the question.** No tests, no error handling beyond making it run, no abstractions, no state persistence unless persistence *is* the question. Hardcode data.
6. **Make it runnable with one command** — `python3 proto.py`, `open index.html`, or an `npm run proto` script. If setup takes longer than the experiment, it is the wrong vehicle.
7. **Show state after every action or variant switch.** The prototype's job is to make the hidden model visible: current state, event log, selected variant. Someone must be able to judge without reading code.
8. **Run the 2–3 guided scenarios with the person** and write down the verdict after each: which action surprised them, which variant won, what the state model got wrong.
9. **Record the answer before deleting anything.** Append the answer and the decisions it implies to `design.md` (or the spec): what was tested, result, decision, rejected variants and the reason.
10. **Dispose.** Delete the prototype folder, or keep it labeled as a source of evidence; either way, the decision lives in the artifact, not in the prototype.

## Output

The answer in `design.md` (or `openspec/changes/<id>/` for spec-level decisions) — a section that a reader can use without opening the prototype:

```markdown
## Prototype: undo after leaving the screen (2026-11-08)

**Question:** can an action be undone after navigating away?
**Prototype:** `prototypes/undo-flow/` (deleted / kept, labeled `PROTOTYPE`).
**What was built:** action buttons A/B/C, full state after each click, 2 guided scenarios.
**Answer:** yes, but the undo must be an explicit stack, not "last action" — "last action" broke on scenario 2.
**Decision:** store `undo_stack[]` per session; API gets `POST /undo` with an id.
**Rejected:** variant 2 (toolbar button) — reviewers kept looking for it in the wrong place.
```

The prototype itself, when kept, is `prototypes/<question>/` with the `PROTOTYPE, not for prod` marker and a one-line link back to this section.

## Check

Done means a decision exists and the prototype has not leaked into production:

```bash
ls prototypes/<question>/ 2>/dev/null || echo "deleted — answer must be in design.md"
rg -n "PROTOTYPE, not for prod" prototypes/
rg -n "Prototype: <question>" .orbit/task/<id>/design.md
rg -n "proto-" src/ || echo "clean: no prototype files in src/"
```

Pass rule: `design.md` contains the question, the answer, the decision and the rejected options; the prototype either is deleted or carries the marker and lives outside production paths; no test or build config references it. Re-run the scenario that decided the answer with the person once; a decision nobody repeated is a rumour.

## Pitfalls

- **No single question.** "Prototype the settings page" produces a half-product and no decision. The question is written before the first file.
- **Leaking into `src/`.** A prototype imported by production code becomes untested production code. Keep it in `prototypes/` and delete it after recording.
- **Polishing.** Tests, error handling, abstractions and CSS systems consume the timebox and make the artifact look shippable. The prototype must look disposable.
- **Blind judgements.** If state or variants are hidden, the person judges the presentation, not the model. Always print full state after each action.
- **Overrunning the timebox.** One or two hours is the budget. If it does not fit, the question is too broad — narrow it ("undo" → "undo of deletion only") and restart.
- **Answer only in the prototype.** Deleting the folder without recording the decision loses the experiment; the artifact is `design.md`, the prototype is evidence.
- **Variants that are not different.** Three near-identical screens answer nothing. Make variants radical: different interaction model, not different padding.

## Portability

No Claude-only features: it is a temp folder, one command, and a Markdown answer. Without a browser, a terminal script or a static HTML file works the same; without subagents, run the guided scenarios inline and ask the person for a verdict. Any stack can host a prototype — `python3 -m http.server` for a static file, a scratch script for logic. The artifact contract does not change: decisions go to `design.md`, prototypes stay disposable.

## What's improved vs the source

- A mandatory single question and a timebox — the prototype doesn't turn into a half-product.
- The result is recorded in design/spec, not left "in the prototype".
- Two prototype kinds with concrete shapes (state walk-through vs radically different variants) and a location rule `prototypes/<question>/`.
- Explicit disposal step and leak checks (`src/` must stay clean), plus rejected-variant recording.
- Run-the-scenarios-with-the-person step, so the answer is based on observed use, not the builder's taste.

## Based on

- [Matt Pocock Skills](https://github.com/mattpocock/skills) — method «prototype» (MIT). Rewritten in our own words and improved — see "What's improved".

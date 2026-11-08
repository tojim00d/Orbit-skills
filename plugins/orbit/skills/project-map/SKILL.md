---
name: project-map
description: '[Orbit 3.1.1 Maps & diagrams] Interactive project map in one HTML: phases, steps in reading order, transitions, links to code. Use when: «карта проекта», «схема проекта», «как устроено», «интерактивная карта репозитория», «покажи как устроен проект»; project map, how the project works.'
---

# project-map — interactive project map

> **Orbit · ③ Operate · step 3.1.1 Maps & diagrams**  
> **Input:** graph / project knowledge ← `ship-k8s`  
> **Output:** `docs/project-map/project.html` → next `project-diagram`  
> **Works with:** `map-knowledge`, `run-spec-loop`, `onboard-people`  
> **Shared rules:** reply in the user's language per `speak-plain`; generated content defaults to English; stay in scope; artifacts go to `.orbit/` (contract: `ARTIFACTS.md` at the pack root).

Builds one standalone `project.html`:

- schema on top: blocks, phase bands ①②③, arrows with **step numbers in reading order**, highlighted transitions, routed-around backward links;
- below: step-by-step scenarios, tables, modules, links to files on GitHub or GitLab;
- clicking a block, chip or number opens a card with details and code links.

No external dependencies; opens with a double click and publishes as a static page (GitHub Pages, GitLab Pages, any web server). Text is in the audience's language; for a **static picture** use `project-diagram`.

## When to use

- Explain how a project works to a person: onboarding, hand-over, demo.
- Show a process by phases and steps: pipeline, lifecycle, end-to-end scenario.
- Show integrations between repositories and where in code each link lives.
- Keep "how it really works" next to the code and update it with the code.
- Not for a slide image (`project-diagram`) or a logo stack (`draw-stack`).

## Inputs

- `.orbit/knowledge/graph.json` and `.orbit/knowledge/overview.md` — best from `map-knowledge`; no sources — `reverse-app`;
- `.orbit/task/<id>/plan.md` — the scope the map must show;
- `assets/project-data.starter.js`, `references/authoring-guide.md`, live `example/project.html`;
- the repo: every block and link needs a real file.

If the graph is missing, run `map-knowledge` or build the block list from the repo and mark unverified facts as hypotheses.

### Language

Default: **English** — UI (`META.lang = "en"`: tabs, labels, cards) and all data texts. Start from `assets/project-data.starter.js`; live example — `example/`. Another language only if the user asks or the repo's docs use it: set `META.lang` to `"en"` or `"ru"` and write data texts in it (both starters and both examples ship with the skill).

### Files

| File | Contents | Edited |
|---|---|---|
| `project-data.js` | `META`, `N` blocks, `E` links, `CHIP`, `KIND`, `LAYOUT`, `PAGES` | **yes — the only one** |
| `project-schema.js` | auto-layout, routing, step numbers | no |
| `project-view.js` | tabs, block view, cards | no |
| `project.template.html` | styles and skeleton | no |
| `build.py` | inlines everything into one `project.html` | no |

No coordinates: the engine computes sizes, wrapping, rows, bands, arrow routes and numbers, so blocks never overlap, text stays in its box, and arrows never cut through blocks.

## Procedure

1. **Facts from code, not memory.** Read the repo (`map-knowledge` gives a graph with evidence; no sources — `reverse-app`). Per block: what it is, how it works (3–6 points), files. Per link: what flows and where.
2. **Copy the engine** from `assets/` into `docs/project-map/` (`project.template.html`, `project-schema.js`, `project-view.js`, `build.py`); base `project-data.js` on `project-data.starter.js`.
3. **Fill `project-data.js`** per the model below.
4. **Order in `LAYOUT`:** `top` — the entry; `bands` — phases top to bottom; inside a band, blocks in step order left to right.
5. **Sections in `PAGES`:** step-by-step scenarios (`flow`), tables, modules (`mod`), limitations.
6. **Build:** `python3 build.py [dir]`; fill `REPO_ROOTS` to verify linked paths.
7. **Look at it.** Open `project.html`, click blocks and arrows, switch to "Block view". Console errors (`LAYOUT: нет блока…`, `E: нет блока для связи…`) mean a key mismatch.
8. **Publish:** commit the sources and `project.html` together so the page never drifts from its data.
9. **Keep it alive.** Regenerate it in the same change as the code (`run-spec-loop`); a map updated "later" lies.

### Steps, phases and transitions — how the map reads

- **Phases.** Each band gets ①②③ (off: `LAYOUT.options.numberBands = false`).
- **Steps.** Numbers follow reading order: entry → phase ① left to right → transition ①→② → phase ② → … The number is identical on the schema, in the block view, the link list and the card.
- **Transition** — thick line, ringed number, bold label, tagged "переход ① → ②".
- **Backward link** (next loop, rework) — right corridor; in the block view dashed along the bottom; tagged "возврат".
- **Custom order:** `LAYOUT.steps = [E indices…]`.

### Data model `project-data.js`

```js
const GL = "https://github.com";                 // link base; GitLab works too
const REPO = { app: ["your-org/app", "main"] };  // alias -> [repository, branch]

// Block: [title, caption, what, [how], [[repo,path]], [[chip,label]]]
const N = {
  ui:  ["Web UI", "React · SPA", "Operator interface.", ["Routes — <code>src/routes.tsx</code>."], [["app", "web/src/"]]],
  api: ["API", "Go · HTTP", "Takes requests.", ["Entry — <code>cmd/api/main.go</code>."], [["app", "cmd/api/main.go"]], [["h", "Handlers"]]],
  db:  ["PostgreSQL", "store", "Orders and users.", [], [["app", "migrations/"]]],
};
const CHIP = { h: ["Handlers", ["Validation."], [["app", "internal/http/"]]] };

// Link: [from, to, kind, title, summary, [how], [[repo,path]]]
const E = [["ui", "api", "ctrl", "UI → API", "REST /api/v1", [], [["app", "web/src/api.ts"]]]];
const KIND = { ctrl: ["#6f8fc9", "requests"], data: ["#7aa36f", "data"] };   // 3–5 kinds

const LAYOUT = { top: ["ui"], bands: [["Server", "", ["api"]], ["Data", "", ["db"]]], labels: { 0: "REST" } };
const META = { title: "How App works", kicker: "App · project map" };
const PAGES = () => [["flows", "Flows", "What happens", "", flow([["User clicks Buy", "web/src/cart.tsx"]])]];
```

Text rules: one idea per point; exact names and paths in `<code>`; never show secrets (only the fact they exist). Details — `references/authoring-guide.md`; example — `example/project.html`.

## Output

`docs/project-map/project.html` plus five source files; sources are edited, HTML is generated.

```text
docs/project-map/
  project-data.js        # the only file you edit
  project-schema.js      # engine
  project-view.js        # engine
  project.template.html  # styles and skeleton
  build.py               # inliner + optional link check
  project.html           # build output, committed with the sources
```

## Check

```bash
cd docs/project-map && python3 build.py          # "built: …/project.html"
test -f project.html
grep -n '<script src=' project.html              # nothing: all inlined
grep -c 'href="https://github.com' project.html  # > 0: code links exist
grep -niE 'password|secret|token|10\.[0-9]+\.[0-9]+\.[0-9]+' project.html
```

Pass rule: build exits 0, the HTML is self-contained, no console warnings; numbers run 1, 2, 3 without jumps; phases/layers follow the flow top-down; ≤ ~15 links; every link opens the right branch and file; ≥1 end-to-end scenario in `PAGES`; hypotheses marked; the security grep prints nothing.

## Example

The quickest run uses the shipped engine and example (`HOW-TO-DEMO.md` has the 5-minute version):

```bash
SKILL="${CLAUDE_PLUGIN_ROOT}/skills/project-map"
python3 "$SKILL/assets/build.py" "$SKILL/example"   # 1. shipped example builds
mkdir -p docs/project-map && cd docs/project-map    # 2. copy the engine
cp "$SKILL/assets/"{project.template.html,project-schema.js,project-view.js,build.py} .
cp "$SKILL/assets/project-data.starter.js" project-data.js
# 3. edit project-data.js: blocks N, links E, LAYOUT bands
python3 build.py && open project.html
```

## Pitfalls

- **Facts from memory.** The map then documents an imagined system. Write what the code shows; mark the rest as a hypothesis.
- **A block key that does not match.** Keys in `E` or `LAYOUT` missing from `N` are skipped with a console warning: the picture looks plausible but is incomplete.
- **Tangled arrows.** Reorder blocks in a band (linked ones adjacent) or layers (flow top-down); drop secondary links into a section below.
- **Too many `KIND`s or jumping numbers.** More than 3–5 colours is noise; set `LAYOUT.steps` when numbers have gaps.
- **Coordinates or an uncommitted source.** The engine owns layout. Commit `project-data.js` and `project.html` together or the page cannot be regenerated.

## Portability

A browser is the only runtime; the engine is plain JavaScript inlined by `build.py` — no network, no package manager, no subagents. Any agent can fill `project-data.js` and run `python3 build.py`. Without `python3`, serve the four files plus data directly. Slash commands are optional; "make an interactive map" triggers the same method.

## What's improved vs the source

- The engine lays out the schema itself: no coordinates, no overlapping blocks, no arrows through blocks.
- Step numbers in reading order, phase numbers ①②③, highlighted transitions and routed-around backward links.
- The map is built from the knowledge graph (`map-knowledge`) and updated in the `run-spec-loop` cycle.

## Based on

- Orbit's own skill.

# How to demo project-map in 5 minutes

**English** · [Русский](HOW-TO-DEMO.ru.md)

## 1. Ready example (30 seconds)
Open `example/project.html` with a double click. Show:
- phases ①②③ top to bottom and step numbers 1→12 in reading order;
- thick ringed arrows — transitions between phases; the dashed "next loop" along the edge;
- click a block, chip or number — a card with details and links to code;
- the "Block view" tab — the same project as columns.

## 2. A map of any project
**Option A — one sentence.** In Claude Code, at the repository root:
```
Build a project map with the project-map skill in docs/project-map/
```
**Option B — by hand in 5 commands.** After install the skill lives in `${CLAUDE_PLUGIN_ROOT}/skills/project-map`:
```bash
mkdir -p docs/project-map && cd docs/project-map
cp "${CLAUDE_PLUGIN_ROOT}/skills/project-map/assets/{project.template.html,project-schema.js,project-view.js,build.py}" .
cp "${CLAUDE_PLUGIN_ROOT}/skills/project-map/assets/project-data.starter.js" project-data.js
# edit project-data.js: blocks N, links E, order LAYOUT
python3 build.py && open project.html
```

## 3. What to say in the demo
- "One HTML file: opens with a double click, publishes as a static page."
- "Only one data file is edited per project; the engine does the layout."
- "Step numbers follow reading order; phase transitions are visible at once."
- "Every block and link leads into the code — the map is checked, not drawn from memory."

## 4. For the cleanest schema
- Phases follow the flow top to bottom; inside a phase, blocks in step order left to right.
- Up to ~15 links on the schema; arrow labels 1–3 words.
- Need a picture for a slide — the `project-diagram` skill.

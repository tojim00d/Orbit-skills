# Project map — data authoring guide

Reference for `SKILL.md`: details of the data model, schema layout and page sections. The engine (`project-view.js`, `project-schema.js`, `project.template.html`) is copied as is; you edit only `project-data.js`. Text inside the data (titles, captions) is written in the audience's language.

## 1. Blocks — `N`
```
key: [title, caption, "what it is in one sentence", [how it works...], [[repo,"path"]...], [[chipKey,"label"]...]]
```
- **title** — short block name ("Orders.Api").
- **caption** — technical subtitle ("ASP.NET Core · process").
- **what it is** — one sentence: why the block exists.
- **how it works** — 3–6 points, one fact each. `<code>…</code>` allowed.
- **files** — `[repo-alias, "path"]` pairs. A path ending in `/` links to a directory tree, otherwise to a file.
- **chips** (optional) — buttons inside the block that open a `CHIP` card.
Block keys tie `N` (content), `LAYOUT` (order) and `E` (links). The key must match everywhere.

## 2. Links — `E`
```
[from, to, kind, "title", "summary", [how it works...], [[repo,"path"]...]]
```
Array order doesn't matter: **the engine numbers steps in reading order** (section 5a). The array index is used only in `labels` and `steps`.
- **from / to** — block keys from `N`; **kind** — key from `KIND` (arrow color); **title / summary** — in the link list and card; **how it works** — details; **files** — where the link lives in code.

## 3. Link kinds — `KIND`
```
const KIND = { ctrl: ["#c9a92b", "control"], ... };
```
Key → `[color, legend label]`. Keep 3–5 kinds or the schema gets noisy. Reference colors: control `#c9a92b`, deploy `#7aa36f`, tests `#6f8fc9`, secrets `#a57fd0`.

## 4. Chips — `CHIP`
```
chipKey: [title, [points...], [[repo,"path"]...]]
```
A chip is a detail that doesn't deserve its own block (e.g. "deletion queue" inside the API). A block links a chip with a `[chipKey, "label"]` pair in its sixth element.

## 5. Schema layout — `LAYOUT` (no coordinates)
```js
const LAYOUT = {
  top: ["user", "partner"],                 // "entry" row above the bands, centered
  bands: [                                  // bands top to bottom
    ["Edge", "entry into the system", ["gw"]],
    ["Services", "business logic", ["orders", "pay", "users"], "#e9f6ef"], // color optional
    ["Data", "stores", ["pg", "redis"]],
  ],
  labels: { 0: "HTTPS", 3: "events" },      // short arrow labels by E index (optional)
  footer: ["Shared libraries across all layers", "libs"], // dashed footer; second item = block to open (optional)
  topTitle: "Entry",                        // title of the top row in the block view (optional)
  steps: [4, 0, 2],                         // custom step order (optional)
  options: { W: 1200, maxW: 380, numberBands: true, numbering: "flow" },  // engine tuning (rarely needed)
};
```
What the engine does:
- **Blocks.** Width from text (200–380 px); long titles and paths wrap — at CamelCase, dots and slashes first, then by characters; an overlong chip label gets "…". All blocks in a row share the height.
- **Rows.** A band that fits one row stretches to the full width; more blocks → an even grid up to 4 columns.
- **Bands.** Band label in its own left column, never over blocks. Blocks not named in `LAYOUT` go to an "Other" band.
- **Arrows.** Right angles only. Neighbors in a row — a short horizontal arrow. Others go through the gap between rows, each in its own lane; far ones through a gap between blocks or the right corridor. Straight when possible.
- **Numbers and labels.** Step number — a colored circle on the longest segment; a `labels` caption is placed only where it doesn't hit blocks, other numbers or lines.

## 5a. Steps, phases and transitions
Bands are phases or layers. The engine numbers and connects them so the map reads as a process:
- **Phase numbers.** Bands get ①②③… before the title. A title already starting with a digit or ① isn't renumbered. Off: `options: { numberBands: false }`.
- **Step numbers in reading order.** Entry → links inside phase ① (left to right) → transition ①→② → links inside ② → … The number on the arrow, in the link list and in the card is the same.
- **Transition between phases** (link from a band to a later band) — thick line, number with a white ring, bold label. In the link list it's tagged "переход ① → ②" (transition).
- **Backward link** to an earlier phase ("next loop", rework) runs through the right corridor outside the blocks; in the block view — dashed along the bottom. Tagged "возврат" (return).
- **Custom order.** `LAYOUT.steps: [4, 0, 2]` — E indices in the wanted order; the rest follow automatically. `options: { numbering: "data" }` — number = position in `E`.
Tip: one phase = one band; inside a band put blocks in step order left to right. Then numbers go 1, 2, 3… with no jumps and transitions sit at band boundaries.

How to get a clean schema:
- Layers follow the flow: entry → logic → data, so most arrows go down.
- Inside a band put linked blocks next to each other: their links become short horizontal arrows.
- Up to ~15 links on the schema. More → move secondary ones to sections below or make a subsystem map.
- Arrow labels — 1–3 words; full text is in the link list and card.

## 6. Header and page sections — `META` and `PAGES`
```js
const META = { lang: "en",   // map UI language: "en" | "ru" — tabs, legend tags, card headings
               title: "How App works", kicker: "App · project map", footer: "Built from sources…",
               mapTitle: "Components and links", mapIntro: "…" };   // all but title optional
const PAGES = () => [
  // [id, kicker (menu item), title, intro, html]
  ["flows", "Flows", "What actually happens", "", `<div class="grid c2"><div class="card"><h3>Create</h3>${flow([["Step", "where in code"]])}</div></div>`],
];
```
The "Schema" section (two tabs + link list) is added by the engine first. The menu is built from sections.
Typical sections: **flows** — end-to-end scenarios step by step (the heart of the map), **contracts** — agreements between repositories, **modules** — what the code consists of, **data** — DB tables, **config / docs / limits** — deploy, docs, limitations.
Helpers: `flow(steps)`, `bullets(items)`, `files(paths)`, `mod(title, items, paths)`. Layout classes: `grid c2`, `grid c3`, `card`, `table-scroll`.

## 7. Build and check
```bash
python3 build.py            # inlines everything into project.html next to it
python3 build.py <dir>      # if the files are elsewhere
```
To make `build.py` check link paths — fill `REPO_ROOTS` in it (repo alias → path to its checkout). Missing sibling checkouts are skipped; a missing linked file fails the build.

## 8. Common mistakes
- A block key in `E` or `LAYOUT` doesn't match `N` → the link is skipped, with a browser console warning.
- Tangled arrows → reorder blocks in a band (linked ones adjacent) or layers (follow the flow top-down); drop secondary links from the schema.
- Too many kinds in `KIND` → noisy schema; reduce to 3–5.
- Facts from memory → the map lies. Write only what the code shows; mark the rest as a hypothesis or move it to "Limitations".

---
name: project-diagram
description: '[Orbit 3.1.2 Maps & diagrams] Static diagram of phases and steps (SVG/PNG) for slides and READMEs; blueprint and paper themes. Use when: «диаграмма картинкой», «схема этапов», «для слайда», «сделай картинку процесса», «схема для README»; static diagram, static process diagram.'
---

# project-diagram — static diagram of phases and steps

> **Orbit · ③ Operate · step 3.1.2 Maps & diagrams**  
> **Input:** phases and steps ← `project-map`  
> **Output:** `docs/diagrams/*.svg|png` → next `draw-stack`  
> **Works with:** `project-map`, `shape-idea`  
> **Shared rules:** reply in the user's language per `speak-plain`; generated content (maps, diagrams, comments, docs, artifacts) defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md` at the pack root).

Draws a **picture**: phases as columns left to right, steps as cards top to bottom, step numbers, transitions between phases and a dashed "next loop". Output: `SVG` (vector, for README/wiki) and, if a converter exists, a 2× `PNG` for slides and chat. **Language:** titles, captions and labels default to **English** in this pack (example `example/orbit.json`); another language only if the user asks or the audience needs it. The renderer has no built-in words — all text comes from the JSON.

`project-map` vs `project-diagram`:

| | project-map | project-diagram |
|---|---|---|
| Format | interactive HTML | static SVG/PNG picture |
| Layout | phases as bands top to bottom | phases as columns left to right |
| Clicks, cards, code links | yes | no |
| Where to show | onboarding, living docs | slide, README, email, chat |
| Style | light "yellow + ink" | "blueprint" (dark) or "paper" (light) |

## When to use

- A picture of a process, lifecycle, pipeline or staged architecture — for a slide, README, email.
- To show **order**: what follows what, where a phase transition is, where the loop returns.
- A "cover picture" for an existing `project-map` or a one-glance version of it.
- Not for a diagram of technologies and logos — that is `draw-stack`. Not for something people must click — that is `project-map`.

## Inputs

- the phases and steps: `.orbit/knowledge/overview.md` from `map-knowledge`, or `.orbit/task/<id>/plan.md` when the process was planned in an Orbit task;
- `references/spec.md` — the exact JSON fields;
- `example/orbit.json` and the rendered `example/orbit.svg` / `example/orbit.png` as a reference;
- the audience and medium (slide, README, print) to choose the theme and language.

If the phases are not written down, derive them from the existing `project-map` data (`project-data.js`: `LAYOUT.bands` and `E`) rather than starting from memory.

## Procedure

1. **Collect phases and steps.** 2–6 phases, 1–6 steps each. A step is a short name (1–3 words), a caption (what we get) and up to 3–4 labels (tools, skills, services); a transition label is 1–2 words. If one phase needs 8 steps, split it into two phases.
2. **Write the JSON** per `references/spec.md`. Links are optional: by default steps connect in order; custom links go in `edges`; a return to an earlier phase is drawn dashed along the bottom. Real JSON must not contain comments — the `//` lines in the spec are explanation only.
3. **Draw it:** the default theme is dark `blueprint`; `paper` is for print and light slides.

   ```bash
   python3 scripts/diagram.py diagram.json --png                  # dark blueprint theme
   python3 scripts/diagram.py diagram.json -o light.svg --theme paper --png
   ```

   PNG uses `rsvg-convert` if present, otherwise headless Chrome/Edge/Chromium. With neither, you get the SVG only — that is fine: any browser opens it.
4. **Check the converter path.** Look at the command's output; if it reports SVG-only, say so in the reply instead of promising a PNG.
5. **Look at the result.** Open the PNG or SVG and verify: text is not clipped, step numbers are consecutive, transition labels are readable, no arrow runs through a card.
6. **Keep the JSON next to the output.** The JSON is the source of truth; the SVG/PNG are generated. Without it the picture cannot be regenerated when a phase changes.
7. **Deliver the file and one line:** where it is and what it shows. Embed it in the README, slide deck or the review page from `publish-design-docs`.

Example of the JSON shape (the real file has no comments):

```json
{
  "title": "Orbit: from task to release",
  "subtitle": "phases left to right, steps top to bottom",
  "theme": "blueprint",
  "phases": [
    {"title": "Understand", "sub": "task and system",
     "steps": [{"id": "intake", "title": "Intake", "sub": "unambiguous requirements", "items": ["clarify-task", "shape-idea"]}]},
    {"title": "Build", "sub": "spec → code",
     "steps": [{"id": "spec", "title": "Spec", "sub": "agreed change", "items": ["write-spec"]}]}
  ],
  "edges": [
    {"from": "intake", "to": "spec", "label": "spec"},
    {"from": "spec", "to": "intake", "label": "next loop", "dashed": true}
  ],
  "footer": "Every loop leaves evidence"
}
```

## Output

`docs/diagrams/<name>.svg` and, when a converter exists, `docs/diagrams/<name>.png`; keep the source as `docs/diagrams/<name>.json`. The script also validates the input: duplicate `id`s and links to unknown steps are reported, so the JSON must be clean before the SVG is trusted. When the diagram is a cover for a map, link it from `docs/project-map/project.html` and from `.orbit/task/<id>/plan.md`.

## Check

```bash
python3 scripts/diagram.py diagram.json -o light.svg --theme paper --png
test -f light.svg                     # SVG always exists
python3 -c "import json;d=json.load(open('diagram.json'));print(len(d['phases']))"
grep -o '"id"' diagram.json | sort | uniq -d      # must print nothing: no duplicate ids
grep -c '<text' light.svg                          # >0: labels were rendered, not just boxes
```

Pass rule: the command exits 0, the SVG exists and opens, duplicate ids print nothing, and the visual review passes — no clipped text, numbers run 1, 2, 3 without a jump, every transition label is readable, and the theme matches the medium (paper for light slides/print, blueprint for dark slides/screens). If a PNG was requested and no converter exists, the pass condition is the SVG plus an explicit note.

## Pitfalls

- **Illegal JSON.** Copying the spec example with its `//` comments produces an unparseable file. Strip comments before running the script.
- **Duplicate step ids or an edge to a step that does not exist.** The script rejects both; a silent mismatch otherwise leaves a link undrawn. Keep ids short and unique.
- **An overfull phase.** Eight steps in one column make the caption unreadable; split the phase rather than shrinking the font.
- **More than 4 labels per card.** Long labels get "…", which hides the point. Move detail into the step caption.
- **Wrong theme for the medium.** `blueprint` on a printed page is a black rectangle; `paper` on a dark slide disappears. Ask where it will be shown.
- **Unwritable output path.** Writing the JSON but not the SVG/PNG because the directory is missing; create `docs/diagrams/` first.
- **Secrets on a picture.** No internal addresses, tokens or personal data — the file is easy to forward.

## Portability

Python standard library only — no Claude features, no subagents, no network. The renderer is a single `scripts/diagram.py`; run it inline in any agent. Without `rsvg-convert` or a headless browser you still get a valid SVG that opens in any browser. Slash commands are optional; asking for "a static diagram of the phases for a slide" in words triggers the same method.

## What's improved

- A separate static format for slides and READMEs with a different style (phase columns, dark and light themes).
- Python standard library only: works in air-gapped networks.
- The JSON is kept as the regenerable source next to the rendered file, so a changed phase does not mean redrawing by hand.
- Explicit validation pass (duplicate ids, unknown steps) before the picture is delivered.

## Based on

- Orbit's own skill.

---
name: rebuild-design
description: '[Orbit 2.3.5 UI] Recover a design system from a reference (migration or analysis) with own assets and a contrast check. Use when: «повтори дизайн», «перенеси интерфейс», «восстанови дизайн-систему», «миграция UI»; match design, recover design system, UI migration.'
---

# rebuild-design — recover a design system from a reference

> **Orbit · ② Build · step 2.3.5 UI**
> **Input:** screenshots / reference ← `craft-frontend`
> **Output:** `tokens.json` + `components.md` → next `test-first`
> **Works with:** `build-design-system`, `teardown-product`
> **Shared rules:** reply in the user's language per `speak-plain`; generated content defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

There is a reference — your old UI during a migration, or a product analyzed with
`teardown-product` — and the task is to produce tokens and component specs for **your** UI
with the same level of usability. The output is not a pixel clone: roles, scales and states
recovered from the reference, values replaced with your own palette and assets.

## When to use

- Migrating an existing product to a new stack and the old design must survive the move.
- Rebuilding someone else's product after `teardown-product` produced screens and a
  component list.
- The team has screenshots but no tokens: colors and spacing exist only as pixels.
- A rebrand is planned and the existing system must first be recovered as roles.
- Not when the reference is itself a design system with published tokens: read those files
  directly instead of re-deriving them.

## Inputs

- Reference screenshots: `.orbit/product/<name>/screens/` from `teardown-product`, or
  captures of the old app. List them: `ls -1 .orbit/product/<name>/screens/ | head -20`.
- The analysis: `.orbit/product/<name>/recon.md` and `features.csv` — screen ids, flows and
  the component inventory already recorded there.
- The old app, if it still runs: `git log --oneline -5` on the old branch, `npm run dev`,
  and screenshot the states the analysis missed.
- Brand assets and licences in the repo: fonts, icons, logos, illustration sources.
- If screenshots are missing, say so and capture them (Playwright or the browser) before
  deriving anything — do not invent values from memory.

## Procedure

1. **Inventory the reference.** One list of screens and one list of distinct components
   (`Button`, `Input`, `Table`, `Dialog`, `Card`, `Tabs`…). Mark which states each screen
   shows; states not visible anywhere go to the open-questions list.
2. **Recover color roles, not a hex list.** From the screenshots name the roles:
   background, surface, primary text, secondary/muted text, border, accent, statuses
   (danger, success, warning, info). Record a value for each role. For someone else's
   product, the values are **your own** palette with the same roles — never the original's
   colors.
3. **Recover scales.** Typography sizes and weights, spacing steps, radii, shadows — from
   observed sizes, rounded to a system (e.g. 4/8/12/16/24/32), not to odd pixel values.
   Check the scale reproduces the reference's rhythm: two sample screens rebuilt with
   tokens should look consistent.
4. **Recover component specs.** For each component: variants, sizes, states (default,
   hover, focus, pressed, disabled, loading, error) and accessibility expectations (role,
   keyboard, aria). Reuse the contract format from `build-design-system`.
5. **Write `tokens.json` in the same shape the shared checker reads** — flat color roles
   plus a `pairs` list, as in `tools/tokens.json`:
   ```json
   {
     "color": { "bg": "#ffffff", "surface": "#f6f7f9", "text": "#14171c",
                "text-muted": "#5b6470", "accent": "#2f5bea", "on-accent": "#ffffff",
                "danger": "#c62f2f", "success": "#1f7a4d" },
     "pairs": [["text", "bg"], ["text-muted", "bg"], ["on-accent", "accent"]],
     "type": { "base": {"size": 16, "line": 24, "weight": 400} },
     "space": [0, 4, 8, 12, 16, 24, 32, 48, 64],
     "radius": { "sm": 6, "md": 10, "lg": 16, "pill": 999 }
   }
   ```
6. **Check contrast before declaring the palette done.** Run the checker on the file, then
   on individual pairs that are not in the `pairs` list:
   ```bash
   python3 tools/contrast.py tokens.json
   python3 tools/contrast.py "#6b7280" "#ffffff"
   ```
   Exit code 1 means at least one pair fails AA — adjust the palette, not the threshold.
   Text needs 4.5:1; large text and UI borders 3:1.
7. **Replace assets, do not carry them over.** The original's logos, icons, illustrations
   and licensed fonts are not yours to reuse. Swap in your own or openly licensed assets;
   record the licence for every font and icon set in `components.md`.
8. **Record the derivation.** In `docs/design/components.md`, next to each component, note
   which reference screen it came from; keep the reference screenshots in
   `.orbit/product/<name>/screens/` and the conclusion in
   `.orbit/task/<id>/evidence.md`.

## Output

`tokens.json` + `components.md` (by convention `docs/design/components.md`, the same pair
`build-design-system` consumes for CSS generation and `build-screens` implements):

```markdown
# Design system — recovered from <reference>

## Tokens
Source: `.orbit/product/<name>/screens/` (2026-11-08 capture), roles only.
- bg #ffffff · surface #f6f7f9 · text #14171c · muted #5b6470
- border #e3e6ea · accent #2f5bea · danger #c62f2f · success #1f7a4d
- type base 16/24 400 · space 0,4,8,12,16,24,32 · radius 6/10/16
## Components
### Table (from screenshot `orders-list.png`)
- variants: comfortable / compact · states: default, loading, empty, error, no-permission
- a11y: header cells, sort state announced, row action via keyboard
### Dialog (from `edit-order.png`)
- states: default, loading, error · a11y: focus trap, Esc closes, labelled title
## Assets
Icons: <own set>, licence <…>; typefaces: <own>, licence <…>; no originals reused.
```

Next: `build-design-system` for CSS generation → `build-screens` for implementation;
`test-first` (per CATALOG) owns the code that consumes the tokens. Contrast and derivation
evidence go to `.orbit/task/<id>/evidence.md`.

## Check

```bash
python3 tools/contrast.py tokens.json                 # exit 0, 0 failing AA
jq -r '.color | keys[]' tokens.json                   # every role present
jq -r '.pairs[] | join(" on ")' tokens.json           # pairs are explicit
rg -n "reused|borrowed" docs/design/components.md       # empty = no originals carried over
test -s docs/design/components.md && grep -c "states:" docs/design/components.md
```

Pass rule: the checker reports `0 failing AA`; every color role has a value; each component
in `components.md` has variants, states and an accessibility line; no original logo,
illustration or licensed font is carried into the new system. Record the command → output
→ conclusion in `.orbit/task/<id>/evidence.md`; `test-first` and `prove-done` read it.

## Pitfalls

- **Cloning pixels instead of roles.** A 1:1 hex copy breaks the moment the palette must
  include dark mode; recover roles, then choose values.
- **Keeping the original's assets.** Logos, icons and licensed fonts are the fastest route
  to a legal problem; replace every one and record the licence.
- **Odd scales copied literally.** 19 px font, 13 px padding, 27 px rows: round to a system
  or the UI stays inconsistent after migration.
- **Missing states.** Screenshots show the happy path; states not visible must be specified
  from the pattern, not silently dropped.
- **Contrast checked after the redesign.** A palette that fails AA forces rework of every
  component; run the checker on `tokens.json` before components are implemented.
- **No derivation trail.** Without screen-to-component mapping, a reviewer cannot tell a
  recovered design from an invented one; record the source screen per component.

## Portability

Any agent with file tools and Python 3 can run this: `tools/contrast.py` is standard
library only; `jq` is optional (use `python3 -m json.tool tokens.json` if absent). Without
Playwright, capture references with the browser's screenshot tool. No subagents or slash
commands. The artifacts are plain JSON and Markdown, so the recovered system can be
continued by `build-design-system` in another session or by another agent.

## What's improved vs the source

- Works for migrating your own UI, not only for someone else's product.
- The result goes into the shared design-system pipeline (`build-design-system`) instead of
  living apart.
- Roles and scales are recovered before values; contrast is a gate, not a postscript.
- Assets are explicitly replaced and licences recorded, and each component keeps its
  source-screen trail.

## Based on

- [Replica](https://github.com/Jakeschincariol/replica-skill) — method «replica-design» (MIT). Rewritten in our own words and improved — see "What's improved".
- Helper files in `tools/` are taken from the source unchanged; licences: `tools/LICENSE.upstream`.

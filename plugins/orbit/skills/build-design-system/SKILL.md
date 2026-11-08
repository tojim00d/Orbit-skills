---
name: build-design-system
description: '[Orbit 2.3.2 UI] Three-level tokens and component specs with all states. Use when: «дизайн-система», «токены», «собери дизайн-систему», «спецификация компонентов»; design tokens, component specs, palette system, component states.'
---

# build-design-system — tokens and component specs

> **Orbit · ② Build · step 2.3.2 UI**
> **Input:** UI direction ← `pick-ui-style` (`.orbit/task/<id>/ui-direction.md`)
> **Output:** `tokens.json` + `tokens.css` + `docs/design/components.md` → next `style-ui`
> **Works with:** `pick-ui-style`, `rebuild-design`, `craft-frontend`
> **Shared rules:** reply in the user's language per `speak-plain`; generated content defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

`pick-ui-style` chose a direction; this skill turns it into a system. The UI is assembled
from the same bricks: a screen is a composition, and a rebrand is a token edit. Three levels, in this order: primitives, semantic, component.
The hard rule that makes the system useful: **components use semantic tokens only.**

## When to use

- The direction exists and implementation starts: screens would otherwise invent colors
  and spacing one by one.
- A new product or a fresh frontend needs its visual vocabulary before the first screen.
- A rebrand or a theme change must touch one file instead of every component.
- An existing UI has raw hex values and ad-hoc paddings, and needs a component contract.
- Not for a throwaway prototype (`prototype-fast`): tokens cost more than they save there.

## Inputs

- `.orbit/task/<id>/ui-direction.md` — style, palette roles, font pair, density, UX rules.
- Repo state: `globals.css`, `tailwind.config.*`, the components directory, any existing
  token file. Run `rg -n "#[0-9a-fA-F]{6}|padding:|border-radius:" src/ | head -40` to see
  what is already hardcoded.
- Helper files in this skill's `tools/`: `tools/templates/design-tokens-starter.json`
  (starting point), `tools/references/` (primitives, semantic tokens, component tokens,
  token architecture, tailwind integration, states and variants).
- Corporate brand book when the product is an internal company system.
- If the direction is missing, ask for it; do not silently invent a palette. If only a
  brand color exists, derive the scale and mark each derived value `[assumed]` in the
  output so a human can veto it.

## Procedure

1. **Read the direction and inventory the repo.** List the colors, sizes, radii and
   shadows already in use. Values that appear in the reference or brand book become
   primitives; values that are one-off become the reason for a component token.
2. **Write primitives into `tokens.json`.** Raw values without meaning: palettes
   (`blue-50…900`), size scale, radii, shadows, durations. Start from the starter file:
   ```json
   {
     "primitive": {
       "color": { "blue": { "500": { "$value": "#3B82F6", "$type": "color" },
                            "600": { "$value": "#2563EB", "$type": "color" } } },
       "space": { "1": { "$value": "0.25rem", "$type": "dimension" },
                  "4": { "$value": "1rem", "$type": "dimension" } }
     }
   }
   ```
3. **Map semantic roles on top of primitives.** Purpose, not appearance:
   `color.bg.surface`, `color.text.muted`, `color.border.focus`, `color.status.danger`,
   `color.accent`. Every role points at a primitive (`$value: "{color.blue.600}"`). No
   component may reference `blue-600` directly after this step.
4. **Add component tokens only for special cases:** `button.primary.bg`,
   `input.border.error`. A component token that just repeats a semantic role is noise —
   keep the component layer small.
5. **Generate CSS variables and wire them once.** Run
   `node tools/scripts/generate-tokens.cjs --config tokens.json -o tokens.css` (paths are
   relative to this skill directory; working directory is the project root). Import
   `tokens.css` in the app entry once; add the dark-theme semantic block under `.dark`.
6. **Spec every component.** For each component record variants, sizes, the seven states
   (default, hover, focus, pressed, disabled, loading, error) and accessibility: role,
   keyboard behaviour, aria attributes. Reference `tools/references/component-specs.md`
   and `tools/references/states-and-variants.md` for the tables.
7. **Check contrast pairs before declaring the palette final.** Use the shared checker:
   `python3 <skills-dir>/rebuild-design/tools/contrast.py "#5b6470" "#ffffff"` per
   text/background pair. Normal text needs 4.5:1; large text and UI borders need 3:1.
8. **Prove there are no raw values in code.** Run
   `node tools/scripts/validate-tokens.cjs --dir src/` and fix every finding, or record a
   justified exception next to the component spec.
9. **Publish the component contract** in `docs/design/components.md` using the template
   below, and link it from the repo's design docs/index.
10. **Record evidence and status.** Append command → output → conclusion to
    `.orbit/task/<id>/evidence.md`; tick the item in `.orbit/task/<id>/plan.md`.

## Output

Three files, plus the evidence entry:

- `tokens.json` — primitives, semantic roles, the few component tokens, and a `pairs`
  list (text role → background role) used by the contrast check.
- `tokens.css` — generated CSS variables; never edited by hand, regenerate it.
- `docs/design/components.md` — the contract every screen implements:

```markdown
# Design system — <product>
Tokens: `tokens.json` (v<N>) · `tokens.css`
## Button
- variants: primary, secondary, ghost, destructive
- sizes: sm 32px, md 40px, lg 48px, icon 40px
- states: default, hover, focus, pressed, disabled, loading, error
- tokens: bg=color.accent, fg=color.on-accent, radius=radius.md
- a11y: role=button, Enter/Space activate, aria-disabled when disabled, focus ring 3:1
## Input
- variants: text, textarea, select, checkbox
- states: default, hover, focus, disabled, loading, error
- a11y: label always present, error described by aria-describedby, focus visible
```

Next: `style-ui` (shadcn/ui + Tailwind) or `craft-frontend` for custom pages.

## Check

Run from the project root; all must pass:

```bash
node tools/scripts/generate-tokens.cjs --config tokens.json -o tokens.css  # idempotent
node tools/scripts/validate-tokens.cjs --dir src/                          # exit 0
python3 <skills-dir>/rebuild-design/tools/contrast.py tokens.json          # 0 failing AA
rg -n "#[0-9a-fA-F]{6}" src/ --glob '!**/tokens.css'                       # no raw hex
test -s docs/design/components.md && grep -c "states:" docs/design/components.md
```

Pass rule: the generator produces no unexpected diff, the validator exits 0, the contrast
checker reports `0 failing AA`, the raw-hex search is empty (documented exceptions
excluded), and every component in `components.md` lists all seven states plus role and
keyboard behaviour. Record the verdict in `.orbit/task/<id>/evidence.md`; `prove-done`
reads it later.

## Pitfalls

- **Components reaching into primitives.** `bg-blue-600` in a component breaks theming:
  the rebrand has to touch every file. Enforce semantic roles only.
- **A token file that is really a color list.** If `tokens.json` has no semantic layer,
  dark mode and rebrands are impossible; build the mapping before generating CSS.
- **Skipping states.** A button spec with only default and hover ships an invisible focus
  ring and a disabled state that still looks clickable. Seven states, every component.
- **Editing `tokens.css` by hand.** The next generation overwrites it; edit
  `tokens.json` and regenerate.
- **Validating the wrong directory.** Scanning `src/` while components live in `app/` or
  `packages/ui/` reports success for unscanned code; pass the real component roots.
- **Contrast checked on the palette only.** Text on `surface` and text on `bg` are
  different pairs; check each pair actually used, in both light and dark themes.
- **A `components.md` nobody enforces.** If screens import ready components that are not
  in the contract, the doc is fiction: a new component goes into the system first.

## Portability

Any agent with file tools can run this skill. The generator and validator are Node
scripts (`node tools/scripts/...`); the contrast checker is Python 3, standard library
only. Without Node, hand-write the CSS variables from `tokens.json` and keep the same
artifact names so `style-ui` and `craft-frontend` still find them. No subagents or slash
commands are involved; the skill is instructions plus three files.

## What's improved vs the source

- The rule "components use semantic tokens only" and a mandatory seven-state component
  list are enforced by the check, not left as advice.
- "No raw values in code" is a step with a command (`validate-tokens.cjs`), not a tip.
- A contrast gate runs on the token pairs before the palette is called final.
- The component contract lives in `docs/design/components.md` and evidence in
  `.orbit/task/<id>/evidence.md`, so later screens can be reviewed against it.

## Based on

- [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) — method «design-system» (MIT). Rewritten in our own words and improved — see "What's improved".
- Helper files in `tools/` are taken from the source unchanged; licences: `tools/LICENSE.upstream`.

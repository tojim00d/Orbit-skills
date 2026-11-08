---
name: style-ui
description: '[Orbit 2.3.3 UI] UI on shadcn/ui + Tailwind on top of tokens; accessibility and responsiveness. Use when: «shadcn», «tailwind», «сверстай», «собери компоненты на tailwind»; shadcn tailwind, accessible components.'
---

# style-ui — build the UI with shadcn/ui and Tailwind

> **Orbit · ② Build · step 2.3.3 UI**
> **Input:** tokens ← `build-design-system`
> **Output:** UI components → next `craft-frontend`
> **Works with:** `build-design-system`, `test-flows`
> **Shared rules:** reply in the user's language per `speak-plain`; generated content defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

Fast assembly of an accessible UI from ready components (shadcn/ui on Radix) and Tailwind
utilities, on top of the tokens from `build-design-system`. The point is not to restyle
components from the outside: the generated component copies belong to the project and are
edited to match the design system, so tokens and components stay one system.

## When to use

- Tokens and component specs exist (`docs/design/components.md`) and screens must be built
  quickly on a React stack.
- The project already uses Tailwind and shadcn/ui, or a standard React + Tailwind app is
  the agreed stack (`choose-stack`).
- Accessibility must be right by default: focus traps, labels, table semantics.
- Not when the stack is Vue, Svelte or plain HTML: keep the token contract and use the
  framework's component primitives instead of shadcn.

## Inputs

- `tokens.json` / `tokens.css` and `docs/design/components.md` from `build-design-system`.
- The project: `package.json`, `tailwind.config.*`, `components.json`, `src/` or `app/`.
  Check the setup with `npx shadcn@latest --version` and `npx tailwindcss --help` or look
  in `package.json`; `test -f components.json` tells you whether shadcn is initialised.
- The screen and flow to build: ids `S…` / `F…` from the analysis or the spec.
- References in this skill's `tools/references/`: `shadcn-components.md`,
  `shadcn-theming.md`, `shadcn-accessibility.md`, `tailwind-utilities.md`,
  `tailwind-responsive.md`, `tailwind-customization.md`, `canvas-design-system.md`.
- If the project has no Tailwind or shadcn yet, installing them changes the repo — ask for
  consent first (step 1), never install silently.

## Procedure

1. **Check the project, then install with consent.** Tailwind present and shadcn
   initialised? If not: `npx shadcn@latest init` (it writes `components.json` and the CSS
   variables), then confirm with the person. Do not mix in a second UI kit.
2. **Map tokens to the theme.** Either generate the Tailwind theme from tokens with
   `python3 tools/scripts/tailwind_config_gen.py --framework nextjs --colors brand:#2f5bea`
   (or `--validate-only` first; `--js` for a JS config, `--fonts`, `--spacing`,
   `--breakpoints` for the rest of the scale), or keep the shadcn CSS variables in
   `globals.css` and set the semantic values from `tokens.json`. Add the dark theme as a
   semantic block under `.dark` — same role names, different values.
3. **Add only the components the screens need:**
   `npx shadcn@latest add button dialog table form` (or
   `python3 tools/scripts/shadcn_add.py button dialog table form --dry-run` first, then
   without `--dry-run`). Components are copied into the path configured in
   `components.json` — usually `components/ui/`.
4. **Edit the copies to the design system.** Change the component's variant styles, radii,
   spacing and focus ring to the token values; do not override from page-level class names.
   A component that needs a new look gets a new variant in the system, not a `!`-class at
   the call site.
5. **Lay out with utilities on the token scale.** Mobile from the start: base styles for
   the small screen, then `sm: md: lg:`; grid and spacing values come from the token scale,
   not from arbitrary numbers. Check one screen at 390 px and 1440 px.
6. **Build accessibility in, not after:** every form control has a `<label>` and an error
   message wired with `aria-describedby`; dialogs trap focus and close on `Esc`; tables use
   real `<thead>`/`<th>`; icon-only buttons have an accessible name.
7. **Verify with `test-flows`:** Playwright screenshots in both themes and at a mobile
   width; the main flow runs end to end. `npx playwright test tests/flows/` should pass,
   and the snapshots should show the design system, not the shadcn defaults.
8. **Lint and typecheck** before handing off: `npm run lint` and `npm run typecheck` (or
   the repo's scripts). Fix errors in the component copies, not by disabling rules.
9. **Record the result** in `.orbit/task/<id>/evidence.md` (commands, pass counts,
   screenshot paths) and tick the screen items in `.orbit/task/<id>/plan.md`.

## Output

UI components in the project (paths per `components.json`, usually `components/ui/` and
the screen routes), plus the evidence entry:

```markdown
## 2026-11-08 16:10 — /orders components
$ npx shadcn@latest add button dialog table form  → 4 components added
$ npm run lint → 0 errors; $ npm run typecheck → 0 errors
$ npx playwright test tests/flows → 3 passed (light, dark, mobile 390px)
Edited: components/ui/button.tsx (primary uses color.accent; focus ring 3px)
Edited: components/ui/dialog.tsx (focus trap + Esc verified by test)
Evidence screenshots: test-results/orders-light.png, orders-dark.png, orders-mobile.png
```

Next: `craft-frontend` for the page-level composition and tone.

## Check

```bash
test -f components.json && npx shadcn@latest add --help >/dev/null  # shadcn initialised
npx shadcn@latest add --help >/dev/null                        # CLI available
rg -n "bg-blue-|text-gray-|p-\[" src/ components/ | head       # no raw palette values
npx playwright test tests/flows/                              # flows pass
npx playwright test tests/visual/ --project=dark              # dark theme snapshot
```

Pass rule: both themes render from semantic tokens (no raw palette classes in components);
the main flow passes Playwright in light, dark and mobile widths; forms have labels and
error messages; dialogs trap focus and close on `Esc`; tables have header semantics. A
failing visual snapshot means a token mapping gap — fix the theme, not the snapshot. Record
the verdict in `.orbit/task/<id>/evidence.md`.

## Pitfalls

- **Overriding components from the outside.** A pile of `className` overrides at call sites
  makes the design system unenforceable; edit the copied component or add a variant.
- **Half a theme.** Mapping light values and leaving dark mode to defaults produces
  unreadable screens; both blocks come from the same semantic roles at the same time.
- **Installing a whole component library.** `add --all` drags in unused code and styles;
  add only what the screens need.
- **Arbitrary Tailwind values.** `mt-[13px]` and `text-[#2563eb]` bypass tokens; use the
  generated scale and semantic color classes.
- **Div-based tables and controls.** A `<div>` table loses header semantics and keyboard
  navigation; use the real element or the component's accessible primitive.
- **Accessibility checked only by eye.** Focus traps and labels break silently; the
  Playwright flow must exercise the dialog and the form error path.
- **Checking one width and one theme.** Mobile-first layout and dark mode are where shadcn
  defaults leak through; screenshots in both are part of done.

## Portability

Any agent with Node and the repo can run this; the helper scripts are Python 3 and call the
shadcn CLI. In a non-React project, keep steps 2, 5 and 6 (tokens → theme, utility layout,
accessibility) and substitute the framework's primitives for shadcn. No subagents or slash
commands: the skill is a sequence of CLI commands plus edits to files already in the repo.
The design contract lives in `docs/design/components.md`, not in this conversation.

## What's improved vs the source

- shadcn components are edited to the design system, not overridden from outside.
- Checking both themes and a mobile size via `test-flows` is a mandatory step.
- The token → theme mapping is a command with a `--validate-only` preflight, not a manual
  copy of hex values.
- Lint/typecheck and evidence are part of the handoff, so the next skill inherits a green
  build rather than a screenshot.

## Based on

- [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) — method «ui-styling» (MIT). Rewritten in our own words and improved — see "What's improved".
- Helper files in `tools/` are taken from the source unchanged; licences: `tools/LICENSE.upstream`.

---
name: craft-frontend
description: '[Orbit 2.3.4 UI] Expressive UI without the template look: direction before code, typography, composition. Use when: «красивый интерфейс», «лендинг», «сделай не шаблонно», «наведи визуальный лоск»; frontend design, make it not look like a template.'
---

# craft-frontend — expressive UI without the "template" look

> **Orbit · ② Build · step 2.3.4 UI**
> **Input:** a UI task ← `style-ui`
> **Output:** pages and components → next `rebuild-design`
> **Works with:** `build-design-system`, `test-flows`
> **Shared rules:** reply in the user's language per `speak-plain`; generated content defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

Pages and components that look designed, not generated: deliberate typography, composition, motion and detail. Any stack — React, Vue, plain HTML/CSS — because the method is about decisions, not a library. The failure mode is the default: centered hero, three identical cards, purple gradient, system font.

## When to use

- A page or feature works but looks like every other generated app.
- A landing page, marketing page or a product screen where presentation is the deliverable.
- A redesign pass after the layout exists but the tone is missing.
- Not when the design system already dictates the exact component: use it, and use this skill only for the layout and page-level composition.

## Inputs

- `.orbit/task/<id>/ui-direction.md` — style, palette roles, fonts, density from `pick-ui-style`.
- The design system from `build-design-system`: tokens, `docs/design/components.md`. Any
  direction you pick lives **inside** that system, not instead of it.
- The screen and flow ids (`S…`, `F…`) from the analysis or the spec, so the page has a
  job to do; a beautiful page that misses the flow is decoration.
- The live app: `npm run dev` (or the repo's dev command); open the route you are changing.
- Existing styles: `rg -n "font-family|max-width|grid-template" src/ | head -40` to avoid
  fighting patterns the team already uses. If an input is missing, ask one question; do
  not invent a brand tone.

## Procedure

1. **Read the direction and the flow.** Write one sentence: who looks at this page and what
   they must do next. If the sentence needs two clauses, the page is doing two jobs.
2. **Fix the direction before opening the code editor.** Fill the craft-direction block
   (template in Output): purpose, audience, tone in one phrase, and one memorable detail.
   Append it to `.orbit/task/<id>/ui-direction.md` so the choice survives the session.
3. **Pick typography.** One or two fonts; an expressive size scale (not six near-identical
   sizes); headings with character; body line length 60–80 characters
   (`max-width: 68ch`). Load fonts with `display: swap` and a system fallback.
4. **Compose.** A visible grid, spacing on the token scale, deliberate asymmetry or a
   strong focal point; not everything centered. Check the page at 1440 px and 390 px wide
   before adding polish.
5. **Use color with a hierarchy.** One dominant surface family plus one accent. The accent
   marks the main action and statuses only; everything else is neutral.
6. **Design the states, not just the happy path.** Empty, loading, error and no-permission
   states are compositions too; visible focus ring; disabled controls look disabled.
7. **Add motion that means something.** 150–250 ms, `ease-out`, animate appearance or a
   state change — not everything on scroll. Respect
   `@media (prefers-reduced-motion: reduce)`.
8. **Avoid the template tells:** purple gradients everywhere, identical 3×3 card grids,
   emoji used as icons, "hero + three features" with no reason, stock-looking illustrations.
9. **Verify with screenshots on desktop and mobile** (`test-flows`), check contrast,
   keyboard order and the tone sentence from step 2. Record the result in
   `.orbit/task/<id>/evidence.md` and tick the page in `.orbit/task/<id>/plan.md`.

Use `npx playwright screenshot --device="Desktop Chrome" "http://localhost:5173/<route>" /tmp/desktop.png`
and the same with `--device="iPhone 13"` for the mobile pass. If Playwright is not set up,
use the browser's device toolbar and save both screenshots.

## Output

Code in the repo (pages, components, styles) plus two artifacts:

```markdown
## Craft direction — /orders
- purpose / audience: an operator clears exceptions in under a minute
- tone: dense engineering, calm
- memorable detail: monospace order ids joined by hairline rules
- type: Inter 400/600; display 28/34; body 15/22, 68ch measure
- color: neutral surfaces; accent only on "Approve" and status dots
- motion: 180ms ease-out on row expand; instant under reduced-motion
- states: empty ledger, skeleton rows, error banner with retry, read-only role
```

Evidence in `.orbit/task/<id>/evidence.md`:

```markdown
## 2026-11-08 15:40 — /orders craft pass
$ npx playwright test tests/visual  → 2 passed (desktop, mobile)
Contrast: #5b6470 on #ffffff = 6.00:1 AA; focus ring 3.2:1
Keyboard: Tab → search → table → row action → pagination, order matches visual
Tone check: dense engineering visible? yes — mono ids, hairlines, tight rows
```

Next: `rebuild-design` when the direction must be recovered as tokens, otherwise continue
building screens.

## Check

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/orders   # 200
npx playwright test tests/visual                                      # screenshots pass
python3 <skills-dir>/rebuild-design/tools/contrast.py "#5b6470" "#ffffff"  # 0 failing AA
rg -n "prefers-reduced-motion|focus-visible" src/                      # both present
```

Pass rule: desktop and mobile screenshots exist and show the stated tone; every interactive
element has a visible focus state; text/background pairs pass AA (4.5:1, or 3:1 for large
text and UI borders); the empty/loading/error states are rendered, not left to defaults.
Record the verdict in `evidence.md` — `prove-done` reads it as the proof for this step.

## Pitfalls

- **Direction chosen after the code.** Retrofitting tone onto a finished layout means a
  rewrite; write the five-line direction card first.
- **Direction fighting the design system.** Inventing a new accent or font because it looks
  nicer breaks tokens and accessibility; extend the system instead, with a token change.
- **Decorative motion.** Scroll-triggered animation on every block delays the main action
  and ignores reduced-motion users. Animate what changes meaning.
- **Contrast checked in the mockup only.** Text over gradients and photos fails in code;
  check the actual rendered pairs.
- **Screenshot only at desktop width.** Mobile reveals the centered column, clipped table
  and 12 px tap targets; both widths are the deliverable.
- **Emoji as iconography.** Renders differently per platform and cannot be themed or
  labelled; use the project's icon set.
- **Polishing before the flow works.** A gorgeous page that cannot complete `F01` is a
  prototype; make the flow work, then make it look designed.

## Portability

Any agent with file tools and a browser can run this. Without Playwright, screenshots come
from the browser or the repo's existing test runner; the contrast checker is Python 3,
standard library only. No subagents or slash commands. The craft-direction block is plain
Markdown appended to `.orbit/task/<id>/ui-direction.md`, so another session can pick up the
same taste decisions.

## What's improved vs the source

- Direction is fixed before code and coexists with the company design system instead of
  fighting it.
- Concrete numbers (motion durations, line length, breakpoints) and a list of patterns to
  avoid replace "make it pretty".
- A mandatory screenshot and accessibility check, with evidence in the shared log.
- The five-minute direction pass is written down, so the next page starts from the same tone.

## Based on

- [Skills by Anthropic](https://github.com/anthropics/skills) — method «frontend-design» (Apache-2.0). Rewritten in our own words and improved — see "What's improved".

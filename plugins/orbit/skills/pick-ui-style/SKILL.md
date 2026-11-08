---
name: pick-ui-style
description: '[Orbit 2.3.1 UI] Style, palette, fonts and UX rules for the product type from a decision database. Use when: «какой стиль интерфейса», «подбери палитру», «UX дашборда», «выбери шрифты»; UI style, palette, dashboard UX, font pairing.'
---

# pick-ui-style — choose visual style and UX decisions for the product

> **Orbit · ② Build · step 2.3.1 UI**
> **Input:** a UI task
> **Output:** `.orbit/task/<id>/ui-direction.md` → next `build-design-system`
> **Works with:** `craft-frontend`, `build-design-system`
> **Shared rules:** reply in the user's language per `speak-plain`; generated content defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

Before a single layout, the decisions: style, palette, fonts, density, screen patterns and
accessibility rules. Not "whatever the agent likes" — a pick by product type from the
decision database in `tools/data/`. The output is a direction another skill can implement
without guessing.

## When to use

- A new UI exists only as "make it look good" — style and palette are still open.
- The product type changes the answer: an internal analytics dashboard and a customer
  landing need different density, color and UX rules.
- A redesign must be justified to a person ("why this palette?") rather than asserted.
- An internal company system must fit the corporate brand book and still work.
- Not when the design system and style are already fixed and only one screen changes; then
  go straight to `style-ui` or `craft-frontend`.

## Inputs

- The task brief: `.orbit/task/<id>/brief.md` — audience, done-criteria, constraints.
- Product context: type (internal tool, customer app, landing), industry, where it runs
  (web, mobile, desktop), users' environment and skill level, brand constraints.
- The database in this skill's `tools/data/`: `styles.csv`, `colors.csv`,
  `typography.csv`, `ui-reasoning.csv`, `ux-guidelines.csv`, `landing.csv`,
  `app-interface.csv`, `charts.csv`, `motion.csv`, `products.csv`, `stacks/*.csv`.
  References: `tools/references/quick-reference.md` and `pro-rules.md` (native/mobile UI;
  when the UI "doesn't look professional").
- Existing repo brand: `doc/design/` files, a brand book, or the current site's tokens.
- Missing input: ask one question about audience and product type; everything else can be
  proposed and marked `[assumed]` in the direction file.

## Procedure

1. **Write the context line.** Product type, audience, industry, platform, brand
   constraints. Internal company systems align with the corporate brand book first; a
   customer-facing product may diverge from it.
2. **Search the database from several angles.** Paths are relative to this skill's
   directory; the working directory is the project root:
   ```bash
   python3 tools/scripts/search.py "internal analytics dashboard finance" --design-system -p "Name"
   python3 tools/scripts/search.py "dashboard" --domain ux
   python3 tools/scripts/search.py "table" --stack react
   python3 tools/scripts/search.py "data table" --domain style --max-results 5
   python3 tools/scripts/search.py "calm editorial" --domain typography --json
   python3 tools/scripts/search.py "<query>" --design-system --variance 3 --motion 2 --density 8
   ```
   Domains available: `style color chart landing product ux typography icons gsap react web
   google-fonts`; stacks include `react nextjs vue svelte astro shadcn html-tailwind`,
   mobile and desktop stacks. The `--variance`, `--motion`, `--density` dials tune the
   recommendation from centered/minimal (1) to bold/asymmetric and dense (10).
3. **Shortlist two candidates, then choose one.** For each: style, palette roles, font
   pair, density, and the trade-off in one line. Pick by product type and audience, not by
   your own preference; if the choice is genuinely even, ask the person with the two
   options and a recommendation.
4. **Turn color into roles.** Background, surface, text, muted text, border, accent and
   status colors — each with a value and its use. "Blue" is not a role.
5. **Choose the font pair and density.** One or two families, a size scale, and a density
   suited to the task (a dashboard is dense; a landing is spacious). Note the licences
   (`google-fonts.csv`, `google-font-licenses.json`) — no unlicensed webfonts.
6. **Write 3–5 key UX rules for this product**, specific enough to implement: "tables:
   sticky header, sorting, empty state with a primary action"; "forms: inline validation,
   first error focused"; "mobile: one column, bottom action bar".
7. **Check accessibility before committing the palette:** text contrast ≥ 4.5:1
   (`python3 <skills-dir>/rebuild-design/tools/contrast.py "#5b6470" "#ffffff"`), visible
   focus, click targets ≥ 24 px (44 pt iOS / 48 dp Android for native). Add the measured
   ratio next to each text/background pair.
8. **Persist the recommendation and write the direction file.** Optionally persist the
   generated master with `--persist --output-dir <dir>` (a `design-system/<project-slug>/`
   tree appears there); point it at `.orbit/task/<id>/` or at the repo path the team uses
   for design docs. Then write `.orbit/task/<id>/ui-direction.md` using the template
   below and send the person a one-line summary.
9. **Hand off.** Next skill reads the direction file, not this conversation:
   `build-design-system` turns it into tokens and component specs.

## Output

`.orbit/task/<id>/ui-direction.md` — the decision record, with the database entry it came
from:

```markdown
# UI direction — <product>
**Context:** internal analytics tool · finance analysts · desktop web · corporate brand book
**Style:** <style from database> — why it fits the task
**Palette (roles):**
- bg #ffffff · surface #f6f7f9 · text #14171c · text-muted #5b6470
- border #e3e6ea · accent #2f5bea (main action only) · danger #c62f2f · success #1f7a4d
**Fonts:** Inter 400/600 (body + UI), tabular numerals for amounts; licence Apache-2.0
**Density:** high — 32 px rows, 24 px card padding; variance 3, motion 2, density 8
**UX rules:**
1. Tables: sticky header, sortable columns, empty state with a primary action
2. Filters persist in the URL so a view can be shared
3. Numbers right-aligned, tabular; dates ISO; timezone shown once
**Accessibility:** text/bg 15.8:1; muted/bg 6.0:1; focus 3.0:1; targets ≥ 24 px
**Source:** tools/data/styles.csv → "<entry>"; tools/data/colors.csv → "<entry>"
**Assumptions:** [assumed] dark theme in phase 2
```

Next: `build-design-system`.

## Check

```bash
test -s .orbit/task/<id>/ui-direction.md                 # file exists and is not a stub
grep -c "^\*\*\|^- " .orbit/task/<id>/ui-direction.md     # sections present
python3 <skills-dir>/rebuild-design/tools/contrast.py "#5b6470" "#ffffff"  # 0 failing AA
rg -n "\[assumed\]" .orbit/task/<id>/ui-direction.md      # every assumption is visible
```

Pass rule: exactly one style and one palette are chosen (not a menu); every color role has
a hex value and a use; the font pair has a licence; at least three UX rules are specific
enough to implement and check; measured contrast passes AA; every remaining assumption is
marked `[assumed]`. Record the verdict in `.orbit/task/<id>/evidence.md` when it feeds
`prove-done`.

## Pitfalls

- **Searching one query and copying the top answer.** The database scores by keyword; run
  the same context through `--domain ux`, `--domain typography` and a stack query.
- **A palette without roles.** A list of nice hex values leaves `build-design-system` to
  guess which one is the surface; name roles and uses.
- **Choosing for the person.** Style is a product decision; with two valid options,
  present both with a recommendation.
- **Ignoring density.** A 48 px-row dashboard wastes half the screen; density is a decision,
  not a default.
- **Unlicensed fonts.** Google Fonts CSV includes licence data — check it before a font
  pair becomes a design-system dependency.
- **Contrast deferred to later.** A palette that cannot pass AA gets rebuilt; check pairs now
  and record the ratios.
- **No source link.** Without the database entry, the next session cannot tell a decision
  from a guess; record file and entry.

## Portability

Any agent with Python 3 and file tools runs the search scripts; the database is CSV, so
`rg -n "<keyword>" tools/data/*.csv` also works without Python. No subagents or slash
commands. The result is one Markdown file, so the direction survives a session change.

## What's improved vs the source

- Decisions go into the shared task artifact and are justified by product type, not dumped
  as a list.
- Internal products: brand-book alignment and a separate accessibility check with measured
  ratios.
- Tool paths are relative to the skill directory and work inside the plugin.
- Two shortlisted candidates and `[assumed]` markers make the direction reviewable.

## Based on

- [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) — method «ui-ux-pro-max» (MIT). Rewritten in our own words and improved — see "What's improved".
- Helper files in `tools/` are taken from the source unchanged; licences: `tools/LICENSE.upstream`.

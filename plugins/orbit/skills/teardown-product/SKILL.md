---
name: teardown-product
description: '[Orbit 1.4.1 Product & domain] Map someone else''s product from public sources: screens, flows, data model, feature matrix. Use when: «как это сделано у конкурента», «разбери продукт», «сравни с конкурентом», «что у них в MVP»; competitor teardown.'
---

# teardown-product — map someone else's product from public sources

> **Orbit · ① Understand · step 1.4.1 Product & domain**
> **Input:** a public product, its public sources and your own account
> **Output:** `.orbit/product/<name>/recon.md` + `features.csv` + `screens/` → next `mine-user-pain`
> **Works with:** `plan-rebuild`, `check-parity`, `mine-user-pain`
> **Shared rules:** reply in the user's language; generated artifacts default to English; public sources and your own account only; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

A product map of a competitor or vendor: screens, flows, components, data model, feature matrix. Used before your own development ("how do they do it", "what goes into the MVP") and as input to a rebuild (`rebuild-clean`). This is analysis of **features and UX**, not copying.

## When to use

- A competitor must be understood before an MVP scope is fixed.
- Users of a vendor product are moving to yours and parity must be planned.
- A rebuild needs a target shape: which screens, flows and data a user expects.
- A feature matrix must show what the market has, what it lacks and where the gap is.
- Before `plan-rebuild` or `check-parity` you need a structured map, not screenshots.

Do **not** use it on a product you only have full access to because of an account you do not own; and for **your own** app with full access use `recon-webapp`, which is allowed to read bundles and network traffic.

## Inputs

- the product name, platform and the slice under analysis (not "all of Notion", but "pages and sharing");
- public URLs: help center, docs, pricing, changelog, app stores, videos, marketing site, public API docs;
- your own account on the product, used at human pace;
- `.orbit/product/<name>/` for previous recon, `.orbit/task/<id>/brief.md` for the task context;
- helper templates in this skill's `tools/`: `recon-map.md`, `features.csv`.

If a source is missing, record it in the sources table as "not available" instead of inferring its content. If the terms of use forbid using an account to build a competitor, work from public sources only and say so — the scope line must reflect the constraint.

## Procedure

1. **Scope the teardown.** Product, platform, slice, and who your version is for. One paragraph; everything below is filtered by it.
2. **Build the sources table.** URLs for help center and docs, pricing (what they sell = what's valuable), changelog, app stores, video walkthroughs, marketing site, your own account, public API docs. Record the access date.
3. **Walk the screens.** Number them `S01…`; for each: screen, how to reach it, purpose, key components, **states** (empty, loading, error, no permission, mobile). Screenshots are reference only.
4. **Walk the flows.** Number `F01…`: goal, path through screens, happy-path clicks (the number to beat), edge cases and dead ends.
5. **Inventory the components.** Repeated UI parts, variants, states, where used. This is the design-system input for `build-design-system`.
6. **Infer the data model.** Entities, fields, relations; each with evidence (screen, article, public API doc) and a confidence. Unknown stays unknown.
7. **Score the feature matrix.** Use `features.csv` (template `tools/features.csv`): feature, area, priority must/should/could, in original, in ours, notes. `check-parity` reads the same format.
8. **List what is not carried over.** Brand, texts, assets, patented things, anything that depends on a network effect. This list protects the team from "just copy it".
9. **Cross-check the rules** while working: public sources and your own account only; never log into others' accounts; never bypass login or paywalls; reading, not scraping (no crawlers or bulk downloads; pages at human pace); no foreign code or private APIs — don't save bundles, decompile or capture the service's network calls (public API docs are fine).
10. **Write the artifacts and hand off:** `recon.md` from the template, `features.csv`, `screens/`. Next: `mine-user-pain` → `plan-rebuild`; parity later in `check-parity`.

## Output

`.orbit/product/<name>/` — three artifacts:

```markdown
# Recon: <product> (<platform>) — <date>
Scope: <slice>; for <who>
## Sources
| # | source | URL | access date |
## Core loop
<one sentence: the thing users pay for>
## Screens
| ID | screen | route | purpose | components | states |
| S01 | Pages list | /pages | find pages | table, filters | empty, loading, error |
## Flows
F01 create and share a page: S01 -> S03 -> S07; happy path 4 clicks; edge: no permission -> S08
## Data model (inferred)
Page (id, title, owner, updated_at); Share (page, user, role) — evidence: S07, help article
## Not carried over
brand, texts, assets, network-effect features
```

`features.csv` keeps the source columns `feature,area,priority,original,clone,notes`; `screens/` stores read-only reference images. Add a "confidence" note to every inferred data-model entity.

## Check

```bash
test -f .orbit/product/<name>/recon.md && test -f .orbit/product/<name>/features.csv && echo "artifacts ok"
grep -c '^| S[0-9]' .orbit/product/<name>/recon.md      # screens
grep -c '^F[0-9]' .orbit/product/<name>/recon.md        # flows
awk -F, 'NR>1 && ($3=="must" || $3=="should" || $3=="could")' .orbit/product/<name>/features.csv | wc -l
grep -c '| [^|]* |' .orbit/product/<name>/recon.md      # evidence rows
```

Pass rule: every screen has a state set (at least empty and error); every flow has a click count and an edge; the data model marks confidence and evidence; the feature matrix uses the must/should/could scale; "not carried over" is filled; every source row has a URL or an explicit "not available". No bundle, credential or captured private traffic appears in `.orbit/product/<name>/`.

## Pitfalls

- **Crossing the line into the service's internals.** Saving bundles, decompiling or capturing network calls of a product you do not own is not teardown work — it is copying. Public UI + public docs only.
- **Scraping instead of reading.** Bulk crawls get accounts banned and violate terms; a human-paced walk of the slice beats 10 000 pages nobody reads.
- **Screens without states.** A screen in its happy state teaches nothing; empty, loading, error and permission states are where the design decisions live.
- **No click counts.** "A flow through the app" is not comparable; the number of clicks on the main path is the benchmark your version must beat.
- **Confusing the vendor's marketing with the product.** The pricing page says what they sell, not what they do. Verify claims on screens and help docs.
- **Losing the boundary between analysis and cloning.** A feature matrix is a map; brand, texts, assets and patented mechanics stay out. Write them in "not carried over" before the rebuild starts.

## Portability

Any agent and model with a browser and a text editor can do this; screenshots are taken manually or with the OS tool. No subagents needed: one pass over the slice, then write the three artifacts. `features.csv` and `recon-map.md` are plain files, so a spreadsheet tool can substitute for the templates. No Claude Code features are required.

## What's improved vs the source

- Tied to company work: competitor or vendor analysis before your own build, not "a clone for its own sake".
- Explicit fork: someone else's product — here; your own app with access — `recon-webapp`.
- Artifacts live in the shared `.orbit/product/`, and the feature matrix is scored by `check-parity` in the same format.
- "Not carried over" is a mandatory section, so brand, texts and network-effect features never sneak into the rebuild.
- Sources are a table with access dates and an explicit "not available" state, instead of an undefined research process.

## Based on

- [Replica](https://github.com/Jakeschincariol/replica-skill) — method «replica-recon» (MIT). Rewritten in our own words and improved — see "What's improved".
- Helper files in `tools/` are taken from the source unchanged; licences: `tools/LICENSE.upstream`.

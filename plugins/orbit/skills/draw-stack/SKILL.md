---
name: draw-stack
description: '[Orbit 3.1.3 Maps & diagrams] Stack diagram with logos and groups, HTML/PNG; never published externally. Use when: «схема стека», «архитектурная диаграмма с логотипами», «нарисуй схему инфраструктуры», «диаграмма с иконками»; stack diagram, infrastructure diagram with logos.'
---

# draw-stack — stack diagram with logos

> **Orbit · ③ Operate · step 3.1.3 Maps & diagrams**  
> **Input:** stack description ← `project-diagram`  
> **Output:** a diagram (HTML + PNG) → next `publish-design-docs`  
> **Works with:** `design-services`, `project-diagram`  
> **Shared rules:** reply in the user's language per `speak-plain`; generated content (maps, diagrams, comments, docs, artifacts) defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md` at the pack root).

A cloud-architecture-style picture: real technology logos, groups around what lives where (cluster, VPC, cloud, monorepo), orthogonal arrows for what flows to what. Output is one standalone HTML plus a PNG next to it.

## When to use

- Someone asks for a "stack diagram" or an architecture picture where the boxes are technologies (Postgres, Redis, Kafka, K8s) and the arrows are network/data flows.
- The system has named environments or tenancy boundaries that must be visible: one cluster, two VPCs, a shared monorepo.
- A doc or review needs a rendered image, not an interactive page — HTML for the wall, PNG for the slide.
- Not for phases and steps (`project-diagram`) or internal code structure (`project-map`).

## Inputs

Read before drawing anything; a wrong stack picture is worse than no picture:

- the stack description from the earlier step: `.orbit/knowledge/overview.md` from `map-knowledge`, or `.orbit/task/<id>/plan.md` when the stack was agreed in a plan;
- the repo's own evidence: `rg -n "image:|service:|datasource:" docker-compose.yml deploy/`, Helm values, Terraform resources;
- `tools/references/geometry.md` — the coordinate and collision rules this skill depends on;
- `tools/assets/template.html`, `tools/assets/generic/` (browser, device, internet, server, user), `tools/assets/fonts/`;
- an existing icon folder with its `manifest.json`, if one was fetched earlier.

If no stack description exists, derive the node list from the manifests, say which files you read, and do not invent services.

## Procedure

1. **Fix the content.** Nodes = technology + role ("PostgreSQL · orders store"). Groups = where it lives: cluster, namespace, VPC, cloud, monorepo. Links = what flows where and in which direction. Stop at 8–20 nodes — more stops reading.
2. **Fetch icons.** `python3 tools/scripts/fetch_icons.py assets/icons postgresql redis "k8s:kubernetes" "queue:aws/SQS"`. Needs network. Spec forms: `name`, `name:slug`, `name=URL`, `name:aws/<Service>`, `name:gcp/<Product>`, `name:azure/<Service>`; `lucide/<icon>` gives a tintable concept icon. The script writes `<name>.<ext>`, `manifest.json` and `<name>_dark.<ext>` when a dark variant exists; it exits non-zero on any `FAIL` and lists candidates. **Air-gapped:** drop your own SVG logos into the icon folder, or use the logo-free `project-diagram`.
3. **Plan nodes on the grid** from `geometry.md`: a node is a 132×100 box (132-wide tile + text below). Node centers on one row stay ≥140 px apart; consecutive rows sit 140 px apart between tile tops. Groups sit 24 px outside the outermost node *boxes*, top edge = first tile top − 60, bottom edge ≥ last tile top + 150; nested groups inset ≥24 px on sides and bottom and start ≥48 px below the parent's label.
4. **Wire the edges with the anchoring rule.** Horizontal edges connect tile side to tile side at `y = topY+30`, from `centerX+30+4` to `targetCenterX-30-4`. Vertical edges connect **box bottom** (`topY+100`) to the lower **tile top** (`topY_lower-4`) — never tile bottom to tile top, because that cuts through the name/role text. Elbows run in x-corridors that cross no node box, with the horizontal segment in the clear band between rows. Leave a 4–6 px gap; arrowheads supply the touch. Use `class="e"` for the primary flow, `class="n"` for internal edges, `class="n dash"` for dev/deploy.
5. **Build the draft.** Copy `tools/assets/template.html` and replace its sample nodes, groups and links with yours. Keep the built-in defenses: edge labels get a paper-coloured halo (`paint-order: stroke`), and name/role text sits on paper-background `<span>`s. Dark theme is `data-theme="dark"` on the root element.
6. **Inline assets.** `python3 tools/scripts/build.py my.html assets/icons out.html --fonts tools/assets/fonts`. It replaces `%%FONT_DISPLAY%%`, `%%FONT_JBM%%` and `%%ICON_<name>%%` with data URIs and **fails loudly** if any token is left — that means a missing icon or a forgotten `--fonts`.
7. **Render and look at it.** `python3 tools/scripts/render_png.py out.html check.png --selector .canvas --scale 2`. Needs Playwright + headless Chromium (`pip install playwright`, then `python3 -m playwright install --with-deps chromium`). By default it captures both themes as `check.png` and `check-dark.png`; `--single` captures only the authored theme. Open both files — do not trust the HTML preview.
8. **Deliver.** Ship `out.html` plus the PNG(s). If the picture is a project document, put it in `docs/diagrams/` as `<system>-stack.html` with its PNGs; otherwise attach it where the team reads it.
9. **Security pass.** Internal systems are internal data: no hostnames, IPs, bucket names, tokens or customer data on the picture, and never publish it to an external gallery or public paste service.

## Output

`docs/diagrams/<system>-stack.html` — one self-contained file, no external assets — plus `<system>-stack.png` and, from the renderer, `<system>-stack-dark.png`. The built HTML and PNG are the deliverable; keep the draft and icon folder only if the diagram is regenerated.

```text
docs/diagrams/
  orders-stack.html        # self-contained: fonts + icons inlined
  orders-stack.png         # light theme, 2x
  orders-stack-dark.png    # dark theme for dark slides
```

Record the files and the icon sources (from `manifest.json`) in `.orbit/task/<id>/evidence.md` when the diagram is part of a proven step.

## Check

Run these before calling it done:

```bash
python3 tools/scripts/build.py my.html assets/icons out.html --fonts tools/assets/fonts
grep -c '%%' out.html                 # must be 0: no unresolved tokens
python3 tools/scripts/render_png.py out.html check.png --selector .canvas --scale 2
test -f check.png && test -f check-dark.png
grep -niE '10\.[0-9]+\.[0-9]+\.[0-9]+|password|secret|token' out.html   # must print nothing
```

Pass rule: build and render exit 0, no leftovers, and four visual checks are true on the PNG — every icon renders, no arrow crosses a label or other text, nothing is clipped, every group encloses exactly its own nodes. Confirm 8–20 nodes, each with a role line.

## Pitfalls

- **A vertical arrow straight through the label.** Drawing from tile bottom (`topY+60`) to the next tile top strikes the name. Connect box bottom (`topY+100`) instead — this is the single most common broken diagram.
- **Icons that vanish on dark backgrounds.** White-fill logos need a dark tile; `manifest.json` flags `white_fill`, but that flag can be a false positive on a coloured logo — inspect the SVG, and never recolour a logo.
- **A wrong brand from a fuzzy match.** `fetch_icons.py` requires an exact title; on `FAIL`, pass the official file as `name=URL` or use `project-diagram`. Never substitute a similar logo.
- **Stale icon files after a re-fetch.** `build.py` embeds whichever `<name>.*` sorts first; the fetcher deletes old same-name files, so re-run the fetcher rather than hand-copying new SVGs into the folder.
- **Crowded rows.** Under 140 px between centres or more than 20 nodes and labels collide; split the diagram by subsystem or move detail into a caption.

## Portability

Pure `python3` plus a browser; no subagents, no slash commands. Without network, use your own SVGs or the logo-free `project-diagram`. Without Playwright, deliver the HTML and state plainly that the PNG was not produced. Run the steps inline with any agent's file and shell tools; the three scripts under `tools/` are ordinary Python.

## What's improved vs the source

- Publishing to an external gallery removed — internal architecture doesn't leak.
- A path for air-gapped networks (own logos or a logo-free diagram).
- Clear split between three diagram skills: stack, phases-and-steps, clickable map.

## Based on

- [stack-diagram](https://github.com/caru-ini/stack-diagram) — method «stack-diagram» (MIT). Rewritten in our own words and improved — see "What's improved".
- Helper files in `tools/` are taken from the source unchanged; licences: `tools/LICENSE.upstream`.

---
name: publish-design-docs
description: '[Orbit 3.1.4 Maps & diagrams] Design docs as one HTML page for human review, with a "what we decide" block. Use when: «покажи доки людям», «страница для ревью», «собери дизайн-доки на одну страницу», «страница ревью дизайна»; render design docs, design docs review page.'
---

# publish-design-docs — design docs as one page for people

> **Orbit · ③ Operate · step 3.1.4 Maps & diagrams**  
> **Input:** a set of md docs ← `draw-stack`  
> **Output:** `review.html` → next `onboard-people`  
> **Works with:** `design-backend`  
> **Shared rules:** reply in the user's language per `speak-plain`; generated content (maps, diagrams, comments, docs, artifacts) defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md` at the pack root).

A set of markdown design docs (requirements, data, architecture, stack — written by `design-backend`) becomes one tidy HTML page for human review. Agents keep working with the markdown; the page is for eyes: tables, code, embedded diagrams and a visible approval gate.

## When to use

- Design docs exist as several markdown files and reviewers need one link, not a folder tour.
- A design review has to end with a decision: the page must surface "what we decide" before the details.
- Diagrams from `project-diagram` or `draw-stack` should sit inside the document flow, not as separate attachments.
- Not for handing a new colleague the project — that is `onboard-people`. Not for a doc that is still being co-written — finish `cowrite-doc` first.

## Inputs

- the markdown docs in reading order: requirements → context → data → architecture → stack → open items, usually under `docs/design/<service>/`;
- the task facts: `.orbit/task/<id>/brief.md` (goal and done-criteria) and `.orbit/knowledge/overview.md` (system context);
- `tools/theme/` — `review-page.css`, `review-page.js`, the Archivo font and its `OFL.txt`, and `mermaid.json` if the source docs use Mermaid;
- diagrams from `project-diagram` / `draw-stack`, ideally as inline SVG.

If a document is missing, leave a placeholder section that names its owner and due date; do not write a summary from imagination.

## Procedure

1. **Collect and order the documents.** `ls docs/design/<service>/*.md`, then agree the reading order with the person. The order is part of the page: requirements before architecture, architecture before stack.
2. **Read the markdown as content, not as markup.** Extract headings, tables, code blocks, decision sentences and ids that other docs link to. Note every "we will decide" sentence — it belongs in the gate, not in a random section.
3. **Start from the theme.** Inline `tools/theme/review-page.css` into a `<style>` block and inline `review-page.js` verbatim at the end of `<body>`. Embed the Archivo `woff2` from the theme as a base64 data URI.
4. **Build the tab contract the JS expects.** Tabs are `<a class="tab" data-tab="KEY" href="#KEY">`; panels are `<section class="panel" data-tab="KEY">` with no `id`; `<body data-gate="KEY">` names the gate tab; every referenced `id="..."` lives inside its panel. Break the contract and the page silently degrades to one long scroll.
5. **Write the gate tab first: "What we decide in this review".** List each decision that needs approval, each open question, and for each an owner and a date. If the gate is empty, the review is not ready to publish.
6. **Render the documents as sections.** One tab per document, a left rail of tabs, readable tables (`.table-scroll`), code in `<pre><code>`, and diagrams as `<figure class="diagram"><svg>…</svg></figure>` so the built-in viewer can zoom them.
7. **Make it self-contained.** One HTML file: styles, font, images and diagrams inline; `grep -nE 'src="http|href="http.*\.css|@import' review.html` must find no stylesheet, script, font or image fetched from a CDN. Ordinary outbound document links are fine.
8. **Put it next to the documents:** `docs/design/<service>/review.html`, then share the path or URL.
9. **Walk the page.** Open it in a browser, click every tab, follow a couple of in-page links, open a diagram viewer, resize to a narrow window — the rail and tables must stay usable.

## Output

`docs/design/<service>/review.html` — one standalone page, generated from the markdown:

```html
<body data-gate="decisions">
  <nav class="tabs">
    <a class="tab" data-tab="decisions" href="#decisions">What we decide</a>
    <a class="tab" data-tab="requirements" href="#requirements">Requirements</a>
    <a class="tab" data-tab="architecture" href="#architecture">Architecture</a>
  </nav>
  <section class="panel" data-tab="decisions">…decision table…</section>
  <section class="panel" data-tab="requirements">…</section>
```

The page mirrors the markdown; record it and the source paths in `.orbit/task/<id>/review.md` so the review has a traceable object.

## Check

```bash
test -f docs/design/<service>/review.html
grep -c 'class="tab"' docs/design/<service>/review.html    # one per document + the gate
grep -nE 'src="https?://|href="https?://[^"]+\.(css|js)|@import' docs/design/<service>/review.html
python3 -c "import re,sys;h=open(sys.argv[1]).read();print(len(re.findall(r'<section class=\"panel\"',h)))" docs/design/<service>/review.html
```

Pass rule: the file exists, the gate section lists at least the decisions actually pending (or says "no decisions pending" explicitly), every source document has a panel, the CDN grep prints nothing, and every in-page link and tab opens the right content in a browser. If secrets or internal hostnames could reach readers outside the team, the page fails regardless of layout.

## Pitfalls

- **Editing `review.html` by hand.** The next rebuild erases the edit and the markdown stops being the source of truth. Every change goes into the markdown, then rebuild.
- **External CDN dependencies.** A page that needs the network to load its styles or fonts breaks in an air-gapped review room and leaks the review URL to third parties.
- **Breaking the tab contract.** A panel with an `id` or a tab without `data-tab` stops the router; the page looks fine until someone clicks a link.
- **An empty or vague gate.** "Discuss the design" is not a decision. Write decision, owner, date, and the consequence of saying no.
- **Secrets pasted into a design doc.** The page goes beyond the team more often than expected; strip tokens, internal IPs and customer data before publishing.
- **Stale page.** Markdown changed but the page not rebuilt. Rebuild on every merge that touches the source docs.
- **Diagrams as `<img>` blobs.** Inline `<svg>` gives the zoom viewer and stays crisp in print; a raster screenshot blurs.

## Portability

A browser is the only dependency. `review-page.js` is progressive enhancement: without JavaScript all panels are visible in document order, so the review still happens. No Claude-only features, no build tool, no subagents. In any agent, read the markdown with its file tools, assemble the HTML, and verify with the greps above; slash commands are not needed.

## What's improved vs the source

- A "what we decide" block at the top — the approval gate is visible at once.
- Diagrams from `project-diagram` and `draw-stack` are embedded and zoomable.
- The tab/panel contract and a self-contained check are written down, so the page degrades predictably instead of half-working.
- The page is explicitly generated from markdown, with rebuild as the only update path.

## Based on

- [backend-skills](https://github.com/si1verwind17/backend-skills) — method «rendering-design-docs» (MIT). Rewritten in our own words and improved — see "What's improved".
- Helper files in `tools/` are taken from the source unchanged; licences: `tools/LICENSE.upstream`.

---
name: recon-webapp
description: '[Orbit 1.3.4 Reverse engineering] Own web app from the inside: routes, bundles, APIs from your session''s HAR, auth, flags. Use when: «разбери фронт», «какие API вызывает приложение», «HAR», «посмотри, как устроен наш фронт»; web app recon.'
---

# recon-webapp — look inside a web application

> **Orbit · ① Understand · step 1.3.4 Reverse engineering**
> **Input:** a web app or SPA you own or may lawfully access
> **Output:** `.orbit/reverse/<target>/web-recon.md` → next `recover-api-spec`
> **Works with:** `teardown-product`, `test-flows`, `project-map`
> **Shared rules:** reply in the user's language; generated artifacts default to English; own or authorized targets only; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

How a web app or SPA you lawfully have access to (own, company, an integration partner's stand) works: screens and routes, frontend bundles, which APIs it calls, where authorization happens, what's behind feature flags. For someone else's public product, when only features and UX matter — `teardown-product` (public sources only). Scope line and findings log — as in `reverse-app`.

## When to use

- A frontend is undocumented and a new team must change it without breaking flows.
- The API contract is missing but the SPA calls it: recover from your own session.
- You must find where a permission check actually happens (client, gateway or service).
- A feature is hidden behind a flag and nobody knows which flag or which condition.
- Before a rewrite or a design-system migration you need the real screen and route inventory.

Do **not** use it on a product you have no right to inspect beyond public pages: that is `teardown-product`. Do not use it to bypass authentication, paywalls or rate limits.

## Inputs

- the app URL and an account you own on the stand under analysis;
- browser DevTools (or Playwright) for routes and traffic;
- `.orbit/reverse/<target>/findings.md` for the scope line and question checklist;
- `.orbit/task/<id>/brief.md` when the recon serves a task;
- the repo, if the frontend sources are available — then start from the router instead of the bundle.

If an input is missing: no account → work from public pages only and say so in the log; no source access → recover from the bundle; no permission → stop.

## Procedure

1. **Write the scope line** as in `reverse-app`: whose app, why, what we will not touch. Add the account and stand used.
2. **Walk the app by hand or with `test-flows` (Playwright)** and list URLs and screens. In an SPA, routes live in the router: search the bundle for `path:`, `createBrowserRouter`, `Routes`, `RouterModule.forRoot`.
   ```bash
   npx --yes playwright open <app-url>   # or drive an existing test project
   ```
3. **List the frontend bundles.** Grep the served HTML for script tags, then fetch each bundle into the work directory; never fetch into the repo root.
   ```bash
   curl -s <app-url>/ | grep -oE 'src="[^"]+\.js"' | sort -u
   curl -s <app-url>/static/js/main.<hash>.js -o .orbit/reverse/<target>/work/main.js
   npx --yes prettier --parser babel .orbit/reverse/<target>/work/main.js > .orbit/reverse/<target>/work/main.pretty.js
   grep -nE 'fetch\(|axios\.|/api/|baseURL|graphql|wss?://' .orbit/reverse/<target>/work/main.pretty.js | head -80
   ```
4. **Recover the module structure** when the app is yours and a source map (`//# sourceMappingURL=`) exists: `npx --yes source-map-explorer` or unpack `sourcesContent` from the map. Module names beat minified identifiers.
5. **Capture APIs from your own session traffic.** DevTools → Network → enable "Preserve log" → run the scenario → "Save all as HAR". Then summarize, not dump:
   ```bash
   jq -r '.log.entries[] | [.request.method, .request.url, .response.status] | @tsv' session.har | sort | uniq -c | sort -rn | head -60
   ```
   **Strip tokens and cookies** (`Authorization`, `Cookie`, `Set-Cookie`) before saving or sharing the HAR. Only your own accounts, only your own stand.
6. **Map authorization.** Where the session lives (cookie / localStorage / memory), how tokens refresh, which endpoints return 401/403 versus 200 with an empty body. The difference tells you whether the check is client-side, gateway-level or service-level.
7. **Find feature flags and runtime config.** Search the pretty bundle and look for config endpoints; config often reveals environments and partner names.
   ```bash
   grep -nE 'feature|flag|toggle|config\.' .orbit/reverse/<target>/work/main.pretty.js | head -40
   ```
8. **Write the three tables** — screens, APIs, flows — into `web-recon.md` (template below), each row tied to the route, the bundle line or the HAR entry that proves it.
9. **Record open questions** and hand off: map → `project-map`; spec → `recover-api-spec`; rebuild → `rebuild-clean`; test coverage → `test-flows`.

## Output

`.orbit/reverse/<target>/web-recon.md`:

```markdown
# <target> — web recon — <date> — <commit or build>
**Scope:** own/integration stand, account <role>; no bypassing auth.
## Screens
| # | URL / route | Purpose | Key actions | Bundle evidence |
|---|---|---|---|---|
| S01 | /orders | order list | filter, open | main.pretty.js:1201 |
## APIs called
| Method | Path | Called from | Auth observed |
|---|---|---|---|
| GET | /api/orders | orders list | bearer, 401 without |
## Flows
S01 -> GET /api/orders -> orders-svc -> S02
## Open questions
- Which service owns /api/orders/:id/permissions?
```

## Check

```bash
test -f .orbit/reverse/<target>/web-recon.md && echo "artifact ok"
grep -c '^| S[0-9]' .orbit/reverse/<target>/web-recon.md       # screens
grep -c '^| \(GET\|POST\|PUT\|PATCH\|DELETE\)' .orbit/reverse/<target>/web-recon.md  # APIs
grep -nE 'Authorization|Cookie|Set-Cookie' session.har .orbit/reverse/<target>/web-recon.md || echo "no secrets"
```

Pass rule: every screen row has a URL or route; every API row names its caller and the observed auth behavior; the HAR and bundle in the work directory contain no tokens, cookies or personal data; open questions are listed; the scope line names the account and stand. Record the artifact path in `.orbit/task/<id>/evidence.md` when a task depends on it.

## Pitfalls

- **Treating a minified bundle as readable code.** Pretty-print it and use source maps first; searching minified output for `fetch` gives false positives across the whole file.
- **Saving a raw HAR.** A HAR contains bearer tokens, cookies and personal data; strip the headers before it leaves the browser, and never commit it.
- **Assuming the SPA enforces permissions.** Hiding a button is not authorization. Check the API's 403 path; if the client "decides", that is a finding and a risk for `model-threats`.
- **Testing on the production account.** Use a dev stand and your own account; public production traffic is other people's data.
- **Ignoring feature flags.** A screen that "does not exist" may be served by a flag; without the flag map the inventory is wrong for other environments.
- **Recon of someone else's product.** Bundles, HARs and private APIs of a product you do not own belong to `teardown-product`'s public-source rules, not here.

## Portability

Any agent can do this with a browser, `curl`, `jq` and a text editor; Playwright is optional and degrades to manual clicking if unavailable. No subagents are needed: walk the app, capture the HAR, write the tables. DevTools are GUI-only, so in a headless environment use Playwright or an HTTP client and note that you did not exercise the UI. No Claude Code features are required.

## What's improved vs the source

- Clear split: own app with access — here; someone else's product — only `teardown-product` from public sources.
- HARs are stripped of tokens and cookies before saving.
- Three tables with per-row evidence replace a free-form description, so `recover-api-spec` can consume the API table directly.
- Authorization location is an explicit decision (client vs gateway vs service), not an afterthought.
- Source maps and module recovery for own apps; minified-bundle reading only as a fallback.

## Based on

- [Craft Anything](https://github.com/storytold/craft-anything) — method «Craft Anything» (MIT/Apache-2.0). Rewritten in our own words and improved — see "What's improved".
- [REA](https://github.com/morluto/rea) — method «reverse-engineer-anything» (MIT). Rewritten in our own words and improved — see "What's improved".

---
name: map-knowledge
description: '[Orbit 1.2.1 Code recon] Knowledge graph of the codebase: modules and links with file:line evidence + system overview. Use when: «разберись в репозитории», «как устроен проект», «граф знаний», «построй карту кода», «с чего начать в чужом коде»; understand codebase, knowledge graph.'
---

# map-knowledge — build a knowledge graph of the codebase

> **Orbit · ① Understand · step 1.2.1 Code recon**
> **Input:** repository ← `shape-idea`
> **Output:** `.orbit/knowledge/graph.json` + `.orbit/knowledge/overview.md` → next `explain-code`
> **Works with:** `index-code`, `survey-codebase`, `project-map`, `run-parallel`
> **Shared rules:** reply in the user's language per `speak-plain`; generated content defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

Method from Understand Anything, rewritten to use **built-in tools only**. Output:
`.orbit/knowledge/graph.json` + `overview.md`, read by `explain-code`, `trace-impact`,
`onboard-people`; `project-map` draws from it. Every edge carries `file:line`
evidence — without it the graph is a drawing.

## When to use

- An unfamiliar repository, legacy code or service — especially before a big change.
- Before onboarding a person or writing `docs/ONBOARDING.md`.
- A design discussion needs the real module boundaries, not the README's version.
- `explain-code`/`trace-impact` needs a graph that does not exist yet.

Skip for one file or function — read it (`explain-code`); don't build a 500-node graph
for a one-line question.

## Inputs

- The repository and its size: `git ls-files | wc -l`, `git ls-files | head -500`.
- Manifests: `package.json`, `pom.xml`, `build.gradle*`, `go.mod`, `pyproject.toml`,
  `*.csproj`, `Chart.yaml`, `Dockerfile`, `.gitlab-ci.yml`.
- Entry points: `main`, `cmd/`, `Program.cs`, `app.py`, `index.ts`, CLI scripts, CI jobs.
- An existing index from `index-code`: `.orbit/knowledge/index/` — reuse its notes.
- Prior knowledge: `.orbit/learnings/` and `docs/adr/` for why the layering is what it is.

If the repository is empty or a single package, reduce the module count; if it is
enormous (thousands of files), use the parallel mode in step 2 rather than reading.

## Procedure

1. **Inventory without reading all the code.** `git ls-files | wc -l` gives the size; split
   by extension. Read the manifests and find entry points — 90 % of the shape.
2. **Define 5–15 modules** by directory and responsibility (api, domain, infra, db, jobs,
   external clients). A module is a unit a person would name in a design discussion. Over
   ~300 files, split the modules across parallel agents (`run-parallel`): each writes its
   own graph fragment, and you merge the JSON.
3. **Write the nodes.** One node per module (or file/service/db/queue/external/config/job
   where the directory split is wrong). The `summary` is 1–2 sentences — **what it does
   and why** — not a retelling of the code. Every `files` entry is a `file:line-range`:

   ```json
   {"id":"api/auth","type":"module","title":"Auth",
    "summary":"Validates JWT, issues a session","files":["src/auth/jwt.ts:1-120"],
    "layer":"api","tags":["security"]}
   ```

4. **Write the edges** — calls / imports / reads / writes / publishes / consumes /
   deploys. Every edge has `file:line` evidence; no evidence → no edge:

   ```json
   {"from":"api/auth","to":"db/users","kind":"calls","evidence":"src/auth/repo.ts:42"}
   ```

5. **Cover the layers deliberately.** Ask per layer: is there a node for it? Missing
   `external`, `queue` or `ops` nodes are the usual blind spots.
6. **Write the overview** `.orbit/knowledge/overview.md`: purpose, modules table (id,
   title, layer, summary), main flows (request → response, event → handling), external
   dependencies, and risk spots (no tests, complex nodes, many incoming edges).
7. **Verify the graph.** Every node's files exist; no dangling edges (every `to` is a
   node id); re-check three random edges against the code. Fix what does not resolve.
8. **Record the limits.** Nodes you could not verify are marked `"hypothesis": true`; the
   overview names what the graph does not cover (generated code, dynamic calls).
9. **Hand off.** `explain-code` starts from a node id; `trace-impact` uses edges for the
   blast radius; `project-map` renders the graph. Commit `.orbit/` only by agreement.

## Output

Artifacts:

```text
.orbit/knowledge/
  graph.json      {"nodes":[...], "edges":[...]}
  overview.md     purpose, modules table, flows, dependencies, risk spots
```

Overview template:

```markdown
# <repo> — overview
Purpose: <what the system does for whom>
**Modules**
| id | title | layer | what it does |
**Main flows**
- request: <client> → <api> → <domain> → <db>
- event: <topic> → <consumer> → <...>
**External dependencies**
- <system> — used by <module> — contract <file:line>
**Risk spots**
- <node> — <why risky> — <file:line>
**Limits**
- hypothesis nodes: <ids>; not covered: <generated code, dynamic calls>
```

## Check

```bash
jq -e '.nodes and .edges' .orbit/knowledge/graph.json
jq '{nodes:(.nodes|length), edges:(.edges|length)}' .orbit/knowledge/graph.json
jq -r '.nodes[].files[]' .orbit/knowledge/graph.json | cut -d: -f1 | sort -u | xargs ls >/dev/null && echo 'files exist'
jq -r '.edges[].to' .orbit/knowledge/graph.json | sort -u > /tmp/to.txt
jq -r '.nodes[].id' .orbit/knowledge/graph.json | sort -u > /tmp/ids.txt
comm -23 /tmp/to.txt /tmp/ids.txt        # dangling edges — must be empty
test -f .orbit/knowledge/overview.md && wc -l .orbit/knowledge/overview.md
```

Pass rule: `graph.json` parses and has both `nodes` and `edges`; 5–15 nodes (more means
the split is too fine, fewer means too coarse); every node has `files` ranges and a
1–2 sentence `summary`; every edge has `evidence` and a `to` that exists; the dangling
check prints nothing; every `file:line` resolves; `overview.md` has the modules table,
flows, dependencies and risk spots. Fix a failing check in the evidence, not the prose.

## Example

A three-module repository, from inventory to verified graph:

```bash
$ git ls-files | wc -l
42
```
`package.json` lists `express` and `pg`. Entries:
```json
{"id":"api/reports","type":"module","title":"Reports API",
 "summary":"Serves the orders report; streams CSV or HTML.","files":["src/reports/router.ts:1-64"],"layer":"api"}
{"id":"db/orders","type":"db","title":"orders table",
 "summary":"Order rows; the single source for reporting.","files":["migrations/003_orders.sql:1-40"],"layer":"infra"}
```
```json
{"from":"api/reports","to":"db/orders","kind":"reads","evidence":"src/reports/query.ts:88"}
{"from":"api/reports","to":"api/auth","kind":"calls","evidence":"src/reports/router.ts:31"}
```
Verification: `jq '{nodes:(.nodes|length), edges:(.edges|length)}'` → `{nodes: 3, edges: 2}`;
the dangling `comm` prints nothing; the `files` paths resolve with `ls`; the
`reports → auth` edge re-checks against `src/reports/router.ts:31`. `overview.md` lists
the modules, the request flow (client → reports → db), and one risk: no CSV streaming test.

## Pitfalls

- **A graph without evidence.** An edge you "know" but cannot point to is a hypothesis.
  Label it or drop it; otherwise `trace-impact` reports a blast radius that does not exist.
- **Summary as a code retelling.** "Calls repo.findAll and maps to DTO" repeats the code;
  the summary answers *what it does and why*, which is what a reader needs.
- **Modules by folder only.** Folders lie: `utils/` may contain a service. Split by
  responsibility; an `id` a designer would say out loud.
- **Missing layers.** No `external`, `queue` or `config` nodes is the classic blind spot.
  Add a node per external system you can name from the manifests.
- **Reading everything.** Entry points plus manifests give the shape; read files only for
  the nodes you write.
- **Secrets in the graph.** Never read or copy `.env`, `*.pem`, `values-secret*` contents.
  A node summary names the dependency, never the credential.
- **A stale graph.** After a migration or module split the graph reports old edges. Refresh
  affected nodes in the `run-spec-loop` loop.

## Portability

Built-in tools only: any agent with file reading, `grep`/`rg`, `git`, `jq` and a shell can
build and verify the graph; the original plugin is not needed. Without subagents, build
the modules sequentially — parallel mode is an accelerator. Without `jq`, validate with
`python3 -m json.tool`. The artifact is plain JSON + Markdown under
`.orbit/knowledge/`, readable by later skills regardless of the agent.

## What's improved vs the source

- Works without the external plugin and its background scripts — built-in tools only.
- Every graph edge must carry `file:line` evidence.
- The graph lives in the shared `.orbit/knowledge/` and feeds `project-map`, `explain-code`, `trace-impact`, `onboard-people` directly.
- A dangling-edge check and a file-existence check make the graph verifiable.
- Hypothesis nodes and graph limits are recorded, so readers know what is unproven.

## Based on

- [Understand Anything](https://github.com/Egonex-AI/Understand-Anything) — method «understand» (MIT). Rewritten in our own words and improved — see "What's improved".

---
name: index-code
description: '[Orbit 1.2.2 Code recon] Working code index: index first, then targeted reading — fewer tokens and calls. Use when: «где это в коде», «кто вызывает», «найди все места», «где используется», «проиндексируй код»; where is, callers, find usages.'
---

# index-code — index first, then read

> **Orbit · ① Understand · step 1.2.2 Code recon**
> **Input:** repository
> **Output:** `.orbit/knowledge/index/` → next `explain-code`
> **Works with:** `map-knowledge`, `trace-impact`, `explain-code`
> **Shared rules:** reply in the user's language per `speak-plain`; generated content defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

Method of Graft / Trail-code: ask a **code index** before reading sources — fewer tool calls
and tokens. Rewritten for built-in tools. If the `trail`/`graft` CLI is installed
(`npm i -g @trailhq/trail-code`), use it: `graft ask`, `graft grep`, `graft skeleton`,
`graft callers` do the same faster. Without it, the index is built from `grep` and short notes, as below.

## When to use

- Any question shaped as "where is X", "who calls Y", "every place Z is used".
- Before opening files in a repository you have not indexed yet — the first full-file
  read is what the index exists to avoid.
- A change is about to touch a symbol and you need its consumers before editing.
- An answer from a previous search was weak and the temptation is to search again in
  other words.
- After a significant change, to keep the index and its wiring current.

Skip for a repository of a few files, or when you already have the exact `file:line` —
read that range and answer.

## Inputs

- The repository and its file list: `git ls-files | head -200`, `wc -l <(git ls-files)`.
- The question in the user's words and the short symbol name behind it.
- An existing graph, if `map-knowledge` ran: `.orbit/knowledge/graph.json` — reuse its
  nodes instead of re-deriving them.
- Any previous index: `ls .orbit/knowledge/index/` (skeleton, nodes, wiring).
- The build/test entry points for context: `package.json`, `go.mod`, `pyproject.toml`,
  `Makefile`.

If no index exists, build the three parts below before answering; if only a graph
exists, skip the node inventory and generate skeleton and wiring from it.

## Procedure

1. **Take the question and reduce it to one symbol or one path.** "Where is the CSV
   export?" → `exportCsv` or `src/export/`. If the question contains several questions,
   answer them one at a time with the matching move.
2. **Build the file skeleton — signatures without bodies.** One command, saved to
   `.orbit/knowledge/index/skeleton.txt`:

   ```bash
   grep -rnE '^\s*(export\s+)?(async\s+)?(function|class|def|func|interface|type|public|private|internal)\b' src/ > .orbit/knowledge/index/skeleton.txt
   ```

   For a large codebase, run it per area (`src/api`, `src/domain`).
3. **Write node notes, one file per area.** `.orbit/knowledge/index/nodes/<area>.md`:
   3–8 lines of prose — "what's here and why" — plus exact `file:line` ranges. One node
   note is enough to answer most "where" questions without opening the code.
4. **Map the wiring for key symbols.** For each symbol that matters in this task:
   `grep -rn '\b<SymbolName>\b' src/` → add a line to
   `.orbit/knowledge/index/wiring.md` in the form `A → B (file:line)`. Wiring is the
   caller graph; it is what makes "what breaks if Z changes" answerable.
5. **Pick exactly one move per question.** Do not chain searches "just in case":

   | Question | Move |
   |---|---|
   | "How does X work / where is X?" | find the node, read the listed lines (offset + limit) |
   | "Every place Y is used" | one `grep -rn` on the short name, not a full signature; empty → loosen the pattern |
   | "API of a file" | skeleton or `grep -n` on signatures in that file |
   | "What breaks if Z changes" | wiring: all callers of Z and their callers (2 levels) |

6. **Don't re-ask the same question in other words.** If the first move is weak, change
   the move (skeleton → grep → wiring), not the wording. A second paraphrase of the same
   search returns the same noise.
7. **Verify the index.** Every `file:line` in a node note resolves (`sed -n '<line>p' <file>`);
   every wiring line has both ends and the evidence path; the skeleton has no duplicate
   areas. Fix what does not resolve — a stale index is worse than none.
8. **Keep it fresh.** After a significant change, update the affected nodes and wiring in
   the same loop as `run-spec-loop`. The index is derived: commit it only by agreement
   (`stay-in-scope`), otherwise keep it in the `.orbit/` work folder.

## Output

`.orbit/knowledge/index/` — a working index with three parts:

```text
.orbit/knowledge/index/
  skeleton.txt          signatures with file:line, no bodies
  nodes/<area>.md       3–8 lines per area + exact ranges
  wiring.md             A → B (file:line) caller edges
```

Node note example:

```markdown
# nodes/export
The CSV export path: HTTP handler → query → stream. No PDF, no scheduled mail.
- handler: src/export/router.ts:20-60
- query: src/reports/query.ts:88-140
- stream helper: src/http/files.ts:42-75
```

Wiring example:

```text
router.get('/reports/orders.csv') → exportOrders (src/export/router.ts:31)
exportOrders → buildOrdersQuery (src/reports/query.ts:90)
exportOrders → sendFile (src/http/files.ts:44)
```

## Check

Before answering, or before calling an index refresh done:

```bash
ls .orbit/knowledge/index/skeleton.txt .orbit/knowledge/index/wiring.md
grep -c ':' .orbit/knowledge/index/skeleton.txt        # skeleton lines carry file:line
grep -c '→' .orbit/knowledge/index/wiring.md           # edges exist
for f in .orbit/knowledge/index/nodes/*.md; do grep -Hn ':[0-9]' "$f"; done
git status --short .orbit/                             # index is not staged by accident
```

Pass rule: for every question the index answers, the answer cites a `file:line` that
resolves; the skeleton and wiring files exist and are non-empty; each node note has at
least one range; no answer required a full-file read outside the listed ranges; the
index is refreshed after the last significant change. If a `file:line` is stale, fix the
index before using it.

## Pitfalls

- **Reading full files "to be sure".** That is the cost the index exists to avoid. Read
  the listed range; widen only when the range does not answer the question.
- **Indexing everything before answering.** A full index of a huge repo takes longer than
  the question. Index the area the question touches first.
- **A skeleton that silently skips a language.** The regex covers common `function/class/
  def/func` forms; if a language is missing, add its keyword before trusting the file.
- **Wiring without evidence.** `A → B` with no `file:line` is a guess; it will be wrong
  in exactly the case that matters (a dynamic call, a re-export).
- **Stale index after a rename.** A moved symbol leaves a dead `file:line` and wrong answers. Refresh after changes.
- **Re-searching the same question in new words.** The second search returns the same
  results and burns context. Change the move, not the phrasing.
- **Committing the index without agreement.** It is a derived work folder, not source;
  decide with the team before it enters the repository.

## Portability

No Claude-only feature: `grep`/`rg`, `sed`, `git` and a text editor suffice; `npm i -g
@trailhq/trail-code` is optional and only an accelerator. On any CLI, the same three
files can be built with `grep` and written by the agent's file tools. Without subagents,
build one area at a time inline. If `graft` is available, its `ask`/`grep`/`skeleton`/
`callers` output maps one-to-one onto the "one move per question" table. The index stays
under `.orbit/knowledge/index/` in every agent, so `explain-code` and `trace-impact`
read the same artifact regardless of who built it.

## What's improved vs the source

- "Index first" works without the npm CLI: index from `grep` plus short node notes; the CLI is used when present.
- A "question type → one move" table instead of chains of searches.
- Index refresh is part of the same loop as spec and map.
- Every node and wiring line must resolve to a `file:line`, with a verification step.
- The index is explicitly a derived work folder: commit only by agreement.

## Based on

- [Graft / Trail-code](https://github.com/trailhq/Graft) — method «graft» (MIT). Rewritten in our own words and improved — see "What's improved".

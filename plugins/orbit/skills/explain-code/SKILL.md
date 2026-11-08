---
name: explain-code
description: '[Orbit 1.2.4 Code recon] Explain a module/file/function in levels: what it does, callers, flow, risks. Use when: «объясни этот модуль», «как работает функция», «что делает этот файл», «разбери код», «объясни по шагам»; explain this code, how it works.'
---

# explain-code — explain a module, file or function

> **Orbit · ① Understand · step 1.2.4 Code recon**
> **Input:** graph node or path ← `map-knowledge`, `index-code`
> **Output:** an explanation → next `trace-impact`
> **Works with:** `map-knowledge`, `index-code`, `teach-topic`, `onboard-people`
> **Shared rules:** reply in the user's language per `speak-plain`; generated content defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

Method of Understand Anything «understand-explain», without the plugin. Answers "how
does this work" for one node: what it does, who calls it, what it calls, what data flows,
where the risks are. The explanation is layered so a newcomer can stop at the first
paragraph and a reviewer can go straight to the risk list.

## When to use

- Before changing a module you do not own, so the change is not a blind edit.
- A newcomer, an on-call engineer or a reviewer asks «как это работает?».
- `trace-impact` showed a consumer and you need to know what that consumer does.
- Onboarding documentation needs one precise, sourced description of a component.
- A bug report names a function and the flow through it is unclear.

Skip for a one-line utility whose name and body already explain it; read the line and
answer inline. Do not use it as a substitute for reading the code you are about to edit.

## Inputs

- The node: an id from `.orbit/knowledge/graph.json`, a path, or a symbol from
  `.orbit/knowledge/index/`. If neither index exists, find the node yourself.
- Its files and line ranges: `jq '.nodes[] | select(.id=="<node>")' .orbit/knowledge/graph.json`,
  `ls .orbit/knowledge/index/nodes/`.
- Neighbours: incoming and outgoing edges from the graph, or `rg -n '<SymbolName>' src/`.
- The system context: `.orbit/knowledge/overview.md`, or `map-knowledge` if it is absent.
- History that explains "why": `git log --oneline -10 -- <file>`, `git blame -L <start>,<end> -- <file>`.

If no index or graph exists, build the minimum first: one `rg` for the symbol and the
file list around it. If the node does not exist at all, say so and show the closest
matches — never invent a module.

## Procedure

1. **Locate the node precisely.** From `.orbit/knowledge/graph.json` take the node's
   `files` ranges; otherwise `rg -n '<SymbolName>' src/` and pick the definition
   (`rg -n 'function <SymbolName>|class <SymbolName>|def <SymbolName>' src/`).
2. **Read only the needed lines.** A full-file read is expensive and noisy; read only the
   range you need (start line + limit), the definition plus the surrounding 20–40 lines.
3. **List incoming links (callers), 1–2 levels.** Who calls it and why: `rg -n '\b<SymbolName>\(' src/ --type ts`
   and the graph's incoming edges. Record each with `file:line`. An "unused" symbol with
   many callers is a different risk story from a dead one.
4. **List outgoing links.** What it calls, where it writes: DB, queue, HTTP, file, cache.
   Each with `file:line`; this is where hidden side effects show up.
5. **Walk one typical call end to end.** Input → validation → key branches → output or
   side effect. Name the branch that matters (the error path, the cache miss); a list of
   every `if` is not a flow.
6. **Explain in levels.** Level 1: one sentence — what and why. Level 2: one paragraph —
   how it is built. Level 3: details — branches, errors, config, and the non-obvious
   ("why the `sleep 3` here"). Answer at the level the person asked for and offer deeper.
7. **Name the risks.** No tests on the path, many incoming edges, global state, hidden
   side effects, a dependency that fails silently, a contract that is easy to break.
8. **Add the newcomer aid when relevant.** A one-line analogy for a non-native concept,
   and a pointer to a picture: `project-map` for the system, `project-diagram` for the
   flow. Language follows `speak-plain`: answer first, exact names in `code`.

## Output

An explanation in the user's language, anchored to the artifacts it came from. No new
file is required; the evidence lives at `.orbit/knowledge/graph.json` (node id) and
`.orbit/knowledge/index/nodes/<area>.md`. If the explanation is part of onboarding, the
final lines go to `docs/ONBOARDING.md` via `onboard-people`, and the system-level summary
to `.orbit/knowledge/overview.md`. Shape:

````markdown
**<Node>** — one sentence: what it does and why it exists.
How it's built: one paragraph — components, data, main branch.

| Link | With | Where |
|---|---|---|
| called by | <caller> | <file:line> |
| calls | <callee> | <file:line> |
| writes | <table/topic> | <file:line> |

Flow: A → B → C (input → branch → output/side effect)
Careful: <risk 1>; <risk 2>.
````

Filled examples of the risk line:

```text
Careful: no tests cover the retry path (src/queue/consumer.ts:120);
the handler swallows a 429 (src/queue/consumer.ts:144), so failures are invisible.
```

## Check

Before sending the explanation:

```bash
jq -e '.nodes[] | select(.id=="<node>")' .orbit/knowledge/graph.json > /dev/null && echo 'node exists'
rg -n '<SymbolName>' src/ | wc -l          # every cited link must appear here or in the graph
sed -n '<start>,<end>p' <file> | head -40   # the range you actually read
git log --oneline -3 -- <file>             # the "why" claim has a commit behind it
```

Pass rule: every caller/callee in the table has a `file:line` that resolves; the flow
names the real branch and the real side effect; each risk names the file and the
consequence; the first sentence answers "what and why" without jargon; no claim comes
from a file you did not read. If a link cannot be verified, drop it or mark it
`hypothesis`.

## Pitfalls

- **Explaining every line.** A line-by-line walkthrough buries the one branch that
  matters. Level 1 sentence first; details only on request.
- **Ignoring callers.** "It does X" is incomplete if five services call it and one passes
  a different shape. Incoming edges are part of what the code *is*.
- **Missing side effects.** The function also writes a row and publishes an event; a
  reader who sees only the return value will break something. List writes and publishes.
- **No evidence.** A link without `file:line` is a guess and gets rejected in review.
  Cite the line or label the claim as a hypothesis.
- **Reading the whole repository.** The index and graph exist to avoid that. If they do
  not, search for the symbol, not the codebase.
- **Jargon-first for newcomers.** A definition written in the domain's own terms teaches
  nothing. Add the one-line analogy, then the precise version.
- **Reusing the same explanation for every audience.** A newcomer and an on-call engineer
  need different depths; mention the level and offer the next one.

## Portability

No Claude-only feature: `rg`/`grep`, `jq`, `git` and a text editor are enough. Without
`jq`, read `graph.json` with `python3 -m json.tool` or the editor. Without the Orbit graph,
`rg -n '<SymbolName>'` gives the same neighbour list. Subagents are not needed — the
reading and the writing are inline. The explanation goes in the chat, and the artifacts
it references stay under `.orbit/knowledge/`; a picture can be produced by any diagram
tool, not only `project-diagram`.

## What's improved vs the source

- Explanation in levels (sentence → paragraph → details) instead of one long answer.
- A links table with `file:line` and a "careful" section — risks are visible at once.
- Every claim must resolve to a line that was actually read; hypotheses are labelled.
- Incoming and outgoing edges are both required, so side effects are not lost.
- A newcomer mode (analogy + pointer to `project-map`) without weakening the precise version.

## Based on

- [Understand Anything](https://github.com/Egonex-AI/Understand-Anything) — method «understand-explain» (MIT). Rewritten in our own words and improved — see "What's improved".

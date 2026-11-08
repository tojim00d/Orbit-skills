---
name: add-code-mode
description: '[Orbit 2.2.9 Architecture & data] Code mode for an MCP server: a sandboxed script against a big response; only the result enters context. Use when: «code mode», «MCP возвращает слишком много», «ответ не влезает в контекст», «сократи вывод MCP»; code mode MCP, reduce MCP token usage.'
---

# add-code-mode — "code mode" for an MCP server

> **Orbit · ② Build · step 2.2.9 Architecture & data**
> **Input:** an MCP server ← `rebuild-clean`
> **Output:** execute tool + sandbox → next `build-mcp`
> **Works with:** `build-mcp`, `compress-context`
> **Shared rules:** reply in the user's language; generated artifacts default to English; stay in scope; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

Large MCP tool responses — pod lists, thousands of users, logs — flood the model's context. Code mode changes what crosses the boundary: the model writes a **small script**, the server runs it in a sandbox against the full response, and only the script's output enters the context. Typical savings are 65–99%, and the full data never leaves the server.

## When to use

- A tool returns payloads that dominate the context: long lists, logs, resource dumps, thousands of rows.
- The agent needs a summary, a filter or a few fields from the response, not the whole body.
- The response forces constant truncation.
- A tool is useful only after post-processing (group, count, diff, extract) the model would otherwise do in prose.
- Not for small responses: the sandbox adds latency and attack surface for no gain; try `compress-context` first.

## Inputs

- the MCP server source: language, framework, tool registration files, which APIs it calls;
- the tools with large responses — find them by reading handlers or measuring: `rg -n "tools?\.(register|add)|server\.tool" src/`;
- realistic sample responses (or the API the server proxies) to benchmark against;
- the server's constraints: deployment target, available runtimes, whether subprocesses are allowed;
- `tools/references/sandbox-options.md` and `tools/references/benchmark-pattern.md` shipped with this skill.

If the server cannot host a sandbox (restricted runtime, no extra dependencies allowed), stop and say so: the fallback is server-side summarisation in the existing tool, not a fake sandbox.

## Procedure

1. **Understand the server.** Record: language (TS/JS, Python, Go, Rust), MCP framework, which tools return big responses, which upstream APIs they call. This determines the sandbox options; do not pick a sandbox before this is written down.
2. **Pick a sandbox** for the server's language and isolation needs — options with trade-offs are in `tools/references/sandbox-options.md`:
   - **TS/JS:** QuickJS (`quickjs-emscripten`, WASM) for strong isolation and zero native deps; `isolated-vm` for full V8 speed with stronger memory control, at the cost of a native addon.
   - **Python:** Pyodide (WASM) or a restricted subprocess with resource limits.
   - **Go/Rust:** an embedded JS engine (goja, boa) or a WASM runtime.
   Show the person 2–3 options with pros and cons; the choice is theirs.
3. **Design the tool.** Parameters: `command` (which API call to run), `code` (the processing script), `language` (default `js`). The tool fetches the upstream response, exposes it to the script as data (`DATA`), runs the script, and returns stdout.
4. **Set hard limits.** Execution timeout, memory cap, output size cap, and **no network, no filesystem, no environment secrets** inside the sandbox. These are not defaults to trust — enforce them in the executor and test them.
5. **Implement** the executor and the tool next to the existing ones (`keep-it-small`): one new module, no rewrite of existing tools.
6. **Test the three paths.** A script that reads data and returns a result; a script that throws (clear error, not a host stack trace); a script that tries network/filesystem access (denied). Add these to the server's test suite.
7. **Sanitise what reaches the prompt.** The sandbox environment holds no secrets; the returned output is capped; upstream auth headers never appear in script-visible data.
8. **Measure before/after** on 3–5 real queries per `tools/references/benchmark-pattern.md`: same query through the regular tool and through code mode, compare response size in tokens. Record the numbers — not the promised range.
9. **Decide with the person.** Enable code mode per tool only where the measurement shows a real reduction; keep the regular tool for small responses.
10. **Document the contract** for the model: when to use `command`+`code`, the `DATA` global, what is unavailable (network, files), and the output cap. Put it in the tool description, not only a README.

## Output

The tool schema (illustrative, adapt to the server's SDK):

```ts
{
  name: "execute",
  description: "Run a processing script against a large API response. globals: DATA (parsed JSON), console.log output is returned. no network, no files. Use for filtering/summarising big payloads.",
  inputSchema: {
    type: "object",
    properties: {
      command: { type: "string", enum: ["pods.list", "users.list", "logs.search"] },
      code:    { type: "string" },
      language:{ type: "string", enum: ["js"], default: "js" }
    },
    required: ["command", "code"]
  }
}
```

Decision record — `.orbit/task/<id>/design.md`, section "Code mode":

```markdown
## Code mode for <server>

**Tool chosen:** `execute` (command, code, language=js). **Sandbox:** QuickJS via quickjs-emscripten.
**Limits:** 2 s timeout, 32 MB, 8 KB output, no network/fs/env.
**Tools switched:** `pods.list`, `logs.search`; kept plain: `cluster.get`.
**Measured (n=4):** pods.list 42k → 380 tokens (−99%); logs.search 12k → 1.1k (−90%); cluster.get unchanged.
**Why not isolated-vm:** native build not allowed on the deploy image.
```

## Check

Done means the sandbox exists, is limited, and pays for itself:

```bash
rg -n "execute" src/                      # tool registered next to existing tools
npm test -- code-mode                     # or: pytest tests/code_mode.py
npm test -- code-mode-security            # escape attempts are denied
rg -n "DATA" src/code-mode/               # the only global exposed
curl -s "$MCP_URL" -d '{"tool":"execute","command":"pods.list","code":"console.log(DATA.length)"}' | jq -r '.result'
```

Pass rule: the executor enforces timeout, memory and output caps; network/filesystem/secret access from the script fails in a test; the tool is registered and visible; the benchmark table in `.orbit/task/<id>/design.md` shows ≥65% reduction on at least one real query with the scenario described; the plain tool remains for small responses.

## Pitfalls

- **Trusting the script.** The model writes it, so treat it as untrusted: sandbox, caps, no secrets in the environment. `eval` in the host process is not code mode, it is remote code execution.
- **Leaking secrets into `DATA`.** Passing the raw upstream response may include tokens or personal data. Filter fields before exposing, and cap output.
- **A sandbox with an escape hatch.** A subprocess "sandbox" that inherits the full environment and network is not isolation. Test the escape paths.
- **No measurement.** The promised "65–99%" is a range, not evidence. Benchmark real queries or the feature is unproven.
- **Re-fetching per step.** Running the upstream call on every script invocation multiplies API load; fetch once and pass the data in.
- **Over-strict defaults.** A 200 ms timeout or 1 KB output cap makes the tool useless; size limits from real scenarios, then add margin.
- **Hiding the contract.** If the model does not know `DATA` exists or that network is unavailable, it writes failing scripts. Put the contract in the tool description.
- **Keeping both paths everywhere.** Two ways to call the same data confuse routing; switch only the tools that measured a win.

## Portability

The method is language-agnostic: any MCP SDK can register the tool, and any sandbox with a programmatic API works. Run the design and benchmark inline; the helper references ship in `tools/` next to this file. Where WASM or an embedded engine is unavailable, the fallback is server-side summarisation or pagination in the existing tool — document that decision rather than bypassing isolation.

## What's improved vs the source

- Sandbox security requirements are a separate section (untrusted code, limits, no secrets).
- Mandatory before/after measurement on real queries instead of promised percentages.
- Concrete sandbox candidates per server language with the trade-offs that matter, plus a "not for small responses" boundary.
- Test list for the sandbox itself (happy path, crash, escape attempt) and output caps.
- A written tool contract and a decision record so `build-mcp` and `prove-done` have something to verify.

## Based on

- [code-mode](https://github.com/chenhunghan/code-mode-skill) — method «code-mode» (MIT). Rewritten in our own words and improved — see "What's improved".
- Helper files in `tools/` are taken from the source unchanged; licences: `tools/LICENSE.upstream`.

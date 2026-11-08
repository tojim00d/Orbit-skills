---
name: build-mcp
description: '[Orbit 2.2.10 Architecture & data] MCP server for an integration: agent-task tools, security, evaluations. Use when: «сделай MCP-сервер», «интеграция для агента», «MCP для API», «подключи сервис к агенту»; build MCP server, MCP integration.'
---

# build-mcp — build an MCP server for an integration

> **Orbit · ② Build · step 2.2.10 Architecture & data**
> **Input:** API to integrate ← `add-code-mode`
> **Output:** an MCP server → next `test-first`
> **Works with:** `add-code-mode`, `test-first`
> **Shared rules:** reply in the user's language; generated artifacts default to English; stay in scope; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

An MCP server gives the model tools for an external system: an API, a database, an internal service. A good server has **agent-friendly tools**, not a mirror of REST endpoints — the model should solve a task in one or two calls with a short, reliable response, not chain six paginated GETs.

## When to use

- An agent must operate a system that has no MCP server yet: issue tracker, cloud API, internal admin service, database.
- An existing MCP server exposes raw endpoints; the agent needs too many calls, too much data or unclear errors.
- A team wants a reusable integration instead of per-task code glue.
- The integration needs safety boundaries: read-only by default, writes gated, secrets out of prompts.
- Not for a one-off lookup: a server costs more than a direct API call; use the API inline.

## Inputs

- the API being integrated: docs/OpenAPI, auth scheme, rate limits, error format;
- the tasks the agent will solve, written as scenarios ("find the incident and its owner"), not endpoints;
- the language and packaging conventions of the target repo (`README.md`, existing packages, CI);
- the skill's guides: `tools/reference/node_mcp_server.md` (v1 SDK), `tools/reference/node_mcp_server_v2.md` (current stable v2 SDK), `tools/reference/python_mcp_server.md` (FastMCP), `tools/reference/mcp_best_practices.md`;
- the evaluation harness: `tools/reference/evaluation.md`, `tools/scripts/evaluation.py`, `tools/scripts/requirements.txt`.

If no scenario list exists, write 5–10 candidate questions first — tool design without tasks produces endpoint wrappers.

## Procedure

1. **Study the API and the scenarios.** For each scenario, trace which API calls an expert would make: filters, joins, paging. This trace is the raw material for tools.
2. **Design the tools by agent task.** One tool = one agent task, not one endpoint (e.g. `find_incident_and_owner`, not `list_incidents` + `list_users`). Descriptions state when to use the tool, its inputs and output shape, with one example.
3. **Constrain the parameters.** Enums instead of free strings, explicit required/optional, pagination hidden behind the tool. The model must not be able to ask for "everything".
4. **Keep responses short and useful.** Return the fields needed for decisions plus ids for follow-ups; paginate or hand large payloads to `add-code-mode`. Never return raw HTML, full logs or megabytes of JSON.
5. **Make errors actionable.** An error says what to do next: "repo not found — check `owner/name`" beats a bare 404. Never leak tokens, headers or internal hostnames in an error.
6. **Choose the stack and implement.** TypeScript (`@modelcontextprotocol/sdk` v1, `@modelcontextprotocol/server` v2) or Python (FastMCP); guides ship with this skill. Validate input with Zod/Pydantic, set request timeouts, read auth from environment variables or a secret store — never from code or prompt.
7. **Apply the security rules before writing tools.** Least-privilege token scoped to the read paths; write operations are **separate** tools with explicit confirmation (`create_ticket`, not `manage_ticket`); secrets never appear in responses or descriptions.
8. **Write the evaluation set.** 10 human-readable, read-only, independent questions with single verifiable answers, in the XML format from `tools/reference/evaluation.md`; save it next to the server (`eval/<server>.xml`).
9. **Run the evaluation.** Start the server, confirm tools are visible, then run `python3 tools/scripts/evaluation.py eval/<server>.xml -t stdio -c node -a "dist/index.js" -o /tmp/eval.json`. Fix descriptions and response shapes when an LLM cannot answer with only this server.
10. **Record the outcome.** Write the tool list, auth model and evaluation result into `design.md` and `evidence.md`, then hand over to `test-first` for the server's own unit/integration tests.

## Output

The server code where the repo keeps integrations (e.g. `mcp/<service>/`), the design record and the eval set. Tool definition example (TypeScript, v2 SDK style):

```ts
server.registerTool("find_incident_and_owner", {
  description: "Find an incident by a short query and return its id, status and owning team. " +
               "Use when the user asks 'who owns incident X' or needs an incident id. Read-only.",
  inputSchema: { query: z.string().min(2), status: z.enum(["open", "resolved"]).optional() },
  outputSchema: { incidentId: z.string(), status: z.string(), ownerTeam: z.string() }
}, async ({ query, status }) => {
  const hits = await api.searchIncidents({ query, status, limit: 10 });
  return { content: [{ type: "text", text: JSON.stringify(hits.map(pick3)) }] };
});
```

Evaluation file `eval/<server>.xml`, in the format the harness reads:

```xml
<evaluation>
  <qa_pair>
    <question>Which team owns the incident with id INC-1042?</question>
    <answer>payments-platform</answer>
  </qa_pair>
</evaluation>
```

`design.md` section — `.orbit/task/<id>/design.md`:

```markdown
## MCP server: <service>
**Tools:** find_incident_and_owner (read), list_deploys (read), create_incident (write, confirm).
**Auth:** token from env `SERVICE_TOKEN`; scopes incidents:read, deploys:read.
**Large responses:** list_deploys paginated; logs via `add-code-mode`.
**Evaluation:** 10/10 read-only questions passed — `.orbit/task/<id>/evidence.md`.
```

## Check

Done means the server runs, is safe, and usable by a model with no other context:

```bash
npm run build && node dist/index.js        # or: python3 -m server; server starts clean
rg -n "registerTool|@mcp.tool" src/ | wc -l   # tools registered as designed
rg -n "SERVICE_TOKEN|process.env|os.environ" src/   # auth only from env/secret store
rg -n "Authorization|token" src/ | grep -i "console\|return" # no secret leakage paths
python3 tools/scripts/evaluation.py eval/<server>.xml -t stdio -c node -a "dist/index.js" -o /tmp/eval.json
jq '.summary // .' /tmp/eval.json | head -30
```

Pass rule: server starts over the chosen transport; every tool in `design.md` is registered; 10 realistic evaluation questions pass, and failures are fixed by improving descriptions/response shapes, not by loosening questions; writes are separate confirmed tools; no secret appears in a response, log line or description; the report is copied into `.orbit/task/<id>/evidence.md`.

## Pitfalls

- **Endpoint mirror.** `list_x`, `get_x`, `update_x` triples push call orchestration onto the model and burn context. Design one tool per task and let it do the paging.
- **Fat responses.** Returning every API field makes the model skim and lose precision; select decision fields and ids.
- **Write tools mixed with reads.** A single `manage_*` tool that can delete is a security incident waiting for a prompt. Separate tools, explicit confirmation, least privilege.
- **Secrets in descriptions or errors.** Tool descriptions travel to the model; auth headers must never be echoed. Keep them in env/secret store and out of responses.
- **Evaluation as an afterthought.** Writing questions after shipping reveals that tools don't match tasks. Write them from scenarios first.
- **Loosening questions to pass.** If a question fails, fix the tool or its description; editing the answer hides the usability bug.
- **No timeout.** A hanging upstream call freezes the agent. Set per-call timeouts and return an actionable error.

## Portability

Any agent or framework that speaks MCP can consume the server; the build itself is plain code. Run the guides and evaluation inline; the harness needs the Anthropic client from `tools/scripts/requirements.txt` — alternatively test with any MCP client and record results in the same XML shape. Without subagents, do the design→implement→evaluate loop yourself; the artifact contract stays the same.

## What's improved vs the source

- Security rules up front (least privilege, writes separate, no secrets in responses).
- Link to `add-code-mode` for tools with large responses.
- Task-based tool design with concrete name/description/response rules instead of endpoint wrapping.
- A 10-question evaluation gate wired to the shipped harness, with the report stored as evidence.
- Version-aware guides (v1 and v2 TypeScript SDKs) and a design record the next skills can read.

## Based on

- [Skills by Anthropic](https://github.com/anthropics/skills) — method «mcp-builder» (Apache-2.0). Rewritten in our own words and improved — see "What's improved".
- Helper files in `tools/` are taken from the source unchanged; licences: `tools/LICENSE.upstream`.

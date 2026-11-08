---
name: compress-context
description: '[Orbit 3.4.5 Memory & hand-over] Shrink large responses and history in your LLM apps: library, own trimmer or code mode. Use when: «слишком много токенов», «сжать логи для LLM», «дорогой промпт», «сократи историю»; reduce tokens.'
---

# compress-context — shrink large responses and history in an LLM app

> **Orbit · ③ Operate · step 3.4.5 Memory & hand-over**
> **Input:** your own LLM app and its real traffic/logs — from `track-debt`
> **Output:** a compression change with measured tokens, recorded in `.orbit/task/<id>/evidence.md` → next `review-observability`
> **Works with:** `add-code-mode`, `prove-done`, `review-security`
> **Shared rules:** reply in the user's language; generated artifacts default to English; use only your own app and data; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

For **your own** LLM-based apps: logs, JSON, search results and chat history bloat the prompt and the bill. Compression keeps what matters (errors, stack traces, first and last items, outliers) and drops repetition. Measure before and after on real data; a saving you did not measure is a claim, not a result.

## When to use

- Prompt tokens and cost grow because tool output (logs, JSON, search results) is pasted in verbatim.
- Chat history is replayed whole and the context window is the limiting factor.
- Latency is dominated by input size, not by generation.
- An LLM app works in production and the bill is reviewed (`track-debt`, `review-observability`).
- A large tool response must be summarized before it reaches the model, without losing errors.

Do **not** compress everything by default: small, structured responses (a JSON object with 10 fields) are cheaper to keep than to trim. Do not compress data you cannot safely store.

## Inputs

- the app and the code path that builds messages/tool results;
- a sample of real data: logs, JSON, search results, chat histories — scrubbed of secrets and personal data;
- a token counter (the SDK's own usage numbers or a local tokenizer) and a baseline measurement on the same sample;
- control questions with known correct answers, to check quality after compression;
- `.orbit/task/<id>/brief.md` for the target saving and the acceptance check;
- the approved package registry for the environment.

If there is no real sample, compression cannot be measured — build one from the app's actual traffic first. If tokens can only be estimated, say the measurement is an estimate and keep the same method before and after.

## Procedure

1. **Establish the baseline.** Take 3–5 representative requests, log `tokens_before` (prompt + tool output) and the current cost, and save the numbers with the input sample. This is the comparison point for everything below.
2. **Choose the option by constraint**, not by preference:
   - **Headroom library** (Python, runs locally) when the app is Python and a library is acceptable;
   - **your own trimmer** when TypeScript without a sidecar, or a strict dependency policy;
   - **code mode** when individual tool responses are huge — see `add-code-mode`.
   ```bash
   pip install headroom-ai        # approved registry; pin the version in the lockfile
   ```
3. **Implement option 1 — Headroom** at the message-building boundary:
   ```python
   from headroom import compress
   result = compress(messages, model=MODEL_NAME)     # OpenAI/Anthropic message dicts
   # send result.messages; log result.tokens_before / result.tokens_after
   ```
   In CI and air-gapped networks set `HEADROOM_OFFLINE=1` (no downloads or telemetry). TypeScript needs the Python proxy; if a sidecar is not acceptable, use option 2.
4. **Implement option 2 — your own trimmer** at the tool boundary: keep lines matching `ERROR|FATAL|Exception`, the first and last N lines, and aggregates instead of lists; drop repeated stack frames and ANSI noise. The trimmer is a pure function with tests.
   ```python
   KEEP = re.compile(r"ERROR|FATAL|Exception|Traceback")
   def trim(lines, head=20, tail=40):
       hits = [l for l in lines if KEEP.search(l)][:200]
       return "\n".join(hits + lines[:head] + lines[-tail:])
   ```
5. **Implement option 3 — code mode** for tools with huge responses: let the model write a short program that queries the payload and returns a small result, so the payload never enters the prompt (`add-code-mode`).
6. **Measure again on the same sample.** Log `tokens_after` for every request; compare per request, not only in total — a mean can hide a request that got larger.
7. **Check quality, not just size.** Run the control questions before and after; a wrong answer after compression is a regression regardless of the saving. Record both token counts and the answer verdict.
8. **Guard the edges.** Empty tool output, a single giant line, a 10 000-line log, a non-UTF-8 payload — each is a test of the trimmer; the compression must not crash the request path.
9. **Roll out and observe.** Ship behind a config flag, watch error rate and answer quality in `review-observability`, and keep the old path selectable until the measurement is stable.
10. **Record the result** in `.orbit/task/<id>/evidence.md` (before/after table, sample size, date, versions) and, if it is a durable finding, in `.orbit/learnings/`. Update the prompt/cost notes the team uses.

## Output

The change in the app plus a measured result. Record in `.orbit/task/<id>/evidence.md`:

```markdown
## Context compression — <date> — model <MODEL_NAME>
Sample: 5 real requests (mixed log/JSON/history) | option: own trimmer at tool boundary
| request | tokens before | tokens after | saving | control answer |
|---|---|---|---|---|
| r1 | 48 200 | 9 400 | 80% | correct |
| r2 | 12 100 | 4 800 | 60% | correct |
Conclusion: mean input -72%; control questions 5/5 before and after; flag `compress.tool_output`.
```

The implementation is a small, tested change (a trimmer function, a compression call at the boundary, or a code-mode tool). No prompt rewrite is implied; comments stay out of the artifact.

## Check

```bash
pytest tests/ -k "trim or compress" -q                 # edge cases and trimmer unit tests
python3 - <<'EOF'                                      # verify the recording has both numbers
import re, pathlib
t = pathlib.Path(".orbit/task/<id>/evidence.md").read_text()
assert "tokens before" in t and "tokens after" in t
print("measurement recorded")
EOF
grep -n 'HEADROOM_OFFLINE\|compress\.' .env* config/ 2>/dev/null | head
git diff --stat | tail -3
```

Pass rule: a baseline and an after measurement exist on the same sample with both token counts; control questions pass at least as well as before; edge-case tests (empty, giant line, non-UTF-8) pass; the change is behind a flag and revertible; no secrets or personal data in the samples or the artifact. Put the verdict in `.orbit/task/<id>/evidence.md` via `prove-done`.

## Pitfalls

- **Promising a saving before measuring.** "This will cut tokens in half" without a before/after on real traffic is marketing. Measure first, then state the number.
- **Optimizing the wrong layer.** Compressing a 2 KB JSON object adds risk for nothing; profile the actual prompt composition before touching anything.
- **Dropping errors.** A trimmer that keeps the first N lines and loses the stack trace makes the model confidently wrong. Always keep error and exception lines.
- **A sidecar you cannot operate.** The TypeScript proxy is a new service to run, monitor and secure; if the team cannot own it, choose the trimmer.
- **Compression without quality checks.** A 90% saving that breaks answers is a regression. Control questions before and after, every time.
- **Sending personal data to a third party.** Offline mode or a local trimmer in closed networks; compressed data inherits the storage rules of the original.
- **No rollback.** Ship behind a flag; a compression bug in the request path takes the whole app down.

## Portability

Python examples run with any agent and model; the trimmer option is language-agnostic and needs only the standard library. Without subagents, implement and measure inline. No Claude Code features are required. In air-gapped networks: `HEADROOM_OFFLINE=1`, packages from the approved internal mirror, and the local trimmer as the default.

## What's improved vs the source

- Three options for different constraints (library, own trimmer, code mode) instead of one tool.
- A required quality check of answers after compression, not just token counts.
- A baseline-then-measure protocol that makes the saving a verifiable number per request.
- Edge-case tests for the trimmer (empty, giant line, non-UTF-8) before rollout behind a flag.
- Security rules (offline mode, approved registry, personal-data storage) are part of the method, not an afterthought.

## Based on

- [Headroom](https://github.com/headroomlabs-ai/headroom) — method «headroom» (Apache-2.0). Rewritten in our own words and improved — see "What's improved".

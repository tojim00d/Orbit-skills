---
name: recall-history
description: '[Orbit 1.2.6 Code recon] Recall past work: memory, .orbit/learnings, ADRs, git, past sessions, MRs. Use when: «что мы уже делали», «вспомни», «было ли такое», «мы это уже пробовали», «найди прошлое решение»; recall, what did we do before.'
---

# recall-history — remember what was already done

> **Orbit · ① Understand · step 1.2.6 Code recon**
> **Input:** a topic
> **Output:** findings with sources → next `keep-learnings`
> **Works with:** `clarify-task`, `keep-learnings`, `handoff-session`
> **Shared rules:** reply in the user's language per `speak-plain`; generated content defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

claude-mem's method without a background worker: find past work on a topic before
redoing it. The most expensive agent failure is not a wrong code change — it is a
correctly executed change to a problem the team already solved, or already rejected, six
weeks ago. This skill searches the project's memory first and reports evidence, not
impressions.

## When to use

- Before starting a task that sounds familiar: "add retry", "fix the export", "why is CI red".
- The person asks «мы это уже делали?», «было ли такое?», «вспомни, мы обсуждали».
- `clarify-task` hits a decision that must already exist somewhere.
- A design option feels rejected before — check who rejected it and why.
- A newcomer asks "why is it like this?" and the answer is in history, not in the code.

Skip for a genuinely new topic in a new repository: if the project has no history, say
so in one line instead of padding the search.

## Inputs

- The topic, reduced to searchable terms: a symbol, an error string, a feature name, a
  ticket key.
- The project root and its identifier: `git rev-parse --show-toplevel`,
  `git remote -v` (the repository name).
- The local memory location if the agent keeps one (Claude Code's project memory
  directory and `MEMORY.md`), when enabled.
- Team memory already in the repository: `.orbit/learnings/`, `docs/adr/`,
  `openspec/changes/archive/`.
- The tracker and its CLI availability: `glab` or `gh`, or a tracker URL.

If the topic is too broad ("performance"), narrow it with the person to one symbol or one
incident before searching — an unbounded search returns everything and answers nothing.

## Procedure

1. **Narrow the topic to one searchable string.** Prefer a symbol, an endpoint, an error
   code or a ticket key over a general theme. Write the string down; every source below
   is searched with it.
2. **Search agent memory first.** Look in the project's memory directory and `MEMORY.md`
   (if the agent keeps one): facts about the user, standing rules, project notes. This is
   the cheapest source and often carries the decision itself.
3. **Search the repository's team memory.** `.orbit/learnings/*.md` (written by
   `keep-learnings`), `docs/adr/`, `openspec/changes/archive/`:

   ```bash
   rg -n -i '<topic>' .orbit/learnings/ docs/adr/ openspec/changes/archive/ 2>/dev/null
   ```

4. **Search git history** for when the topic appeared, disappeared or was discussed:

   ```bash
   git log --oneline --all -S '<symbol>' | head      # when a symbol appeared/disappeared
   git log --oneline --all --grep '<topic>' -i | head
   git log -p --follow -- <file> | head -200
   ```

5. **Search past agent sessions** (local transcripts), only matching fragments:

   ```bash
   grep -rl --include='*.jsonl' -i '<topic>' ~/.claude/projects/<project-dir>/ | head
   grep -o '.\{0,200\}<topic>.\{0,200\}' <transcript.jsonl> | head
   ```

   Read fragments, not whole transcripts — sessions are long and may contain unrelated
   context or secrets.
6. **Search tasks and MRs.** `glab mr list --search '<topic>'` or
   `gh pr list --search '<topic>'`; in the tracker, search the topic and the ticket key.
   A rejected MR is the strongest evidence that an approach was considered.
7. **Verify each hit against the current state.** A commit from six months ago may be
   superseded: check `git log --oneline -5 -- <file>` and read the current code. Memory
   can be stale; the repository is the source of truth.
8. **Answer with sources first.** State what was found and where — commit sha, `file:line`,
   MR number, date — then the conclusion. Found nothing → say so and list the places you
   searched. Never imply a search you did not run.

## Output

Findings with sources, answered in the user's language, plus the decision on what to
remember. Nothing is written by this skill; `keep-learnings` writes team memory to
`.orbit/learnings/<topic>.md`, and a non-obvious fact about the user or project goes to
agent memory (one entry = one fact). Shape:

```markdown
**Found:** <one-sentence answer>
1. <what> — <source: commit <sha> / MR !<n> / file:line / date>
2. <what> — <source>
**Not found in:** agent memory, .orbit/learnings/, docs/adr/, git -S, MR search.
**Conclusion:** <what this means for the task now>; still current? yes/no.
```

Example of a filled answer:

```markdown
**Found:** CSV export was implemented and reverted in March.
1. Endpoint added — commit a1b2c3d, MR !214 (merged 2026-03-04).
2. Reverted — commit e4f5a6b, MR !231: "OOM on 100k rows" (2026-03-11).
3. Learning: .orbit/learnings/export-oom.md — stream rows, do not load all.
**Conclusion:** the old approach is not reusable as-is; the streaming retry is still open.
```

## Check

Before reporting the answer:

```bash
git show -s --oneline <sha>            # every cited commit exists
test -f .orbit/learnings/<topic>.md    # every cited learning file exists
rg -n '<topic>' .orbit/learnings/ docs/adr/ | head
git log --oneline -3 -- <file>         # the cited file still holds the claim
```

Pass rule: every claim has a source (commit sha, MR number, `file:line` or dated memory
entry); every cited commit and file resolves; the answer says whether the finding is
still current; a "not found" answer lists every place searched; no transcript content,
secret or personal data is quoted beyond the matching fragment. If a source does not
resolve, drop the claim instead of softening it.

## Pitfalls

- **Redoing solved work.** The most common cost of skipping this skill. Search before
  design, not after the prototype.
- **Trusting stale memory over code.** A memory entry or an old ADR may describe a state
  that no longer exists. Verify against the current file and commit.
- **Saying "nothing found" without a trail.** Without the list of places searched, the
  person cannot tell a real absence from a lazy search. List them.
- **Reading whole transcripts.** Sessions are long, token-expensive and may contain
  unrelated secrets. Read only the matching fragments.
- **Quoting private data.** A transcript or memory may contain names, tokens or customer
  data. Quote the fact, not the personal content; never paste a secret.
- **Searching one source only.** Git finds commits, not decisions; decisions live in
  ADRs, learnings and MR discussions. Search all five sources.
- **Confusing "was discussed" with "was decided".** A comment in a thread is not a
  decision. Report it as discussion and name where the decision was made, or that none
  was found.

## Portability

No Claude-only feature. Claude Code memory and transcripts are one source among five;
without them, run steps 3–6 with `rg`, `git` and the tracker CLI. On Codex/Qwen/DeepSeek/
Cursor, keep the same file-based memory under `.orbit/learnings/` and `docs/adr/` — that
is the portable part. If `~/.claude/projects/` does not exist, skip step 5 and say so.
Without `glab`/`gh`, use the tracker's web search. Subagents are not required; the
searches are cheap and inline.

## What's improved vs the source

- No background memory worker needed: search over agent memory, `.orbit/learnings/`, ADRs, git and past session transcripts.
- Every answer cites its source; "not found" lists where you looked.
- A verification step against the current code, so stale memory cannot masquerade as fact.
- Explicit privacy rules for transcripts and memory: fragments only, no secrets.
- The five sources are ordered cheapest-first, so the common case costs one `rg` call.

## Based on

- [claude-mem](https://github.com/thedotmack/claude-mem) — method «mem-search» (Apache-2.0). Rewritten in our own words and improved — see "What's improved".

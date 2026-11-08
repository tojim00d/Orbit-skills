---
name: shape-idea
description: '[Orbit 1.1.3 Intake] Idea → agreed design: talk about why, 2–3 approaches, design in chunks before code. Use when: «давай подумаем», «как лучше сделать», «брейншторм», «предложи варианты», «обсудим подход»; brainstorm, design options, approach.'
---

# shape-idea — from idea to an agreed design

> **Orbit · ① Understand · step 1.1.3 Intake**
> **Input:** requirements / brief ← `capture-requirements`
> **Output:** design.md → next `map-knowledge`
> **Works with:** `research-sources`, `project-diagram`, `write-spec`
> **Shared rules:** reply in the user's language per `speak-plain`; generated content defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

When "what" is clear but "how" is not. Choose the approach **before** code, together with
the person — don't build what the agent happened to think was right. The expensive
mistake this skill prevents is a design that nobody agreed to, discovered in review.

## When to use

- New feature, UI, service or rework with several reasonable paths.
- The person asks "let's think", "what's the best way", «предложи варианты».
- Requirements exist but no one has decided the architecture, data shape or API.
- Two implementations are plausible and the choice changes the cost of later changes.

Skip when the approach is obvious or already given by the brief — then go straight to
`write-spec` and do not perform a conversation for its own sake.

## Inputs

Read before proposing anything, so the options are rooted in the project:

- `.orbit/task/<id>/brief.md` from `clarify-task` — goal, done criteria, scope;
- `.orbit/task/<id>/requirements.md` from `capture-requirements` — LD/UC/R/NF;
- the existing code: `rg -n '<domain word>' src/ | head -40`, and the system shape from
  `.orbit/knowledge/overview.md` or `jq '.nodes[] | .id' .orbit/knowledge/graph.json`;
- how similar things are solved here and elsewhere: `git log --oneline -20`, `docs/adr/`,
  then `research-sources` for external practice;
- the team's constraints: stack, versions, deadline (from requirements).

If an input is missing, say so in one line and proceed with a labelled assumption — a
design built on a guessed requirement is a rejected design.

## Procedure

1. **Collect what is known.** Read the inputs above. If everything important is already
   stated — goal, constraints, non-functionals — skip the conversation and propose a
   design directly. The fork is explicit: known → propose; unknown → talk.
2. **Talk about "why", one question at a time.** Ask specific questions about this
   project, not generic ones: "Why an export endpoint and not a scheduled email?" The
   motivation lets you make the hundred small decisions the way the person would.
3. **Recon before proposing.** See how the repository already handles a similar case
   (`rg -n '<similar pattern>' src/`) and how the world does it (`research-sources`).
   An option that ignores existing code is not an option, it is a rewrite.
4. **Present 2–3 approaches.** For each: one-line essence, pros, cons, and the cost of
   changing it later. Recommend one and say why. A single "only right" option hides the
   trade-off from the person who pays for it.
5. **Show, don't tell.** Where a picture beats text, sketch it: a call flow
   (`project-diagram`), a screen mock-up, or a sample API call/response
   (`curl -s <url> | head -20` against a stub). Keep the sketch small; it is for the
   decision, not the documentation.
6. **Design in chunks, 200–300 words at a time.** Confirm each chunk before the next:
   architecture → data → API → errors and edges → tests. A person can say "no" to one
   chunk cheaply; saying "no" to a finished design is expensive.
7. **Record the rejected options.** Why an approach lost matters as much as why the
   winner won: reviewers, `instruct-agents` and the next session read the rejection, not
   the chat.
8. **Write it down before any code.** Create `.orbit/task/<id>/design.md` using the
   template below. Code before an agreed design is a guess with extra steps.
Next: `write-spec` → `run-spec-loop`.

## Output

`.orbit/task/<id>/design.md` — the design that the spec and the implementation will
follow:

```markdown
# design: <id>
**Goal**
<from brief.md, one paragraph>
**Chosen approach**
<name> — why it wins: <2–3 reasons>.
**Rejected approaches**
- <name> — pros / cons; rejected because <reason>; cost to change later: <low/medium/high>.
**Components and flows**
<modules/services touched>; flow: A → B → C (mermaid or arrows).
**Data**
Entities, storage, migrations, retention.
**API**
Endpoints or events: method, path, request, response, errors.
**Errors and edges**
Empty, permission denied, concurrency, retry, timezone, limits.
**How we'll verify**
The commands/tests that will prove the design works.
**Open questions**
Each with an owner.
```

Example of a chunk the person confirms:

```markdown
**API**
GET /reports/orders.csv?from=<date>&to=<date>
200 → text/csv; charset=utf-8, header row, one row per order.
400 → {"error":"invalid_range"} when from > to.
Auth: existing bearer middleware; no new permission.
```

## Check

Before handing `design.md` to `write-spec`:

```bash
test -f .orbit/task/<id>/design.md && grep -n '^## ' .orbit/task/<id>/design.md
rg -c '^## Rejected approaches' .orbit/task/<id>/design.md
rg -n '^## (Goal|Chosen approach|Components and flows|Data|API|Errors and edges|How we' .orbit/task/<id>/design.md
rg -n 'TODO|TBD' .orbit/task/<id>/design.md
```

Pass rule: every required section exists and is non-empty; at least two approaches are
listed, one chosen and the others with a reason; the chosen approach names its evidence
(`file:line`, a requirement id, or a `research-sources` link); errors and edges name the
specific cases, not "handle errors"; "How we'll verify" names at least one command; the
person confirmed the last chunk. No code was written before this file existed.

## Pitfalls

- **Asking what the code already answers.** "Where is the API defined?" when `rg` would
  answer in one call reads as not having looked. Read, then ask only the real unknown.
- **Five questions in one message.** The person answers the easiest and ignores the rest.
  One question at a time, each with a proposed answer.
- **One "only right" option.** Without alternatives the person cannot judge the trade-off,
  and the design becomes the agent's private choice. Always 2–3 options.
- **Designing in one dump.** A 1 500-word design arrives as a fait accompli. Chunks of
  200–300 words with a confirm point produce agreement, not review comments.
- **Skipping recon.** An option that duplicates an existing module looks clever and is
  rejected in review. Search first.
- **Code before agreement.** Writing the first file "to check the design" turns the
  discussion into a defence of code already written. Design first, then `write-spec`.
- **Losing the rejections.** Without the "why not", the same rejected option returns in
  three weeks. Write it into `design.md`.

## Portability

No Claude-only feature: it is a conversation protocol plus one Markdown artifact, with
`rg`/`git`/`jq` for recon. Without subagents or slash commands, run it inline: read the
inputs with the agent's file tools, ask in the chat, write `design.md` with the file
tools. In a non-interactive run, replace the conversation with 2–3 labelled options,
choose one, mark the open questions `[assumed]`, and let a human veto before
`write-spec`. In Claude Code the `/orbit:orbit` router enters this skill at step 1.1.3.

## What's improved vs the source

- Explicit fork "everything is known → design right away", no conversation for its own sake.
- Mandatory 2–3 approaches with cost-of-change and recorded rejections — read later by reviewers and `instruct-agents`.
- Output is `design.md`, the input to the spec, not a chat transcript.
- Chunked confirmation (200–300 words) instead of one big design dump.
- A "How we'll verify" section, so the design is testable before it becomes a spec.

## Based on

- [Superpowers](https://github.com/obra/superpowers) — method «brainstorming» (MIT). Rewritten in our own words and improved — see "What's improved".

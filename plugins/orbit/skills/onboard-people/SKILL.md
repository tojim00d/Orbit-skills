---
name: onboard-people
description: '[Orbit 3.2.1 Explaining] Guide for a newcomer: what it is, map, run, end-to-end flow, careful spots, first tasks. Use when: «онбординг», «гид для новичка», «напиши онбординг для нового разработчика», «с чего начать в проекте»; onboarding guide, newcomer guide.'
---

# onboard-people — a guide for someone new to the project

> **Orbit · ③ Operate · step 3.2.1 Explaining**  
> **Input:** graph + repo ← `publish-design-docs`  
> **Output:** `docs/ONBOARDING.md` → next `teach-topic`  
> **Works with:** `project-map`, `explain-code`  
> **Shared rules:** reply in the user's language per `speak-plain`; generated content defaults to English; stay in scope; artifacts go to `.orbit/` (contract: `ARTIFACTS.md` at the pack root).

Method of Understand Anything "understand-onboard": from the knowledge graph and the code, a guide that gets a colleague oriented within an hour. It is not a copy of the README — it is the ordered set of facts a person needs before their first real change: where the system lives, how to run it, one end-to-end flow, what is fragile, and what to do in the first hour.

## When to use

- A new teammate joins and asks "where do I start?" — this is the reusable answer.
- A hand-over: someone leaves the project or changes team; the outgoing owner writes the guide while the knowledge is still fresh.
- The team grows around a service that nobody can comfortably explain end to end.
- After a big refactor or ownership change — refresh the guide so it does not teach the old system.
- Not for a single question ("how do I run tests?") — answer it directly and, if it repeats, add it to the guide.

## Inputs

- `.orbit/knowledge/overview.md` and `.orbit/knowledge/graph.json` — the base; if they are missing, run `map-knowledge` first;
- `project.html` from `project-map` (or a `project-diagram` picture) — link it instead of redrawing a map in prose;
- `README.md`, CI config (`.github/workflows/*.yml`, `.gitlab-ci.yml`), Helm chart, `values.yaml`, `docker-compose.yml`, `Makefile`, `package.json` / `go.mod` / `pyproject.toml` — these define the real run commands;
- `CODEOWNERS`, team channels, ADRs (`docs/adr/`), `docs/`, `.orbit/learnings/`.

If the graph is missing, either run `map-knowledge` or assemble the facts from the README and the manifests, and mark the gaps explicitly.

## Procedure

1. **Establish the frame in three sentences.** What it is, who it is for, where it lives — cluster, namespace, public URL. Verify each claim from the chart, the service manifests or the deploy config, not from memory.
2. **Map the system.** Link `project.html` (or the static diagram) and add a table of 5–10 modules with the file to open first, in `path:line` form. The newcomer opens files, so every module needs a starting point.
3. **Verify running it locally.** Clone into a scratch directory and copy the exact commands and tool versions that worked; record what failed and why.

   ```bash
   git clone <repo-url> /tmp/<repo>
   cd /tmp/<repo> && make test          # or: npm ci && npm test
   docker compose up -d && open http://localhost:8080
   ```

   Everything not actually executed is written as `not verified` — never as a command that "should" work.
4. **Trace one typical request end to end.** Entry point → handler → storage → response. List the files at each hop and one command that exercises the flow (`curl -s localhost:8080/api/...` or the existing test).
5. **Document how to change things.** Branch naming, commit format (`commit-clean`), OpenSpec (`run-spec-loop`), MR process, CI gates, deploy path. Quote the real config file and line, e.g. `.github/workflows/ci.yml:12`.
6. **Name the careful spots.** Fragile modules, shared databases, migrations, feature flags, secrets handling, on-call rotation. Each entry says "don't touch without X" and names the owner.
7. **Who to ask and what to read.** `CODEOWNERS` groups, channels, ADRs, previous design docs. A newcomer should not need to guess who reviews what.
8. **Give three first tasks.** Small, safe, and each ends with a check: read X and explain it back, run Y and observe Z, change one test inside the existing test file. These create the first success, which is what keeps people.
9. **Write the guide and test it.** Create `docs/ONBOARDING.md` from the template below, then hand it to someone (or a fresh agent with no context) and fix every place they stumble.

## Output

`docs/ONBOARDING.md` — eight sections, in the order a newcomer needs them:

```markdown
# Onboarding: <project>

## 1. What and why
Three sentences: audience, purpose, where it lives (cluster, namespace, URL).
## 2. Map
Link to project.html. Table: module | what it does | open first (path:line).
## 3. Run locally
Verified commands with versions. Unverified ones marked "not verified".
## 4. A typical request
One end-to-end scenario with the files touched at each hop.
## 5. How to change things
Branches, commit format, OpenSpec, MR, CI gates, deploy.
## 6. Careful here
Fragile spots and shared resources; owner for each.
## 7. Who to ask and what to read
CODEOWNERS groups, channels, ADRs, docs.
## 8. First tasks
Three tasks: read X, run Y, change Z in a test — each with a check.
```

Record the source commit or date in the file, and note the guide in `.orbit/task/<id>/review.md` when it is part of a tracked change.

## Check

```bash
test -f docs/ONBOARDING.md
grep -c '^## ' docs/ONBOARDING.md          # 8 sections
grep -n 'not verified' docs/ONBOARDING.md  # every unverified command is marked
grep -nE '^[a-z/._-]+\.(go|py|ts|js|yaml|yml):[0-9]+' docs/ONBOARDING.md  # path:line refs exist
```

Pass rule: all eight sections are present; every command is either verified in this session or marked `not verified`; every `path:line` reference resolves to an existing file and line; a person with the repo can reach a running system and complete first task 1 within an hour; no secret, token or private hostname appears in the guide.

## Pitfalls

- **Commands copied from memory or from a blog.** The newcomer's first hour is lost to a stale flag. Run every command yourself; mark anything you did not.
- **Version drift.** "Works on my machine" with Node 18 when the repo pins Node 20. Read `.nvmrc`, `engines`, `go.mod`, `pyproject.toml` and write the pinned version.
- **A README clone.** Repeating marketing copy wastes the one hour the guide exists to save. Keep only what changes behaviour or expectations.
- **Unexplained jargon.** Internal codenames mean nothing to a newcomer; define them once or link the glossary.
- **A stale map link.** A `project.html` that describes the old architecture teaches the wrong system; regenerate it or it will lie.
- **No owner on a careful spot.** "Careful here" without a name is a warning nobody can act on.
- **Secrets in examples.** Real tokens, internal IPs and customer IDs leak the moment the guide is shared.

## Portability

Plain Markdown plus the repo's own tools: no Claude-only features, no subagents, no slash commands. Any agent can read the knowledge graph and the repo with its file tools and write the guide. Without `project-map`, link the README or add a small ASCII map; without `map-knowledge`, build the module table from the source tree and mark the guide as "assembled from code, not from the graph".

## What's improved vs the source

- Every command in the guide is verified or marked "not verified".
- Three first tasks for the newcomer to touch the system right away.
- An explicit freshness marker (source commit or date) so the guide announces when it is stale.

## Based on

- [Understand Anything](https://github.com/Egonex-AI/Understand-Anything) — method «understand-onboard» (MIT). Rewritten in our own words and improved — see "What's improved".

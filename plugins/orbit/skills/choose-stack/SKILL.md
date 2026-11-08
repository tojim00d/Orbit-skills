---
name: choose-stack
description: '[Orbit 2.2.4 Architecture & data] Choose/confirm the stack: existing stack by default, ecosystem, platform, pinned versions. Use when: «какой стек», «выбери фреймворк», «версии», «на чём писать»; tech stack, pick a framework, pin versions.'
---

# choose-stack — choose or confirm the tech stack

> **Orbit · ② Build · step 2.2.4 Architecture & data**
> **Input:** architecture ← `design-services`
> **Output:** `.orbit/task/<id>/design/stack-selection.md` → next `shape-modules`
> **Works with:** `research-sources`, `design-services`, `shape-modules`
> **Shared rules:** reply in the user's language; generated artifacts default to English; stay in scope; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

This is **not** language shopping. The team's existing stack wins by default; alternatives are considered only if it objectively doesn't fit this service. The output is a decision with pinned versions that CI can install today — not a survey of the ecosystem.

## When to use

- A new service or component is starting and its runtime/framework/drivers must be fixed before code.
- An existing service needs a confirmation that the current stack still fits, or one component must be replaced.
- Someone proposes a new framework/language and the decision needs evidence instead of taste.
- Versions must be pinned for a release or a rebuild and the current ones are floating.
- **Not** for tiny scripts or throwaway prototypes: use what is already installed.

## Inputs

- the architecture: `.orbit/task/<id>/design/architecture-design.md` — service shape, boundaries, runtime (Kubernetes vs serverless), data store family;
- the existing stack: `package.json`, `pyproject.toml`, `go.mod`, `pom.xml`, `Dockerfile`, CI config; read them before proposing anything;
- the company platform: approved base images, CI runners, monitoring, internal package registry (from `setup-repo` / platform docs);
- team ownership: who maintains the service, on-call rotation, onboarding docs;
- version facts from `research-sources`: registry and release pages, not memory.

If the architecture is missing, run `design-services` first; stack decisions without boundaries are guesswork. If the registry is unreachable, record the checked date and mark versions as unverified — never silently pin from memory.

## Procedure

1. **Assess the current stack.** List what the team already runs: language/runtime, framework, database driver, test runner, build tooling, deployment target. State in one paragraph whether it fits *this* service shape.
2. **Derive criteria from the service shape.** Heavy domain logic → strong typing and a mature framework; thin async glue → a light runtime; integrations → mature SDKs and webhook tooling. Write the criteria down before looking at candidates.
3. **Check ecosystem coverage.** For every needed protocol, database, auth scheme and client, name a mature library and its current version. A key need with no library **disqualifies** the candidate — "we'll write it ourselves" is not a mitigation, it is scope.
4. **Check platform fit.** Is the runtime supported by CI, base images, monitoring and the internal registry? If the platform team cannot deploy it, it is not a candidate regardless of technical merit.
5. **Weigh cost and ownership.** Licences (including transitive), runtime resources, hiring and on-call load. Team experience breaks ties between otherwise fit options; it does not excuse an unfit stack.
6. **Build the candidate matrix only if alternatives are genuinely needed.** Candidates × criteria, each cell a fact or a citation, not a vibe. If the existing stack passes, write the matrix with one candidate and say so.
7. **Recommend with rationale and a failure plan.** One primary choice, why it beats the runner-up, and for critical services what happens if it proves wrong: migration cost, exit path, what is locked in.
8. **Pin every version.** Runtime, framework, database driver, key libraries, build tools — exact versions with the registry lookup that proved they exist. Record the source (`npm view`, `pip index versions`, release page) and the date checked.
9. **Verify installability.** Install from a clean state with the pinned versions on the target platform base image; a version that cannot resolve in the internal registry is not pinned, it is imagined.

## Output

`.orbit/task/<id>/design/stack-selection.md` (later published to `docs/design/<service>/`):

```markdown
# Stack selection: <service>

## Current stack assessment
Runs Node 20 + Fastify + PostgreSQL 16; fits the request shape; no change needed except the queue client.

## Candidate matrix (only if alternatives were needed)
| criterion | current (Node 20/Fastify) | alternative (Go 1.22) |
|---|---|---|
| async I/O fits | yes | yes |
| ecosystem for <protocol> | mature (`<lib>` 4.2) | adequate |
| platform support | base image + CI ready | needs new image |

## Recommendation
Keep Node 20/Fastify. Runner-up Go rejected: platform image and SDK maturity lag; no requirement pushes us off the current stack.

## Pinned versions (checked 2026-11-08)
| component | version | source |
|---|---|---|
| node | 20.18.0 | Docker base image `<registry>/node:20.18` |
| fastify | 5.2.1 | `npm view fastify version` |
| postgres driver | 8.13.1 | `npm view pg version` |

## If this proves wrong
Thin HTTP adapter keeps the domain framework-free; replacing Fastify costs days, not a rewrite.
```

A pinned manifest excerpt, so the decision is executable:

```json
{
  "engines": { "node": "20.18.0" },
  "dependencies": { "fastify": "5.2.1", "pg": "8.13.1" }
}
```

## Check

A stack decision is done when every pinned version exists and the platform can build it:

```bash
npm view fastify version                      # matches the table
npm view pg version                           # matches the table
pip index versions <pkg> | head -3            # Python components
go list -m -versions <module> | tr ' ' '\n' | tail -3   # Go modules
docker manifest inspect <registry>/node:20.18 >/dev/null && echo base-ok
rg -n '"node"|fastify|pg' package.json        # manifest agrees with the document
```

Pass rule: every component has an exact version and a source line; the versions resolve in the registry and on the platform base image; no key need is covered by "we'll write it ourselves"; the matrix exists only when alternatives were needed; a critical service has a written failure/exit note. Append the install check output to `.orbit/task/<id>/evidence.md` (command → output → conclusion).

## Pitfalls

- **Language shopping.** Comparing five ecosystems burns a week and usually ends on the current stack. Start from the team's stack and only investigate a switch when a criterion objectively fails.
- **Versions from memory.** The model's training data is older than the registry; pin from a live lookup and record the date, or the build breaks on the first `install`.
- **"We'll write the missing library."** That is a hidden project. A missing library for a key need disqualifies the candidate.
- **Ignoring the platform.** A technically superior runtime that the platform team cannot deploy is not selectable; check base images and CI first.
- **Pin that never resolves internally.** A version present on the public registry but absent from the company mirror fails CI. Verify against the registry actually used.
- **No failure plan.** For critical services, the cost of being wrong belongs in the document; otherwise review will ask for it later.
- **Pins without sources.** A version table without lookup evidence cannot be re-verified by the next agent.

## Portability

The method is a decision document, not tooling: any agent can read the manifests with its file tools and query registries with the CLIs it has. Where a package manager is unavailable, use the registry's HTTP API (`curl -s https://registry.npmjs.org/<pkg> | jq -r '."dist-tags".latest'`) or the release page. No subagents or slash commands are involved; the `package.json` / `pyproject.toml` pins are the durable output.

## What's improved vs the source

- Availability in the internal registry and platform support are mandatory criteria.
- Versions are checked in the registry, not taken from memory (`research-sources`).
- An explicit current-stack assessment and "keep it" outcome, instead of a blank-slate comparison.
- A failure/exit plan for critical services and a pinned manifest example.
- Registry-verified pins with source and date, plus a clean-install check that `prove-done` can re-run.

## Based on

- [backend-skills](https://github.com/si1verwind17/backend-skills) — method «backend-stack-selection» (MIT). Rewritten in our own words and improved — see "What's improved".

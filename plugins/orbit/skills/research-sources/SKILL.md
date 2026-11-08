---
name: research-sources
description: '[Orbit 1.4.3 Product & domain] Research from primary sources: every fact with a link and version, saved in the repo. Use when: «исследуй», «найди в документации», «поддерживает ли», «какая версия», «проверь по первоисточнику»; research, docs.'
---

# research-sources — research a question from primary sources

> **Orbit · ① Understand · step 1.4.3 Product & domain**
> **Input:** a question that a decision depends on
> **Output:** `docs/research/<topic>.md` → next `model-domain`
> **Works with:** `shape-idea`, `choose-stack`, `write-spec`
> **Shared rules:** reply in the user's language; generated artifacts default to English; facts need a source and a version; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

Facts about a library, API, standard, version or platform behavior — from **primary sources**, with a citation and link per claim. The result is saved in the repo and reused, so the same question is not answered twice.

## When to use

- A decision depends on a fact not in the code: "does X support Y", "what breaks on upgrade", "what's the API limit".
- Comparing 2–3 options (libraries, approaches) and the comparison must be defensible.
- A version upgrade is planned and deprecations/behaviour changes must be known before work.
- A team cites a blog post as fact and the primary source says something else.
- Before `shape-idea` or `choose-stack`: an RFC/standard claims to be checked.

Skip it when the answer is in the code or an existing note (`recall-history`), or when the question can be settled by a two-minute experiment in the repo.

## Inputs

- the question in one sentence and what counts as an answer ("yes/no with version", "comparison table on latency and licence");
- the exact versions in play — from `package.json`, `pyproject.toml`, `go.mod`, `pom.xml`, lockfiles;
- `.orbit/task/<id>/brief.md` for why the answer matters;
- `.orbit/learnings/` and `docs/research/` for prior answers — reuse before re-researching;
- network access for primary sources (or a local mirror when air-gapped).

If a primary source is unreachable, record it as unreachable and label the claim unconfirmed — never substitute a memory. If the version is unknown, the first step is finding the version, not the answer.

## Procedure

1. **Write the question and the acceptance shape.** One sentence plus the form of a good answer. A question without an answer shape becomes an essay.
2. **Find the version in play.** The doc for the wrong version is the most common research error.
   ```bash
   cat package.json | jq -r '.dependencies, .devDependencies' 2>/dev/null | head
   grep -E '^(python|node|go) ' .tool-versions 2>/dev/null; grep -n 'version' pyproject.toml 2>/dev/null | head
   ```
3. **Search sources in trust order:** official docs of the right version → source code (the repository at the tag) → spec/RFC → repo changelog and issues → articles and blog posts last. For library docs, use an MCP docs server (e.g. Context7) if one is connected; otherwise fetch the official docs.
   ```bash
   curl -s https://raw.githubusercontent.com/<org>/<repo>/<tag>/CHANGELOG.md | head -80
   ```
4. **Read, don't skim.** For each claim, find the sentence or the code that states it; save the URL with the version anchor or the retrieved date.
5. **Put every claim next to its link and version.** No source → mark "unconfirmed" in a separate section. Do not launder a guess as a fact.
6. **Handle contradictions explicitly.** Two sources disagree: show both, say which you trust and why (version, authority, date). Never silently pick one.
7. **Optionally delegate big studies.** Hand a large comparison to a separate agent so the main context stays clean; require a Markdown file and a 3-line summary back. Without delegation, timebox the study and write the file.
8. **Write "what this means for us"** — the decision this fact changes, and where it goes next (`shape-idea`, `choose-stack`, `write-spec`). Then store the note where the repo keeps notes, else `docs/research/`.

## Output

`docs/research/<topic>.md`:

```markdown
# Does <library> v<X> support <feature> on <platform>?
**Answer:** yes, since v<Y>; no before that. (checked <date>, docs v<X>, repo tag v<X>)
## Facts
- Supported on <platform> — [official docs v<X>](https://…), retrieved <date>
- Default timeout is 30 s — [source file at v<X>](https://…/src/config.ts#L42)
## Unconfirmed / contradictions
- Blog post claims 60 s; the v<X> source says 30 s — trust the source.
## What this means for us
- We can drop the custom retry wrapper; update `docs/adr/…` and `write-spec`.
```

## Check

```bash
test -f docs/research/<topic>.md && echo "note ok"
grep -cE '\]\(https?://' docs/research/<topic>.md          # linked facts
grep -c 'retrieved\|v[0-9]' docs/research/<topic>.md        # version/date on claims
grep -n 'Unconfirmed' docs/research/<topic>.md              # unconfirmed section exists
```

Pass rule: every fact has a link and either a version anchor or a retrieval date; the answer matches the acceptance shape from step 1; contradictions are shown, not resolved silently; "what this means for us" names the decision and the next skill; no claim rests on memory alone. When the research supports a task, write the three-line conclusion into `.orbit/task/<id>/evidence.md` (`prove-done`).

## Pitfalls

- **Researching the wrong version.** Docs for `main` describe unreleased behavior; pin the version and use that tag's docs or source.
- **Treating a blog post as a primary source.** Articles go last and are labelled as secondary; the official docs or the source code decide.
- **A fact with no link.** It will be re-researched next month and may be wrong. No link → unconfirmed section.
- **Hiding contradictions.** Two sources disagreeing is information; picking one silently is how a team builds on a false premise.
- **Writing an essay instead of an answer.** If the acceptance shape was "yes/no with version", a 900-word comparison wastes the reader's time.
- **Ignoring prior notes.** `.orbit/learnings/` and `docs/research/` exist to stop repeat work; check them before the first search.

## Portability

Any agent and model with web access or a local docs mirror can run it. Without subagents, do the study inline and keep the note short; the artifact is the memory, not the context. In an air-gapped environment, use vendored docs and source tags from the internal mirror and say which mirror was used. No Claude Code features are required.

## What's improved vs the source

- Explicit source trust order and the rule "no link — not a fact".
- Version and date on every fact, so research doesn't silently go stale.
- "What this means for us" links facts to decisions in `shape-idea` and `choose-stack`.
- A dedicated unconfirmed/contradiction section makes uncertainty visible instead of hidden.
- Prior notes in `.orbit/learnings/` and `docs/research/` are checked before searching, to avoid duplicate work.

## Based on

- [Matt Pocock Skills](https://github.com/mattpocock/skills) — method «research» (MIT). Rewritten in our own words and improved — see "What's improved".

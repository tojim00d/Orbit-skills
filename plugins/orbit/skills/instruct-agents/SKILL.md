---
name: instruct-agents
description: '[Orbit 3.3.2 Docs & writing] Instructions for agents: CLAUDE.md, prompts, skill descriptions — without contradictions. Use when: «CLAUDE.md», «промпт для агента», «AGENTS.md», «напиши правила для агента», «системный промпт»; agent instructions, system prompt for a coding agent.'
---

# instruct-agents — write instructions for agents

> **Orbit · ③ Operate · step 3.3.2 Docs & writing**  
> **Input:** rules / knowledge ← `cowrite-doc`  
> **Output:** text for an agent → next `create-skill`  
> **Works with:** `setup-repo`, `run-retro`  
> **Shared rules:** reply in the user's language per `speak-plain`; generated content defaults to English; stay in scope; artifacts go to `.orbit/` (contract: `ARTIFACTS.md` at the pack root).

`CLAUDE.md`, `AGENTS.md`, subagent prompts, tool and skill descriptions. An agent executes what is written literally and does not ask when a rule is missing — imprecision becomes an error on every run, not once.

## When to use

- A repository needs its agent instructions: how to build, test, commit, and what not to touch.
- A prompt or skill description triggers wrongly, or fails to fire for the requests it was written for.
- Agents keep doing something the instructions already forbid — usually two rules disagree, or a rule has no priority.
- A tool, command or workflow changed and the instructions now describe the old world.
- Not for documentation read by humans (`cowrite-doc`), and not for a status message (`write-update`).

## Inputs

- the artifact and its reader: which agent, which model, what it can see (repo only? network? tools?);
- the repository facts: build/test commands, structure, commit and branch rules, `.orbit/task/<id>/brief.md` for the current task's constraints;
- every existing instruction file: `CLAUDE.md`, `AGENTS.md`, files under `.cursor/`, `.github/prompts/`, `setup-repo` output;
- evidence of misreading: transcripts, review comments, failed runs, recurring mistakes in `.orbit/learnings/`;
- for a skill description: the skill's own `SKILL.md` and its artifact contract in `ARTIFACTS.md`.

If the failure evidence is missing, reproduce it first — run the agent on 1–2 real tasks and note where it misreads.

## Procedure

1. **Name the artifact and its single job.** Repo instructions (`CLAUDE.md`/`AGENTS.md`) set persistent rules; a task prompt sets one task; a skill description decides whether the skill fires. One artifact, one job — mixing them loads the wrong text at the wrong time.
2. **Inventory every existing rule.** Enumerate the files and list the sentences that bind behaviour:

   ```bash
   ls CLAUDE.md AGENTS.md .cursor .github/prompts 2>/dev/null
   rg -n "must|never|always|do not|don't|instead|only" CLAUDE.md AGENTS.md .cursor .github/prompts 2>/dev/null
   ```

3. **Put purpose and context first.** Explain *why* the repo works this way before listing commands. An agent that knows the reason decides correctly in situations the instructions did not foresee.
4. **Replace adjectives with specifics.** Exact paths, commands, formats, and input/output examples. "Keep commits clean" is not a rule; "commit as `feat(<scope>): <subject>`, one logical change per commit" is.
5. **Hunt contradictions systematically.** Compare pairs: "always run X" vs "never run X", "write tests first" vs "tests are generated". Two conflicting rules make the agent choose at random. Resolve each one and state an explicit priority — e.g. "repo rules beat general defaults; the task brief beats repo rules".
6. **Cut the obvious and the repeated.** Every line loads into context on every run. Drop what the code, `README.md` or the tool's own docs already say; keep what is non-obvious, local and behavioural.
7. **Write instructions in English.** English costs fewer tokens than most languages; keep only user-facing examples in the users' language.
8. **Write the trigger description for skills.** `description` = what the skill does + when to use it + 2–4 trigger phrases in the users' languages (RU and EN), keeping `[Orbit X.Y.Z Phase]`; hard max 1024 characters.
9. **Test on real tasks.** Run the agent on 2–3 concrete tasks — a bug fix, a doc change, a review — and watch where it misreads. Fix the rule that caused it, not the symptom. Repeat until the three runs follow the rules.
10. **Keep it alive.** Instructions live in the repo, reviewed in a PR like code. Update them in the same change that changes the tooling; a stale instruction is worse than none because it is confidently wrong.

## Output

The target artifact — `CLAUDE.md`, `AGENTS.md`, a prompt file (e.g. `.github/prompts/review.prompt.md`), or a skill `description`. A repository `CLAUDE.md` template:

```markdown
# <Repo> — agent instructions

**Why this repo exists:** one paragraph of context the agent cannot infer from code.

## Build, test, run
- Install: `<command>` (version: <pinned>)
- Test: `<command>` — the full suite is <n> tests, <duration>
- Run locally: `<command>`, then open <url>

## Structure
- `<path>/` — what lives there and what must not be touched
- Entry point: `<path>:<line>`

## Rules
- Branch: `<pattern>`; commit: `<format>` (see commit-clean)
- Do not touch: `<paths, generated files, vendored dirs>`
- Artifacts: Orbit writes to `.orbit/` (see ARTIFACTS.md); OpenSpec specs live in `openspec/`
- On conflict: repo rules > task brief > general defaults

## Verification
- Before saying done: `<check commands>` and show the output
```

For a skill, the parallel artifact is its `description` field; record the tested triggers in `.orbit/learnings/agent-instructions.md`.

## Check

```bash
wc -l CLAUDE.md                                   # keep it short; every line costs tokens
rg -n "always|never|must" CLAUDE.md AGENTS.md     # read each pair for conflicts
rg -n "TBD|TODO|maybe|as needed" CLAUDE.md        # vague rules an agent cannot execute
python3 -c "print(len(open('CLAUDE.md').read().split()))"   # rough token budget
```

Pass rule: no two rules contradict and the priority is written; every rule is checkable (a path, a command, a format); the artifact contains no line the code or README already states; the agent was run on 2–3 real tasks and followed each rule; a skill description is ≤1024 characters, names the trigger phrases, and fires on the intended requests without firing on unrelated ones.

## Pitfalls

- **Contradictions left in place.** "Always add tests" in one section and "skip tests for doc changes" in another — the agent picks one at random. Resolve and write the priority.
- **A wall of instructions.** Context is finite; a 400-line file makes the agent ignore the important lines. Keep the file to what changes behaviour.
- **Unverifiable rules.** "Write good code" cannot be executed or checked. Replace with a command or a concrete format.
- **Mixing repository rules with task rules.** A task constraint pasted into `CLAUDE.md` becomes permanent law for every future task.
- **No conflict priority.** Without a stated order, the model invents one — often the wrong one.
- **A skill description without triggers.** The skill exists but never fires, or fires on every task. Test it on real requests.
- **Stale instructions after a tooling change.** The old command is confidently wrong; update in the same change as the tooling.
- **Secrets and internal hosts in examples.** Instructions are frequently shared and committed; use placeholders.

## Portability

Plain text files read by any agent: no Claude-only features. `CLAUDE.md` is Claude Code's convention; other agents use `AGENTS.md`, `.cursor/rules`, or a system prompt — the method is the same, only the filename changes. Skill descriptions work in any skills-capable agent. For the real-task test, use whatever delegation or batch mode the agent offers; without one, run the tasks inline and compare the results against the rules.

## What's improved vs the source

- An explicit hunt for contradictory rules and a conflict priority — a common cause of "weird" agent behavior (found while validating this pack's rules).
- English for instructions to save tokens; triggers in the users' languages.
- A `CLAUDE.md` content template aligned with `setup-repo`, including where Orbit artifacts live.
- The real-task test is mandatory, so instructions are verified rather than assumed.

## Based on

- [Matt Pocock Skills](https://github.com/mattpocock/skills) — method «writing-for-agents» (MIT). Rewritten in our own words and improved — see "What's improved".

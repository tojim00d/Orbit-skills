---
name: teach-topic
description: '[Orbit 3.2.2 Explaining] Teach a topic in small steps with examples from the project and understanding checks. Use when: «научи», «объясни мне тему», «объясни по шагам», «проверь, что я понял»; teach me, teach me step by step.'
---

# teach-topic — teach a topic step by step

> **Orbit · ③ Operate · step 3.2.2 Explaining**  
> **Input:** a topic ← `onboard-people`  
> **Output:** the person can do it → next `cowrite-doc`  
> **Works with:** `explain-code`, `model-domain`  
> **Shared rules:** reply in the user's language per `speak-plain`; generated content defaults to English; stay in scope; artifacts go to `.orbit/` (contract: `ARTIFACTS.md` at the pack root).

An explanation after which the person **can do**, not just "has read". For onboarding, a new technology, or a complex part of the system. The unit of progress is a completed task by the person, not a paragraph delivered by you.

## When to use

- Someone asks to be taught a topic: a new language feature, a framework, a protocol, an internal subsystem.
- A newcomer finished the `onboard-people` guide and now needs depth on one area.
- A person repeatedly makes the same mistake — the model behind the rule is missing, and teaching it is cheaper than fixing it again.
- Not for one-off factual questions ("what does this flag do?") — answer directly. Not for reference material — write a doc with `cowrite-doc`.

## Inputs

- the topic and the person's goal: what they want to be able to do at the end;
- their current level: one or two questions, or the last tasks they completed;
- the project material to ground examples in: `.orbit/knowledge/overview.md`, `.orbit/knowledge/graph.json`, `docs/ONBOARDING.md` (from `onboard-people`), and the actual code;
- the project glossary: `GLOSSARY.md`, if the repo has one (`model-domain` owns it);
- primary sources for the final reading list (`research-sources`).

If no project code fits the topic, say so and use a minimal worked example in the person's stack; never teach from an invented codebase.

## Procedure

1. **Set the learning goal.** One sentence, observable: "deploy the chart to dev myself", "read an EXPLAIN plan and say why the query is slow". If the goal is not observable, the topic is still too broad — narrow it with the person.
2. **Check the baseline.** One or two questions ("have you used X before? show me the last thing you built with it"). Do not explain what they already know; do not skip what they only think they know.
3. **Build a ladder of 4–7 steps.** One idea per step, ordered by dependency. Each step is: idea → an example from **their** project → a short task. If a step needs two ideas, split it.
4. **Ground every example in the repo.** Find it, read it, run it if it is runnable:

   ```bash
   rg -n "<topic>" --glob '!node_modules' | head -20
   git log --oneline -- path/to/file | head -5
   sed -n '1,60p' path/to/file
   pytest tests/test_topic.py -q        # or: npm test -- <pattern>, go test ./...
   ```

   Cite `path:line`. An example that does not run teaches a wrong mental model.
5. **Teach one step at a time.** Present the step in the fixed format below, then stop and wait. Do not batch three steps into one message; the person's answer is the input to the next step.

   ```text
   Idea: one sentence.
   Example: code/command from the project (path:line).
   Task: do X. (waiting for your answer)
   ```

6. **Check understanding after every step.** Ask a "why" question or give a mini task. Correct answer → next step. Wrong answer → diagnose the misconception, re-explain with a different example and a smaller step; never repeat the same wording louder.
7. **Grow the glossary as you go.** Each new term gets a one-line definition in the project's `GLOSSARY.md` (`model-domain`), in the team's language if the team uses one.
8. **Wrap up with a recap and a reading list.** What was learned, what to practise again, and where to read next — primary sources only (`research-sources`), not a random blog. Optionally save the lesson shape in `.orbit/learnings/<topic>-lesson.md` so the next person benefits.
9. **Respect the stop rule.** If the person cannot perform the goal after the ladder, the goal was too big or the step too steep: split the goal into two lessons and say so.

## Output

The deliverable is a person who can do the thing, verified by tasks. Supporting artifacts:

- new or updated entries in `GLOSSARY.md` (project terms, one line each);
- optional `.orbit/learnings/<topic>-lesson.md` with the goal, the ladder, and the checks that failed:

```markdown
# Lesson: <topic>

**Goal:** <observable action>
**Ladder:** 1) <idea> 2) <idea> 3) <idea>
**Checks:** <task per step and whether it passed>
**To repeat:** <what stayed shaky>
**Next sources:** <primary links>
```

Update `.orbit/task/<id>/plan.md` if the lesson is part of a tracked onboarding plan.

## Check

- **Can do:** the person performs the goal task without hints; for "read an EXPLAIN plan" they read a fresh one and explain it correctly.
- **Each step passed its check:** the transcript has a task and an answer per step; no step was skipped "to save time".
- **No unexplained word:** `grep -n "<new term>" GLOSSARY.md` finds every term introduced; if not, add it.
- **Examples ran:** each command shown in an example was executed in this session or is quoted from a file with a `path:line`.
- **Reading list is primary:** links point to official docs/specs/source, not aggregator posts.
- Pass rule: the goal task is performed unaided and every step has a passed check; otherwise the lesson continues, and the person is told what remains.

## Pitfalls

- **Lecturing.** A wall of prose feels productive and teaches little. One idea → example → task, then wait.
- **Abstract examples.** A Fibonacci snippet does not teach the project's event loop. Use the code the person will actually change, with `path:line`.
- **Explaining what they know.** Baseline questions save the first ten minutes; skipping them loses the person's attention.
- **Skipping the checks.** Without a task, "got it?" always returns "yes". The check is the only evidence.
- **Steps that are too big.** "Now write the service" is a project, not a step. Split until each step is one idea.
- **Unverified examples.** A snippet that does not run (wrong import, stale API) teaches an error. Run it first.
- **Wrong vocabulary.** Introducing three new terms per sentence overloads working memory; define one, use it, then add the next.
- **Shaming a wrong answer.** A wrong answer is data about the explanation; respond to the gap, not the person.

## Portability

A conversation protocol plus the repo's file tools — no Claude-only features, no subagents. In a non-interactive setting, turn the ladder and checks into a worksheet with expected answers, and mark which checks need a human. Without `GLOSSARY.md`, keep definitions in the lesson note and offer to add them. Slash commands are unnecessary; "teach me X step by step with checks" triggers the same method.

## What's improved vs the source

- Examples come from the person's project (`.orbit/knowledge/`), not abstract ones.
- New terms go straight into the project's shared glossary.
- A stop rule and a written lesson shape, so a failed lesson becomes a smaller next lesson instead of a repeat.

## Based on

- [Matt Pocock Skills](https://github.com/mattpocock/skills) — method «teach» (MIT). Rewritten in our own words and improved — see "What's improved".

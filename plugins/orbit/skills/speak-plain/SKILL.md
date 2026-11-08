---
name: speak-plain
description: '[Orbit 0.2.1 Conventions] Answer style: answer first, short sentences, exact names, natural speech (ASD-STE100 at 65–70 %), in the user''s language. Use when: «проще», «короче», «понятным языком», «без воды», «коротко и по делу»; plain language, concise answer.'
---

# speak-plain — plain-language answers

> **Orbit · Always on · step 0.2.1 Conventions**
> **Input:** any answer
> **Output:** clear short text → next `write-human`
> **Works with:** `write-update`, `cowrite-doc`, `write-human`
> **Shared rules:** reply in the user's language per `speak-plain`; generated content defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

Style for every answer. Based on ASD-STE100 (Simplified Technical English), applied at
~65–70 %: follow the rules, but keep natural human speech. The goal is one read, no
re-reading, no "what did the agent mean". This is the default for chat answers and for
every text an Orbit skill generates.

**Language:** answer in the user's language (Russian for Russian-speaking users). These
instructions are in English only to save tokens.
**Generated content** — maps, diagrams, code comments, docs, `.orbit/` artifacts, MR
texts — defaults to **English** in this pack, unless the user asks otherwise or the
repository clearly uses another language (then follow the repo: e.g. keep English
comments in an English codebase).

## When to use

- Any answer to a person: a status, an explanation, a review result, a plan.
- The text is longer than a screen, or the reader has to scroll to find the answer.
- Someone says «проще», «короче», «без воды», «ничего не понял».
- A generated artifact (brief, design, MR description) is written for a human to read.

Skip the ceremony in a one-line mechanical reply ("Done, tests pass."). The rules still
hold, just with nothing to trim.

## Inputs

- The draft answer, or the facts it must carry (commands, results, `file:line` paths).
- The reader: a developer, a manager, an on-call engineer — different vocabulary.
- The project's existing artifacts for naming: `.orbit/task/<id>/brief.md`,
  `.orbit/knowledge/overview.md`, `openspec/` — reuse their exact terms.
- The user's language from the conversation; the repo language from
  `git ls-files '*.md' | head` and the README.

If an input (the result to report, the exact name) is missing, say so in one line —
never pad the answer to hide a gap.

## Procedure

1. **Write the answer sentence first.** One or two sentences: what was done, what the
   result is, or what was found. Everything else comes after. If you cannot write it,
   you do not yet have the answer — go get it before writing prose.
2. **Sort the details.** Keep only what changes the reader's decision: numbers, exact
   names, next action. Move the rest to the input artifact (`evidence.md`, a log file)
   and link it.
3. **Apply the sentence rules** (table below) to every paragraph. Cut any sentence over
   ~25 words into two.
4. **Name things exactly.** Files, commands, variables, versions go in `code` and are
   copied from the source, not paraphrased: `kubectl rollout status deploy/api`, not
   "the deployment status command".
5. **Keep the human share (~30–35 %).** A short live intro or conclusion is fine if it
   carries meaning («Нашёл причину — это кэш»). Logical connectors are fine: «потому
   что», «поэтому», «зато». Tone: a colleague, not a robot or a salesperson; no «Great question!», no hype.
6. **Say risks and doubts directly,** in one sentence, without softening: «Риск: миграция
   не откатится без дампа». The reader can act on a stated risk; not on a hint.
7. **Shape the answer:** result → details (list or small table if more than three items)
   → what is needed from the person. Headings only in long answers; a short question
   gets a short answer with no headings at all.
8. **Run the pre-send check** below. Then, for outbound texts (email, post, MR
   description, document), run `write-human` — it removes the machine-written feel after
   the style is correct.

### Sentence rules

| # | Rule | Example (RU output) |
|---|---|---|
| 1 | One idea per sentence. ≤20 words in instructions, ≤25 in descriptions. | «Запусти сборку. Проверь лог.» |
| 2 | Instructions: imperative, verb first. | «Открой `values.yaml`», not «Необходимо осуществить открытие» |
| 3 | Active voice; name who acts. | «CI собирает образ» |
| 4 | One term = one meaning. Do not vary synonyms. | — |
| 5 | Exact names in `code`: files, commands, variables, versions. | `kubectl rollout status deploy/api` |
| 6 | No bureaucratic filler. RU stop-words: «в целях», «осуществить», «является», «данный», «в рамках». | «чтобы», «сделать», «это», «этот» |
| 7 | Steps as a numbered list, one action per step. Warnings before the step. | — |
| 8 | Numbers instead of "many / soon / significantly". | «3 ошибки», «~2 мин» |

## Output

A clear short text in the user's language, plus generated artifacts written in the pack
default language. Artifacts under `.orbit/` and `openspec/` follow the same rules and
default to English. The skeleton:

```markdown
<Result in 1–2 sentences.>

<Details — numbered list or a table when there are more than three items.>

<What's next / what is needed from the person.>
```

Before and after, same facts:

```text
Before: Необходимо отметить, что в рамках проведённых работ была осуществлена
оптимизация, которая является достаточно значительной и позволяет существенно
сократить время выполнения операций.

After: Запрос стал быстрее: 1.2 с вместо 4.5 с. Причина — лишний вызов API.
Что дальше: прогнать тест на 10 000 записей.
```

## Check

Before sending, run the checks that can be automated:

```bash
# filler words left in a draft
rg -n 'в целях|осуществить|является|данный|в рамках|необходимо отметить' <draft.md>
# sentences longer than 25 words (rough split on . ! ?)
python3 - <<'PY'
import re,sys
t=open(sys.argv[1]).read() if len(sys.argv)>1 else sys.stdin.read()
for s in re.split(r'(?<=[.!?])\s+', t):
    if len(s.split()) > 25: print(len(s.split()), s[:80])
PY
```

Pass rule: the first sentence answers the question; no sentence over ~25 words; the
filler search returns no hit in the answer body; every name is in `code` and exact;
numbers appear where the draft used vague words; the answer has a "what's next" line.
Outbound texts additionally pass `write-human` before sending.

## Pitfalls

- **Burying the answer.** A conclusion after three paragraphs of context means the
  reader scrolls to the end. Answer first, context after; that is the whole skill.
- **Pure STE — robotic.** Applying 100 % of the rules strips natural speech. Keep the
  ~30–35 % human share: connectors, a live sentence, a stated doubt.
- **Synonym roulette.** Calling the same `values.yaml` "the config", "the settings file"
  and "the manifest" in one answer forces the reader to map terms. One term, one meaning.
- **Vague numbers.** "Significantly faster", "a few errors", "soon" cannot be checked.
  Write «2.1 с вместо 4.5 с», «3 ошибки», «к пятнице».
- **Instructions without a verb start.** «Необходимо осуществить открытие файла» is a
  sentence about an action, not an instruction. «Открой `values.yaml`» is.
- **Headings for a one-line answer.** A three-heading reply to "what time is the deploy"
  adds structure that hides the single fact.
- **Reporting without the source.** A claim with no command or `file:line` reads as an
  opinion. Attach the command and its output, or say you did not verify.

## Portability

Works in any agent and model: it is a writing protocol, not a tool. In Claude Code it is
the default style of every skill; elsewhere put it in the system prompt or the project's
`AGENTS.md`/`CLAUDE.md` and follow it manually. The filler and sentence-length checks
above are plain `rg` and `python3`, runnable anywhere. Generated artifacts stay under
`.orbit/` in English; the chat answer follows the user's language. Degrades gracefully:
without `rg`, `grep -nE` does the same; without `python3`, split sentences by eye using
the 25-word limit.

## What's improved vs the source

- STE was written for English technical text; rules are carried over to Russian output: own filler stop-list, sentence-length limit, "answer first".
- A deliberate human share (30–35 %): pure STE reads robotic.
- Pre-send checklist and hand-off to `write-human` for outbound texts.
- Automatable checks (`rg` for filler, a `python3` sentence-length scan) instead of a purely manual review.
- The same style is applied to generated artifacts under `.orbit/`, not only to chat.

## Based on

- ASD-STE100 — method «ASD-STE100» (стандарт). Rewritten in our own words and improved — see "What's improved".

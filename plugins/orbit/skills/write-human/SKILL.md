---
name: write-human
description: '[Orbit 0.2.6 Conventions] Remove the machine-written feel from outbound texts without changing facts. Use when: «сделай по-человечески», «звучит как ИИ», «очеловечь текст», «убери канцелярит», «перепиши естественно»; humanize, sounds like AI.'
---

# write-human — remove the machine-written feel from text

> **Orbit · Always on · step 0.2.6 Conventions**
> **Input:** outbound text ← `speak-plain`
> **Output:** natural text → next `write-update`
> **Works with:** `speak-plain`, `cowrite-doc`, `write-update`
> **Shared rules:** reply in the user's language per `speak-plain`; generated content defaults to English; act within `stay-in-scope`; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

Outbound texts — email, post, MR description, document for people, a message in a
tracker — should not sound generated. Rewrite the text **without changing facts**: the
same claims, names, numbers and links, only a human voice. Output stays in the text's
language (Russian texts stay Russian; English texts stay English). This is the last pass
after `speak-plain` has fixed clarity.

## When to use

- The person says «звучит как ИИ», «сделай по-человечески», «убери канцелярит».
- A text is going out of the team: email, announcement, MR/PR description, public post,
  a document a customer or manager will read.
- A generated artifact under `.orbit/` or `docs/` is meant for humans, not only for agents.
- You are about to send a long answer and notice triads, bold in every bullet, or a
  "Great question!" opener.

Skip for internal machine-facing artifacts — briefs, graph JSON, plan checklists — where
the reader is an agent and structure beats voice.

## Inputs

- The draft text, in a file or in the chat.
- Its facts to preserve: names, numbers, dates, links, commands, quoted requirements.
- The target audience and channel: a teammate in chat, a customer email, a public post,
  a review comment.
- The project's voice samples: `README.md`, past entries in `.orbit/learnings/` or
  `docs/`, existing MR descriptions from `git log --oneline -20`.
- For file mode: the current version at `git show HEAD:<path>` so nothing outside prose
  is touched.

If the draft has no clear reader, ask for the audience in one question — the "wrong
reader" tell cannot be fixed without knowing the right one.

## Procedure

1. **Read the whole draft once.** Mark the tells below, strongest first. Do not rewrite
   sentence by sentence yet — that produces a patchwork, not a voice.
2. **Decide the one main point** the reader must take away, and put it first. If the
   draft buries the decision at the end, move it to the top; that alone fixes the "wrong
   reader" and "decision at the end" tells.
3. **Rewrite.** Keep every claim, name, number, date and link. Structure may change;
   facts may not. Cut the tells in the table below: replace a contrast or a triad with
   the one precise thing it was decorating.
4. **Compare draft and rewrite mechanically.** Extract numbers, links and `code` spans
   from both and diff them; a missing or new item is a fact change — restore it or ask
   which is correct.
5. **Read it aloud.** If a sentence cannot be said in one breath, split it. If it sounds
   like a press release or a bot, rewrite that sentence, not the whole text.
6. **Respect the mode.** Chat → return the final version plus 2–3 lines "what I removed".
   File → rewrite prose only; never touch code, commands, links or data tables. Inside
   another task (MR, commit, email) → return only the final text.
7. **Report the fact check.** Say explicitly that no fact was added or lost, and name the
   one or two biggest cuts.

### Tells to find and remove

| Tell | Example | Fix |
|---|---|---|
| Contrast for weight | "not just a tool, but a whole platform" | say what it is |
| Triads and dashes everywhere | "fast, reliable and convenient — all of it …" | keep one precise attribute |
| Inflation | "key", "revolutionary", "it's important to note" | the fact without the rating |
| Formatting by habit | bold in every item, headings over 3 lines of text | bold only what must not be missed |
| Chat wrappers | "Great question!", "Hope this helps" | delete |
| Wrong reader | re-explaining known context; decision at the end | decision first |
| RU filler | «в рамках», «осуществить», «является» | «в», «сделать», «это» (see `speak-plain`) |

## Output

The final text, in the text's language, plus a short removal note. In file mode the
artifact is rewritten in place (`.orbit/`, `docs/`, `openspec/`). In chat:

```text
<final text>

Что убрал: <tell> → <replace>; <tell> → <replace>.
Факты не менял: <N> чисел, <M> ссылок, все имена на месте.
```

When the text is a file, the file is rewritten in place and the diff is the evidence:

```bash
git diff --word-diff -- docs/announcement.md
```

Example of a rewrite (same facts):

```text
Before: В рамках данной работы было осуществлено не просто обновление
документации, а настоящая трансформация подхода — быстрая, удобная и
надёжная. Важно отметить, что релиз 2.4 выйдет в пятницу.

After: Обновили документацию. Теперь в ней есть примеры на каждый эндпоинт.
Релиз 2.4 выйдет в пятницу.
```

## Check

Before sending or saving:

```bash
# tell scan
rg -niE 'not just|it.s important to note|great question|hope this helps|в рамках|осуществить|является|необходимо отметить' <text>
# fact inventory — compare before and after
grep -oE 'https?://[^ )]+|`[^`]+`|[0-9]+([.,][0-9]+)?%?' <before.txt> | sort | uniq -c > /tmp/facts.before
grep -oE 'https?://[^ )]+|`[^`]+`|[0-9]+([.,][0-9]+)?%?' <after.txt>  | sort | uniq -c > /tmp/facts.after
diff /tmp/facts.before /tmp/facts.after
```

Pass rule: the tell scan returns no hit in the final text; the fact diff is empty (no
number, link, code span or name lost or invented); the main point is in the first
paragraph; the text reads aloud without a breath break; in file mode `git diff` shows
changes only in prose. In chat mode the removal note names at least two cuts.

## Pitfalls

- **Changing a fact while "improving" the sentence.** "p95 < 300 ms" becoming "fast" is
  a fact loss. The mechanical before/after diff exists for exactly this.
- **Removing the structure the reader needs.** The tell is habit formatting, not all
  structure: a long document still needs headings and lists. Delete bold-everywhere and
  three-line headings, keep the navigation.
- **Overdoing the voice.** Forced slang, jokes or emoji in a customer email is as
  artificial as "Great question!". Aim for a calm colleague, not a persona.
- **Rewriting code or tables in file mode.** "Prose only" is literal: a command inside a
  fenced block, a table cell or a link target is data, not text to polish.
- **Translating the text.** A Russian draft stays Russian; an English one stays English.
  "Humanize" is not "translate".
- **Keeping the chat wrapper.** "Hope this helps" at the end of a finished document is a
  tell; delete it, the reader knows the document ended.
- **Sending without the read-aloud pass.** The ear catches what the eye skipped; one
  awkward sentence is enough to make the whole text feel machine-made.

## Portability

Works in any agent and model — it is an editing protocol with two `grep`/`rg` checks and
no Claude-only feature. In Claude Code it follows `speak-plain` automatically; elsewhere
put it in the review step of the writing workflow. Without `rg`, `grep -nEi` does the
same; without the shell checks, compare facts by hand using the same lists. In
non-interactive mode where no "what I removed" note can be sent, put that note in the
commit message or the MR description so the reviewer sees the fact check.

## What's improved vs the source

- The tell catalog covers Russian bureaucratic filler, not only English idioms.
- Strict "no fact added or lost" check — rewriting never distorts meaning.
- Paired with `speak-plain`: that one sets style, this one cleans finished text.
- A mechanical before/after fact diff instead of a promise to be careful.
- Three explicit modes (chat, file, inside another task) with different output contracts.

## Based on

- [Humanizer](https://github.com/blader/humanizer) — method «humanizer» (MIT). Rewritten in our own words and improved — see "What's improved".

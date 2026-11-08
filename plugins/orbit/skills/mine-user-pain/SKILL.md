---
name: mine-user-pain
description: '[Orbit 1.4.2 Product & domain] User pains from real reviews and tickets: hate, missing, unsolved — with quotes. Use when: «что бесит пользователей», «разбери отзывы», «обращения в поддержку», «боли пользователей»; user pain, reviews.'
---

# mine-user-pain — what users hate and what they miss

> **Orbit · ① Understand · step 1.4.2 Product & domain**
> **Input:** a product and its real reviews / support requests
> **Output:** `.orbit/product/<name>/pain.md` → next `model-domain`
> **Works with:** `teardown-product`, `write-spec`, `plan-rebuild`
> **Shared rules:** reply in the user's language; generated artifacts default to English; never fabricate evidence; artifacts go to `.orbit/` (contract: `ARTIFACTS.md`).

Ranked user pains of a product (yours or someone else's) from real reviews and support requests. They become an improvement plan and the positioning of your solution.

## When to use

- Before a rebuild or a big feature: what do users actually complain about and ask for?
- The product is yours and support tickets pile up while the roadmap is decided from opinion.
- A competitor's app stores have years of reviews and the positioning must be found.
- A specification needs a "problem" section grounded in evidence, not in a stakeholder's hunch.
- Before `plan-rebuild` or `write-spec` you need ranked pains with quotes.

Do **not** use it to justify a decision already made — that is marketing, not research. Do not use it when there is no real feedback corpus: 10 reviews produce 10 themes and no signal.

## Inputs

- 50–200 real items: reviews, tickets, survey answers, interview notes, chat threads;
- sources per type — external: app stores, G2/Capterra/Trustpilot, Reddit, Hacker News, the product's feature-request board; internal: support tickets, issues, surveys, user chats, interview notes;
- `.orbit/product/<name>/recon.md` from `teardown-product` when analyzing someone else's product;
- `.orbit/task/<id>/brief.md` for the task context;
- the helper scripts in this skill's `tools/`: `reviews.py` and `themes.json`.

If fewer than 50 items exist, say so and lower the confidence of the output instead of padding it. If a source cannot be linked, the item cannot be quoted.

## Procedure

1. **State the product, segment and time window** in one line: whose product, which users, which period. A pain list without a segment is a list of everything.
2. **Collect items into `reviews.csv`** with columns `source, url, date, rating, text`. Copy text exactly; never clean up a quote. A row without a URL or text is dropped.
3. **Rank themes with the script** — it groups by words and weights recency and rating; custom themes are a JSON file like `tools/themes.json`.
   ```bash
   python3 tools/reviews.py reviews.csv --out feedback.md
   python3 tools/reviews.py reviews.csv --themes tools/themes.json --json > feedback.json
   ```
   Re-check by eye: the script groups by words; you check meaning. Two themes often collapse into one.
4. **Build three lists** — **hate** (complaints about what the product does), **missing** (features requested by name), **unsolved** (whole jobs or user groups the product ignores). Per theme: frequency, recency, 1–2 verbatim quotes with links/ticket numbers.
5. **Rank by pain × frequency × recency**, not raw count: one recurring complaint from a paying segment can outweigh 40 one-star drive-bys. Note the ranking rule in the artifact.
6. **Write the fix plan:** theme → what we do → priority → how we verify the pain went away (metric, ticket label, review sentiment).
7. **Write the positioning sentence:** who we are for and which main pain we remove. This is the output for `shape-idea`, not a slogan.
8. **Verify quotes against sources** one more time — every quote is a substring of a collected item and carries that item's link. Then hand off: features into `write-spec`, priorities into `plan-rebuild`.

## Output

`.orbit/product/<name>/pain.md`:

```markdown
# <product> — user pains (<segment>, <window>)
Items: 137 (app stores 90, support 47) | method: reviews.py v… | ranking: pain × frequency × recency
## Hate
| Theme | Freq | Recency | Quotes |
|---|---|---|---|
| sync is slow | 31 | last 90 d | "takes minutes to sync" — <url>; ticket #4821 |
## Missing
...
## Unsolved
...
## Fix plan
| Theme | Action | Priority | Verify |
|---|---|---|---|
## Positioning
For <who> who <pain>, we remove <pain> by <what>.
## Method notes
Script output re-checked by eye on <date>; thin themes (<3 items, one source) marked.
```

## Check

```bash
test -f .orbit/product/<name>/pain.md && echo "artifact ok"
grep -c '^| ' .orbit/product/<name>/pain.md                 # theme rows
grep -cE '\]\(https?://' .orbit/product/<name>/pain.md      # linked quotes (or ticket numbers)
wc -l reviews.csv                                           # 50–200 items collected
python3 tools/reviews.py reviews.csv --out /tmp/check.md && diff -q /tmp/check.md feedback.md
```

Pass rule: each theme has a frequency, a recency and at least one verbatim quote with a link or ticket id; hate/missing/unsolved are all present (an empty list is stated, not omitted); thin themes are marked; the ranking rule is written in the header; no quote is paraphrased or invented. Copy the "items collected and themes ranked" line into `.orbit/task/<id>/evidence.md` when this feeds a decision.

## Pitfalls

- **Fabricating a review or a number.** One invented quote destroys the whole artifact. If the corpus is small, report a small corpus.
- **Trusting the script's grouping.** Word-based clustering merges "sync is slow" with "sync is broken"; read the raw rows behind every top theme.
- **Quotes without links.** A quote with no source cannot be verified and will be challenged in review; the link is part of the evidence.
- **Counting only volume.** 200 one-star reviews of an abandoned free tier may matter less than 5 tickets from the paying segment. Rank with the segment in the loop.
- **Mixing evidence with marketing copy.** Never reuse a reviewer's words as your testimonial, and never write the positioning before the three lists exist.
- **Forgetting internal sources for your own product.** Support, tickets and surveys are the richest corpus and the easiest to access — do not default to app stores.

## Portability

Plain CSV, Markdown and `python3` standard library — works with any agent and model. Without subagents, collect and code items sequentially; `reviews.py` carries the ranking. If the script is unavailable, a spreadsheet pivot on the same CSV reproduces the counts. No Claude Code features are required.

## What's improved vs the source

- Works for your own internal product: sources are support, tickets and surveys, not only app stores.
- Script output is always re-checked by eye.
- The output feeds the spec directly, not only a marketing "angle".
- Ranking is explicit (pain × frequency × recency) and thin themes are marked, so the list cannot overclaim.
- Every theme carries a verification step, so the fix plan is testable after release.

## Based on

- [Replica](https://github.com/Jakeschincariol/replica-skill) — method «replica-entrepreneur» (MIT). Rewritten in our own words and improved — see "What's improved".
- Helper files in `tools/` are taken from the source unchanged; licences: `tools/LICENSE.upstream`.

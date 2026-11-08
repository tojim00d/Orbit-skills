---
name: write-update
description: '[Orbit 3.3.4 Docs & writing] Internal messages: status, update, announcement, FAQ, incident update. Use when: «напиши статус», «апдейт для команды», «рассылка», «статус проекта для руководства», «сообщение об инциденте»; status update, incident update message.'
---

# write-update — internal messages: statuses, updates, reports

> **Orbit · ③ Operate · step 3.3.4 Docs & writing**  
> **Input:** facts ← `write-human`, `create-skill`  
> **Output:** message / post → next `keep-learnings`  
> **Works with:** `write-human`, `handle-incident`  
> **Shared rules:** reply in the user's language per `speak-plain`; generated content defaults to English; stay in scope; artifacts go to `.orbit/` (contract: `ARTIFACTS.md` at the pack root).

Project status for a manager, team update, announcement, FAQ, incident update. Short, factual, with a clear "what we need from you". Written in the audience's language — a status nobody finishes reading is a status nobody acts on.

## When to use

- A weekly or milestone status is due: what shipped, what is next, what is at risk.
- An incident needs an update per the incident process (`handle-incident`), with impact and the next update time.
- A change affects other teams and needs an announcement: what changed, who it affects, what to do.
- The same question keeps arriving in chat — answer it once as an FAQ.
- Not for a design rationale (`cowrite-doc`), not for a customer-facing release note, and not for polished prose before the facts are checked.

## Inputs

- the task state: `.orbit/task/<id>/plan.md` (`[ ]` not started, `[~]` in progress, `[x]` done and proven) and `.orbit/task/<id>/evidence.md` (command → output → conclusion);
- the code history: `git log`, merged MRs, the tracker;
- the incident record from `handle-incident` — timeline, impact, current status;
- the audience and channel (team chat, leadership email, all-hands), and their expected length;
- the previous update, so the new one answers the questions it raised.

If a number or date cannot be traced to an artifact, mark it as unknown rather than estimating: a wrong ETA in a status is worse than no ETA.

## Procedure

1. **Choose the format.** The structure is decided by the message type, not by taste:

   | Type | Structure |
   |---|---|
   | Project status | One-line verdict (on track / at risk / slipped) → done → next → risks and what is needed from the reader |
   | Incident update | Status → impact → what we are doing → next update at HH:MM |
   | Announcement | What changed → who it affects → what to do → where to read more |
   | FAQ | Question in the user's words → short answer → link |

   Examples — `tools/examples/`.
2. **Fix the audience and the one action.** Who reads it and what should they do after: approve, wait, migrate, or nothing. If there is no action, say so explicitly ("no action needed") — readers assume silence means trouble.
3. **Pull facts from artifacts, not from impressions.** Status comes from the plan, claims from the evidence:

   ```bash
   less .orbit/task/<id>/plan.md
   grep -n '\[~\]' .orbit/task/<id>/plan.md          # what is in progress
   sed -n '1,80p' .orbit/task/<id>/evidence.md       # what is proven
   git log --oneline --since="7 days ago" --no-merges
   ```

4. **Write the first line as the main point.** The verdict or the change goes first; readers may stop there, and that is fine. "On track, one risk: the vendor API is still unconfirmed" is a complete status.
5. **Fill the sections with concrete numbers and absolute dates.** "3 of 5 tasks done, ETA 2026-02-14" beats "most of it is done, soon". Every risk carries an owner and a mitigation.
6. **Verify every claim against its artifact.** Quote the command or the link in a working note; if a claim cannot be traced, remove it or mark it as unconfirmed.
7. **Run the language pass.** `speak-plain` for short sentences and defined terms, `write-human` for the final polish. Cut anything that does not change what the reader knows or does.
8. **Send and record.** Post to the agreed channel, then link the message from `.orbit/task/<id>/review.md` (or the incident record). For an incident, schedule the next update now, not later.
9. **Follow up.** Collect the questions the message produced; repeated questions become the next FAQ entry, and a topic that needs a page becomes `cowrite-doc`.

## Output

The message or post itself, in the audience's language. Canonical shapes:

```markdown
Status — <project>, <YYYY-MM-DD>
Verdict: on track / at risk / slipped — one line.
Done: <n> items, including <the one that matters> (<link>).
Next: <what lands next>, by <YYYY-MM-DD>.
Risks: <risk> — owner <name>, mitigation <plan>.
Need from you: <one action, or "none">.
```

```markdown
Incident update — <service>, <HH:MM UTC>
Status: investigating / mitigated / resolved.
Impact: <who and how many> cannot <do what> since <HH:MM>.
Doing: <current action, owner>.
Next update: <HH:MM UTC> in <channel>.
```

Keep the sent copy where the team archives updates, and reference it from the task's `.orbit/` artifacts.

## Check

```bash
grep -nE '^Verdict:|^Status:' message.md                        # first line carries the point
grep -nE '[0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{2}:[0-9]{2}' message.md   # absolute dates/times
grep -n 'owner' message.md                                      # every risk has an owner
grep -niE 'secret|token|password|10\.[0-9]+\.[0-9]+\.[0-9]+' message.md   # must print nothing
```

Pass rule: the first line states the verdict or the change; every claim traces to a plan item, an evidence line, a commit or an incident record; dates are absolute; each risk has an owner and each incident update has a next-update time; the reader can state what they must do after one read; the message is in the audience's language and contains no secrets.

## Pitfalls

- **Burying the lede.** A status whose verdict is in the last paragraph gets skimmed or ignored. Main point first.
- **"On track" without evidence.** Optimistic statuses destroy trust fastest. Pull the state from `plan.md` and `evidence.md`.
- **Relative dates.** "Next week" is ambiguous by the time it is read. Always write the absolute date.
- **Risks without owners.** A risk nobody owns is a wish. Name the person and the mitigation.
- **Mixing audiences.** A leadership email and a team chat need different detail; one message for both serves neither.
- **No ask.** If you need a decision, say it in one line; "please advise" is not an ask.
- **Jargon and internal codenames.** The audience may be adjacent teams; define terms or link the glossary.
- **A stale update.** Facts change between draft and send — re-check the verdict on the day of sending.
- **Secrets or internals in the text.** Statuses travel to channels with wider access than the repo; strip tokens and hostnames.

## Portability

Plain text in any channel: no Claude-only features, no subagents, no slash commands. The facts live in the repo's `.orbit/` artifacts and git history, so any agent with file and shell access can assemble the update. Without a tracker integration, ask for the ticket list or derive it from `git log`; without the previous update, state assumptions explicitly. `write-human` is optional — the rules here (main point first, absolute dates, owners) work on their own.

## What's improved vs the source

- A format table for typical internal messages, including incident updates.
- Facts are pulled from the task's shared artifacts.
- Absolute dates, risk owners and an explicit "need from you" line make the message actionable.
- A verification pass (`grep` checks) before sending, instead of sending and correcting.

## Based on

- [Skills by Anthropic](https://github.com/anthropics/skills) — method «internal-comms» (Apache-2.0). Rewritten in our own words and improved — see "What's improved".
- Helper files in `tools/` are taken from the source unchanged; licences: `tools/LICENSE.upstream`.

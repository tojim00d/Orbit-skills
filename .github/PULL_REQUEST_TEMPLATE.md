## What

<!-- One logical change: what does it add or fix? -->

## Why

<!-- The real workflow this unblocks. Link the issue if there is one. -->

## How to verify

<!-- Commands or prompts a reviewer can run. -->

- [ ] `python3 scripts/validate_pack.py` passes
- [ ] `claude plugin validate .` passes (if the plugin changed)
- [ ] `CATALOG.md` / `CATALOG.ru.md` and `CHANGELOG.md` updated (if skills changed)

## Checklist

- [ ] Skill instructions are in English; the skill names its phase, input, output, next step and `.orbit/` artifact
- [ ] Any borrowed method is credited with **Based on** and **What's improved**, and helper tools keep their `LICENSE.upstream`
- [ ] No secrets, internal hostnames, employer or personal data in examples

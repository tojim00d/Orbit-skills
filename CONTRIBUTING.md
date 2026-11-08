# Contributing to Orbit

Thanks for helping! Orbit is one pipeline, so every change must keep the skills connected.

## Add or improve a skill
1. Use the `create-skill` skill — it walks you through the format.
2. Skill folder: `plugins/orbit/skills/<verb-name>/SKILL.md` with `name` and a `description` that says what it does, when to use it, and trigger phrases.
3. Instructions in English, short. Say where the skill sits in the pipeline (phase, input, output, next step) and which `.orbit/` artifact it reads and writes (`ARTIFACTS.md`).
4. Based on someone else's method? Add **Based on** (pack, repository, licence) and **What's improved**. Keep helper tools in `tools/` with their original licence.
5. Check: `claude plugin validate .`; then run:
   ```bash
   python3 scripts/validate_pack.py
   python3 scripts/verify_all.py
   ```
   Try 3–5 real requests where the skill should and shouldn't fire.
6. Structure: every SKILL.md follows `docs/SKILL-STANDARD.md` — When to use / Inputs /
   Procedure / Output / Check / Pitfalls / Portability, with concrete commands and
   `.orbit/` artifact paths. Keep every existing capability: a PR that deletes a step or
   an artifact path is rejected.

## Pull requests
- One logical change per PR; describe what, why, how to verify.
- Update `CATALOG.md` and `CHANGELOG.md` if skills change.
- No secrets, internal hostnames or personal data in examples.

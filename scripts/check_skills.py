#!/usr/bin/env python3
"""Quality rubric for Orbit SKILL.md files (v3.0.0).

  python3 scripts/check_skills.py                 # whole pack, human summary
  python3 scripts/check_skills.py --json reports/quality.json
  python3 scripts/check_skills.py --skill clarify-task
  python3 scripts/check_skills.py --fail-under 8.0

Exit code is non-zero if the pack (or the requested skill) misses the bar.
Dependency-free.
"""
from __future__ import annotations

import argparse
import json
import re
import statistics
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKILLS = ROOT / "plugins" / "orbit" / "skills"

SECTION_ALIASES = {
    "when": ("when to use", "when"),
    "inputs": ("inputs", "input"),
    "procedure": ("procedure", "method", "steps"),
    "output": ("output", "outputs"),
    "check": ("check", "checks", "verify", "verification"),
    "pitfalls": ("pitfalls", "gotchas", "failure modes"),
    "portability": ("portability", "compatibility", "other agents"),
    "improved": ("what's improved", "improved", "what is improved"),
    "based": ("based on", "sources"),
}

COMMAND_HINTS = (
    "git ", "grep", "rg ", "find ", "pytest", "python3", "npm ", "npx ", "node ",
    "docker", "kubectl", "helm", "gh ", "glab", "curl ", "make ", "cargo ", "go ",
    "terraform", "ansible", "jq ", "sed ", "awk ", "playwright",
)

FRONTMATTER = re.compile(r"\A---[ \t]*\r?\n(.*?)\r?\n---[ \t]*\r?\n", re.S)
HEADING = re.compile(r"^##\s+(.+?)\s*$", re.M)


def parse_frontmatter(text: str) -> dict[str, str]:
    m = FRONTMATTER.match(text)
    if not m:
        return {}
    data: dict[str, str] = {}
    key = None
    for raw in m.group(1).splitlines():
        if re.match(r"^[A-Za-z_][\w-]*\s*:", raw):
            key, _, value = raw.partition(":")
            key = key.strip()
            data[key] = value.strip().strip("\"'")
        elif key and raw.startswith((" ", "\t")):
            data[key] = (data[key] + " " + raw.strip()).strip()
    return data


def section_text(text: str, aliases: tuple[str, ...]) -> str:
    """Return the body of the first heading whose name matches one alias."""
    heads = list(HEADING.finditer(text))
    for i, h in enumerate(heads):
        name = h.group(1).strip().lower()
        name = re.sub(r"[`*_]", "", name)
        if any(name == a or name.startswith(a + " ") or name.startswith(a + "/") for a in aliases):
            start = h.end()
            end = heads[i + 1].start() if i + 1 < len(heads) else len(text)
            return text[start:end].strip()
    return ""


def bullets(block: str) -> int:
    return len(re.findall(r"^\s*(?:[-*+]|\d+\.)\s+\S", block, re.M))


def count_steps(procedure: str) -> int:
    return len(re.findall(r"^\s*\d+\.\s+\S", procedure, re.M))


def count_commands(text: str) -> int:
    low = text.lower()
    return sum(low.count(h) for h in COMMAND_HINTS)


def words(text: str) -> int:
    return len(re.findall(r"[A-Za-zА-Яа-я0-9][A-Za-zА-Яа-я0-9'’_-]*", text))


def score_skill(path: Path) -> dict:
    text = path.read_text(encoding="utf-8", errors="ignore")
    fm = parse_frontmatter(text)
    body = text[FRONTMATTER.match(text).end():] if FRONTMATTER.match(text) else text
    found = {k: section_text(text, v) for k, v in SECTION_ALIASES.items()}
    missing = [k for k, v in found.items() if not v]

    n_words = words(body)
    steps = count_steps(found.get("procedure", ""))
    code_blocks = body.count("```") // 2
    commands = count_commands(body + " " + found.get("check", ""))
    artifacts = len(re.findall(r"\.orbit/|openspec/|docs/project-map/", body))
    pitfalls = bullets(found.get("pitfalls", ""))
    desc = fm.get("description", "")
    desc_ok = 120 <= len(desc) <= 1024 and "Use when" in desc
    has_ru = bool(re.search(r"[А-Яа-яЁё]", desc))

    # components: sections 4, depth 3, concreteness 2, description 1
    sections_pts = 4.0 * (len(SECTION_ALIASES) - len(missing)) / len(SECTION_ALIASES)
    depth_pts = 0.0
    depth_pts += 1.0 if n_words >= 800 else 0.75 if n_words >= 650 else 0.4 if n_words >= 450 else 0.0
    depth_pts += 1.0 if steps >= 6 else 0.5 if steps >= 4 else 0.0
    depth_pts += 1.0 if code_blocks >= 2 else 0.5 if code_blocks == 1 else 0.0
    conc_pts = 0.0
    conc_pts += 1.0 if commands >= 8 else 0.6 if commands >= 4 else 0.2 if commands >= 1 else 0.0
    conc_pts += 1.0 if (pitfalls >= 4 and artifacts >= 2) else 0.5 if (pitfalls >= 2 or artifacts >= 1) else 0.0
    desc_pts = 1.0 if (desc_ok and has_ru) else 0.5 if desc_ok or has_ru else 0.0
    score = round(sections_pts + depth_pts + conc_pts + desc_pts, 2)

    # pass bar per skill
    checks = {
        "sections": not missing,
        "words>=700": n_words >= 700,
        "steps>=6": steps >= 6,
        "code>=2": code_blocks >= 2,
        "pitfalls>=4": pitfalls >= 4,
        "commands>=4": commands >= 4,
        "artifacts>=2": artifacts >= 2,
        "description": desc_ok and has_ru,
    }
    return {
        "skill": path.parent.name,
        "file": str(path.relative_to(ROOT)),
        "words": n_words,
        "steps": steps,
        "code_blocks": code_blocks,
        "commands": commands,
        "artifacts": artifacts,
        "pitfalls": pitfalls,
        "score": score,
        "missing_sections": missing,
        "failed": [k for k, ok in checks.items() if not ok],
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", help="write machine-readable report")
    ap.add_argument("--skill", help="check one skill only")
    ap.add_argument("--fail-under", type=float, default=8.0)
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args()

    paths = sorted(SKILLS.glob("*/SKILL.md"))
    if args.skill:
        paths = [p for p in paths if p.parent.name == args.skill]
        if not paths:
            print(f"unknown skill: {args.skill}", file=sys.stderr)
            return 2

    results = [score_skill(p) for p in paths]
    scores = [r["score"] for r in results]
    words_list = [r["words"] for r in results]
    passing = [r for r in results if not r["failed"]]
    avg = round(statistics.mean(scores), 2) if scores else 0
    median_words = int(statistics.median(words_list)) if words_list else 0

    if args.json:
        out = Path(args.json)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps({
            "skills": len(results),
            "average_score": avg,
            "median_words": median_words,
            "passing": len(passing),
            "results": results,
        }, indent=2, ensure_ascii=False), encoding="utf-8")

    if not args.quiet:
        print(f"skills: {len(results)} | avg score: {avg}/10 | median words: {median_words} | passing: {len(passing)}/{len(results)}")
        for r in results:
            flag = "OK " if not r["failed"] else "LOW"
            print(f"  {flag} {r['skill']:22s} score {r['score']:4.2f}  words {r['words']:5d}  steps {r['steps']:2d}  "
                  f"code {r['code_blocks']:2d}  pitfalls {r['pitfalls']:2d}  cmds {r['commands']:3d}"
                  + (f"  missing: {','.join(r['missing_sections'])}" if r["missing_sections"] else "")
                  + (f"  failed: {','.join(r['failed'])}" if r["failed"] else ""))

    failed = not results or avg < args.fail_under or len(passing) < len(results)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())

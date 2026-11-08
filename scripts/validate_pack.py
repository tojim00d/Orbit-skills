#!/usr/bin/env python3
"""Validate the Orbit pack.

Dependency-free checks used by CI and by contributors:

  python3 scripts/validate_pack.py

Checks:
  * exactly 89 skills, each with SKILL.md and valid frontmatter (name/description);
  * skill `name` matches its folder and is unique;
  * plugin manifests are valid JSON and point at existing paths;
  * every relative link in Markdown/HTML resolves to a real file;
  * no unpublished placeholders in user-facing pages;
  * GitHub Pages root and required files are present;
  * no junk files (__pycache__, .pyc, .DS_Store).
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKILLS = ROOT / "plugins" / "orbit" / "skills"
EXPECTED_SKILLS = 89

errors: list[str] = []
warnings: list[str] = []


def err(msg: str) -> None:
    errors.append(msg)


def warn(msg: str) -> None:
    warnings.append(msg)


def walk_files(root: Path):
    """Walk files without descending into .git / __pycache__."""
    import os
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in {".git", "__pycache__"}]
        for name in filenames:
            yield Path(dirpath) / name


def rel(p: Path) -> str:
    try:
        return str(p.relative_to(ROOT))
    except ValueError:
        return str(p)


# ---------------------------------------------------------------- skills
FRONTMATTER = re.compile(r"\A---[ \t]*\r?\n(.*?)\r?\n---[ \t]*\r?\n", re.S)


def parse_frontmatter(text: str) -> dict[str, str] | None:
    m = FRONTMATTER.match(text)
    if not m:
        return None
    data: dict[str, str] = {}
    key = None
    for raw in m.group(1).splitlines():
        if not raw.strip() or raw.lstrip().startswith("#"):
            continue
        if re.match(r"^[A-Za-z_][\w-]*\s*:", raw):
            key, _, value = raw.partition(":")
            key = key.strip()
            data[key] = value.strip().strip("\"'")
        elif key and raw.startswith((" ", "\t")):
            data[key] = (data[key] + " " + raw.strip()).strip()
    return data


def check_skills() -> None:
    if not SKILLS.is_dir():
        err(f"missing skills directory: {rel(SKILLS)}")
        return
    dirs = sorted(p for p in SKILLS.iterdir() if p.is_dir())
    mds = sorted(SKILLS.glob("*/SKILL.md"))
    if len(dirs) != EXPECTED_SKILLS:
        err(f"expected {EXPECTED_SKILLS} skill folders, found {len(dirs)}")
    if len(mds) != EXPECTED_SKILLS:
        err(f"expected {EXPECTED_SKILLS} SKILL.md files, found {len(mds)}")

    empty_dirs = [p for p in dirs if not any(p.iterdir())]
    for p in empty_dirs:
        err(f"empty skill folder: {rel(p)}")

    names: dict[str, str] = {}
    for md in mds:
        folder = md.parent.name
        try:
            text = md.read_text(encoding="utf-8")
        except OSError as exc:
            err(f"{rel(md)}: cannot read ({exc})")
            continue
        fm = parse_frontmatter(text)
        if fm is None:
            err(f"{rel(md)}: missing YAML frontmatter (--- ... ---)")
            continue
        name = fm.get("name", "")
        description = fm.get("description", "")
        if not name:
            err(f"{rel(md)}: frontmatter has no `name`")
        elif name != folder:
            err(f"{rel(md)}: name `{name}` does not match folder `{folder}`")
        elif name in names:
            err(f"{rel(md)}: duplicate skill name `{name}` (also {names[name]})")
        else:
            names[name] = rel(md)
        if not description:
            err(f"{rel(md)}: frontmatter has no `description`")
        elif len(description) < 40:
            warn(f"{rel(md)}: description is very short ({len(description)} chars)")


# ---------------------------------------------------------------- manifests
def check_manifests() -> None:
    marketplace = ROOT / ".claude-plugin" / "marketplace.json"
    plugin = ROOT / "plugins" / "orbit" / ".claude-plugin" / "plugin.json"
    for path in (marketplace, plugin):
        if not path.is_file():
            err(f"missing manifest: {rel(path)}")
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            err(f"{rel(path)}: invalid JSON ({exc})")
            continue
        if not isinstance(data, dict) or "name" not in data:
            err(f"{rel(path)}: manifest has no `name`")

    if marketplace.is_file():
        try:
            data = json.loads(marketplace.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            data = {}
        for entry in data.get("plugins", []):
            source = entry.get("source")
            if source and not (ROOT / source).is_dir():
                err(f"{rel(marketplace)}: plugin source `{source}` does not exist")


# ---------------------------------------------------------------- links
LINK_MD = re.compile(r"!?\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+\"[^\"]*\")?\s*\)")
LINK_HTML = re.compile(r"""(?:href|src)\s*=\s*["']([^"']+)["']""")
SKIP_PREFIXES = ("http://", "https://", "mailto:", "tel:", "data:", "#", "javascript:")


PLACEHOLDER_TARGETS = {"url", "path", "target", "link", "href", "your-url"}


def is_placeholder(target: str) -> bool:
    if target in PLACEHOLDER_TARGETS:
        return True
    return target.startswith(("%%", "${", "<", "{{"))


def local_target(raw: str) -> str | None:
    if not raw or raw.startswith(SKIP_PREFIXES):
        return None
    target = raw.split("#", 1)[0].strip()
    if not target:
        return None
    if target.startswith("/"):  # root-absolute: resolve against repo root
        return target.lstrip("/")
    return target


def check_links() -> None:
    checked = 0
    for path in sorted(walk_files(ROOT)):
        if path.suffix.lower() not in {".md", ".html", ".htm"}:
            continue
        # build inputs: templates reference files generated/copied at build time
        if path.name.endswith(".template.html"):
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        pattern = LINK_HTML if path.suffix.lower() in {".html", ".htm"} else LINK_MD
        for match in pattern.finditer(text):
            target = local_target(match.group(1))
            if target is None:
                continue
            # query strings are not files
            target = target.split("?", 1)[0]
            resolved = (path.parent / target).resolve()
            checked += 1
            if not resolved.exists():
                # allow links into .orbit/ that are only created at runtime
                if target.startswith(".orbit/"):
                    continue
                if is_placeholder(target):
                    continue
                err(f"{rel(path)}: broken link `{match.group(1)}`")
    print(f"  links checked: {checked}")


# ---------------------------------------------------------------- pages
def check_pages() -> None:
    docs = ROOT / "docs"
    for required in ("index.html", "index.ru.html", "map.html", "map.ru.html", "llms.txt", "robots.txt", "sitemap.xml", ".nojekyll"):
        if not (docs / required).is_file():
            err(f"docs/ is not a valid Pages root: missing {required}")
    if not (ROOT / "assets" / "social-preview.png").is_file():
        warn("assets/social-preview.png missing (README preview)")

    for path in [docs / "index.html", docs / "index.ru.html", docs / "map.html", docs / "map.ru.html", docs / "llms.txt"]:
        if not path.is_file():
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        for placeholder in ("__REPO__", "__REPO_URL__", "__SITE__", "your-org/orbit"):
            if placeholder in text:
                err(f"{rel(path)}: unpublished placeholder `{placeholder}`")


JUNK_NAMES = {".DS_Store", "__pycache__", ".coverage"}
JUNK_SUFFIXES = {".pyc", ".pyo", ".sqlite", ".db", ".log"}
JUNK_PATTERNS = ("coverage.xml", "htmlcov")


def check_junk() -> None:
    for path in walk_files(ROOT):
        name = path.name
        if name in JUNK_NAMES:
            kind = "directory" if path.is_dir() else "file"
            err(f"junk {kind}: {rel(path)}")
        elif path.suffix in JUNK_SUFFIXES:
            err(f"junk file: {rel(path)}")
        elif name.startswith("coverage") and name.endswith(".json"):
            err(f"junk file: {rel(path)}")



# ---------------------------------------------------------------- commands
COMMAND_DOCS = ("README.md", "README.ru.md", "DEMO.md", "DEMO.ru.md", "llms.txt", "docs/index.html")
BARE_COMMAND = re.compile(r"(?<![.\w/])/orbit(?![:/\w])")


def check_commands() -> None:
    """Plugin commands are namespaced (/orbit:<command>) — docs must not promise a bare /orbit."""
    commands = ROOT / "plugins" / "orbit" / "commands"
    if not commands.is_dir():
        err("missing commands directory: plugins/orbit/commands")
        return
    names = sorted(p.stem for p in commands.glob("*.md"))
    if not names:
        err("no commands in plugins/orbit/commands")
    for name in COMMAND_DOCS:
        path = ROOT / name
        if not path.is_file():
            continue
        for i, line in enumerate(path.read_text(encoding="utf-8", errors="ignore").splitlines(), 1):
            for match in BARE_COMMAND.finditer(line):
                err(f"{name}:{i}: command `{match.group(0)}` is missing the plugin namespace "
                    f"(use /orbit:orbit, /orbit:understand, /orbit:map, /orbit:reverse or /orbit:<skill>)")


# ---------------------------------------------------------------- tables
TABLE_SEPARATOR = re.compile(r"^\|?\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)+\|?\s*$")


def unescaped_pipes(line: str) -> int:
    return len(re.findall(r"(?<!\\)\|", line))


def check_tables() -> None:
    """GitHub tables break if a cell contains an unescaped pipe (even inside backticks)."""
    for path in sorted(walk_files(ROOT)):
        if path.suffix != ".md":
            continue
        lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
        header = None
        for i, line in enumerate(lines):
            stripped = line.strip()
            if header is None:
                if stripped.startswith("|") and i + 1 < len(lines) and TABLE_SEPARATOR.match(lines[i + 1].strip()):
                    header = unescaped_pipes(stripped)
                continue
            if not stripped.startswith("|"):
                header = None
                continue
            if unescaped_pipes(stripped) != header:
                err(f"{rel(path)}:{i + 1}: table row has {unescaped_pipes(stripped)} pipes, "
                    f"header has {header} — escape literal pipes as \\|")


def check_claims() -> None:
    claims = {
        "README.md": "89 skills",
        "README.ru.md": "89",
        "CATALOG.md": "89",
        "llms.txt": "89 agent skills",
        "plugins/orbit/.claude-plugin/plugin.json": "89 skills",
    }
    for name, needle in claims.items():
        path = ROOT / name
        if not path.is_file():
            warn(f"claim file missing: {name}")
            continue
        if needle not in path.read_text(encoding="utf-8", errors="ignore"):
            err(f"{name}: expected string `{needle}` not found")


def main() -> int:
    print(f"Validating Orbit pack at {ROOT}")
    check_skills()
    check_manifests()
    check_commands()
    check_tables()
    check_links()
    check_pages()
    check_junk()
    check_claims()

    for w in warnings:
        print(f"WARN  {w}")
    for e in errors:
        print(f"ERROR {e}")
    if errors:
        print(f"\nFAILED: {len(errors)} error(s), {len(warnings)} warning(s)")
        return 1
    print(f"\nOK: pack is valid ({len(warnings)} warning(s))")
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Builds the one-page interactive project map into a single project.html.

Inlines the template (project.template.html) and three scripts (project-data.js,
project-schema.js, project-view.js) into a standalone project.html with no external dependencies.

Link check (optional): if checkouts of the repositories listed in REPO_ROOTS lie next to the map,
the script verifies that every linked path exists.
Missing sibling checkouts are skipped; missing files are an error.

Run:  python3 build.py [map-files-directory]
Defaults to build.py's own directory.
"""
import re
import sys
from pathlib import Path

HERE = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path(__file__).resolve().parent

# Short repo code -> where its checkout lives relative to the map.
# Leave {} empty if the map links no external repositories.
# Example for a map in <repo>/docs/project-map/ with sibling checkouts:
#   REPO_ROOTS = {"C": HERE.parents[1], "P": HERE.parents[2] / "platform"}
REPO_ROOTS: dict[str, Path] = {}

TEMPLATE = "project.template.html"
SCRIPTS = ("project-data.js", "project-schema.js", "project-view.js")

html = (HERE / TEMPLATE).read_text(encoding="utf-8")
scripts = {name: (HERE / name).read_text(encoding="utf-8") for name in SCRIPTS}

# Check paths like [X, "rel/path"] or [X, B + "rel/path"] in the map data.
if REPO_ROOTS:
    missing, skipped = [], set()
    blob = "".join(scripts.values())
    bprefix = re.search(r'B\s*=\s*"([^"]*)"', blob)
    bprefix = bprefix.group(1) if bprefix else ""
    for repo, expr in re.findall(r'\[([A-Z]),\s*((?:B\s*\+\s*)?"[^"]+")\]', blob):
        if repo not in REPO_ROOTS:
            continue
        path = expr.replace("B +", bprefix).replace("B+", bprefix).replace('"', "").strip()
        root = REPO_ROOTS[repo]
        if not root.exists():
            skipped.add(repo)
        elif not (root / path).exists():
            missing.append(f"{repo}: {path}")
    if skipped:
        print("not checked (no sibling checkout):", ", ".join(sorted(skipped)))
    if missing:
        raise SystemExit("linked files missing:\n" + "\n".join(missing))

# Add dialog backdrop styles and inline the scripts into one file.
html = html.replace("</style>", "dialog" + chr(58) * 2 + "backdrop{background:rgba(41,41,41,.45)}\n</style>")
for name, code in scripts.items():
    html = html.replace(f'<script src="{name}"></script>', "<script>\n" + code + "\n</script>")

out = HERE / "project.html"
out.write_text(html, encoding="utf-8")
print("built:", out)

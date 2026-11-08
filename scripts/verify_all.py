#!/usr/bin/env python3
"""Repository check for Orbit: structure, links, skill layout, catalog, build sanity.

Run locally or in CI:

  python3 scripts/verify_all.py
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PY = sys.executable or "python3"

gates: list[dict] = []


def run(name: str, cmd: list[str], detail: str = "") -> bool:
    proc = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
    ok = proc.returncode == 0
    tail = ((proc.stdout + proc.stderr).strip().splitlines() or [""])[-1]
    gates.append({"name": name, "ok": ok, "detail": detail or tail})
    print(f"{'PASS' if ok else 'FAIL'}  {name}" + (f"  — {tail}" if tail else ""))
    return ok


def main() -> int:
    run("structure & links (validate_pack)", [PY, "scripts/validate_pack.py"])
    run("skill structure & depth (check_skills)", [PY, "scripts/check_skills.py"])

    inventory = ROOT / "scripts" / "skills-inventory.txt"
    expected = set(inventory.read_text(encoding="utf-8").split()) if inventory.is_file() else None
    actual = {p.parent.name for p in (ROOT / "plugins" / "orbit" / "skills").glob("*/SKILL.md")}
    if expected is None:
        ok = len(actual) == 89
        detail = f"{len(actual)} skills"
    else:
        ok = expected == actual
        detail = f"{len(actual)}/{len(expected)} present" + ("" if ok else f"; missing={sorted(expected - actual)} extra={sorted(actual - expected)}")
    gates.append({"name": "skill inventory (89)", "ok": ok, "detail": detail})
    print(f"{'PASS' if ok else 'FAIL'}  skill inventory (89) — {detail}")

    py_files = [p for p in ROOT.rglob("*.py") if ".git" not in p.parts]
    bad = []
    for p in py_files:
        proc = subprocess.run([PY, "-m", "py_compile", str(p)], capture_output=True, text=True)
        if proc.returncode != 0:
            bad.append(str(p.relative_to(ROOT)))
    gates.append({"name": "python sources compile", "ok": not bad, "detail": f"{len(py_files)} files"})
    print(f"{'PASS' if not bad else 'FAIL'}  python sources compile ({len(py_files)} files)")

    shells = list(ROOT.rglob("*.sh"))
    sh_bad = [str(p.relative_to(ROOT)) for p in shells
              if subprocess.run(["bash", "-n", str(p)], capture_output=True).returncode != 0]
    gates.append({"name": "shell scripts parse", "ok": not sh_bad, "detail": f"{len(shells)} files"})
    print(f"{'PASS' if not sh_bad else 'FAIL'}  shell scripts parse ({len(shells)} files)")

    json_bad = []
    for p in [ROOT / ".claude-plugin" / "marketplace.json",
              ROOT / "plugins" / "orbit" / ".claude-plugin" / "plugin.json"]:
        try:
            json.loads(p.read_text(encoding="utf-8"))
        except Exception as exc:  # noqa: BLE001
            json_bad.append(f"{p.name}: {exc}")
    gates.append({"name": "manifests valid JSON", "ok": not json_bad, "detail": "marketplace.json, plugin.json"})
    print(f"{'PASS' if not json_bad else 'FAIL'}  manifests valid JSON")

    import re
    catalog = (ROOT / "CATALOG.md").read_text(encoding="utf-8", errors="ignore")
    rows = len(re.findall(r"^\|\s*\d+\.\d+\.\d+\s*\|", catalog, re.M))
    gates.append({"name": "CATALOG has one row per skill", "ok": rows == 89, "detail": f"{rows} rows"})
    print(f"{'PASS' if rows == 89 else 'FAIL'}  CATALOG has one row per skill ({rows})")

    commands = sorted(p.stem for p in (ROOT / "plugins" / "orbit" / "commands").glob("*.md"))
    agents = sorted(p.stem for p in (ROOT / "plugins" / "orbit" / "agents").glob("*.md"))
    comp_ok = commands == ["map", "reverse", "understand"] and agents == ["orbit-cartographer", "orbit-reverse-analyst"]
    gates.append({"name": "plugin components (3 commands, 2 agents)", "ok": comp_ok,
                  "detail": f"commands={commands} agents={agents}"})
    print(f"{'PASS' if comp_ok else 'FAIL'}  plugin components (3 commands, 2 agents)")

    failed = [g for g in gates if not g["ok"]]
    print(f"\n{len(gates) - len(failed)}/{len(gates)} checks passed")
    return 0 if not failed else 1


if __name__ == "__main__":
    sys.exit(main())

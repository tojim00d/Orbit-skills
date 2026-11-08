#!/usr/bin/env bash
# Orbit installer.
#
#   ./install.sh                    install Orbit as a Claude Code plugin from this folder
#   ./install.sh --skills-dir DIR   copy the 89 skills into any agent's skills directory
#   ./install.sh --help             show this help
#
# Works for Claude Code (native plugin + slash commands) and for other agents
# that read SKILL.md folders (Codex, Qwen Code, GLM/Z.ai setups, Cursor, ...).
# See AGENTS.md and COMPATIBILITY.md.
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
SKILLS_SRC="$DIR/plugins/orbit/skills"
SKILLS_DIR=""

usage() {
  cat <<'EOF'
Orbit — Claude Code skill pack (89 skills, one pipeline: Understand → Build → Operate).

Usage:
  ./install.sh                    Install as a Claude Code plugin from this folder.
  ./install.sh --skills-dir DIR   Copy the 89 SKILL.md folders into any agent's
                                  skills directory (e.g. ~/.agents/skills).
  ./install.sh --help             Show this help.

After install, read AGENTS.md and ask for a task in your own words.
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --skills-dir)
      [ $# -ge 2 ] || { echo "error: --skills-dir needs a value" >&2; exit 1; }
      SKILLS_DIR="$2"; shift 2 ;;
    --skills-dir=*)
      SKILLS_DIR="${1#*=}"; shift ;;
    -h|--help)
      usage; exit 0 ;;
    *)
      echo "error: unknown argument: $1" >&2; usage >&2; exit 1 ;;
  esac
done

if [ ! -d "$SKILLS_SRC" ]; then
  echo "error: skills directory not found: $SKILLS_SRC" >&2
  exit 1
fi

if [ -n "$SKILLS_DIR" ]; then
  mkdir -p "$SKILLS_DIR"
  copied=0
  skipped=0
  for skill in "$SKILLS_SRC"/*/; do
    name="$(basename "$skill")"
    if [ -e "$SKILLS_DIR/$name" ]; then
      skipped=$((skipped + 1))
      continue
    fi
    cp -R "$skill" "$SKILLS_DIR/$name"
    copied=$((copied + 1))
  done
  echo "Orbit: copied $copied skills to $SKILLS_DIR (skipped $skipped existing)."
  echo "Next: read AGENTS.md in your agent session and describe the task in words."
  echo "Artifacts go to .orbit/ in your project (see ARTIFACTS.md)."
  exit 0
fi

if ! command -v claude >/dev/null 2>&1; then
  echo "error: the 'claude' CLI is not on PATH." >&2
  echo "Install Claude Code, or use: ./install.sh --skills-dir <dir> for another agent." >&2
  exit 1
fi

claude plugin marketplace add "$DIR"
claude plugin install orbit@orbit
echo "Done. Restart Claude Code and type /orbit:orbit. Pack map: $DIR/map/index.html"
echo "Готово. Перезапусти Claude Code и набери /orbit:orbit. Карта пака: $DIR/map/index.html"

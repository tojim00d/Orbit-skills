#!/usr/bin/env bash
# Claude Code PreToolUse hook: blocks dangerous git commands. Exit code 2 = deny, reason on stderr.
input="$(cat)"
cmd="$(printf '%s' "$input" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("tool_input",{}).get("command",""))' 2>/dev/null)"
patterns='git[[:space:]]+push([^|;&]*)(--force|-f([[:space:]]|$)|--force-with-lease)|git[[:space:]]+reset[[:space:]]+--hard|git[[:space:]]+clean[[:space:]]+-[a-zA-Z]*f|git[[:space:]]+branch[[:space:]]+-D|git[[:space:]]+checkout[[:space:]]+--[[:space:]]+\.|git[[:space:]]+restore[[:space:]]+\.|git[[:space:]]+push[^|;&]*[[:space:]]:[^[:space:]]+'
if printf '%s' "$cmd" | grep -Eq "$patterns"; then
  echo "Orbit: dangerous git command blocked: $cmd. A human must ask for it explicitly." >&2
  exit 2
fi
exit 0

#!/usr/bin/env python3
"""Generate self-hosted flat SVG badges (shields.io style) into assets/badges/."""
from pathlib import Path

OUT = Path("assets/badges")
OUT.mkdir(parents=True, exist_ok=True)

FONT = "Verdana,Geneva,DejaVu Sans,sans-serif"

BADGES = {
    "claude-code-plugin": ("Claude Code", "plugin", "#d97757"),
    "agent-skills": ("agent skills", "89", "#2f5da8"),
    "license": ("license", "MIT", "#2e7d55"),
    "prs-welcome": ("PRs", "welcome", "#2e7d55"),
    "website": ("website", "tojim00d.github.io", "#2f5da8"),
    "agents": ("agents", "Claude · Codex · Qwen · DeepSeek", "#6b6760"),
}


def text_width(text: str, size: int = 11) -> float:
    # rough Verdana advance widths, good enough for 11px badge text
    wide = set("mwMW@#%&")
    narrow = set("iljI.,:;'|!")
    w = 0.0
    for ch in text:
        if ch in wide:
            w += size * 0.9
        elif ch in narrow:
            w += size * 0.32
        elif ch == " ":
            w += size * 0.4
        else:
            w += size * 0.6
    return w


def svg(label: str, value: str, color: str) -> str:
    size = 11
    label_w = round(text_width(label, size) + 12)
    value_w = round(text_width(value, size) + 20)
    total = label_w + value_w
    lx = label_w / 2
    vx = label_w + value_w / 2
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{total}" height="20" role="img" aria-label="{label}: {value}">
  <title>{label}: {value}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="{total}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="{label_w}" height="20" fill="#555"/>
    <rect x="{label_w}" width="{value_w}" height="20" fill="{color}"/>
    <rect width="{total}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="{FONT}" font-size="{size}">
    <text x="{lx:.0f}" y="15" fill="#010101" fill-opacity=".3">{label}</text>
    <text x="{lx:.0f}" y="14">{label}</text>
    <text x="{vx:.0f}" y="15" fill="#010101" fill-opacity=".3">{value}</text>
    <text x="{vx:.0f}" y="14">{value}</text>
  </g>
</svg>
'''


for name, (label, value, color) in BADGES.items():
    path = OUT / f"{name}.svg"
    path.write_text(svg(label, value, color), encoding="utf-8")
    print("wrote", path)

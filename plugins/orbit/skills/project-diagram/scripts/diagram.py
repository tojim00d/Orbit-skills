#!/usr/bin/env python3
"""project-diagram: static diagram of phases and steps → SVG (+ PNG if a converter exists).

Input — JSON (see references/spec.md). Python 3.8+ standard library only.

  python3 diagram.py spec.json                  # → spec.svg next to it
  python3 diagram.py spec.json -o out.svg --png # + out.png (rsvg-convert / Chrome / Edge if present)
  python3 diagram.py spec.json --theme paper    # light theme
"""
import argparse, json, shutil, subprocess, sys, unicodedata
from pathlib import Path
from xml.sax.saxutils import escape

THEMES = {
    "blueprint": dict(bg="#0f1b2d", grid="#1b2a42", ink="#eef3fb", muted="#9fb0c8", card="#15243b", stroke="#2c4366",
                      accents=["#5cc8ff", "#7ee2a8", "#ffd166", "#c29bff", "#ff8fa3", "#66e0d0"], title="#ffffff", chip="#1d3150"),
    "paper": dict(bg="#fbfaf7", grid="#efece6", ink="#22201c", muted="#6f6a61", card="#ffffff", stroke="#d9d4ca",
                  accents=["#2f5da8", "#2e7d55", "#b8860b", "#7a4fbf", "#b4452f", "#167a75"], title="#111111", chip="#f3f1ec"),
}
FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"

def tw(text, size, bold=False):
    """Text width estimate without a browser: width by character class."""
    w = 0.0
    for ch in str(text):
        if ch == " ": w += .30
        elif unicodedata.east_asian_width(ch) in "WF": w += 1.0
        elif ch in "iljtf.,:;'|!()[]": w += .30
        elif ch in "mwMWШЩЖЮмшщжю": w += .82
        elif ch.isupper(): w += .66
        elif ch.isdigit(): w += .56
        else: w += .54
    return w * size * (1.06 if bold else 1.0)

def wrap(text, size, maxw, bold=False):
    lines, cur = [], ""
    for word in str(text or "").split():
        t = f"{cur} {word}" if cur else word
        if not cur or tw(t, size, bold) <= maxw: cur = t
        else: lines.append(cur); cur = word
    if cur: lines.append(cur)
    out = []
    for l in lines:  # split an overlong word by characters
        while tw(l, size, bold) > maxw and len(l) > 1:
            k = len(l)
            while k > 1 and tw(l[:k], size, bold) > maxw: k -= 1
            out.append(l[:k]); l = l[k:]
        out.append(l)
    return out

def circled(n):
    return chr(0x245F + n) if 1 <= n <= 20 else f"{n}."

def build(spec, theme_name):
    T = THEMES[theme_name]
    phases = spec["phases"]
    colW, gap, pad, top = spec.get("columnWidth", 300), 76, 48, 150
    cardPad, chipH = 18, 24
    # 1. Step cards: text wrapping, height.
    step_no, steps, n = {}, {}, 0
    for pi, ph in enumerate(phases):
        for st in ph["steps"]:
            n += 1; step_no[st["id"]] = n
            inner = colW - 2 * cardPad - 34
            tl = wrap(st["title"], 17, inner, True)
            sl = wrap(st.get("sub", ""), 13, inner)
            chips, cx, cy = [], 0, 0
            for it in st.get("items", []):
                w = min(tw(it, 12) + 20, colW - 2 * cardPad)
                if cx and cx + w > colW - 2 * cardPad: cx = 0; cy += chipH + 6
                chips.append((it, cx, cy, w)); cx += w + 6
            h = cardPad + len(tl) * 22 + len(sl) * 18 + (cy + chipH + 12 if chips else 0) + cardPad - 4
            steps[st["id"]] = dict(st=st, pi=pi, tl=tl, sl=sl, chips=chips, h=max(h, 74), no=n)
    # 2. Columns: phase header, cards top to bottom.
    W = pad * 2 + len(phases) * colW + (len(phases) - 1) * gap
    headH = max(len(wrap(p["title"], 20, colW - 70, True)) * 24 + len(wrap(p.get("sub", ""), 13, colW - 30)) * 17 for p in phases) + 30
    y0, vgap, maxY = top + headH + 12, 34, 0
    for pi, ph in enumerate(phases):
        x, y = pad + pi * (colW + gap), y0
        for st in ph["steps"]:
            s = steps[st["id"]]; s["x"], s["y"] = x, y; y += s["h"] + vgap
        maxY = max(maxY, y)
    # 3. Links: by default a chain in step order; custom edges allowed.
    order = [st["id"] for ph in phases for st in ph["steps"]]
    edges = spec.get("edges") or [{"from": a, "to": b} for a, b in zip(order, order[1:])]
    extra_back = [e for e in edges if steps[e["to"]]["pi"] < steps[e["from"]]["pi"]]
    H = maxY + (len(extra_back) * 26 + 10 if extra_back else 0) + (64 if spec.get("footer") else 20)
    acc = lambda pi: T["accents"][pi % len(T["accents"])]
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" font-family="{FONT}">',
         f'<defs><pattern id="g" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="{T["grid"]}"/></pattern>',
         *[f'<marker id="a{i}" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="{c}"/></marker>' for i, c in enumerate(T["accents"])],
         f'<marker id="am" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="{T["muted"]}"/></marker></defs>',
         f'<rect width="{W}" height="{H}" fill="{T["bg"]}"/><rect width="{W}" height="{H}" fill="url(#g)"/>',
         f'<text x="{pad}" y="{64}" font-size="30" font-weight="800" fill="{T["title"]}">{escape(spec.get("title", ""))}</text>']
    for k, l in enumerate(wrap(spec.get("subtitle", ""), 15, W - 2 * pad)):
        o.append(f'<text x="{pad}" y="{94 + k * 20}" font-size="15" fill="{T["muted"]}">{escape(l)}</text>')
    # Phase headers and transition chevrons.
    for pi, ph in enumerate(phases):
        x, c = pad + pi * (colW + gap), acc(pi)
        o.append(f'<rect x="{x}" y="{top}" width="{colW}" height="4" rx="2" fill="{c}"/>')
        o.append(f'<text x="{x}" y="{top + 32}" font-size="20" font-weight="800" fill="{c}">{circled(pi + 1)}</text>')
        for k, l in enumerate(wrap(ph["title"], 20, colW - 70, True)):
            o.append(f'<text x="{x + 30}" y="{top + 32 + k * 24}" font-size="20" font-weight="800" fill="{T["ink"]}">{escape(l)}</text>')
        nt = len(wrap(ph["title"], 20, colW - 70, True))
        for k, l in enumerate(wrap(ph.get("sub", ""), 13, colW - 30)):
            o.append(f'<text x="{x}" y="{top + 30 + nt * 24 + k * 17}" font-size="13" fill="{T["muted"]}">{escape(l)}</text>')
        if pi < len(phases) - 1:
            gx, gy = x + colW + gap / 2, top + 22
            o.append(f'<path d="M{gx - 10},{gy - 12} L{gx + 4},{gy} L{gx - 10},{gy + 12}" fill="none" stroke="{T["muted"]}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>')
    # Links under the cards.
    lane_used = {}
    for e in edges:
        a, b = steps[e["from"]], steps[e["to"]]
        c, mk = acc(b["pi"]), f'a{b["pi"] % len(T["accents"])}'
        dash = ' stroke-dasharray="7 6"' if e.get("dashed") else ""
        if a["pi"] == b["pi"]:
            if order.index(e["to"]) == order.index(e["from"]) + 1:  # adjacent steps in a column — straight down
                x = a["x"] + 34; d = f'M{x},{a["y"] + a["h"]} V{b["y"] - 2}'
            else:  # non-adjacent in a column — detour left of the column
                k = lane_used.setdefault(("L", a["pi"]), 0); lane_used[("L", a["pi"])] += 1
                lx = a["x"] - 14 - k * 9
                d = f'M{a["x"]},{a["y"] + a["h"] / 2} H{lx} V{b["y"] + b["h"] / 2} H{b["x"] - 2}'
        elif b["pi"] > a["pi"]:  # forward transition: through the gap between columns
            k = lane_used.setdefault(("G", b["pi"]), 0); lane_used[("G", b["pi"])] += 1
            gx = b["x"] - gap / 2 + (k - 0) * 10 - 5
            d = f'M{a["x"] + colW},{a["y"] + a["h"] / 2} H{gx} V{b["y"] + b["h"] / 2} H{b["x"] - 2}'
        else:  # return to an earlier phase: along the bottom
            k = extra_back.index(e)
            by = maxY + 10 + k * 26
            d = f'M{a["x"] + colW / 2},{a["y"] + a["h"]} V{by} H{b["x"] - 20 - k * 8} V{b["y"] + b["h"] / 2} H{b["x"] - 2}'
            dash = ' stroke-dasharray="7 6"'
            c, mk = T["muted"], "am"
        o.append(f'<path d="{d}" fill="none" stroke="{c}" stroke-width="2.4"{dash} marker-end="url(#{mk})" stroke-linejoin="round"/>')
        if e.get("label"):
            if b["pi"] < a["pi"]:
                lx, ly = (a["x"] + b["x"]) / 2, maxY + 10 + extra_back.index(e) * 26 - 7
                o.append(f'<text x="{lx}" y="{ly}" font-size="12" font-weight="700" fill="{c}">{escape(e["label"])}</text>')
            elif b["pi"] != a["pi"]:  # transition: a label pill on the vertical in the gap
                gx = b["x"] - gap / 2 + (lane_used[("G", b["pi"])] - 1) * 10 - 5
                my = (a["y"] + a["h"] / 2 + b["y"] + b["h"] / 2) / 2
                lab = e["label"]
                while tw(lab, 11, True) > gap - 14 and len(lab) > 2: lab = lab[:-2] + "…"
                pw = tw(lab, 11, True) + 12
                o.append(f'<rect x="{gx - pw / 2}" y="{my - 10}" width="{pw}" height="20" rx="10" fill="{T["bg"]}" stroke="{c}"/>'
                         f'<text x="{gx}" y="{my + 4}" font-size="11" font-weight="700" text-anchor="middle" fill="{c}">{escape(lab)}</text>')
            else:
                o.append(f'<text x="{a["x"] + 46}" y="{(a["y"] + a["h"] + b["y"]) / 2 + 4}" font-size="12" font-weight="700" fill="{c}">{escape(e["label"])}</text>')
    # Cards.
    for sid in order:
        s = steps[sid]; x, y, c = s["x"], s["y"], acc(s["pi"])
        o.append(f'<rect x="{x}" y="{y}" width="{colW}" height="{s["h"]}" rx="14" fill="{T["card"]}" stroke="{T["stroke"]}"/>')
        o.append(f'<rect x="{x}" y="{y + 12}" width="4" height="{s["h"] - 24}" rx="2" fill="{c}"/>')
        o.append(f'<circle cx="{x + colW - 26}" cy="{y + 26}" r="13" fill="{c}"/><text x="{x + colW - 26}" y="{y + 30.5}" font-size="12" font-weight="800" text-anchor="middle" fill="{T["bg"]}">{s["no"]}</text>')
        ty = y + cardPad + 15
        for l in s["tl"]:
            o.append(f'<text x="{x + cardPad}" y="{ty}" font-size="17" font-weight="700" fill="{T["ink"]}">{escape(l)}</text>'); ty += 22
        for l in s["sl"]:
            o.append(f'<text x="{x + cardPad}" y="{ty - 2}" font-size="13" fill="{T["muted"]}">{escape(l)}</text>'); ty += 18
        for it, cx, cy, w in s["chips"]:
            label = it
            while tw(label, 12) + 20 > w and len(label) > 2: label = label[:-2] + "…"
            o.append(f'<rect x="{x + cardPad + cx}" y="{ty + cy}" width="{w}" height="{chipH}" rx="12" fill="{T["chip"]}" stroke="{T["stroke"]}"/>'
                     f'<text x="{x + cardPad + cx + w / 2}" y="{ty + cy + 16}" font-size="12" text-anchor="middle" fill="{T["ink"]}">{escape(label)}</text>')
    if spec.get("footer"):
        fy = H - 44
        o.append(f'<rect x="{pad}" y="{fy}" width="{W - 2 * pad}" height="30" rx="10" fill="none" stroke="{T["stroke"]}" stroke-dasharray="5 5"/>'
                 f'<text x="{W / 2}" y="{fy + 20}" font-size="13" text-anchor="middle" fill="{T["muted"]}">{escape(spec["footer"])}</text>')
    o.append("</svg>")
    return "\n".join(o), W, H

def to_png(svg_path, png_path, W, H):
    if shutil.which("rsvg-convert"):
        subprocess.run(["rsvg-convert", "-z", "2", "-o", str(png_path), str(svg_path)], check=True); return True
    for ch in ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
               shutil.which("google-chrome") or "", shutil.which("chromium") or "", shutil.which("chromium-browser") or ""]:
        if ch and Path(ch).exists():
            html = svg_path.with_suffix(".tmp.html")
            html.write_text(f'<html><body style="margin:0">{svg_path.read_text()}</body></html>')
            subprocess.run([ch, "--headless=new", "--disable-gpu", "--hide-scrollbars", f"--window-size={W},{H}",
                            "--force-device-scale-factor=2", f"--screenshot={png_path}", html.resolve().as_uri()],
                           check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            html.unlink(); return True
    return False

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("spec"); ap.add_argument("-o", "--out"); ap.add_argument("--theme", choices=THEMES)
    ap.add_argument("--png", action="store_true")
    a = ap.parse_args()
    spec = json.loads(Path(a.spec).read_text())
    ids = [s["id"] for p in spec["phases"] for s in p["steps"]]
    if len(ids) != len(set(ids)): sys.exit("error: duplicate step ids")
    for e in spec.get("edges") or []:
        for k in ("from", "to"):
            if e[k] not in ids: sys.exit(f"error: link points to an unknown step {e[k]!r}")
    svg, W, H = build(spec, a.theme or spec.get("theme", "blueprint"))
    out = Path(a.out or Path(a.spec).with_suffix(".svg"))
    out.write_text(svg); print("SVG:", out)
    if a.png:
        png = out.with_suffix(".png")
        print("PNG:", png) if to_png(out, png, W, H) else print("PNG: no converter found (rsvg-convert or Chrome) — SVG only")

if __name__ == "__main__":
    main()

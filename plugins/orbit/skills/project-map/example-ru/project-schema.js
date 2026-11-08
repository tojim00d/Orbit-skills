// Project schema with auto-layout. No hand-set coordinates:
// block sizes, wrapping, rows, bands and arrow routes are computed from N, E and LAYOUT.
// Guarantees: blocks never overlap, text stays inside its box, arrows never cross blocks,
// every arrow has its own lane in a gap, step numbers never collide.

// UI language: META.lang = "en" | "ru" (default "en"). Data texts are written by the author in the same language.
const LANG = (typeof META === "object" && META && META.lang === "ru") ? "ru" : "en";
const I18N = {
  en: { schema: "Schema", block: "Block view", other: "Other", components: "Components", entry: "Entry",
        transition: "transition", back: "return", how: "How it works", links: "Links", where: "Where in code", close: "Close",
        ariaSchema: "Project schema", title: "Project map", kicker: "project map", mapKicker: "Big picture", mapTitle: "Components and links",
        lead: "Click <b>any block, chip or link number</b> to open details and links to files. Hover a block to highlight its links.",
        mapIntro: "Top to bottom by phases or layers. Arrow color — link kind; number — step in reading order. Click a block, chip or arrow for details and code." },
  ru: { schema: "Схема", block: "Блок-схема", other: "Прочее", components: "Компоненты", entry: "Вход",
        transition: "переход", back: "возврат", how: "Как устроено", links: "Связи", where: "Где в коде", close: "Закрыть",
        ariaSchema: "Схема проекта", title: "Карта проекта", kicker: "карта проекта", mapKicker: "Большая схема", mapTitle: "Компоненты и связи",
        lead: "Нажмите на <b>любой блок, чип или номер связи</b>: откроются подробности и ссылки на файлы. Наведите на блок, чтобы подсветить его связи.",
        mapIntro: "Сверху вниз по фазам или слоям. Цвет стрелки — тип связи, номер — шаг по ходу чтения. Нажмите на блок, чип или стрелку, чтобы прочитать подробности и перейти к коду." },
};
const T = I18N[LANG];

const SCHEMA_OPT = { W: 1200, gutter: 250, right: 36, gapX: 44, padY: 28, rowGap: 40, bandGap: 24, lane: 22, minW: 200, maxW: 380, minH: 84 };
const BAND_COLORS = ["#e8effa", "#e9f6ef", "#fff5d3", "#f3ecfb", "#fbece8", "#e6f3f3"];

const CIRCLED = n => n >= 1 && n <= 20 ? String.fromCharCode(0x245F + n) : `${n}.`;

// Block groups: top row (entry) + bands. Blocks not named in LAYOUT go to an "Other" band.
function schemaGroups() {
  const L = typeof LAYOUT === "object" && LAYOUT ? LAYOUT : {};
  const used = new Set();
  const take = ids => (ids || []).filter(id => {
    if (!(id in N)) { console.warn("LAYOUT: no such block in N:", id); return false; }
    if (used.has(id)) return false;
    used.add(id); return true;
  });
  const top = take(L.top);
  const numbered = !L.options || L.options.numberBands !== false;
  const bands = (L.bands || []).map(([title, sub, ids, color], i) => ({
    num: i + 1, title: numbered && !/^[\d\u2460-\u2473]/.test(String(title)) ? `${CIRCLED(i + 1)} ${title}` : title,
    sub: sub || "", ids: take(ids), color: color || BAND_COLORS[i % BAND_COLORS.length] }));
  const rest = Object.keys(N).filter(id => !used.has(id));
  if (rest.length) bands.push({ title: bands.length ? T.other : T.components, sub: "", ids: rest, color: BAND_COLORS[bands.length % BAND_COLORS.length] });
  return { top: { title: L.topTitle || T.entry, sub: L.topSub || "", ids: top, color: "#f2f1ee" }, bands: bands.filter(b => b.ids.length), labels: L.labels || {}, footer: L.footer, options: L.options || {} };
}

// Step order (link numbers) follows reading order, not the order in E:
// entry → links inside phase ① → transition ①→② → links inside ② → … ; backward links at the end of their phase.
// LAYOUT.steps = [E indices] sets a manual order (remaining links follow automatically).
// LAYOUT.options.numbering = "data" — legacy behavior (number = position in E).
let _steps = null;
function schemaSteps() {
  if (_steps) return _steps;
  const G = schemaGroups(), pos = {};
  G.top.ids.forEach((id, k) => { pos[id] = [-1, k]; });
  G.bands.forEach((b, gi) => b.ids.forEach((id, k) => { pos[id] = [gi, k]; }));
  const key = i => {
    const [f, t] = E[i], a = pos[f], b = pos[t];
    if (!a || !b) return [1e9, 9, i, 0];
    const kind = a[0] === b[0] ? 0 : b[0] > a[0] ? 1 : 2;
    return [a[0], kind, a[1], b[1]];
  };
  const cmp = (x, y) => { const p = key(x), q = key(y); for (let k = 0; k < 4; k++) if (p[k] !== q[k]) return p[k] - q[k]; return x - y; };
  const all = E.map((_, i) => i);
  const L = typeof LAYOUT === "object" && LAYOUT ? LAYOUT : {};
  let order;
  if ((L.options || {}).numbering === "data") order = all;
  else {
    const manual = (L.steps || []).filter(i => Number.isInteger(i) && i >= 0 && i < E.length);
    order = manual.concat(all.filter(i => !manual.includes(i)).sort(cmp));
  }
  const num = {}, gate = {}, back = {};
  order.forEach((i, k) => { num[i] = k + 1; });
  const label = gi => gi < 0 ? String(G.top.title || T.entry).toLowerCase() : CIRCLED(gi + 1);
  all.forEach(i => {
    const a = pos[E[i][0]], b = pos[E[i][1]];
    if (a && b && a[0] !== b[0]) { back[i] = b[0] < a[0]; gate[i] = `${back[i] ? T.back : T.transition} ${label(a[0])} → ${label(b[0])}`; }
  });
  return (_steps = { order, num, gate, back });
}
const stepNo = i => schemaSteps().num[i] ?? i + 1;

function schemaLayout() {
  const G = schemaGroups();
  const O = Object.assign({}, SCHEMA_OPT, G.options);
  const font = getComputedStyle(document.body).fontFamily;
  const ctx = document.createElement("canvas").getContext("2d");
  const tw = (t, size, weight = 400) => { ctx.font = `${weight} ${size}px ${font}`; return ctx.measureText(t).width; };
  const plain = s => String(s ?? "").replace(/<[^>]*>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();
  const wrap = (s, size, weight, max) => {
    const lines = []; let cur = "";
    for (const w of plain(s).split(/\s+/).filter(Boolean)) {
      const t = cur ? cur + " " + w : w;
      if (!cur || tw(t, size, weight) <= max) cur = t; else { lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    return lines.flatMap(l => { // overlong word: split at CamelCase, dots, slashes first; then by characters
      if (tw(l, size, weight) <= max) return [l];
      const parts = l.split(/(?<=[a-zа-я0-9])(?=[A-ZА-Я])|(?<=[._\/-])/);
      if (parts.length > 1 && parts.every(p => tw(p, size, weight) <= max)) {
        const out = []; let c = "";
        for (const p of parts) { if (c && tw(c + p, size, weight) > max) { out.push(c); c = p; } else c += p; }
        return out.concat(c);
      }
      const out = []; let c = "";
      for (const ch of l) { if (c && tw(c + ch, size, weight) > max) { out.push(c); c = ch; } else c += ch; }
      return out.concat(c);
    });
  };
  const clip = (s, size, weight, max) => { if (tw(s, size, weight) <= max) return s; while (s.length > 1 && tw(s + "…", size, weight) > max) s = s.slice(0, -1); return s + "…"; };

  const x0 = O.gutter, x1 = O.W - O.right, avail = x1 - x0;
  const B = {};
  const natural = id => {
    const [title, sub, , , , chips] = N[id];
    const chipMax = Math.max(0, ...(chips || []).map(([, l]) => tw(plain(l), 13) + 24));
    const w = Math.max(tw(plain(title), 18, 700), Math.min(tw(plain(sub), 14), O.maxW - 36), Math.min(chipMax, O.maxW - 36)) + 36;
    return Math.min(O.maxW, Math.max(O.minW, Math.ceil(w)));
  };
  const fit = b => {
    const [title, sub, , , , chips] = N[b.id], inner = b.w - 36;
    b.tl = wrap(title, 18, 700, inner);
    b.sl = sub ? wrap(sub, 14, 400, inner) : [];
    let cx = 0, cy = 0;
    b.cp = (chips || []).map(([key, label]) => {
      const text = clip(plain(label), 13, 400, inner - 24), cw = tw(text, 13) + 24;
      if (cx && cx + cw > inner) { cx = 0; cy += 34; }
      const c = { key, text, dx: cx, dy: cy, w: cw }; cx += cw + 8; return c;
    });
    b.textH = 20 + b.tl.length * 23 + b.sl.length * 19 + 4;
    b.h = Math.max(O.minH, b.textH + (b.cp.length ? 10 + cy + 26 : 0) + 18);
  };

  // 1. Rows. The top row is centered. A one-row band stretches to full width,
  //    a multi-row band becomes an even grid of columns.
  const rows = [];
  const place = (ids, band) => {
    const nat = ids.map(natural);
    const sum = nat.reduce((s, w) => s + w, 0) + O.gapX * (ids.length - 1);
    if (!band) {
      let row = [], used = 0;
      ids.forEach((id, k) => {
        if (row.length && used + O.gapX + nat[k] > avail) { rows.push({ band, items: row }); row = []; used = 0; }
        row.push(B[id] = { id, w: nat[k] }); used += (row.length > 1 ? O.gapX : 0) + nat[k];
      });
      if (row.length) rows.push({ band, items: row });
      return;
    }
    if (sum <= avail) {
      const extra = ids.length > 1 ? (avail - sum) / ids.length : Math.max(0, Math.min(avail, 440) - nat[0]);
      rows.push({ band, items: ids.map((id, k) => (B[id] = { id, w: nat[k] + extra })) });
      return;
    }
    const med = [...nat].sort((p, q) => p - q)[Math.floor(nat.length / 2)]; // by median: a long name wraps instead of stretching the grid
    const cols = Math.max(1, Math.min(ids.length, 4, Math.floor((avail + O.gapX) / (med + O.gapX))));
    const w = (avail - O.gapX * (cols - 1)) / cols;
    for (let k = 0; k < ids.length; k += cols) rows.push({ band, items: ids.slice(k, k + cols).map(id => (B[id] = { id, w })) });
  };
  if (G.top.ids.length) place(G.top.ids, null);
  G.bands.forEach(b => place(b.ids, b));
  rows.forEach((r, ri) => {
    const sum = r.items.reduce((s, b) => s + b.w, 0) + O.gapX * (r.items.length - 1);
    let x = r.band ? x0 : x0 + (avail - sum) / 2;
    r.items.forEach((b, k) => { b.x = x; b.row = ri; b.k = k; x += b.w + O.gapX; fit(b); });
    r.h = Math.max(...r.items.map(b => b.h));
    r.items.forEach(b => { b.h = r.h; });
  });

  // 2. Arrow routes in X. Gap g lies above row g; gap rows.length is below the last row.
  const R = rows.length;
  const lanes = Array.from({ length: R + 1 }, () => []);
  const ports = {}, pairCount = {};
  let corridor = 0;
  const routes = E.map(([f, t], i) => {
    const a = B[f], b = B[t];
    if (!a || !b) { console.warn("E: no block for link", i + 1, f, "→", t); return null; }
    if (f === t) return null;
    if (a.row === b.row && Math.abs(a.k - b.k) === 1) {
      const key = [f, t].sort().join("|");
      return { i, type: "side", a, b, n: (pairCount[key] = (pairCount[key] || 0) + 1) - 1, key };
    }
    const r = { i, a, b };
    if (b.row > a.row) Object.assign(r, { sa: "b", sb: "t", g1: a.row + 1, g2: b.row });
    else if (b.row < a.row) Object.assign(r, { sa: "t", sb: "b", g1: a.row, g2: b.row + 1 });
    else Object.assign(r, { sa: "b", sb: "b", g1: a.row + 1, g2: a.row + 1 });
    (ports[f + "|" + r.sa] ??= []).push([r, "a"]);
    (ports[t + "|" + r.sb] ??= []).push([r, "b"]);
    return r;
  });
  for (const [key, list] of Object.entries(ports)) {
    const box = B[key.split("|")[0]];
    const other = ([r, end]) => { const o = end === "a" ? r.b : r.a; return o.x + o.w / 2; };
    list.sort((p, q) => other(p) - other(q));
    list.forEach(([r, end], k) => { r[end + "x"] = box.x + box.w * (k + 1) / (list.length + 1); });
  }
  // If an end is the only one on its block side, align it with the other end so the arrow runs straight.
  const solo = (id, side) => ports[id + "|" + side].length === 1;
  const inside = (x, b) => x >= b.x + 24 && x <= b.x + b.w - 24;
  routes.forEach(r => {
    if (!r || r.type === "side" || r.a.row === r.b.row || Math.abs(r.a.row - r.b.row) !== 1) return;
    const sa = solo(r.a.id, r.sa), sb = solo(r.b.id, r.sb);
    if (sb && inside(r.ax, r.b)) r.bx = r.ax;
    else if (sa && inside(r.bx, r.a)) r.ax = r.bx;
    else if (sa && sb) { const lo = Math.max(r.a.x, r.b.x) + 24, hi = Math.min(r.a.x + r.a.w, r.b.x + r.b.w) - 24; if (lo <= hi) r.ax = r.bx = (lo + hi) / 2; }
  });
  // A vertical between distant rows runs through a free gap between blocks, otherwise through the right corridor.
  const usedX = [];
  routes.forEach(r => {
    if (!r || r.type === "side") return;
    const lo = Math.min(r.a.row, r.b.row) + 1, hi = Math.max(r.a.row, r.b.row) - 1;
    if (r.g1 === r.g2 || lo > hi) { r.X = null; return; }
    // A backward link to an earlier phase (next loop, return) runs through the right corridor, not across other phases.
    if (schemaSteps().back[r.i]) { r.X = x1 + 16 + 14 * corridor++; usedX.push(r.X); return; }
    const mid = rows.slice(lo, hi + 1);
    const between = mid.flatMap(q => q.items);
    const clear = x => x > x0 - 30 && x < x1 + 4 && between.every(b => x < b.x - 10 || x > b.x + b.w + 10);
    const free = x => usedX.every(u => Math.abs(u - x) >= 8);
    const want = (r.ax + r.bx) / 2;
    const cands = [r.bx, r.ax];
    mid.forEach(q => q.items.forEach((b, k) => { const n = q.items[k + 1]; cands.push(n ? (b.x + b.w + n.x) / 2 : (b.x + b.w + x1) / 2 + 8); if (!k) cands.push((x0 + b.x) / 2 - 8); }));
    cands.sort((p, q) => Math.abs(p - want) - Math.abs(q - want));
    let X;
    for (const c of cands) {
      for (const d of [0, 9, -9, 18, -18, 27, -27]) { const x = c + d; if (clear(x) && free(x)) { X = x; break; } }
      if (X !== undefined) break;
    }
    if (X === undefined) X = x1 + 16 + 14 * corridor++;
    usedX.push(X);
    r.X = X;
  });
  // Lane in a gap: [route, key, x of upper end, x of lower end, U-loop?]
  routes.forEach(r => {
    if (!r || r.type === "side") return;
    const down = r.b.row > r.a.row;
    if (r.g1 === r.g2) {
      if (Math.abs(r.ax - r.bx) <= 1) return;
      if (r.a.row === r.b.row) lanes[r.g1].push([r, "L", r.ax, r.bx, true]);
      else lanes[r.g1].push([r, "L", down ? r.ax : r.bx, down ? r.bx : r.ax]);
      return;
    }
    if (Math.abs(r.X - r.ax) > 1) lanes[r.g1].push([r, "L1", down ? r.ax : r.X, down ? r.X : r.ax]);
    if (Math.abs(r.X - r.bx) > 1) lanes[r.g2].push([r, "L2", down ? r.X : r.bx, down ? r.bx : r.X]);
  });
  // Lane order with few crossings: loops on top (narrow first), then "rightward" (right upper end higher),
  // then "leftward" (left upper end higher).
  const rank = ([, , t, b, u]) => u ? [0, Math.abs(t - b)] : b > t ? [1, -t] : [2, t];
  lanes.forEach(list => list.sort((p, q) => { const a = rank(p), b = rank(q); return a[0] - b[0] || a[1] - b[1]; }));

  // 3. Vertically: rows, gaps with lanes, bands with room for the label.
  const bandLabel = band => {
    const tl = wrap(band.title, 20, 700, O.gutter - 64), sl = band.sub ? wrap(band.sub, 13, 400, O.gutter - 64) : [];
    return { tl, sl, h: 30 + tl.length * 25 + sl.length * 18 + 22 };
  };
  const bandInfo = new Map();
  const need = g => lanes[g].length ? (lanes[g].length - 1) * O.lane + 36 : 0;
  const setLanes = (g, start, h) => { const off = (h - (lanes[g].length - 1) * O.lane) / 2; lanes[g].forEach(([r, key], k) => { r[key] = start + off + k * O.lane; }); };
  let y = 22;
  rows.forEach((row, ri) => {
    const prev = rows[ri - 1];
    const newBand = !prev || prev.band !== row.band;
    let start = y, h;
    if (!prev) h = need(ri) + (row.band ? O.padY : 0);
    else if (!newBand) h = Math.max(O.rowGap, need(ri));
    else {
      if (prev.band) { const pi = bandInfo.get(prev.band); start = Math.max(start, pi.top + pi.label.h - O.padY); }
      h = Math.max((prev.band ? O.padY : 0) + O.bandGap + (row.band ? O.padY : 0), need(ri) + (row.band ? 12 : 0));
    }
    setLanes(ri, start, row.band && newBand && ri ? h - 12 : h);
    row.y = start + h;
    if (row.band && newBand) bandInfo.set(row.band, { top: row.y - O.padY, label: bandLabel(row.band) });
    if (row.band) bandInfo.get(row.band).last = row;
    row.items.forEach(b => { b.y = row.y; });
    y = row.y + row.h;
  });
  const last = rows[R - 1];
  if (last && last.band) { const li = bandInfo.get(last.band); y = Math.max(y, li.top + li.label.h - O.padY); }
  setLanes(R, y, need(R));
  y += Math.max(last && last.band ? O.padY : 0, need(R) + (last && last.band ? 10 : 0));
  bandInfo.forEach(info => { const l = info.last; info.bottom = Math.max(l.y + l.h + O.padY, info.top + info.label.h, l === last ? y : 0); });

  // 4. Path points (right angles only).
  routes.forEach(r => {
    if (!r) return;
    if (r.type === "side") {
      const total = pairCount[r.key], cy = r.a.y + r.a.h / 2 + (r.n - (total - 1) / 2) * 16;
      const lr = r.a.k < r.b.k;
      r.pts = [[lr ? r.a.x + r.a.w : r.a.x, cy], [lr ? r.b.x : r.b.x + r.b.w, cy]];
      return;
    }
    const ya = r.sa === "b" ? r.a.y + r.a.h : r.a.y, yb = r.sb === "b" ? r.b.y + r.b.h : r.b.y;
    const p = [[r.ax, ya]];
    if (r.g1 === r.g2) { if (r.L !== undefined) p.push([r.ax, r.L], [r.bx, r.L]); }
    else {
      if (r.L1 !== undefined) p.push([r.ax, r.L1], [r.X, r.L1]);
      if (r.L2 !== undefined) p.push([r.X, r.L2], [r.bx, r.L2]);
    }
    p.push([r.bx, yb]);
    r.pts = p.filter((q, k) => !k || q[0] !== p[k - 1][0] || q[1] !== p[k - 1][1]);
  });

  // 5. Numbers and labels: on the longest segment, never over blocks or each other.
  const boxes = Object.values(B);
  const taken = [];
  const segs = routes.filter(Boolean).flatMap(r => r.pts.slice(1).map((q, k) => [r.i, r.pts[k], q]));
  let self = -1;
  const crossLine = (x, y, w, h) => segs.some(([i, [ax, ay], [bx, by]]) => i !== self &&
    Math.min(ax, bx) < x + w && Math.max(ax, bx) > x && Math.min(ay, by) < y + h && Math.max(ay, by) > y);
  const hits = (x, y, w, h) => boxes.some(b => x < b.x + b.w && x + w > b.x && y < b.y + b.h && y + h > b.y) || taken.some(t => x < t[0] + t[2] && x + w > t[0] && y < t[1] + t[3] && y + h > t[1]) || crossLine(x, y, w, h);
  const longest = r => Math.max(...r.pts.slice(1).map((q, k) => Math.hypot(q[0] - r.pts[k][0], q[1] - r.pts[k][1])));
  routes.filter(Boolean).sort((p, q) => longest(p) - longest(q)).forEach(r => { // short arrows pick their place first
    self = r.i;
    const own = r.pts.slice(1).map((q, k) => [r.pts[k], q, Math.hypot(q[0] - r.pts[k][0], q[1] - r.pts[k][1])]).sort((s, t) => t[2] - s[2]);
    const text = G.labels[r.i] ? plain(G.labels[r.i]) : "";
    const textW = text ? tw(text, 13, 600) : 0;
    for (const [[ax, ay], [bx, by]] of own) {
      const horiz = ay === by;
      for (const withText of text ? [true, false] : [false]) {
        const groupW = withText && horiz ? 24 + 6 + textW : 24;
        for (let s = 0; s < 17 && !r.badge; s++) {
          const t = .5 + (s % 2 ? 1 : -1) * Math.ceil(s / 2) * .055;
          const mx = ax + (bx - ax) * t, my = ay + (by - ay) * t;
          const left = horiz ? mx - groupW / 2 : mx - 12;
          if (horiz && (Math.min(ax, bx) > left - 6 || Math.max(ax, bx) < left + groupW + 6)) continue;
          if (!horiz && Math.abs(by - ay) < 34) continue;
          if (hits(left - 2, my - 13, groupW + 4, 26)) continue;
          if (withText && !horiz && hits(mx + 14, my - 10, textW + 6, 20)) continue;
          r.badge = [left + 12, my];
          taken.push([left - 2, my - 13, groupW + 4, 26]);
          if (withText) { r.label = horiz ? [left + 30, my] : [mx + 16, my]; if (!horiz) taken.push([mx + 14, my - 10, textW + 6, 20]); }
        }
        if (r.badge) break;
      }
      if (r.badge) break;
    }
    if (!r.badge) { // no perfect spot — take the one with the fewest conflicts
      const ov = (x, y, w, h, t) => x < t[0] + t[2] && x + w > t[0] && y < t[1] + t[3] && y + h > t[1];
      let best = null;
      for (const [[ax, ay], [bx, by], len] of own) for (let t = .1; t <= .9; t += .05) {
        const mx = ax + (bx - ax) * t, my = ay + (by - ay) * t, q = [mx - 13, my - 13, 26, 26];
        const score = boxes.filter(b => ov(...q, [b.x, b.y, b.w, b.h])).length * 100 + taken.filter(k => ov(...q, k)).length * 20 + (crossLine(...q) ? 1 : 0) - len / 1000;
        if (!best || score < best[0]) best = [score, mx, my];
      }
      r.badge = [best[1], best[2]];
      taken.push([best[1] - 13, best[2] - 13, 26, 26]);
    }
    r.text = text;
  });

  // 6. Footer: shared conventions across all blocks.
  let footer = null;
  if (G.footer) {
    const [text, node] = Array.isArray(G.footer) ? G.footer : [G.footer];
    const lines = wrap(text, 13, 400, x1 - 40 - 48);
    footer = { x: 40, y: y + 22, w: x1 - 40, h: 22 + lines.length * 18, lines, node };
    y = footer.y + footer.h;
  }
  const W = Math.max(O.W, corridor ? x1 + 16 + 14 * corridor + 10 : 0);
  return { W, H: y + 24, B, bands: [...bandInfo.entries()], routes: routes.filter(Boolean), footer };
}

function renderSchema(host) {
  const S = schemaLayout();
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const col = k => (KIND[k] || ["#8a857c"])[0];
  const mk = k => "mk-" + String(k).replace(/[^\w-]/g, "_");
  const r1 = n => Math.round(n * 10) / 10;
  let out = `<svg viewBox="0 0 ${r1(S.W)} ${r1(S.H)}" class="schema" style="min-width:${Math.round(S.W * .75)}px" role="img" aria-label="${T.ariaSchema}"><defs>${Object.keys(KIND).concat("_").map(k => `<marker id="${mk(k)}" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="17" markerHeight="17" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${col(k)}"/></marker>`).join("")}</defs>`;
  for (const [band, info] of S.bands) {
    out += `<rect x="16" y="${r1(info.top)}" width="${r1(S.W - 32)}" height="${r1(info.bottom - info.top)}" rx="22" fill="${band.color}"/>`;
    info.label.tl.forEach((l, k) => { out += `<text x="40" y="${r1(info.top + 40 + k * 25)}" class="s-band">${esc(l)}</text>`; });
    info.label.sl.forEach((l, k) => { out += `<text x="40" y="${r1(info.top + 40 + info.label.tl.length * 25 - 3 + k * 18)}" class="s-band-sub">${esc(l)}</text>`; });
  }
  for (const r of S.routes) {
    const d = r.pts.map(([x, y], k) => `${k ? "L" : "M"}${r1(x)},${r1(y)}`).join(" ");
    const kind = E[r.i][2], gate = schemaSteps().gate[r.i];
    out += `<g class="s-arrow${gate ? " s-gate" : ""}" data-edge="${r.i}" tabindex="0" role="button"><title>${stepNo(r.i)}. ${esc(E[r.i][3])}${gate ? " · " + gate : ""}</title><path d="${d}" class="s-hit"/><path d="${d}" stroke="${col(kind)}" marker-end="url(#${mk(KIND[kind] ? kind : "_")})" class="s-line"/></g>`;
  }
  for (const b of Object.values(S.B)) {
    out += `<g class="s-node" data-node="${b.id}" tabindex="0" role="button"><rect x="${r1(b.x)}" y="${r1(b.y)}" width="${r1(b.w)}" height="${r1(b.h)}" rx="14"/>`;
    b.tl.forEach((l, k) => { out += `<text x="${r1(b.x + 18)}" y="${r1(b.y + 37 + k * 23)}" class="s-title">${esc(l)}</text>`; });
    b.sl.forEach((l, k) => { out += `<text x="${r1(b.x + 18)}" y="${r1(b.y + 38 + b.tl.length * 23 + k * 19)}" class="s-sub">${esc(l)}</text>`; });
    for (const c of b.cp) {
      const cx = b.x + 18 + c.dx, cy = b.y + b.textH + 10 + c.dy;
      out += `<g class="s-chip" data-chip="${c.key}" tabindex="0" role="button"><rect x="${r1(cx)}" y="${r1(cy)}" width="${r1(c.w)}" height="26" rx="13"/><text x="${r1(cx + c.w / 2)}" y="${r1(cy + 18)}" text-anchor="middle">${esc(c.text)}</text></g>`;
    }
    out += `</g>`;
  }
  for (const r of S.routes) {
    const [bx, by] = r.badge, c = col(E[r.i][2]);
    const gate = schemaSteps().gate[r.i], n = stepNo(r.i);
    out += `<g class="s-badge${gate ? " s-gate" : ""}" data-edge="${r.i}"><title>${n}. ${esc(E[r.i][3])}${gate ? " · " + gate : ""}</title>${gate ? `<circle cx="${r1(bx)}" cy="${r1(by)}" r="15" fill="#fff" stroke="${c}" stroke-width="2"/>` : ""}<circle cx="${r1(bx)}" cy="${r1(by)}" r="12" fill="${c}"/><text x="${r1(bx)}" y="${r1(by + 4)}" text-anchor="middle">${n}</text></g>`;
    if (r.label) out += `<text x="${r1(r.label[0])}" y="${r1(r.label[1] + 4.5)}" fill="${c}" class="s-label${gate ? " s-gate" : ""}" data-edge="${r.i}">${esc(r.text)}</text>`;
  }
  if (S.footer) {
    const f = S.footer;
    out += `<g class="s-libs" ${f.node ? `data-node="${f.node}" tabindex="0" role="button"` : ""}><rect x="${f.x}" y="${r1(f.y)}" width="${r1(f.w)}" height="${r1(f.h)}" rx="14"/>${f.lines.map((l, k) => `<text x="${r1(f.x + f.w / 2)}" y="${r1(f.y + 26 + k * 18)}" text-anchor="middle">${esc(l)}</text>`).join("")}</g>`;
  }
  host.innerHTML = out + "</svg>";
}

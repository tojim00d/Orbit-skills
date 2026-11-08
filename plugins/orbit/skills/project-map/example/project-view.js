// Map page engine: header, menu, sections, "Schema / Block view" tabs, wires and cards.
// Nothing here is edited per project: all content comes from project-data.js (META, N, E, CHIP, KIND, LAYOUT, PAGES).
// UI strings come from I18N in project-schema.js (META.lang = "en" | "ru").
const M = Object.assign({ title: T.title, kicker: T.kicker, lead: T.lead, mapKicker: T.mapKicker, mapTitle: T.mapTitle, mapIntro: T.mapIntro, footer: "" }, typeof META === "object" ? META : {});
document.documentElement.lang = LANG;

const link = (repo, path) => {
  const [proj, ref] = REPO[repo], kind = path.endsWith("/") ? "tree" : "blob", p = path.replace(/\/$/, "");
  return /github\.com/.test(GL) ? `${GL}/${proj}/${kind}/${ref}/${p}` : `${GL}/${proj}/-/${kind}/${ref}/${p}`;
};
const files = list => list && list.length ? `<div class="links">${list.map(([r, p]) => `<a href="${link(r, p)}" target="_blank" rel="noreferrer"><span class="repo">${r}</span>${p}</a>`).join("")}</div>` : "";
const bullets = items => items && items.length ? `<ul>${items.map(i => `<li>${i}</li>`).join("")}</ul>` : "";
const flow = steps => `<ol class="flow">${steps.map(([t, s], i) => `<li><span class="num">${i + 1}</span><span>${t}${s ? `<small>${s}</small>` : ""}</span></li>`).join("")}</ol>`;
const mod = (title, items, paths) => `<div class="card"><h3>${title}</h3>${bullets(items)}<div style="margin-top:10px">${files(paths)}</div></div>`;
const nodeHtml = id => {
  const [title, sub, , , , chips] = N[id];
  return `<div class="node" role="button" tabindex="0" data-node="${id}"><strong>${title}</strong><small>${sub}</small>${chips ? `<div class="chips">${chips.map(([k, l]) => `<button type="button" class="chip" data-chip="${k}">${l}</button>`).join("")}</div>` : ""}</div>`;
};
const group = (g, title, sub, ids) => `<div class="group" style="background:${g}"><h3>${title}</h3>${sub ? `<div class="sub">${sub}</div>` : ""}${ids.map(nodeHtml).join("")}</div>`;

// Header, menu and sections.
document.title = M.title.replace(/<[^>]*>/g, "");
document.getElementById("hero-kicker").innerHTML = M.kicker;
document.getElementById("hero-title").innerHTML = M.title;
document.getElementById("hero-lead").innerHTML = M.lead;
document.getElementById("page-footer").innerHTML = M.footer;

const GROUPS = schemaGroups();
const blockGroups = (GROUPS.top.ids.length ? [GROUPS.top] : []).concat(GROUPS.bands);
const legend = `<div class="legend">${Object.values(KIND).map(([c, l]) => `<span><i style="background:${c}"></i>${l}</span>`).join("")}</div>`;
const SECTIONS = [
  ["map", M.mapKicker, M.mapTitle, M.mapIntro,
    `<div class="tabs" role="tablist"><button type="button" role="tab" aria-selected="true" data-tab="schema">${T.schema}</button><button type="button" role="tab" aria-selected="false" data-tab="block">${T.block}</button></div>
    <div class="tab-panel" data-panel="schema"><div class="schema-shell" id="schema"></div>${legend}</div>
    <div class="tab-panel" data-panel="block" hidden><div class="map-shell"><div class="map" id="map" style="grid-template-columns:repeat(${blockGroups.length},minmax(210px,1fr));min-width:${blockGroups.length * 270}px">
      ${blockGroups.map(g => group(g.color, g.title, g.sub, g.ids)).join("")}
    </div><svg class="wires" id="wires"></svg><div class="badges" id="badges"></div></div>${legend}</div>
    <div class="edges">${schemaSteps().order.map(i => { const e = E[i], gate = schemaSteps().gate[i]; return `<button type="button" class="edge-item${gate ? " gate" : ""}" data-edge="${i}"><span class="n" style="background:${(KIND[e[2]] || ["#292929"])[0]}">${stepNo(i)}</span><span>${gate ? `<em class="gate-tag">${gate}</em>` : ""}<b>${e[3]}</b><span>${e[4]}</span></span></button>`; }).join("")}</div>`],
  ...(typeof PAGES === "function" ? PAGES() : []),
];
document.getElementById("content").innerHTML = SECTIONS.map(([id, kicker, title, intro, html]) =>
  `<section id="${id}"><p class="kicker">${kicker}</p><h2>${title}</h2>${intro ? `<p class="intro">${intro}</p>` : ""}${html}</section>`).join("");
document.getElementById("toc").innerHTML = SECTIONS.map(([id, kicker, title]) => `<a href="#${id}">${id === "map" ? T.schema : kicker || title}</a>`).join("");

renderSchema(document.getElementById("schema"));
document.querySelectorAll("[data-tab]").forEach(tab => tab.addEventListener("click", () => {
  document.querySelectorAll("[data-tab]").forEach(t => t.setAttribute("aria-selected", String(t === tab)));
  document.querySelectorAll("[data-panel]").forEach(p => { p.hidden = p.dataset.panel !== tab.dataset.tab; });
  if (tab.dataset.tab === "block") draw();
}));

// Block-view wires: one curve per link; ends spread along the block side; numbers never collide.
const shell = document.querySelector(".map-shell"), wires = document.getElementById("wires"), badges = document.getElementById("badges");
function draw() {
  if (!shell || shell.offsetParent === null) return;
  wires.innerHTML = ""; badges.innerHTML = "";
  wires.style.width = shell.scrollWidth + "px"; wires.style.height = shell.scrollHeight + "px";
  const base = shell.getBoundingClientRect(), sx = shell.scrollLeft;
  const box = id => {
    const r = shell.querySelector(`.map [data-node="${id}"]`).getBoundingClientRect();
    return { l: r.left - base.left + sx, r: r.right - base.left + sx, cx: (r.left + r.right) / 2 - base.left + sx, cy: (r.top + r.bottom) / 2 - base.top };
  };
  const back = i => !!schemaSteps().back[i];
  const ends = E.map(([f, t], i) => {
    if (!(f in N) || !(t in N) || back(i)) return null;
    const a = box(f), b = box(t);
    if (Math.abs(a.cx - b.cx) < 40) return [a, "r", b, "r"]; // a link inside one column bulges right into the gap
    return a.cx < b.cx ? [a, "r", b, "l"] : [a, "l", b, "r"];
  });
  const slots = {};
  ends.forEach((e, i) => { if (!e) return; (slots[E[i][0] + e[1]] ??= []).push([i, 0]); (slots[E[i][1] + e[3]] ??= []).push([i, 1]); });
  const off = {};
  Object.values(slots).forEach(list => list.forEach(([i, end], k) => { off[`${i}-${end}`] = (k - (list.length - 1) / 2) * 10; }));
  const pt = (n, side, o) => [side === "r" ? n.r : n.l, n.cy + o];
  const placed = [];
  ends.forEach((e, i) => {
    if (!e) return;
    const [a, sa, b, sb] = e;
    const [x1, y1] = pt(a, sa, off[`${i}-0`]), [x2, y2] = pt(b, sb, off[`${i}-1`]);
    const same = sa === sb, dx = same ? 22 + Math.min(30, Math.abs(y2 - y1) * .12) : Math.max(36, Math.abs(x2 - x1) / 2);
    const c1 = [x1 + (sa === "r" ? dx : -dx), y1], c2 = [x2 + (sb === "r" ? dx : -dx), y2];
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", `M${x1},${y1} C${c1} ${c2} ${x2},${y2}`);
    p.setAttribute("stroke", (KIND[E[i][2]] || ["#8a857c"])[0]); p.dataset.edge = i; if (schemaSteps().gate[i]) p.classList.add("gate");
    wires.appendChild(p);
    const len = p.getTotalLength();
    let t = .5, q = p.getPointAtLength(len * t);
    for (let k = 0; k < 14 && placed.some(([x, y]) => Math.hypot(x - q.x, y - q.y) < 27); k++) {
      t = .5 + (k % 2 ? 1 : -1) * Math.ceil((k + 1) / 2) * .06; q = p.getPointAtLength(len * t);
    }
    placed.push([q.x, q.y]);
    const badge = document.createElement("button");
    badge.type = "button"; badge.className = "badge"; badge.dataset.edge = i; badge.textContent = stepNo(i); badge.title = E[i][3]; if (schemaSteps().gate[i]) badge.classList.add("gate");
    badge.style.left = `${q.x}px`; badge.style.top = `${q.y}px`; badge.style.background = (KIND[E[i][2]] || ["#292929"])[0];
    badges.appendChild(badge);
  });
  if (!wires.querySelector("#wire-arrow")) wires.insertAdjacentHTML("afterbegin", `<defs><marker id="wire-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="12" markerHeight="12" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#8a857c"/></marker></defs>`);
  drawBack(placed);
}
window.addEventListener("resize", () => requestAnimationFrame(draw));
// Backward links (next loop, return to an earlier phase): dashed along the bottom and up the gap left of the target.
function drawBack(placed) {
  const base = shell.getBoundingClientRect(), sx = shell.scrollLeft;
  const mapEl = shell.querySelector(".map"), mb = mapEl.getBoundingClientRect();
  let k = 0;
  E.forEach(([f, t], i) => {
    if (!schemaSteps().back[i] || !(f in N) || !(t in N)) return;
    const rect = id => shell.querySelector(`.map [data-node="${id}"]`).getBoundingClientRect();
    const a = rect(f), b = rect(t), col = shell.querySelector(`.map [data-node="${t}"]`).closest(".group").getBoundingClientRect();
    const X = v => v - base.left + sx, Y = v => v - base.top;
    const yb = Y(mb.bottom) + 18 + k * 12, xg = X(col.left) - 14 - k * 8, k0 = k++;
    const x1 = X((a.left + a.right) / 2), y1 = Y(a.bottom), y2 = Y((b.top + b.bottom) / 2), x2 = X(b.left);
    const d = `M${x1},${y1} V${yb} H${xg} V${y2} H${x2}`;
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", d); p.setAttribute("stroke", (KIND[E[i][2]] || ["#8a857c"])[0]); p.setAttribute("stroke-dasharray", "6 5");
    p.setAttribute("marker-end", "url(#wire-arrow)"); p.dataset.edge = i; p.classList.add("gate", "back");
    wires.appendChild(p);
    const badge = document.createElement("button");
    badge.type = "button"; badge.className = "badge gate"; badge.dataset.edge = i; badge.textContent = stepNo(i); badge.title = E[i][3];
    badge.style.left = `${(x1 + xg) / 2}px`; badge.style.top = `${yb}px`; badge.style.background = (KIND[E[i][2]] || ["#292929"])[0];
    badges.appendChild(badge);
  });
  if (k) { shell.style.paddingBottom = `${30 + k * 12}px`; wires.style.height = shell.scrollHeight + "px"; }
}

// Highlighting and cards.
const toggle = (sel, on) => document.querySelectorAll(sel).forEach(x => x.classList.toggle("hot", on));
function hotNode(id, on) { toggle(`[data-node="${id}"]`, on); E.forEach((e, i) => { if (e[0] === id || e[1] === id) toggle(`[data-edge="${i}"]`, on); }); }
function hotEdge(i, on) { toggle(`[data-edge="${i}"]`, on); toggle(`[data-node="${E[i][0]}"]`, on); toggle(`[data-node="${E[i][1]}"]`, on); }
for (const [type, on] of [["mouseover", true], ["mouseout", false]])
  document.addEventListener(type, e => {
    if (e.target.closest("[data-chip]")) return;
    const d = e.target.closest("[data-edge]"); if (d) return hotEdge(+d.dataset.edge, on);
    const n = e.target.closest("[data-node]"); if (n) hotNode(n.dataset.node, on);
  });

const dlg = document.getElementById("dlg");
function show(title, route, html) {
  document.getElementById("dlg-title").innerHTML = title;
  document.getElementById("dlg-route").innerHTML = route;
  document.getElementById("dlg-body").innerHTML = html;
  dlg.showModal();
}
function openNode(id) {
  const [title, sub, what, how, paths] = N[id];
  const related = E.map((e, i) => [e, i]).filter(([e]) => e[0] === id || e[1] === id).sort((a, b) => stepNo(a[1]) - stepNo(b[1]));
  show(title, sub, `<p>${what || ""}</p>${how && how.length ? `<h4>${T.how}</h4>${bullets(how)}` : ""}${related.length ? `<h4>${T.links}</h4>${bullets(related.map(([e, i]) => `<a href="#" data-edge-link="${i}">${stepNo(i)}. ${e[3]}</a> — ${e[4]}`))}` : ""}${paths && paths.length ? `<h4>${T.where}</h4>${files(paths)}` : ""}`);
}
function openEdge(i) {
  const [from, to, kind, title, summary, how, paths] = E[i];
  const gate = schemaSteps().gate[i];
  show(`${stepNo(i)}. ${title}`, `${N[from][0]} → ${N[to][0]} · ${(KIND[kind] || ["", kind])[1]}${gate ? " · " + gate : ""}`, `<p>${summary || ""}</p>${how && how.length ? `<h4>${T.how}</h4>${bullets(how)}` : ""}${paths && paths.length ? `<h4>${T.where}</h4>${files(paths)}` : ""}`);
}
function openChip(key) {
  if (!(key in CHIP)) return key in N ? openNode(key) : undefined;
  const [title, items, paths] = CHIP[key];
  show(title, "", `${bullets(items)}${paths && paths.length ? `<h4>${T.where}</h4>${files(paths)}` : ""}`);
}
document.addEventListener("click", e => {
  const chip = e.target.closest("[data-chip]"); if (chip) { e.stopPropagation(); return openChip(chip.dataset.chip); }
  const edgeLink = e.target.closest("[data-edge-link]"); if (edgeLink) { e.preventDefault(); return openEdge(+edgeLink.dataset.edgeLink); }
  const edge = e.target.closest("[data-edge]"); if (edge) return openEdge(+edge.dataset.edge);
  const node = e.target.closest("[data-node]"); if (node) return openNode(node.dataset.node);
});
document.addEventListener("keydown", e => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const t = e.target;
  if (t.matches("[data-chip]")) { e.preventDefault(); openChip(t.dataset.chip); }
  else if (t.matches("[data-edge]")) { e.preventDefault(); openEdge(+t.dataset.edge); }
  else if (t.matches("[data-node]")) { e.preventDefault(); openNode(t.dataset.node); }
});
dlg.querySelector(".close").setAttribute("aria-label", T.close);
dlg.querySelector(".close").addEventListener("click", () => dlg.close());
dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });

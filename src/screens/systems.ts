import { HORMONES } from '../data/hormones.ts';
import { AXES, GLANDS, LEVERS, SYSTEMS, type GlandId } from '../data/systems.ts';
import { hormoneStates, systemStates } from '../logic/score.ts';
import { ctx, actions, render } from '../ui/ctx.ts';
import { art, emblem, esc, head, hormoneTags, meter, plain } from '../ui/parts.ts';

let axisId = 'hpa';
let gland: GlandId | null = null;

actions['axis'] = (el) => { axisId = el.dataset['id']!; gland = null; render.now(); };
actions['gland'] = (el) => { gland = el.dataset['id'] as GlandId; render.now(); document.getElementById('gland')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };

export function systems(): string {
  const { s, link, today } = ctx;
  const axis = AXES.find((a) => a.id === axisId) ?? AXES[0]!;
  const sys = systemStates(hormoneStates(s, link, today));
  const path = axis.path.map((g) => GLANDS.find((x) => x.id === g)!).filter(Boolean);
  const d = path.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join('');
  const sel = gland ? GLANDS.find((x) => x.id === gland) : null;
  const made = sel ? HORMONES.filter((h) => h.gland.includes(sel.id)) : [];
  const nodes = GLANDS.map((g) => {
    const on = axis.path.includes(g.id);
    const anchor = g.x > 300 ? 'start' : 'end', tx = g.x > 300 ? g.x + 15 : g.x - 15;
    return `<g class="node ${on ? 'path' : ''} ${gland === g.id ? 'sel' : ''}" data-act="gland" data-id="${g.id}" role="button" tabindex="0" aria-label="${esc(g.n)}"><circle class="halo" cx="${g.x}" cy="${g.y}" r="24"/><circle class="dot" cx="${g.x}" cy="${g.y}" r="7"/><text x="${tx}" y="${g.y + 6}" text-anchor="${anchor}">${esc(g.n)}</text></g>`;
  }).join('');

  return `
  ${head('endocrine', 'Endocrine Systems', 'Cum vorbesc glandele între ele. Hormonii nu lucrează singuri.')}
  <div class="chips" role="tablist" aria-label="Axe hormonale" style="margin-bottom:12px">${AXES.map((a) => `<button class="chip" role="tab" data-act="axis" data-id="${a.id}" aria-selected="${a.id === axis.id}">${esc(a.n)}</button>`).join('')}</div>
  <div class="two">
    <div>
      <div class="map">
        <img class="figure" src="${art('body')}" alt="" width="600" height="900">
        <img class="head-wolf" src="${emblem()}" alt="" width="680" height="801">
        <svg viewBox="0 0 600 790" aria-label="Harta glandelor">
          <defs><linearGradient id="flowgrad" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#ff3b2f"/><stop offset="1" stop-color="#6fb6ff"/></linearGradient></defs>
          <path class="flow" d="${d}"/>${nodes}
        </svg>
      </div>
      ${sel ? `<div class="panel stack" id="gland" style="margin-top:8px"><h3>${esc(sel.n)}</h3><p class="muted">${esc(sel.line)}</p>${made.length ? hormoneTags(made.map((h) => h.id)) : '<p class="faint">Nu produce hormoni din lista celor 44.</p>'}</div>` : '<p class="faint" style="text-align:center;margin-top:6px">Atinge o glandă ca să vezi ce produce.</p>'}
    </div>
    <div class="stack">
      <h2>${esc(axis.n)}</h2>
      <p class="muted">${esc(axis.plain)}</p>
      <ol class="axisn">${axis.steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
      <div class="panel flat stack"><h3>Ce o strică</h3><p class="muted">${esc(axis.breaks)}</p></div>
      <div class="panel flat stack"><h3>Ce o repară</h3><p class="muted">${esc(axis.fix)}</p></div>
      ${axis.sys.map((id) => { const x = sys.find((y) => y.id === id)!; return `<div><div class="between"><span class="small">${esc(x.n)}</span><span class="num tab">${x.score ?? '–'}</span></div>${meter(x.score, x.status)}</div>`; }).join('')}
    </div>
  </div>
  <section>
    <h2>Douăsprezece pârghii, 44 de hormoni</h2>
    <p class="muted" style="margin-bottom:8px">De asta nu trebuie să-i ții minte: aceleași obiceiuri mișcă aproape tot.</p>
    <div class="scroll"><table class="matrix"><thead><tr><th><span class="sr">Pârghie</span></th>${SYSTEMS.map((x) => `<th scope="col">${esc(x.short)}</th>`).join('')}</tr></thead>
    <tbody>${LEVERS.map((l) => `<tr><th scope="row">${esc(l.n)}</th>${SYSTEMS.map((x) => `<td>${l.sys.includes(x.id) ? '●<span class="sr">da</span>' : ''}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    <details class="fold" style="margin-top:8px"><summary>Regula fiecărei pârghii</summary><div>${plain(LEVERS.map((l) => `${l.n}: ${l.rule}. ${l.gain}`))}</div></details>
  </section>`;
}

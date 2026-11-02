import { AVOID, SUPPS, type Supp } from '../data/performance.ts';
import { PHASE, PHASES } from '../data/phases.ts';
import type { PhaseId } from '../data/systems.ts';
import { phaseVerdict } from '../logic/insights.ts';
import { caffeineCutoff, dayPlan, targets, timeline } from '../logic/plan.ts';
import { readiness, ZONE } from '../logic/recovery.ts';
import { ctx, actions, day, persist, render, toast } from '../ui/ctx.ts';
import { cites, esc, ev, head, hormoneTags, plain, status } from '../ui/parts.ts';

const TIERS: { id: Supp['tier']; n: string; line: string }[] = [
  { id: 'base', n: 'Baza', line: 'Merită pentru aproape oricine se antrenează.' },
  { id: 'perf', n: 'Performanță', line: 'Dovedite, cu efect mic și util la sesiuni cheie.' },
  { id: 'lab', n: 'Doar după analize', line: 'Corectează un deficit. Fără deficit nu aduc nimic.' },
  { id: 'sleep', n: 'Somn', line: 'Doar după ce ai pus în ordine lumina și orele.' },
  { id: 'caution', n: 'Cu prudență', line: 'Efect real, dar și riscuri.' },
];

actions['phase'] = (el) => {
  const id = el.dataset['id'] as PhaseId, st = ctx.s.phase;
  if (st.id === id) return;
  ctx.s.phase = { ...st, id, start: ctx.today, rate: null, history: [...st.history, { id: st.id, start: st.start, end: ctx.today }] };
  persist(); render.now(); toast(`Faza: ${PHASE[id].n}`);
};

actions['tick'] = (el) => {
  const d = day(ctx.today), id = el.dataset['id']!;
  const done = new Set(d.done ?? []);
  if (done.has(id)) done.delete(id); else done.add(id);
  d.done = [...done];
  persist(); render.now();
};

actions['maint'] = (el) => {
  const v = Number((el as HTMLInputElement).value);
  ctx.s.phase.maintenance = v > 800 ? v : null;
  persist(); render.now();
};

export function protocol(): string {
  const { s, link, today } = ctx;
  const tg = targets(s, link, today), ph = PHASE[s.phase.id], items = timeline(s, link, today), done = new Set(s.days[today]?.done ?? []);
  const plan = dayPlan(s, link, today), r = readiness(s, link, today), verdict = phaseVerdict(s, link, today);
  const pct = Math.round((items.filter((x) => done.has(x.id)).length / items.length) * 100);
  const macro = (label: string, v: string) => `<div class="macro"><b>${v}</b><small>${label}</small></div>`;

  return `
  ${head('protocol', 'Protocolul de azi', 'Ce faci, la ce oră și ce câștigi.')}
  <section aria-label="Faza">
    <div class="seg" role="group" aria-label="Alege faza">${PHASES.map((p) => `<button data-act="phase" data-id="${p.id}" aria-pressed="${p.id === s.phase.id}">${esc(p.n)}</button>`).join('')}</div>
    <p class="muted" style="margin-top:8px"><b style="color:var(--t1)">Săptămâna ${tg.week}.</b> ${esc(ph.goal)} ${esc(ph.rate)}.</p>
  </section>

  <section>
    <div class="macros">${macro('kcal', String(tg.kcal))}${macro('proteine, g', String(tg.p))}${macro('carbohidrați, g', String(tg.c))}${macro('grăsimi, g', String(tg.f))}${macro('fibre, g', String(tg.fiber))}${macro('apă, L', String(tg.waterL).replace('.', ','))}</div>
    <p class="faint" style="margin-top:6px">${tg.source === 'nutrition' ? 'Din Beast Nutrition.' : `Calculat din menținere de ${tg.maintenance} kcal${tg.delta ? `, ${tg.delta > 0 ? '+' : ''}${tg.delta} kcal` : ''}.`} ${tg.notes.map(esc).join(' ')}</p>
  </section>

  ${r ? `<section class="panel"><div class="between"><h3>${esc(ZONE[r.zone].n)}</h3>${status(r.zone === 'push' ? 'good' : r.zone === 'hold' ? 'watch' : 'act', `${r.score}/100`)}</div><p class="muted">${esc(ZONE[r.zone].line)}</p></section>` : ''}

  <section>
    <div class="between"><h2>Ziua</h2><span class="faint">${pct}% făcut</span></div>
    <div class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
    <p class="faint" style="margin:8px 0">Cafeina stop la ${esc(caffeineCutoff(s.profile))}. Ora de somn și de antrenament se schimbă din Setări.</p>
    <ol class="line">${items.map((x) => `
      <li class="item ${done.has(x.id) ? 'done' : ''}">
        <span class="at">${x.at}</span>
        <button class="tick" data-act="tick" data-id="${x.id}" aria-pressed="${done.has(x.id)}" aria-label="Bifează: ${esc(x.title)}"><span>${done.has(x.id) ? '✓' : ''}</span></button>
        <details><summary><span class="ttl">${esc(x.title)}</span></summary><p>${esc(x.why)}</p><div style="padding:6px 0 0 12px">${hormoneTags(x.hormones)}</div></details>
      </li>`).join('')}</ol>
  </section>

  ${plan.own || plan.inner.length ? `<section class="panel stack">
    <h2>Sesiunea de azi</h2>
    ${plan.inner.length ? `<p class="muted">Din planul Inner Beast: <b style="color:var(--t1)">${esc(plan.inner.map((x) => x.name).join(', '))}</b>.</p>` : ''}
    ${plan.own ? `<h3>${esc(plan.own.n)}, ${plan.own.min} minute</h3><p class="muted">${esc(plan.own.line)}</p>${plain(plan.own.blocks)}` : ''}
    <a class="btn" href="#/performanta">Vezi toată săptămâna</a>
  </section>` : ''}

  <section>
    <h2>Regulile fazei ${esc(ph.n)}</h2>
    <p class="muted" style="margin-bottom:8px"><b style="color:var(--t1)">${esc(verdict.title)}.</b> ${esc(verdict.body)}</p>
    <details class="fold" open><summary>Mâncare</summary><div>${plain(ph.food)}</div></details>
    <details class="fold"><summary>Antrenament</summary><div>${plain(ph.train)}</div></details>
    <details class="fold"><summary>Recuperare</summary><div>${plain(ph.recover)}</div></details>
    <details class="fold"><summary>Ce se întâmplă cu hormonii</summary><div><p class="muted">${esc(ph.hormones)}</p></div></details>
    <details class="fold"><summary>Când ieși din fază</summary><div>${plain(ph.exit)}</div></details>
    <details class="fold"><summary>Când faci analize</summary><div><p class="muted">${esc(ph.blood)}</p></div></details>
    <details class="fold"><summary>Ce știm sigur și ce nu</summary><div class="stack"><p class="muted">${esc(ph.honest)}</p>${cites(ph.refs)}</div></details>
    <div class="field" style="margin-top:12px"><label for="maint">Menținerea ta, kcal pe zi</label><input id="maint" class="inp" inputmode="numeric" data-change="maint" value="${s.phase.maintenance ?? ''}" placeholder="${tg.maintenance}"></div>
  </section>

  <section>
    <h2>Suplimente</h2>
    <p class="muted" style="margin-bottom:8px">Selecție strictă. Doar ce are dovezi și merită banii.</p>
    ${TIERS.map((t) => `<details class="fold" ${t.id === 'base' ? 'open' : ''}><summary>${esc(t.n)}</summary><div><p class="faint" style="margin-bottom:6px">${esc(t.line)}</p><ul class="steps">${SUPPS.filter((x) => x.tier === t.id).map((x) => `<li>${ev(x.ev)}<div class="grow"><b>${esc(x.n)}</b>. ${esc(x.dose)}. ${esc(x.when)}.<div class="muted small">${esc(x.why)} ${esc(x.care)}</div>${cites(x.refs)}</div></li>`).join('')}</ul></div></details>`).join('')}
    <details class="fold"><summary>Ce eviți</summary><div><ul class="steps">${AVOID.map((x) => `<li><div class="grow"><b>${esc(x.n)}</b>. <span class="muted">${esc(x.why)}</span>${cites(x.refs)}</div></li>`).join('')}</ul></div></details>
  </section>`;
}

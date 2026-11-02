import { BENCHES, DOMAIN, DOMAINS, YEAR, type Bench, type DomainId } from '../data/performance.ts';
import { PHASE } from '../data/phases.ts';
import { dayPlan, weekSessions } from '../logic/plan.ts';
import { benchLevel, benchScore, benchTargets, benchValue, domainStates, nextFocus, scoreStatus } from '../logic/score.ts';
import { DAYS, addDays, fmtVal, num, shortDate, uid, weekday } from '../logic/util.ts';
import { ctx, actions, persist, render, toast } from '../ui/ctx.ts';
import { back, esc, ev, cites, head, lineChart, meter, plain, status, steps } from '../ui/parts.ts';

actions['test'] = (el) => {
  const input = el.previousElementSibling as HTMLInputElement, v = num(input.value), bench = el.dataset['id']!;
  if (v == null) { toast('Scrie un număr.'); return; }
  ctx.s.tests.push({ id: uid(), date: ctx.today, bench, v });
  persist(); render.now(); toast('Test salvat');
};

function week(): string {
  const { s, link, today } = ctx;
  const list = weekSessions(s), wd = weekday(today);
  return `<div class="week">${DAYS.map((d, i) => {
    const own = list[i], date = addDays(today, i - wd), inner = dayPlan(s, link, date).inner;
    return `<div class="dayc ${own?.hard ? 'hard' : own ? 'easy' : ''} ${i === wd ? 'today' : ''}"><small>${d}</small><b>${esc(own?.n ?? 'Odihnă și mobilitate')}</b>${inner.length ? `<small>Inner Beast: ${esc(inner.map((x) => x.name).join(', '))}</small>` : ''}</div>`;
  }).join('')}</div>`;
}

function year(): string {
  const total = YEAR.reduce((a, b) => a + b.weeks, 0);
  const cur = ctx.s.phase.id;
  const nowIdx = YEAR.findIndex((y) => y.phase === cur);
  return `<div class="year" role="img" aria-label="Exemplu de an în ${YEAR.length} blocuri">${YEAR.map((y, i) => `<div class="${y.phase} ${i === nowIdx ? 'now' : ''}" style="flex:${y.weeks / total}" title="${esc(y.n)}"></div>`).join('')}</div>
  <ul class="yearkey" style="margin-top:6px">${YEAR.map((y) => `<li><span>${esc(y.n)} <span class="faint">(${esc(PHASE[y.phase].n)})</span></span><span class="faint tab">${y.weeks} săpt.</span></li>`).join('')}</ul>`;
}

function benchRow(b: Bench): string {
  const { s, link, today } = ctx;
  const val = benchValue(s, link, today, b);
  const t = benchTargets(b, s), score = val ? benchScore(b, s, val.v) : null;
  const unit = b.from === 'perkg' ? 'kg' : b.unit;
  const hist = s.tests.filter((x) => x.bench === b.id).sort((a, c) => a.date.localeCompare(c.date));
  return `<li class="panel stack" style="margin-top:8px">
    <div class="between"><div><h3>${esc(b.n)}</h3></div>${ev(b.ev)}</div>
    ${val ? `<div class="between"><span class="num" style="font-size:24px;font-weight:700">${fmtVal(val.v)} <small class="faint">${esc(b.unit)}</small></span>${status(scoreStatus(score ?? 0), benchLevel(score ?? 0))}</div>${meter(Math.round(score ?? 0), scoreStatus(score ?? 0))}` : '<p class="faint">Nu ai încă un rezultat.</p>'}
    ${t ? `<p class="faint">Bază ${fmtVal(t[0])}, bun ${fmtVal(t[1])}, excelent ${fmtVal(t[2])}, elită ${fmtVal(t[3])}.</p>` : ''}
    <p class="muted small">${esc(b.how)}</p>
    ${hist.length > 1 ? lineChart(hist.map((h) => ({ label: shortDate(h.date), v: h.v })), { unit, height: 130, summary: `${b.n} în timp` }) : ''}
    ${b.from === 'auto' ? '' : `<div class="row"><input class="inp" inputmode="decimal" aria-label="Rezultat ${esc(b.n)}, în ${esc(unit)}" placeholder="Rezultat, ${esc(unit)}"><button class="btn" data-act="test" data-id="${b.id}">Salvează</button></div>`}
    ${cites(b.refs)}
  </li>`;
}

function domainPage(id: DomainId): string {
  const d = DOMAIN[id], { s, link, today } = ctx, state = domainStates(s, link, today).find((x) => x.id === id)!;
  const phaseNote = d.phase[s.phase.id];
  const tests = d.tests.map((t) => BENCHES.find((b) => b.id === t)!).filter(Boolean);
  return `
  ${back('#/performanta', 'Performanță')}
  <h1>${esc(d.n)}</h1>
  <p class="muted" style="margin:4px 0 14px">${esc(d.line)}</p>
  <section class="panel stack">
    <div class="between"><h3>Ținta</h3>${state.score != null ? status(scoreStatus(state.score), `${state.score}/100`) : status('none', 'Fără teste')}</div>
    <p>${esc(d.target)}</p>
  </section>
  <section class="fields" style="grid-template-columns:1fr">
    <div class="panel flat stack"><h3>Doza de progres</h3><p class="muted">${esc(d.dose)}</p></div>
    <div class="panel flat stack"><h3>Doza de menținere</h3><p class="muted">${esc(d.keep)}</p></div>
    ${phaseNote ? `<div class="panel flat stack"><h3>În ${esc(PHASE[s.phase.id].n)}</h3><p class="muted">${esc(phaseNote)}</p></div>` : ''}
  </section>
  <section><h2>Protocolul</h2>${steps(d.steps)}</section>
  <section><h2>Greșeli de evitat</h2>${plain(d.mistakes)}</section>
  <section><h2>Cum măsori</h2><ul>${tests.map(benchRow).join('')}</ul></section>`;
}

export function performance(param?: string): string {
  if (param && DOMAIN[param as DomainId]) return domainPage(param as DomainId);
  const { s, link, today } = ctx;
  const states = domainStates(s, link, today), focus = nextFocus(states);
  const list = weekSessions(s).filter(Boolean);
  const hard = list.filter((x) => x?.hard).length;
  const coverage = DOMAINS.map((d) => ({ d, n: list.filter((x) => x?.domains.includes(d.id)).length }));
  return `
  ${head('performance', 'Performance Protocols', 'Definire, forță, motor, viteză, recuperare, sănătate.')}
  <section class="panel stack">
    <h2>Regula care face totul posibil</h2>
    <p class="muted">Nimeni nu e la vârf în toate în aceeași zi. Lucrezi în blocuri: unul sau două domenii primesc doza de progres, restul doza de menținere. Testele îți arată ce urmează.</p>
    ${focus ? `<p><b>Veriga slabă acum: ${esc(focus.n)}</b>, ${focus.score}/100. <a href="#/performanta/${focus.id}" style="text-decoration:underline">Deschide protocolul</a>.</p>` : '<p class="faint">Introdu rezultate la cel puțin 3 domenii și aplicația îți spune veriga slabă.</p>'}
  </section>
  <section>
    <h2>Domeniile tale</h2>
    <ul class="bars">${states.map((d) => `<li><a href="#/performanta/${d.id}"><span class="blab">${esc(d.n)}</span>${meter(d.score, d.score == null ? 'none' : scoreStatus(d.score))}<span class="num tab" style="text-align:right">${d.score ?? '–'}</span></a></li>`).join('')}</ul>
    <p class="faint" style="margin-top:6px">Reperele pentru sprint, sărituri și 5 km sunt repere de antrenor, nu norme științifice. Progresul față de tine contează mai mult.</p>
  </section>
  <section>
    <div class="between"><h2>Săptămâna ta, ${esc(PHASE[s.phase.id].n)}</h2><span class="faint">${hard} sesiuni grele</span></div>
    ${week()}
    <p class="faint" style="margin-top:6px">Roșu înseamnă greu, albastru ușor. Se aranjează după zilele alese în Setări.</p>
    <details class="fold" style="margin-top:8px"><summary>Toate sesiunile, în detaliu</summary><div class="stack">${[...new Map(list.map((x) => [x!.id, x!])).values()].map((x) => `<div><h3>${esc(x.n)}, ${x.min} minute</h3><p class="muted small">${esc(x.line)}</p>${plain(x.blocks)}</div>`).join('')}</div></details>
    <details class="fold"><summary>Ce domenii acoperă săptămâna</summary><div><ul class="yearkey">${coverage.map((c) => `<li><span>${esc(c.d.n)}</span><span class="faint">${c.n ? `${c.n} sesiuni` : 'zilnic, prin protocol'}</span></li>`).join('')}</ul></div></details>
  </section>
  <section><h2>Un an întreg</h2><p class="muted" style="margin-bottom:8px">Exemplu de ordine, ca fiecare domeniu să-și primească blocul.</p>${year()}</section>`;
}

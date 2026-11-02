import { BENCHES, DOMAIN, type Bench, type DomainId } from '../data/performance.ts';
import { PHASE } from '../data/phases.ts';
import { SHIFT } from '../data/shifts.ts';
import { audit } from '../logic/audit.ts';
import { frame, isHard, sessionsOn, shiftOn } from '../logic/plan.ts';
import { benchLevel, benchScore, benchTargets, benchValue, domainStates, nextFocus, scoreStatus } from '../logic/score.ts';
import { DAYS, addDays, fmtVal, fromMin, num, shortDate, uid, weekday } from '../logic/util.ts';
import { ctx, actions, persist, render, toast } from '../ui/ctx.ts';
import { back, esc, ev, cites, head, lineChart, meter, plain, status, steps } from '../ui/parts.ts';

actions['test'] = (el) => {
  const input = el.previousElementSibling as HTMLInputElement, v = num(input.value), bench = el.dataset['id']!;
  if (v == null) { toast('Scrie un număr.'); return; }
  ctx.s.tests.push({ id: uid(), date: ctx.today, bench, v });
  persist(); render.now(); toast('Test salvat');
};

/** The next seven days: the shift of the day, the Inner Beast session, and the hour that fits. */
function week(): string {
  const { s, link, today } = ctx;
  const rows = Array.from({ length: 7 }, (_, i) => addDays(today, i)).map((d) => {
    const f = frame(s, d), sh = SHIFT[shiftOn(s.roster, d)], list = sessionsOn(link, d), hard = list.filter(isHard).length > 0;
    const warn = hard && f.sleepMin < 360 ? 'Somn puțin înainte: taie din volum.' : hard && f.prev === '3' && f.shift === 'L' ? 'Zi de revenire: mai ușor.' : '';
    return `<div class="dayc ${hard ? 'hard' : 'easy'} ${d === today ? 'today' : ''}"><small>${DAYS[weekday(d)]}, ${esc(sh.short)}</small><b>${list.length ? `${fromMin(f.trainAt)}, ${esc(list.map((x) => x.name).join(', '))}` : 'Liber'}</b>${warn ? `<small>${esc(warn)}</small>` : ''}</div>`;
  });
  return `<div class="week">${rows.join('')}</div>`;
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

const COVER = { good: ['good', 'Acoperit'], watch: ['watch', 'Parțial'], act: ['act', 'Lipsește'], none: ['none', 'Nu se aplică'] } as const;

function domainPage(id: DomainId): string {
  const d = DOMAIN[id], { s, link, today } = ctx, state = domainStates(s, link, today).find((x) => x.id === id)!;
  const phaseNote = d.phase[s.phase.id];
  const tests = d.tests.map((t) => BENCHES.find((b) => b.id === t)!).filter(Boolean);
  const cover = audit(link).find((c) => c.id === id);
  return `
  ${back('#/performanta', 'Performanță')}
  <h1>${esc(d.n)}</h1>
  <p class="muted" style="margin:4px 0 14px">${esc(d.line)}</p>
  <section class="panel stack">
    <div class="between"><h3>Ținta</h3>${state.score != null ? status(scoreStatus(state.score), `${state.score}/100`) : status('none', 'Fără teste')}</div>
    <p>${esc(d.target)}</p>
  </section>
  ${cover ? `<section class="panel stack"><div class="between"><h3>În planul Inner Beast</h3>${status(COVER[cover.level][0], COVER[cover.level][1])}</div><p class="muted">${esc(cover.note)}</p>${cover.sessions.length ? `<p class="faint">${cover.min} de minute pe săptămână: ${esc(cover.sessions.join(', '))}.</p>` : ''}</section>` : ''}
  ${phaseNote ? `<section class="panel flat stack"><h3>În ${esc(PHASE[s.phase.id].n)}</h3><p class="muted">${esc(phaseNote)}</p></section>` : ''}
  <section><h2>Cum măsori</h2><ul>${tests.map(benchRow).join('')}</ul></section>
  <section>
    <h2>Ce spun studiile</h2>
    <p class="muted" style="margin-bottom:6px">Pentru verificarea planului, nu un plan în plus.</p>
    <details class="fold"><summary>Doza dovedită</summary><div class="stack"><p class="muted">${esc(d.dose)}</p><p class="muted"><b style="color:var(--t1)">Minimul ca să nu pierzi:</b> ${esc(d.keep)}</p></div></details>
    <details class="fold"><summary>Studiile</summary><div>${steps(d.steps)}</div></details>
    <details class="fold"><summary>Greșeli de evitat</summary><div>${plain(d.mistakes)}</div></details>
  </section>`;
}

export function performance(param?: string): string {
  if (param && DOMAIN[param as DomainId]) return domainPage(param as DomainId);
  const { s, link, today } = ctx;
  const states = domainStates(s, link, today), focus = nextFocus(states), cov = audit(link);
  return `
  ${head('performance', 'Performance Protocols', 'Unde ești, ce acoperă planul tău, ce lipsește.')}
  <section class="panel stack">
    <h2>Regula care face totul posibil</h2>
    <p class="muted">Nimeni nu e la vârf în toate în aceeași zi. Lucrezi în blocuri: un domeniu urcă, restul se mențin. Testele îți arată ce urmează.</p>
    ${focus ? `<p><b>Veriga slabă acum: ${esc(focus.n)}</b>, ${focus.score}/100. <a href="#/performanta/${focus.id}" style="text-decoration:underline">Deschide</a>.</p>` : '<p class="faint">Introdu rezultate la cel puțin 3 domenii și aplicația îți spune veriga slabă.</p>'}
  </section>
  <section>
    <h2>Domeniile tale</h2>
    <ul class="bars">${states.map((d) => `<li><a href="#/performanta/${d.id}"><span class="blab">${esc(d.n)}</span>${meter(d.score, d.score == null ? 'none' : scoreStatus(d.score))}<span class="num tab" style="text-align:right">${d.score ?? '–'}</span></a></li>`).join('')}</ul>
    <p class="faint" style="margin-top:6px">Reperele pentru sprint, sărituri și 5 km sunt repere de antrenor, nu norme științifice. Progresul față de tine contează mai mult.</p>
  </section>
  <section>
    <h2>Săptămâna ta: schimburi și Inner Beast</h2>
    <p class="muted" style="margin-bottom:8px">Planul rămâne în Inner Beast. Aici e ora la care intră în schimbul fiecărei zile.</p>
    ${week()}
    ${link.week ? '' : '<p class="faint" style="margin-top:6px">Folosesc copia planului. Deschide Inner Beast în acest browser ca să văd alegerile tale.</p>'}
  </section>
  <section>
    <h2>Ce acoperă planul din Inner Beast</h2>
    <ul class="rows">${cov.map((c) => `<li><a class="rowa" href="#/performanta/${c.id}"><span class="grow"><b>${esc(DOMAIN[c.id].n)}</b><small>${esc(c.note)}</small></span>${status(COVER[c.level][0], COVER[c.level][1])}</a></li>`).join('')}</ul>
    <p class="faint" style="margin-top:6px">Verificare după tipul sesiunilor, nu o judecată a programului.</p>
  </section>`;
}

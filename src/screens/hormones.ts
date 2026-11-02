import { BIOMARKER } from '../data/biomarkers.ts';
import { DIR, HORMONE, HORMONES } from '../data/hormones.ts';
import { PHASE, PHASES } from '../data/phases.ts';
import { GLANDS, LEVERS, SYSTEMS } from '../data/systems.ts';
import { latest } from '../logic/labs.ts';
import { hormoneStates, type HormoneState } from '../logic/score.ts';
import { dateLabel, fmtVal, strip } from '../logic/util.ts';
import { ctx, actions } from '../ui/ctx.ts';
import { back, esc, head, plain, status, steps } from '../ui/parts.ts';

let query = '', sys = '';

actions['hsys'] = (el) => {
  sys = sys === el.dataset['id'] ? '' : el.dataset['id']!;
  document.querySelectorAll<HTMLElement>('[data-act="hsys"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset['id'] === sys)));
  drawList();
};

actions['hsearch'] = (el) => { query = (el as HTMLInputElement).value; drawList(); };

function rows(states: HormoneState[]): string {
  const q = strip(query);
  const list = states.filter((x) => (!sys || x.h.sys === sys) && (!q || strip(`${x.h.n} ${x.h.en} ${x.h.what}`).includes(q)));
  if (!list.length) return '<p class="muted">Niciun hormon nu se potrivește. Încearcă alt cuvânt.</p>';
  return `<ul class="rows">${list.map((x) => `<li><a class="rowa" href="#/hormoni/${x.h.id}"><span class="glyph" aria-hidden="true">${DIR[x.h.dir].glyph}</span><span class="grow"><b>${esc(x.h.n)}</b><small>${esc(x.h.en)}. ${esc(DIR[x.h.dir].n)}.</small></span>${x.status === 'none' ? '' : status(x.status)}</a></li>`).join('')}</ul>`;
}

function drawList() {
  const el = document.getElementById('hlist');
  if (el) el.innerHTML = rows(hormoneStates(ctx.s, ctx.link, ctx.today));
}

function detail(id: string): string {
  const h = HORMONE[id];
  if (!h) return '<p>Hormonul nu există.</p>';
  const { s, link, today } = ctx;
  const st = hormoneStates(s, link, today).find((x) => x.h.id === id)!;
  const l = latest(s);
  const glands = h.gland.map((g) => GLANDS.find((x) => x.id === g)?.n).filter(Boolean).join(', ');
  const lever = h.levers.map((x) => LEVERS.find((y) => y.id === x)?.n).filter(Boolean);
  const phaseRows = PHASES.filter((p) => h.phase[p.id]);
  const measured = h.markers.map((m) => BIOMARKER[m]).filter((b) => !!b);
  return `
  ${back('#/hormoni', 'Hormone Database')}
  <h1>${esc(h.n)}</h1>
  <p class="muted">${esc(h.en)}. Produs de: ${esc(glands)}.</p>
  <section class="panel stack" style="margin-top:14px">
    <div class="between"><h3>Direcția bună</h3><span aria-hidden="true" class="num">${DIR[h.dir].glyph}</span></div>
    <p>${esc(h.goal)}</p>
    <div class="between">${status(st.status)}<span class="faint">${st.source === 'blood' ? `Din analize, ${st.date ? esc(dateLabel(st.date)) : ''}` : st.source === 'habits' ? 'Estimat din obiceiuri, nu e o măsurătoare' : 'Fără date încă'}</span></div>
  </section>
  <section><h2>Ce face</h2><p class="muted">${esc(h.what)}</p></section>
  <section><h2>Ce câștigi</h2>${plain(h.gain)}</section>
  <section><h2>Protocolul</h2>${steps(h.steps)}</section>
  ${phaseRows.length ? `<section><h2>Pe faze</h2><ul class="rows">${phaseRows.map((p) => `<li style="padding:9px 0"><b style="${p.id === s.phase.id ? '' : 'color:var(--t2)'}">${esc(PHASE[p.id].n)}${p.id === s.phase.id ? ', faza ta' : ''}</b><div class="muted">${esc(h.phase[p.id] ?? '')}</div></li>`).join('')}</ul></section>` : ''}
  ${h.warn ? `<section class="fix"><h3>Atenție</h3><p class="muted">${esc(h.warn)}</p></section>` : ''}
  ${measured.length ? `<section><h2>Cum se măsoară</h2><ul class="rows">${measured.map((b) => { const v = l[b.id]; return `<li><a class="rowa" href="#/analize/${b.id}"><span class="grow"><b>${esc(b.n)}</b><small>${v ? `Ultima: ${fmtVal(v.value)} ${esc(v.unit)}` : 'Nu ai valoare'}</small></span>${v ? status(v.reading.status) : ''}</a></li>`; }).join('')}</ul></section>` : '<section><h2>Cum se măsoară</h2><p class="muted">Nu se măsoară de rutină. Urmărești rezultatele pârghiilor de mai jos.</p></section>'}
  ${lever.length ? `<section><h2>Pârghiile care îl mișcă</h2><div class="tags">${lever.map((x) => `<span class="tag">${esc(x)}</span>`).join('')}</div></section>` : ''}`;
}

export function hormones(param?: string): string {
  if (param) return detail(param);
  const states = hormoneStates(ctx.s, ctx.link, ctx.today);
  return `
  ${head('hormones', 'Hormone Database', '44 de hormoni, explicați simplu, fiecare cu protocolul lui.')}
  <div class="field"><label class="sr" for="hq">Caută un hormon</label><input id="hq" class="inp" data-input="hsearch" type="search" placeholder="Caută: testosteron, foame, somn" value="${esc(query)}"></div>
  <div class="chips" style="margin:10px -16px" role="group" aria-label="Filtrează după sistem">${SYSTEMS.map((x) => `<button class="chip" data-act="hsys" data-id="${x.id}" aria-pressed="${sys === x.id}">${esc(x.short)}</button>`).join('')}</div>
  <p class="faint" style="margin-bottom:6px">Nu trebuie să îi ții minte. Protocolul zilnic îi acoperă pe toți. Baza asta e pentru curiozitate.</p>
  <div id="hlist" class="cols">${rows(states)}</div>
  <p class="faint" style="margin-top:12px">${HORMONES.length} hormoni. ${Object.entries(DIR).map(([, d]) => `${d.glyph} ${d.n}`).join('. ')}.</p>`;
}

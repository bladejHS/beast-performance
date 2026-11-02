import { AVOID, SUPPS, type Supp } from '../data/performance.ts';
import { PHASE, PHASES } from '../data/phases.ts';
import { GUIDES, ROTATIONS, SHIFT, SHIFT_CHECKS, SHIFT_RISKS, SHIFT_STEPS, SWD, type ShiftId } from '../data/shifts.ts';
import type { PhaseId } from '../data/systems.ts';
import { phaseVerdict } from '../logic/insights.ts';
import { activeDate, anchorOptions, chronoNote, frame, phaseWeek, setRotation, shiftOn, timeline, transition } from '../logic/plan.ts';
import { readiness, ZONE } from '../logic/recovery.ts';
import { DAYS, addDays, dateLabel, diffDays, fmt, fromMin, weekday } from '../logic/util.ts';
import { ctx, actions, day, persist, render, toast } from '../ui/ctx.ts';
import { cites, esc, ev, head, hormoneTags, plain, status, steps } from '../ui/parts.ts';

const TIERS: { id: Supp['tier']; n: string; line: string }[] = [
  { id: 'base', n: 'Baza', line: 'Merită pentru aproape oricine se antrenează.' },
  { id: 'perf', n: 'Performanță', line: 'Dovedite, cu efect mic și util la sesiuni cheie.' },
  { id: 'lab', n: 'Doar după analize', line: 'Corectează un deficit. Fără deficit nu aduc nimic.' },
  { id: 'sleep', n: 'Somn', line: 'Doar după ce ai pus în ordine lumina și orele.' },
  { id: 'caution', n: 'Cu prudență', line: 'Efect real, dar și riscuri.' },
];

const ORDER: ShiftId[] = ['1', '2', '3', 'L'];
/** Which cycle is on screen; empty means the one running now. */
let viewing = '';

actions['phase'] = (el) => {
  const id = el.dataset['id'] as PhaseId, st = ctx.s.phase;
  if (st.id === id) return;
  ctx.s.phase = { ...st, id, start: ctx.today, history: [...st.history, { id: st.id, start: st.start, end: ctx.today }] };
  persist(); render.now(); toast(`Faza: ${PHASE[id].n}`);
};

actions['tick'] = (el) => {
  const d = day(el.dataset['date']!), id = el.dataset['id']!;
  const done = new Set(d.done ?? []);
  if (done.has(id)) done.delete(id); else done.add(id);
  d.done = [...done];
  persist(); render.now();
};

/** Tapping a day moves it to the next option: 1, 2, 3, free. */
actions['shiftday'] = (el) => {
  const date = el.dataset['date']!, r = ctx.s.roster;
  r.overrides = { ...r.overrides, [date]: ORDER[(ORDER.indexOf(shiftOn(r, date)) + 1) % ORDER.length]! };
  r.set = true;
  persist(); render.now();
};

actions['viewday'] = (el) => { viewing = el.dataset['date'] === activeDate(ctx.s) ? '' : el.dataset['date']!; render.now(); };

actions['rotation'] = (el) => {
  const id = (el as HTMLSelectElement).value;
  if (id === 'custom') ctx.s.roster = setRotation(ctx.s.roster, id, 0, ctx.today);
  else ctx.s.roster.rotation = id;
  persist(); render.now();
};

actions['anchor'] = (el) => {
  ctx.s.roster = setRotation(ctx.s.roster, ctx.s.roster.rotation, Number(el.dataset['i']), ctx.today);
  ctx.s.roster.overrides = {};
  persist(); render.now(); toast('Rotație salvată');
};

/** Rotation picker, shared with Settings and onboarding. */
export function rotationPicker(): string {
  const r = ctx.s.roster, options = anchorOptions(r.rotation, ctx.today);
  const n = r.pattern.length, pos = n ? ((diffDays(r.start, ctx.today) % n) + n) % n : -1;
  const weekly = ROTATIONS.find((x) => x.id === r.rotation)?.weekly;
  return `<div class="field"><label for="rot">Cum se rotesc schimburile</label><select id="rot" data-change="rotation">${ROTATIONS.map((x) => `<option value="${x.id}" ${x.id === r.rotation ? 'selected' : ''}>${esc(x.n)}</option>`).join('')}</select></div>
  ${options.length ? `<div class="stack" style="margin-top:8px"><p class="small muted">${weekly ? 'În ce schimb ești săptămâna asta?' : 'Unde ești azi în rotație?'}</p><div class="chips">${options.map((o) => `<button class="chip" data-act="anchor" data-i="${o.index}" aria-pressed="${r.set && o.index === pos}">${esc(o.label)}</button>`).join('')}</div></div>` : '<p class="faint" style="margin-top:6px">Atinge zilele din bandă ca să pui fiecare schimb.</p>'}`;
}

function strip(cur: string): string {
  const r = ctx.s.roster;
  const days = Array.from({ length: 14 }, (_, i) => addDays(ctx.today, i - 1));
  return `<div class="shiftbar" role="group" aria-label="Următoarele zile">${days.map((d) => {
    const sh = shiftOn(r, d);
    return `<div class="sd ${d === cur ? 'on' : ''}"><button class="sd-day" data-act="viewday" data-date="${d}" aria-label="Arată ${esc(dateLabel(d))}">${DAYS[weekday(d)]!.slice(0, 2)}<b>${Number(d.slice(8))}</b></button><button class="sd-sh s${sh}" data-act="shiftday" data-date="${d}" aria-label="${esc(dateLabel(d))}: ${esc(SHIFT[sh].n)}. Atinge ca să schimbi.">${sh === 'L' ? 'L' : sh}</button></div>`;
  }).join('')}</div>`;
}

export function protocol(): string {
  const { s, link } = ctx;
  const active = activeDate(s), date = viewing || active;
  const f = frame(s, date), items = timeline(s, link, date), done = new Set(s.days[date]?.done ?? []);
  const ph = PHASE[s.phase.id], sh = SHIFT[f.shift], note = transition(f), r = date === active ? readiness(s, link, ctx.today) : null;
  const verdict = phaseVerdict(s, link, ctx.today);
  const pct = Math.round((items.filter((x) => done.has(x.id)).length / items.length) * 100);
  const cell = (label: string, v: string) => `<div class="macro"><b>${v}</b><small>${label}</small></div>`;
  return `
  ${head('protocol', 'Protocolul de azi', 'Orele zilei tale, după schimb.')}
  ${!s.roster.set ? `<section class="panel stack"><h2>Spune-mi cum lucrezi</h2><p class="muted">Tot protocolul se calculează din schimburi.</p>${rotationPicker()}</section>` : ''}
  <section aria-label="Schimburi">${strip(date)}<p class="faint" style="margin-top:6px">Atinge cifra ca să schimbi ziua: 1, 2, 3 sau L, liber. Atinge data ca să vezi ziua aceea.</p></section>

  <section>
    <div class="between"><h2>${esc(sh.n)}${f.shift === 'L' ? '' : `, ${sh.label}`}</h2><span class="faint">${date === active ? 'Acum' : esc(dateLabel(date))}</span></div>
    <div class="macros" style="margin-top:8px">${cell('trezire', fromMin(f.wake))}${cell('somn', fromMin(f.bed))}${cell('ultima cafea', fromMin(f.cafStop))}${cell('antrenament', fromMin(f.trainAt))}${cell('somn scurt', f.nap ? fromMin(f.nap.at) : '–')}${cell('ai dormit înainte', `${fmt(f.sleepMin / 60, 1)} h`)}</div>
  </section>

  ${note ? `<section class="panel stack">${status(note.level)}<h3>${esc(note.title)}</h3><p class="muted">${esc(note.body)}</p></section>` : ''}
  ${chronoNote(f, s.profile) ? `<p class="muted">${esc(chronoNote(f, s.profile))}</p>` : ''}
  ${r ? `<section class="panel"><div class="between"><h3>${esc(ZONE[r.zone].n)}</h3>${status(r.zone === 'push' ? 'good' : r.zone === 'hold' ? 'watch' : 'act', `${r.score}/100`)}</div><p class="muted">${esc(ZONE[r.zone].line)}</p></section>` : ''}

  <section>
    <div class="between"><h2>Ziua, de la trezire la somn</h2><span class="faint">${pct}% făcut</span></div>
    <div class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
    <p class="faint" style="margin:8px 0">Mâncarea e în Beast Nutrition, antrenamentul în Inner Beast. Aici sunt orele.</p>
    <ol class="line">${items.map((x) => `
      <li class="item ${done.has(x.id) ? 'done' : ''}">
        <span class="at">${x.at}</span>
        <button class="tick" data-act="tick" data-date="${date}" data-id="${x.id}" aria-pressed="${done.has(x.id)}" aria-label="Bifează: ${esc(x.title)}"><span>${done.has(x.id) ? '✓' : ''}</span></button>
        <details><summary><span class="ttl">${esc(x.title)}</span>${x.tomorrow ? ' <span class="faint">a doua zi</span>' : ''}</summary><p>${esc(x.why)}</p>${x.hormones.length ? `<div style="padding:6px 0 0 12px">${hormoneTags(x.hormones)}</div>` : ''}</details>
      </li>`).join('')}</ol>
  </section>

  <section>
    <h2>Cum treci prin fiecare schimb</h2>
    ${GUIDES.map((g) => `<details class="fold" ${g.id === f.shift ? 'open' : ''}><summary>${esc(g.n)}</summary><div class="stack"><p class="muted">${esc(g.hard)}</p>
      <ul class="yearkey">${[['Somn', g.sleep], ['Lumină', g.light], ['Cafea', g.caffeine], ['Mese', g.food], ['Antrenament', g.train], ['Hormoni', g.hormones]].map(([k, v]) => `<li style="display:block"><b>${k}.</b> <span class="muted">${esc(v)}</span></li>`).join('')}</ul><div><h3>Evită</h3>${plain(g.avoid)}</div></div></details>`).join('')}
    <details class="fold"><summary>Ce spun studiile despre ture</summary><div class="stack">${steps(SHIFT_STEPS)}<p class="faint">Nu există studii controlate care să compare ora antrenamentului la oameni în ture. Ferestrele de antrenament sunt practică, deduse din somn și lumină.</p></div></details>
    <details class="fold"><summary>Riscurile turelor și ce urmărești</summary><div class="stack"><ul class="steps">${SHIFT_RISKS.map((x) => `<li><div class="grow">${esc(x.t)}${cites(x.refs)}</div></li>`).join('')}</ul><p class="muted">${esc(SHIFT_CHECKS)}</p><div class="fix"><p class="muted">${esc(SWD)}</p>${cites(['wickwire2017'])}</div></div></details>
  </section>

  <section>
    <h2>Faza: ${esc(ph.n)}, săptămâna ${phaseWeek(s, ctx.today)}</h2>
    ${link.plan ? '<p class="faint" style="margin-bottom:6px">Faza vine din Beast Nutrition.</p>' : ''}
    <div class="seg" role="group" aria-label="Alege faza">${PHASES.map((p) => `<button data-act="phase" data-id="${p.id}" aria-pressed="${p.id === s.phase.id}">${esc(p.n)}</button>`).join('')}</div>
    <p class="muted" style="margin:8px 0"><b style="color:var(--t1)">${esc(verdict.title)}.</b> ${esc(verdict.body)}</p>
    <details class="fold"><summary>Recuperare în această fază</summary><div>${plain(ph.recover)}</div></details>
    <details class="fold"><summary>Ce se întâmplă cu hormonii</summary><div><p class="muted">${esc(ph.hormones)}</p></div></details>
    <details class="fold"><summary>Când ieși din fază</summary><div>${plain(ph.exit)}</div></details>
    <details class="fold"><summary>Când faci analize</summary><div><p class="muted">${esc(ph.blood)}</p></div></details>
    <details class="fold"><summary>Ce știm sigur și ce nu</summary><div class="stack"><p class="muted">${esc(ph.honest)}</p>${cites(ph.refs)}</div></details>
  </section>

  <section>
    <h2>Suplimente</h2>
    <p class="muted" style="margin-bottom:8px">Selecție strictă. Doar ce are dovezi și merită banii.</p>
    ${TIERS.map((t) => `<details class="fold"><summary>${esc(t.n)}</summary><div><p class="faint" style="margin-bottom:6px">${esc(t.line)}</p><ul class="steps">${SUPPS.filter((x) => x.tier === t.id).map((x) => `<li>${ev(x.ev)}<div class="grow"><b>${esc(x.n)}</b>. ${esc(x.dose)}. ${esc(x.when)}.<div class="muted small">${esc(x.why)} ${esc(x.care)}</div>${cites(x.refs)}</div></li>`).join('')}</ul></div></details>`).join('')}
    <details class="fold"><summary>Ce eviți</summary><div><ul class="steps">${AVOID.map((x) => `<li><div class="grow"><b>${esc(x.n)}</b>. <span class="muted">${esc(x.why)}</span>${cites(x.refs)}</div></li>`).join('')}</ul></div></details>
  </section>`;
}

import { BIOMARKER, BIOMARKERS, ORDER_PANELS, PANELS, PREP, type Biomarker } from '../data/biomarkers.ts';
import { HORMONES } from '../data/hormones.ts';
import { history, latest, panelsByDate, parseReport, patterns, refFor, optFor, statusCounts, type Parsed } from '../logic/labs.ts';
import { dateLabel, fmtVal, num, shortDate, uid } from '../logic/util.ts';
import { ctx, actions, persist, render, toast } from '../ui/ctx.ts';
import { back, bullet, cites, esc, empty, head, hormoneTags, lineChart, plain, status } from '../ui/parts.ts';

let parsed: Parsed[] = [];
let draftDate = '';

actions['parse'] = () => {
  const text = (document.getElementById('report') as HTMLTextAreaElement).value;
  parsed = parseReport(text);
  render.now();
  toast(parsed.length ? `Am citit ${parsed.length} valori. Verifică-le.` : 'Nu am recunoscut nicio valoare. Lipește rezultatele rând cu rând.');
};

actions['dropparsed'] = (el) => { parsed = parsed.filter((p) => p.id !== el.dataset['id']); render.now(); };

actions['saveparsed'] = () => {
  const date = (document.getElementById('pdate') as HTMLInputElement).value || ctx.today;
  const lab = (document.getElementById('plab') as HTMLInputElement).value.trim();
  const values: Record<string, { v: number; unit: string; lo?: number; hi?: number }> = {};
  for (const p of parsed) {
    const input = document.querySelector<HTMLInputElement>(`[data-pv="${p.id}"]`);
    const unit = document.querySelector<HTMLSelectElement>(`[data-pu="${p.id}"]`)?.value ?? p.unit;
    const v = input ? num(input.value) : p.v;
    if (v != null) values[p.id] = { v, unit, ...(p.lo != null && p.hi != null ? { lo: p.lo, hi: p.hi } : {}) };
  }
  document.querySelectorAll<HTMLInputElement>('[data-mv]').forEach((el) => {
    const v = num(el.value), id = el.dataset['mv']!;
    if (v == null) return;
    const unit = document.querySelector<HTMLSelectElement>(`[data-mu="${id}"]`)?.value ?? BIOMARKER[id]!.unit;
    values[id] = { v, unit };
  });
  if (!Object.keys(values).length) { toast('Nu ai introdus nicio valoare.'); return; }
  ctx.s.panels.push({ id: uid(), date, lab, fasted: true, values });
  parsed = []; draftDate = '';
  persist();
  location.hash = '#/analize';
  toast('Analize salvate');
};

actions['delpanel'] = (el) => {
  ctx.s.panels = ctx.s.panels.filter((p) => p.id !== el.dataset['id']);
  persist(); render.now(); toast('Set de analize șters');
};

const unitPicker = (b: Biomarker, attr: string, chosen?: string) => (b.alt?.length ? `<select class="inp" style="width:auto;flex:none" ${attr} aria-label="Unitate pentru ${esc(b.n)}">${[b.unit, ...b.alt.map((a) => a.u)].map((u) => `<option ${u === chosen ? 'selected' : ''}>${esc(u)}</option>`).join('')}</select>` : `<span class="faint" style="flex:none">${esc(b.unit)}</span>`);

const tabs = (cur: string) => `<nav class="tabs" aria-label="Analize">${[['', 'Rezultate'], ['adauga', 'Adaugă'], ['comanda', 'Ce ceri la laborator'], ['pregatire', 'Pregătire']].map(([id, n]) => `<a href="#/analize${id ? `/${id}` : ''}" ${cur === id ? 'aria-current="page"' : ''}>${n}</a>`).join('')}</nav>`;

function results(): string {
  const { s } = ctx, l = latest(s);
  if (!s.panels.length) return empty('Nu ai încă analize', 'Lipește textul de la laborator sau scrie valorile. Primești imediat ce înseamnă fiecare și cum corectezi ce nu e bine.', '#/analize/adauga', 'Adaugă analize');
  const c = statusCounts(s), pats = patterns(s);
  const row = (b: Biomarker) => {
    const x = l[b.id]; if (!x) return '';
    return `<a class="lab" href="#/analize/${b.id}"><div><b>${esc(b.n)}</b><div>${status(x.reading.status)}</div></div><div class="val">${fmtVal(x.value)} <small>${esc(x.unit)}</small></div><div class="bullet">${bullet(x.reading.base, x.reading.ref, x.reading.opt, x.reading.status)}</div></a>`;
  };
  return `
  <div class="row wrap" style="margin-bottom:10px">${status('good', `${c.good} optim`)} ${status('watch', `${c.watch} de urmărit`)} ${status('act', `${c.act} de corectat`)} ${c.urgent ? status('urgent', `${c.urgent} la medic`) : ''}</div>
  <p class="faint" style="margin-bottom:10px">Bara gri e intervalul laboratorului, zona verde e banda de performanță, semnul e valoarea ta.</p>
  ${pats.length ? `<section><h2>Citite împreună</h2>${pats.map((p) => `<div class="panel stack" style="margin-bottom:8px">${status(p.level)}<h3>${esc(p.title)}</h3><p class="muted">${esc(p.body)}</p></div>`).join('')}</section>` : ''}
  <div class="cols">${PANELS.map((p) => {
    const list = BIOMARKERS.filter((b) => b.panel === p.id && l[b.id]);
    return list.length ? `<section><h2>${esc(p.n)}</h2><div class="rows">${list.map(row).join('')}</div></section>` : '';
  }).join('')}</div>
  <section><h2>Istoric</h2><ul class="rows">${panelsByDate(s).map((p) => `<li class="between" style="padding:9px 0"><span>${esc(dateLabel(p.date))}${p.lab ? `, ${esc(p.lab)}` : ''} <span class="faint">${Object.keys(p.values).length} valori</span></span><button class="btn quiet danger" data-act="delpanel" data-id="${p.id}">Șterge</button></li>`).join('')}</ul></section>`;
}

function add(): string {
  draftDate ||= ctx.today;
  return `
  <section class="stack">
    <h2>Lipește rezultatele</h2>
    <p class="muted">Copiază textul din PDF-ul laboratorului, un rezultat pe rând. Nu pleacă nicăieri, se citește pe telefon.</p>
    <div class="field"><label for="report">Text de la laborator</label><textarea id="report" placeholder="Testosteron total 5,12 ng/mL 2,49 - 8,36&#10;TSH 1,82 µUI/mL 0,27 - 4,2"></textarea></div>
    <button class="btn" data-act="parse">Citește textul</button>
  </section>
  ${parsed.length ? `<section><h2>Am găsit</h2><ul class="rows">${parsed.map((p) => { const b = BIOMARKER[p.id]!; return `<li class="row" style="padding:8px 0"><span class="grow"><b>${esc(b.n)}</b>${p.lo != null ? `<small class="faint" style="display:block">Interval laborator ${fmtVal(p.lo)}–${fmtVal(p.hi ?? 0)}</small>` : ''}</span><input class="inp" style="width:90px" inputmode="decimal" data-pv="${p.id}" value="${String(p.v).replace('.', ',')}" aria-label="Valoare ${esc(b.n)}">${unitPicker(b, `data-pu="${p.id}"`, p.unit)}<button class="btn quiet" data-act="dropparsed" data-id="${p.id}" aria-label="Scoate ${esc(b.n)}">×</button></li>`; }).join('')}</ul></section>` : ''}
  <section class="stack">
    <h2>Sau scrie valorile</h2>
    ${PANELS.map((p) => `<details class="fold" ${p.id === 'hormones' ? 'open' : ''}><summary>${esc(p.n)}</summary><div>${BIOMARKERS.filter((b) => b.panel === p.id && !b.calc).map((b) => `<div class="row" style="padding:5px 0"><label class="grow small" for="m-${b.id}">${esc(b.n)}</label><input id="m-${b.id}" class="inp" style="width:90px" inputmode="decimal" data-mv="${b.id}">${unitPicker(b, `data-mu="${b.id}"`)}</div>`).join('')}</div></details>`).join('')}
  </section>
  <section class="stack">
    <div class="fields"><div class="field"><label for="pdate">Data recoltării</label><input id="pdate" type="date" value="${draftDate}" max="${ctx.today}"></div><div class="field"><label for="plab">Laborator</label><input id="plab" placeholder="Opțional"></div></div>
    <button class="btn go" data-act="saveparsed">Salvează analizele</button>
  </section>`;
}

function order(): string {
  return `${ORDER_PANELS.map((p) => `<section class="panel stack"><h2>${esc(p.n)}</h2><p class="muted">${esc(p.when)}</p><div class="tags">${p.ids.map((id) => `<a class="tag" href="#/analize/${id}">${esc(BIOMARKER[id]?.n ?? id)}</a>`).join('')}</div></section>`).join('')}`;
}

function prep(): string {
  return `<p class="muted" style="margin-bottom:10px">O analiză făcută prost te duce la concluzii greșite. Asta contează în zilele de dinainte.</p>
  <ul class="steps">${PREP.map((p) => `<li><div class="grow"><b>${esc(p.t)}</b><div class="muted">${esc(p.why)}</div>${cites(p.refs)}</div></li>`).join('')}</ul>`;
}

function detail(id: string): string {
  const b = BIOMARKER[id];
  if (!b) return '<p>Markerul nu există.</p>';
  const { s } = ctx, x = latest(s)[id], sex = s.profile.sex;
  const ref = x?.reading.ref ?? refFor(b, sex), opt = x?.reading.opt ?? optFor(b, sex);
  const hist = history(s, id);
  const side = x?.reading.side ?? null;
  const fix = side === 'low' ? b.low : side === 'high' ? b.high : null;
  const hs = HORMONES.filter((h) => h.markers.includes(id)).map((h) => h.id);
  const block = (title: string, f: NonNullable<Biomarker['low']>, open: boolean) => `<details class="fold" ${open ? 'open' : ''}><summary>${esc(title)}</summary><div class="stack"><div><h3>De ce apare</h3>${plain(f.why)}</div><div><h3>Ce faci</h3>${plain(f.do)}</div><div class="fix"><h3>Când mergi la medic</h3><p class="muted">${esc(f.doc)}</p></div></div></details>`;
  const altRange = (r: [number, number]) => `${fmtVal(r[0])}–${Number.isFinite(r[1]) ? fmtVal(r[1]) : '∞'} ${esc(b.unit)}`;
  return `
  ${back('#/analize', 'Bloodwork & Biomarkers')}
  <h1>${esc(b.n)}</h1>
  <p class="muted" style="margin-top:4px">${esc(b.what)}</p>
  <section class="panel stack" style="margin-top:14px">
    ${x ? `<div class="between"><span class="num" style="font-size:32px;font-weight:700">${fmtVal(x.value)} <small class="faint">${esc(x.unit)}</small></span>${status(x.reading.status)}</div><div class="bullet">${bullet(x.reading.base, x.reading.ref, x.reading.opt, x.reading.status)}</div><p class="faint">Din ${esc(dateLabel(x.date))}.${x.unit !== b.unit ? ` Egal cu ${fmtVal(x.reading.base)} ${esc(b.unit)}.` : ""}</p>` : '<p class="muted">Nu ai încă o valoare.</p>'}
    <p class="faint">${ref ? `Interval: ${altRange(ref)}.` : 'Fără interval universal: folosește intervalul laboratorului.'} ${opt ? `Banda de performanță: ${altRange(opt)}.` : ''}</p>
  </section>
  ${b.note ? `<section class="fix"><h3>De știut</h3><p class="muted">${esc(b.note)}</p></section>` : ''}
  ${hist.length >= 2 ? `<section><h2>Evoluție</h2>${lineChart(hist.map((h) => ({ label: shortDate(h.date), v: Math.round(h.base * 100) / 100 })), { unit: b.unit, band: opt && Number.isFinite(opt[1]) ? opt : ref && Number.isFinite(ref[1]) ? ref : undefined, summary: `${b.n}: ${hist.length} valori, ultima ${fmtVal(hist[hist.length - 1]!.base)} ${b.unit}` })}</section>` : ''}
  <section><h2>Cum corectezi</h2>
    ${b.low ? block('Dacă e scăzut', b.low, side === 'low') : ''}${b.high ? block('Dacă e crescut', b.high, side === 'high') : ''}
    ${!b.low && !b.high ? '<p class="muted">Nu are o corecție standard. Se interpretează împreună cu medicul.</p>' : ''}
    ${!fix && x?.reading.status === 'good' ? '<p class="st st-good" style="margin-top:8px"><i>●</i>Valoarea ta e bună. Păstrează ce faci.</p>' : ''}
  </section>
  <p class="faint" style="margin-top:14px">Repetă la ${b.retest >= 500 ? 'nevoie, o dată în viață e de obicei suficient' : `${b.retest} săptămâni după o schimbare`}.</p>
  ${hs.length ? `<section><h2>Hormoni legați</h2>${hormoneTags(hs)}</section>` : ''}
  ${b.refs?.length ? `<section>${cites(b.refs)}</section>` : ''}`;
}

export function bloodwork(param?: string): string {
  const known = param === 'adauga' || param === 'comanda' || param === 'pregatire';
  if (param && !known) return detail(param);
  const body = param === 'adauga' ? add() : param === 'comanda' ? order() : param === 'pregatire' ? prep() : results();
  return `${head('blood', 'Bloodwork & Biomarkers', 'Fiecare valoare, ce înseamnă și cum o corectezi.')}${tabs(param ?? '')}${body}`;
}

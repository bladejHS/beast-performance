import { RED_FLAGS } from '../data/phases.ts';
import { BIOMARKER } from '../data/biomarkers.ts';
import { SYMPTOM, SYMPTOMS, SYM_GROUPS } from '../data/symptoms.ts';
import { dayView } from '../logic/bridge.ts';
import { addDays, dateLabel, lastDays, num } from '../logic/util.ts';
import type { Day } from '../logic/store.ts';
import { ctx, actions, day, persist, render, toast } from '../ui/ctx.ts';
import { back, esc, head, hormoneTags, plain } from '../ui/parts.ts';

let date = '';

actions['jday'] = (el) => { date = addDays(date, Number(el.dataset['d'])); if (date > ctx.today) date = ctx.today; render.now(); };

actions['rate'] = (el) => {
  const k = el.dataset['k'] as keyof Day, v = Number(el.dataset['v']), d = day(date) as Record<string, unknown>;
  d[k] = d[k] === v ? undefined : v;
  persist(); render.now();
};

actions['flag'] = (el) => {
  const k = el.dataset['k'] as keyof Day, d = day(date) as Record<string, unknown>;
  d[k] = d[k] ? undefined : true;
  persist(); render.now();
};

actions['sev'] = (el) => {
  const d = day(date), id = el.dataset['id']!, v = Number(el.dataset['v']);
  const sym = { ...d.sym };
  if (sym[id] === v) delete sym[id]; else sym[id] = v;
  d.sym = sym;
  persist(); render.now();
};

actions['jnum'] = (el) => {
  const input = el as HTMLInputElement, k = input.dataset['k'] as keyof Day, d = day(date) as Record<string, unknown>;
  const v = input.type === 'time' ? input.value || undefined : num(input.value) ?? undefined;
  d[k] = v;
  persist();
  toast('Salvat');
};

const scale = (k: keyof Day, label: string, lo: string, hi: string, cur?: number) => `<div class="scale" role="group" aria-label="${esc(label)}"><div class="between"><b class="small">${esc(label)}</b><span class="faint">1 ${esc(lo)}, 5 ${esc(hi)}</span></div><div class="opts">${[1, 2, 3, 4, 5].map((v) => `<button data-act="rate" data-k="${k}" data-v="${v}" aria-pressed="${cur === v}">${v}</button>`).join('')}</div></div>`;

const numField = (k: keyof Day, label: string, cur: unknown, hint: unknown, type = 'text') => `<div class="field"><label for="f-${k}">${esc(label)}</label><input id="f-${k}" ${type === 'time' ? 'type="time"' : 'inputmode="decimal"'} data-change="jnum" data-k="${k}" value="${esc(String(cur ?? '').replace('.', ','))}" placeholder="${esc(String(hint ?? '').replace('.', ','))}"></div>`;

function detail(id: string): string {
  const y = SYMPTOM[id];
  if (!y) return '<p>Simptomul nu există.</p>';
  const count = lastDays(ctx.today, 14).filter((d) => dayView(ctx.s, ctx.link, d).sym?.[id]).length;
  return `
  ${back('#/jurnal', 'Symptoms & Health Tracking')}
  <h1>${esc(y.n)}</h1>
  ${count ? `<p class="muted">Apărut de ${count} ori în ultimele 14 zile.</p>` : ''}
  <section style="margin-top:14px"><h2>Ce faci</h2>${plain(y.fix)}</section>
  <section><h2>Cauze frecvente</h2>${plain(y.causes)}</section>
  ${y.check.length ? `<section><h2>Ce verifici</h2><div class="tags">${y.check.map((c) => `<a class="tag" href="#/analize/${c}">${esc(BIOMARKER[c]?.n ?? c)}</a>`).join('')}</div></section>` : ''}
  <section class="fix"><h3>Când mergi la medic</h3><p class="muted">${esc(y.doctor)}</p></section>
  <section><h2>Hormoni implicați</h2>${hormoneTags(y.hormones)}</section>`;
}

export function journal(param?: string): string {
  if (param) return detail(param);
  date ||= ctx.today;
  const own = ctx.s.days[date] ?? {}, view = dayView(ctx.s, ctx.link, date), sym = own.sym ?? {};
  const counts: Record<string, number> = {};
  for (const d of lastDays(ctx.today, 14)) for (const k of Object.keys(dayView(ctx.s, ctx.link, d).sym ?? {})) counts[k] = (counts[k] ?? 0) + 1;
  const heat = lastDays(ctx.today, 28).map((d) => { const v = dayView(ctx.s, ctx.link, d), n = Object.values(v.sym ?? {}).reduce((a, b) => a + b, 0), done = v.sleepH != null || v.energy != null; return `<i title="${esc(dateLabel(d))}: ${n ? `${n} puncte de simptome` : done ? 'fără simptome' : 'nimic notat'}" style="background:${n ? `rgba(255,198,92,${Math.min(1, 0.3 + n * 0.14)})` : done ? '#1f5f4b' : 'var(--s2)'}"></i>`; }).join('');
  return `
  ${head('tracking', 'Symptoms & Health Tracking', 'Două minute pe zi. Din ele vin prioritățile.')}
  <div class="datebar"><button data-act="jday" data-d="-1" aria-label="Ziua de dinainte">‹</button><b>${date === ctx.today ? 'Azi' : esc(dateLabel(date))}</b><button data-act="jday" data-d="1" aria-label="Ziua următoare" ${date === ctx.today ? 'disabled style="opacity:.3"' : ''}>›</button></div>
  <div class="two">
    <section class="panel">
      <h2>Check-in</h2>
      ${scale('sleepQ', 'Calitatea somnului', 'slab', 'excelent', own.sleepQ)}
      ${scale('energy', 'Energie', 'la pământ', 'plin', own.energy)}
      ${scale('stress', 'Stres', 'calm', 'foarte mare', own.stress)}
      ${scale('hunger', 'Foame', 'deloc', 'constantă', own.hunger)}
      ${scale('soreness', 'Febră musculară', 'deloc', 'mare', own.soreness)}
      ${scale('mood', 'Dispoziție', 'jos', 'excelentă', own.mood)}
      ${scale('libido', 'Libido', 'absent', 'mare', own.libido)}
      ${ctx.s.profile.sex === 'm' ? `<button class="btn" style="margin-top:6px;width:100%" data-act="flag" data-k="morning" aria-pressed="${!!own.morning}">${own.morning ? '✓ ' : ''}Erecție matinală</button>` : ''}
    </section>
    <section class="panel stack">
      <h2>Cifrele zilei</h2>
      <p class="faint">Ce vine din Inner Beast sau Beast Nutrition apare ca sugestie. Dacă scrii aici, valoarea ta are prioritate.</p>
      <div class="fields">
        ${numField('sleepH', 'Somn principal, ore', own.sleepH, view.sleepH)}
        ${numField('napMin', 'Somn scurt, minute', own.napMin, '')}
        ${numField('weight', 'Greutate, kg', own.weight, view.weight)}
        ${numField('waist', 'Talie, cm', own.waist, view.waist)}
        ${numField('steps', 'Pași', own.steps, view.steps)}
        ${numField('waterL', 'Apă, litri', own.waterL, view.waterL)}
        ${numField('alcohol', 'Alcool, unități', own.alcohol, '')}
        ${numField('lastCaffeine', 'Ultima cafea', own.lastCaffeine, '', 'time')}
        ${numField('caffeineMg', 'Cafeină, mg', own.caffeineMg, '')}
      </div>
      ${view.kcal ? `<p class="faint">Din Beast Nutrition: ${view.kcal} kcal, ${view.protein ?? 0} g proteine.</p>` : ''}
      <p class="faint">Puls, HRV, tensiune și antrenament se notează în Recovery.</p>
    </section>
  </div>
  <section>
    <h2>Simptome</h2>
    <p class="muted" style="margin-bottom:6px">Bifează ce simți: 1 ușor, 2 clar, 3 puternic. Atinge numele pentru ce faci.</p>
    ${SYM_GROUPS.map((g) => `<details class="fold" ${SYMPTOMS.some((y) => y.group === g.id && sym[y.id]) ? 'open' : ''}><summary>${esc(g.n)}</summary><div><ul class="rows">${SYMPTOMS.filter((y) => y.group === g.id && !(ctx.s.profile.sex === 'm' ? ['cycle'] : ['morning', 'ed', 'gyno']).includes(y.id)).map((y) => `<li class="row" style="padding:6px 0"><a class="grow" href="#/jurnal/${y.id}" style="min-height:36px;display:flex;align-items:center">${esc(y.n)}</a><div class="sevs" role="group" aria-label="${esc(y.n)}">${[1, 2, 3].map((v) => `<button data-act="sev" data-id="${y.id}" data-v="${v}" aria-pressed="${sym[y.id] === v}">${v}</button>`).join('')}</div></li>`).join('')}</ul></div></details>`).join('')}
  </section>
  <section><h2>Ultimele 28 de zile</h2><div class="heat" aria-label="Harta simptomelor pe ultimele 28 de zile" role="img">${heat}</div><p class="faint" style="margin-top:6px">Verde: zi notată, fără simptome. Galben: simptome, cu atât mai intens cu cât sunt mai multe.</p></section>
  ${Object.keys(counts).length ? `<section><h2>Cele mai dese</h2><ul class="rows">${Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, c]) => `<li><a class="rowa" href="#/jurnal/${k}"><span class="grow"><b>${esc(SYMPTOM[k]?.n ?? k)}</b></span><span class="faint">de ${c} ori</span></a></li>`).join('')}</ul></section>` : ''}
  <details class="fold" style="margin-top:22px"><summary>Semnale de alarmă: mergi la medic, nu aștepta</summary><div>${plain(RED_FLAGS)}</div></details>`;
}

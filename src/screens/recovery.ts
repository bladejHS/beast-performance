import { readiness, series, totalSleep, trainingLoad, ZONE, avgOf, weightTrend } from '../logic/recovery.ts';
import { activeDate, frame } from '../logic/plan.ts';
import type { Day } from '../logic/store.ts';
import { fmt, shortDate, num } from '../logic/util.ts';
import { ctx, actions, day, persist, render, toast } from '../ui/ctx.ts';
import { cites, esc, empty, head, lineChart, meter, status } from '../ui/parts.ts';
import { scoreStatus } from '../logic/score.ts';

let range = 30;
actions['range'] = (el) => { range = Number(el.dataset['n']); render.now(); };

actions['rnum'] = (el) => {
  const input = el as HTMLInputElement, k = input.dataset['k'] as keyof Day, d = day(ctx.today) as Record<string, unknown>;
  d[k] = (input.tagName === 'SELECT' ? input.value : num(input.value)) ?? undefined;
  persist(); toast('Salvat');
};

const input = (k: keyof Day, label: string, cur: unknown) => `<div class="field"><label for="r-${k}">${esc(label)}</label><input id="r-${k}" inputmode="decimal" data-change="rnum" data-k="${k}" value="${esc(String(cur ?? '').replace('.', ','))}"></div>`;

function gauge(score: number, zone: 'push' | 'hold' | 'back'): string {
  const r = 52, c = 2 * Math.PI * r, color = zone === 'push' ? 'var(--good)' : zone === 'hold' ? 'var(--watch)' : 'var(--act)';
  return `<svg viewBox="0 0 124 124" role="img" aria-label="Disponibilitate ${score} din 100"><circle cx="62" cy="62" r="${r}" fill="none" stroke="var(--s3)" stroke-width="8"/><circle cx="62" cy="62" r="${r}" fill="none" stroke="${color}" stroke-width="8" stroke-dasharray="${(score / 100) * c} ${c}" transform="rotate(-90 62 62)"/><text x="62" y="72" text-anchor="middle" fill="var(--t1)" font-family="Saira" font-weight="700" font-size="32">${score}</text></svg>`;
}

export function recovery(): string {
  const { s, link, today } = ctx;
  const r = readiness(s, link, today), own = s.days[today] ?? {}, load = trainingLoad(s, link, today), trend = weightTrend(s, link, today);
  const chart = (title: string, f: (d: Day) => number | undefined, unit: string, band?: [number, number], color?: string) => {
    const pts = series(s, link, today, range, f).filter((x) => x.v != null).map((x) => ({ label: shortDate(x.date), v: x.v! }));
    if (pts.length < 2) return '';
    const last = pts[pts.length - 1]!;
    return `<section><div class="between"><h3>${esc(title)}</h3><span class="num tab">${String(last.v).replace('.', ',')} ${esc(unit)}</span></div>${lineChart(pts, { unit, band, color, height: 150, summary: `${title}, ultimele ${range} de zile, ultima valoare ${last.v} ${unit}` })}</section>`;
  };
  const planned = frame(s, activeDate(s)).sleepMin / 60;
  const sleep7 = avgOf(s, link, today, 7, totalSleep);
  const charts = [chart('Somn în 24 de ore', totalSleep, 'h', [7.5, 9]), chart('HRV', (d) => d.hrv, 'ms', undefined, 'var(--sky)'), chart('Puls de repaus', (d) => d.rhr, 'bpm', undefined, 'var(--act)'), chart('Greutate', (d) => d.weight, 'kg', undefined, 'var(--t2)'), chart('Tensiune sistolică', (d) => d.bpS, 'mmHg', [100, 120], 'var(--t2)'), chart('Pași', (d) => d.steps, 'pași', [8000, 12000], 'var(--t2)')].filter(Boolean);
  return `
  ${head('recovery', 'Recovery & Physiological Data', 'Cât poți duce azi și ce îți spune corpul.')}
  ${r ? `<section class="panel"><div class="gauge">${gauge(r.score, r.zone)}<div class="stack"><div>${status(r.zone === 'push' ? 'good' : r.zone === 'hold' ? 'watch' : 'act', ZONE[r.zone].n)}</div><p class="muted">${esc(ZONE[r.zone].line)}</p></div></div>
    <ul class="bars wide" style="margin-top:10px">${r.parts.map((p) => `<li><span class="blab">${esc(p.n)}</span>${meter(Math.round(p.score), scoreStatus(p.score))}<span class="faint tab" style="text-align:right">${esc(p.value)}</span></li>`).join('')}</ul></section>` : empty('Fără date pentru azi', 'Notează somnul și cum te simți. HRV-ul și pulsul intră în calcul după 5 zile de bază.', '#/jurnal', 'Fă check-in')}
  <section class="panel stack">
    <h2>Măsurători de azi</h2>
    <div class="fields">
      ${input('rhr', 'Puls de repaus, bpm', own.rhr)}${input('hrv', 'HRV, ms', own.hrv)}
      ${input('bpS', 'Tensiune sistolică', own.bpS)}${input('bpD', 'Tensiune diastolică', own.bpD)}
      ${input('trainMin', 'Antrenament, minute', own.trainMin)}${input('rpe', 'Cât de greu, 1–10', own.rpe)}
      ${input('spo2', 'SpO2, %', own.spo2)}${input('temp', 'Temperatură, °C', own.temp)}
    </div>
    <p class="faint">Măsoară pulsul și HRV imediat după somnul principal, în pat, cu același dispozitiv. După schimbul 3, valorile sunt mai greu de comparat.</p>
  </section>
  <section>
    <h2>Încărcare</h2>
    <div class="stats">
      <div class="panel stat"><small>Săptămâna asta</small><b>${load.week || '–'}</b><small>minute × efort</small></div>
      <div class="panel stat"><small>Față de cea trecută</small><b>${load.change != null ? `${load.change > 0 ? '+' : ''}${Math.round(load.change * 100)}%` : '–'}</b><small>Ținta: maximum +20%</small></div>
      <div class="panel stat"><small>Monotonie</small><b>${load.monotony != null ? fmt(load.monotony, 1) : '–'}</b><small>Sub 2 e bine</small></div>
      <div class="panel stat"><small>Somn posibil azi</small><b>${fmt(planned, 1)} h</b><small>${sleep7 != null ? `Media ta: ${fmt(sleep7, 1)} h` : 'După schimbul de azi'}</small></div>
    </div>
    <p class="faint" style="margin-top:6px">Încărcarea e metoda session-RPE. Nu folosim raportul acut:cronic, pentru că nu s-a dovedit că prezice accidentările.</p>
    ${cites(['foster2001', 'impellizzeri2020'])}
  </section>
  ${trend?.pct != null ? `<p class="muted" style="margin-top:12px">Greutatea se schimbă cu ${trend.pct > 0 ? '+' : ''}${fmt(trend.pct, 2)}% pe săptămână.</p>` : ''}
  <section>
    <div class="between"><h2>Tendințe</h2><div class="row">${[14, 30, 60].map((n) => `<button class="chip" data-act="range" data-n="${n}" aria-pressed="${range === n}">${n} zile</button>`).join('')}</div></div>
    ${charts.length ? `<div class="two" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr));margin-top:0">${charts.join('')}</div>` : '<p class="muted">Graficele apar după câteva zile de date.</p>'}
  </section>`;
}

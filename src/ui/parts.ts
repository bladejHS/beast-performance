/* Small pieces of markup shared by the screens. Every value from the user goes through `esc`. */
import { HORMONE } from '../data/hormones.ts';
import { REF } from '../data/refs.gen.ts';
import type { Ev } from '../data/systems.ts';
import type { Status } from '../logic/labs.ts';
import { STATUS } from '../logic/labs.ts';
import type { HormoneState } from '../logic/score.ts';

export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export const art = (name: string) => `${import.meta.env.BASE_URL}art/${name}.svg`;
export const emblem = () => `${import.meta.env.BASE_URL}splash/emblem.webp`;

export const head = (icon: string, title: string, line: string) => `<header class="head"><img src="${art(icon)}" alt="" width="58" height="58"><div><h1>${esc(title)}</h1><p>${esc(line)}</p></div></header>`;

export const back = (href: string, label: string) => `<a class="back" href="${href}">${esc(label)}</a>`;

export const status = (s: Status, label?: string) => `<span class="st st-${s}"><i aria-hidden="true">${STATUS[s].glyph}</i>${esc(label ?? STATUS[s].n)}</span>`;

const EV_NAME: Record<Ev, string> = { A: 'dovezi puternice: meta-analize sau ghiduri', B: 'studii controlate', C: 'studii mici sau mecanism', D: 'practică de antrenor' };
export const ev = (e: Ev) => `<span class="ev ev-${e}" title="Nivel ${e}: ${EV_NAME[e]}" aria-label="Nivel de dovezi ${e}: ${EV_NAME[e]}">${e}</span>`;

export function cites(keys?: string[]): string {
  if (!keys?.length) return '';
  return `<div class="refs">${keys.map((k) => { const r = REF[k]; return r ? `<a href="${esc(r.u)}" target="_blank" rel="noopener">${esc(r.a)} ${r.y}</a>` : ''; }).filter(Boolean).join(', ')}</div>`;
}

export function steps(list: { t: string; ev: Ev; refs?: string[] }[]): string {
  return `<ol class="steps">${list.map((s) => `<li>${ev(s.ev)}<div class="grow">${esc(s.t)}${cites(s.refs)}</div></li>`).join('')}</ol>`;
}

export const plain = (list: string[]) => `<ul class="plain">${list.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;

export const hormoneTags = (ids: string[]) => `<div class="tags">${ids.map((id) => { const h = HORMONE[id]; return h ? `<a class="tag" href="#/hormoni/${id}">${esc(h.n)}</a>` : ''; }).join('')}</div>`;

export const empty = (title: string, line: string, href: string, cta: string) => `<div class="panel flat stack"><h3>${esc(title)}</h3><p class="muted">${esc(line)}</p><a class="btn go" href="${href}">${esc(cta)}</a></div>`;

const COLOR: Record<Status, string> = { good: 'var(--good)', watch: 'var(--watch)', act: 'var(--act)', urgent: 'var(--urgent)', none: 'var(--none)' };

/** The 44 hormones around the wolf. Length repeats what colour says, so it survives colour blindness and grayscale. */
export function ring(states: HormoneState[]): string {
  const gap = 3.2, order = ['sex', 'growth', 'thyroid', 'stress', 'metabolic', 'appetite', 'sleep', 'fluid', 'bone'];
  const groups = order.map((id) => states.filter((x) => x.h.sys === id));
  const step = (360 - gap * groups.length) / states.length;
  const pt = (r: number, a: number) => `${(100 + r * Math.cos(a)).toFixed(2)} ${(100 + r * Math.sin(a)).toFixed(2)}`;
  let angle = -90 + gap / 2, out = '';
  const len: Record<Status, number> = { good: 15, watch: 11, act: 7, urgent: 7, none: 5 };
  for (const g of groups) {
    for (const x of g) {
      const a0 = ((angle + 0.42) * Math.PI) / 180, a1 = ((angle + step - 0.42) * Math.PI) / 180;
      const inner = 80, outer = inner + len[x.status];
      const label = x.source === 'habits' ? `${x.h.n}: estimat din obiceiuri` : `${x.h.n}: ${STATUS[x.status].n}${x.source === 'blood' ? ', din analize' : ''}`;
      out += `<a href="#/hormoni/${x.h.id}" aria-label="${esc(label)}"><title>${esc(label)}</title><path fill="${COLOR[x.status]}" opacity="${x.source === 'habits' ? 0.72 : 1}" d="M${pt(inner, a0)}L${pt(outer, a0)}L${pt(outer, a1)}L${pt(inner, a1)}Z"/></a>`;
      angle += step;
    }
    angle += gap;
  }
  return `<svg class="ring" viewBox="0 0 200 200" role="group" aria-label="Starea celor 44 de hormoni">${out}</svg>`;
}

interface Point { label: string; v: number }

/** Small line with a marker at the end. Context, not a number to read. */
export function spark(values: (number | null)[], color = 'var(--t2)'): string {
  const pts = values.map((v, i) => [i, v] as const).filter((p): p is readonly [number, number] => p[1] != null);
  if (pts.length < 2) return '';
  const min = Math.min(...pts.map((p) => p[1])), max = Math.max(...pts.map((p) => p[1]));
  const X = (i: number) => (i / (values.length - 1)) * 96 + 2, Y = (v: number) => 30 - ((v - min) / (max - min || 1)) * 26;
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)} ${Y(p[1]).toFixed(1)}`).join('');
  const last = pts[pts.length - 1]!;
  return `<svg viewBox="0 0 100 34" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${X(last[0]).toFixed(1)}" cy="${Y(last[1]).toFixed(1)}" r="1.6" fill="${color}"/></svg>`;
}

/** One series over time, with a hover layer. `band` draws the target zone behind the line. */
export function lineChart(points: Point[], opts: { unit?: string; band?: [number, number]; height?: number; color?: string; summary: string }): string {
  if (points.length < 2) return '';
  const W = 400, H = opts.height ?? 170, L = 32, R = 8, T = 10, B = 20;
  const vals = points.map((p) => p.v);
  let min = Math.min(...vals), max = Math.max(...vals);
  if (opts.band) { min = Math.min(min, opts.band[0]); max = Math.max(max, opts.band[1]); }
  const pad = (max - min || Math.abs(max) || 1) * 0.12;
  min -= pad; max += pad;
  const X = (i: number) => L + (i / (points.length - 1)) * (W - L - R), Y = (v: number) => T + (1 - (v - min) / (max - min)) * (H - T - B);
  const ticks = [min + pad, (min + max) / 2, max - pad];
  const fmtTick = (v: number) => (Math.abs(max - min) < 8 ? v.toFixed(1) : Math.round(v).toString()).replace('.', ',');
  const grid = ticks.map((t) => `<line x1="${L}" x2="${W - R}" y1="${Y(t).toFixed(1)}" y2="${Y(t).toFixed(1)}" stroke="var(--line)"/><text x="${L - 6}" y="${(Y(t) + 4).toFixed(1)}" text-anchor="end" fill="var(--t3)" font-size="10.5">${fmtTick(t)}</text>`).join('');
  const band = opts.band ? `<rect x="${L}" width="${W - L - R}" y="${Y(opts.band[1]).toFixed(1)}" height="${(Y(opts.band[0]) - Y(opts.band[1])).toFixed(1)}" fill="var(--good)" opacity=".1"/>` : '';
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(p.v).toFixed(1)}`).join('');
  const area = `${d}L${X(points.length - 1).toFixed(1)} ${H - B}L${L} ${H - B}Z`;
  const color = opts.color ?? 'var(--sky)';
  const last = points[points.length - 1]!, first = points[0]!;
  const data = esc(JSON.stringify(points.map((p, i) => ({ x: X(i) / W, y: Y(p.v) / H, t: `${p.label}: ${String(Math.round(p.v * 100) / 100).replace('.', ',')}${opts.unit ? ` ${opts.unit}` : ''}` }))));
  return `<figure class="chart" data-pts="${data}" style="margin:0"><figcaption class="sr">${esc(opts.summary)}</figcaption><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.summary)}">${band}${grid}<path d="${area}" fill="${color}" opacity=".1"/><path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${X(points.length - 1).toFixed(1)}" cy="${Y(last.v).toFixed(1)}" r="4" fill="${color}" stroke="var(--s1)" stroke-width="2"/><text x="${L}" y="${H - 5}" fill="var(--t3)" font-size="10.5">${esc(first.label)}</text><text x="${W - R}" y="${H - 5}" fill="var(--t3)" font-size="10.5" text-anchor="end">${esc(last.label)}</text></svg></figure>`;
}

/** Bullet graph after Stephen Few: the lab interval, the performance band, and the value as a mark. */
export function bullet(value: number, ref: [number, number] | undefined, opt: [number, number] | undefined, s: Status): string {
  if (!ref) return '';
  const lo = ref[0], hi = Number.isFinite(ref[1]) ? ref[1] : Math.max(value * 1.3, lo + 1);
  const span = (hi - lo) || 1;
  const min = Math.min(lo - span * 0.35, value - span * 0.05), max = Math.max(hi + span * 0.35, value + span * 0.05);
  const X = (v: number) => ((Math.max(min, Math.min(max, v)) - min) / (max - min)) * 100;
  const o = opt ? `<rect x="${X(opt[0]).toFixed(2)}%" width="${Math.max(0, X(opt[1]) - X(opt[0])).toFixed(2)}%" y="7" height="8" fill="var(--good)" opacity=".55"/>` : '';
  return `<svg class="bullet" aria-hidden="true"><rect width="100%" y="9" height="4" fill="var(--s3)"/><rect x="${X(lo).toFixed(2)}%" width="${(X(hi) - X(lo)).toFixed(2)}%" y="7" height="8" fill="var(--edge)"/>${o}<rect x="calc(${X(value).toFixed(2)}% - 2px)" y="2" width="4" height="18" fill="${COLOR[s]}" stroke="var(--void)" stroke-width="1"/></svg>`;
}

export const meter = (score: number | null, s: Status) => `<div class="meter" role="img" aria-label="${score == null ? 'Fără date' : `${score} din 100`}"><i class="${s}" style="width:${score ?? 0}%"></i></div>`;

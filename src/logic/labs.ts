/* Bloodwork: units, classification, the derived markers, and reading a pasted lab report. */
import { BIOMARKER, BIOMARKERS, type Biomarker, type Range } from '../data/biomarkers.ts';
import type { Panel, Sex, State } from './store.ts';
import { strip } from './util.ts';

/** good: inside the performance band. watch: inside the lab interval, outside the band. act: outside the lab interval. urgent: beyond the critical limits. */
export type Status = 'good' | 'watch' | 'act' | 'urgent' | 'none';

export const STATUS: Record<Status, { n: string; glyph: string }> = {
  good: { n: 'Optim', glyph: '●' },
  watch: { n: 'De urmărit', glyph: '▲' },
  act: { n: 'De corectat', glyph: '◆' },
  urgent: { n: 'Mergi la medic', glyph: '✕' },
  none: { n: 'Fără date', glyph: '○' },
};

const pick = (r: Biomarker['ref'], sex: Sex): Range | undefined => (!r ? undefined : Array.isArray(r) ? r : r[sex]);
export const refFor = (b: Biomarker, sex: Sex) => pick(b.ref, sex);
export const optFor = (b: Biomarker, sex: Sex) => pick(b.opt, sex);

export function toBase(b: Biomarker, v: number, unit: string): number {
  if (unit === b.unit) return v;
  const alt = b.alt?.find((a) => a.u === unit);
  return alt ? v * alt.f : v;
}

export interface Reading { status: Status; side: 'low' | 'high' | null; ref?: Range; opt?: Range; base: number }

/** The lab's own interval, when given, replaces the default one. It is converted from the unit the value came in. */
export function classify(b: Biomarker, value: number, unit: string, sex: Sex, lo?: number, hi?: number): Reading {
  const base = toBase(b, value, unit);
  const labRef: Range | undefined = lo != null && hi != null ? [toBase(b, lo, unit), toBase(b, hi, unit)] : undefined;
  const ref = labRef ?? refFor(b, sex);
  const opt = optFor(b, sex);
  if (!ref) return { status: 'none', side: null, base };
  if (b.crit && ((b.crit.lo != null && base < b.crit.lo) || (b.crit.hi != null && base > b.crit.hi))) {
    return { status: 'urgent', side: b.crit.lo != null && base < b.crit.lo ? 'low' : 'high', ref, opt, base };
  }
  if (b.lowOk && base < (opt?.[0] ?? ref[0])) return { status: 'good', side: null, ref, opt, base };
  if (base < ref[0]) return { status: 'act', side: 'low', ref, opt, base };
  if (base > ref[1]) return { status: 'act', side: 'high', ref, opt, base };
  if (opt && base < opt[0]) return { status: 'watch', side: 'low', ref, opt, base };
  if (opt && base > opt[1]) return { status: 'watch', side: 'high', ref, opt, base };
  return { status: 'good', side: null, ref, opt, base };
}

export interface Latest { id: string; date: string; value: number; unit: string; reading: Reading; panelId: string }

/** Glucose (mg/dL) × insulin (µIU/mL) ÷ 405. */
export const homaIr = (glucose: number, insulin: number) => (glucose * insulin) / 405;

/** Panel values plus the markers computed from them. */
export function panelValues(p: Panel): Panel['values'] {
  const v = { ...p.values };
  const g = v['glu'], i = v['ins'];
  if (g && i && !v['homa']) v['homa'] = { v: Math.round(homaIr(toBase(BIOMARKER['glu']!, g.v, g.unit), toBase(BIOMARKER['ins']!, i.v, i.unit)) * 100) / 100, unit: 'index' };
  return v;
}

export const panelsByDate = (s: State) => [...s.panels].sort((a, b) => b.date.localeCompare(a.date));

/** The most recent value of every marker, across panels. */
export function latest(s: State): Record<string, Latest> {
  const out: Record<string, Latest> = {};
  for (const p of panelsByDate(s)) {
    for (const [id, x] of Object.entries(panelValues(p))) {
      const b = BIOMARKER[id];
      if (!b || out[id]) continue;
      out[id] = { id, date: p.date, value: x.v, unit: x.unit, panelId: p.id, reading: classify(b, x.v, x.unit, s.profile.sex, x.lo, x.hi) };
    }
  }
  return out;
}

export function history(s: State, id: string): { date: string; base: number }[] {
  const b = BIOMARKER[id];
  if (!b) return [];
  return [...s.panels].sort((a, c) => a.date.localeCompare(c.date)).flatMap((p) => {
    const x = panelValues(p)[id];
    return x ? [{ date: p.date, base: toBase(b, x.v, x.unit) }] : [];
  });
}

export function statusCounts(s: State) {
  const counts = { good: 0, watch: 0, act: 0, urgent: 0 };
  for (const l of Object.values(latest(s))) if (l.reading.status !== 'none') counts[l.reading.status]++;
  return counts;
}

const normUnit = (u: string) => strip(u).replace(/μ/g, 'µ').replace(/ui/g, 'iu').replace(/\s/g, '').replace('uiu', 'µiu');

const unitsOf = (b: Biomarker) => [b.unit, ...(b.alt ?? []).map((a) => a.u)];

function matchUnit(b: Biomarker, text: string): string {
  const t = normUnit(text).replace(/uiu/g, 'µiu').replace(/ug/g, 'µg').replace(/umol/g, 'µmol');
  const all = unitsOf(b).sort((x, y) => y.length - x.length);
  return all.find((u) => t.includes(normUnit(u).replace(/uiu/g, 'µiu'))) ?? b.unit;
}

const NUM = '[<>≤≥]?\\s*-?\\d+(?:[.,]\\d+)?';

/** Longest aliases first: "testosteron liber" must win over "testosteron". */
const ALIASES = BIOMARKERS.flatMap((b) => b.aliases.map((a) => ({ a: strip(a), id: b.id }))).sort((x, y) => y.a.length - x.a.length);

export interface Parsed { id: string; v: number; unit: string; lo?: number; hi?: number; line: string }

/** Reads the text of a lab report, one result per line. Lines it cannot read are ignored, so the user reviews what it found. */
export function parseReport(text: string): Parsed[] {
  const found = new Map<string, Parsed>();
  for (const raw of text.split(/\r?\n/)) {
    const line = strip(raw).replace(/\t/g, ' ').trim();
    if (!line) continue;
    const hit = ALIASES.find(({ a }) => {
      if (a.length <= 3) return new RegExp(`^${a}\\b`).test(line);
      return line.includes(a);
    });
    if (!hit || found.has(hit.id)) continue;
    const after = line.slice(line.indexOf(hit.a) + hit.a.length);
    const m = after.match(new RegExp(NUM));
    if (!m) continue;
    const v = Number(m[0].replace(/[<>≤≥\s]/g, '').replace(',', '.'));
    if (!Number.isFinite(v)) continue;
    const rest = after.slice((m.index ?? 0) + m[0].length);
    const b = BIOMARKER[hit.id]!;
    const range = rest.match(new RegExp(`(${NUM})\\s*(?:-|–|—|\\.\\.|to|la)\\s*(${NUM})`));
    const parsed: Parsed = { id: hit.id, v, unit: matchUnit(b, rest), line: raw.trim() };
    if (range) {
      const lo = Number(range[1]!.replace(/[<>≤≥\s]/g, '').replace(',', '.')), hi = Number(range[2]!.replace(/[<>≤≥\s]/g, '').replace(',', '.'));
      if (Number.isFinite(lo) && Number.isFinite(hi) && hi > lo) { parsed.lo = lo; parsed.hi = hi; }
    }
    found.set(hit.id, parsed);
  }
  return [...found.values()];
}

/** Patterns that only make sense read together. */
export interface Pattern { id: string; title: string; body: string; level: 'watch' | 'act' }

export function patterns(s: State): Pattern[] {
  const l = latest(s);
  const out: Pattern[] = [];
  const st = (id: string) => l[id]?.reading;
  const low = (id: string) => st(id)?.status === 'act' && st(id)?.side === 'low';
  const high = (id: string) => st(id)?.status === 'act' && st(id)?.side === 'high';
  const cut = s.phase.id === 'cut';

  if (low('tt') && (low('lh') || (st('lh') && !high('lh')))) out.push({ id: 'central', level: 'act', title: 'Testosteron mic cu LH mic sau normal', body: cut ? 'Tiparul obișnuit în deficit: creierul a redus semnalul. Oprește deficitul 4–8 săptămâni și repetă.' : 'Semnalul de la creier e slab. Verifică energia, somnul, prolactina, feritina. Dacă nu ești în deficit, mergi la endocrinolog.' });
  if (low('tt') && high('lh')) out.push({ id: 'primary', level: 'act', title: 'Testosteron mic cu LH mare', body: 'Creierul cere, dar testiculele nu răspund. Are nevoie de consult de specialitate.' });
  if (high('tsh') && (low('ft4') || st('ft4'))) out.push({ id: 'hypo', level: 'act', title: 'TSH mare', body: low('ft4') ? 'TSH mare cu FT4 mic înseamnă hipotiroidism. Mergi la endocrinolog.' : 'Hipotiroidism subclinic posibil. Repetă în 6–8 săptămâni cu anti-TPO.' });
  if ((low('ft3') || st('ft3')?.side === 'low') && st('tsh')?.status !== 'act' && cut) out.push({ id: 'lowt3', level: 'watch', title: 'FT3 jos cu TSH normal în cut', body: 'E adaptarea la deficit, nu o boală de tiroidă. Fă 7–14 zile la menținere sau un refeed.' });
  if (high('alt') && (high('ck') || high('ast')) && !high('ggt')) out.push({ id: 'muscleliver', level: 'watch', title: 'ALT/AST crescute cu GGT normal', body: 'Tiparul tipic după antrenament greu, nu neapărat ficat. Repetă după 7 zile fără efort mare.' });
  if (high('creat') && !st('cysc')) out.push({ id: 'cystatin', level: 'watch', title: 'Creatinină crescută', body: 'Creatina și masa musculară o cresc. Cere cistatina C înainte să tragi concluzii.' });
  if (low('ferritin') && st('crp')) out.push({ id: 'iron', level: 'act', title: 'Rezervă de fier scăzută', body: s.profile.sex === 'm' ? 'La bărbați, feritina mică trebuie explicată: discută cu medicul despre o posibilă sângerare.' : 'Verifică menstruația și aportul de carne. Discută cu medicul.' });
  if (high('crp') && st('ferritin')?.side === 'high') out.push({ id: 'inflam', level: 'watch', title: 'hs-CRP și feritină crescute', body: 'Feritina mare poate fi inflamație, nu rezervă mare.' });
  if ((high('apob') || high('ldl')) && high('tg')) out.push({ id: 'atherogenic', level: 'act', title: 'ApoB și trigliceride crescute', body: 'Tipar metabolic. Prioritate: grăsime abdominală, fără alcool, fibre, cardio.' });
  if (high('hct')) out.push({ id: 'hct', level: 'act', title: 'Hematocrit crescut', body: 'Repetă hidratat. Dacă rămâne mare, verifică apneea și orice substanță hormonală.' });
  return out;
}

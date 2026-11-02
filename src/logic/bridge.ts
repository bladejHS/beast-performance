/* Reads Inner Beast and Beast Nutrition, which live on the same origin. Read only: this file never writes to their keys.
   A value the user typed in this app always wins over a value read from a sibling. */
import type { PhaseId } from '../data/systems.ts';
import type { Day, Profile, Sex, State } from './store.ts';

export interface PlanSession { id: string; name: string; kind: string; min: number; focus?: string }

export interface Link {
  nutrition: boolean; inner: boolean;
  /** Filled from Beast Nutrition when it has a plan. */
  plan: { phase: 'cut' | 'maintain' | 'reverse'; kcal: number; p: number; c: number; f: number; maintenance: number; ratePct: number; start: string } | null;
  profile: Partial<Profile> | null;
  week: PlanSession[][] | null;
  /** date → what the sibling apps know about that day. */
  days: Record<string, Partial<Day>>;
}

export const EMPTY_LINK: Link = { nutrition: false, inner: false, plan: null, profile: null, week: null, days: {} };

type Rec = Record<string, unknown>;
const isObj = (x: unknown): x is Rec => !!x && typeof x === 'object' && !Array.isArray(x);
const nums = (x: unknown): Record<string, number> => {
  if (!isObj(x)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(x)) if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
  return out;
};

function read(key: string, store: Pick<Storage, 'getItem'>): Rec | null {
  try {
    const raw = store.getItem(key);
    const data: unknown = raw ? JSON.parse(raw) : null;
    return isObj(data) ? data : null;
  } catch {
    return null;
  }
}

const put = (days: Link['days'], date: string, patch: Partial<Day>) => { days[date] = { ...days[date], ...patch }; };

/** Kinds of Inner Beast entries that count as training load. */
const TRAINING = new Set(['rounds', 'amrap', 'workout', 'routine', 'run', 'row', 'coach', 'race']);

export function readLink(store: Pick<Storage, 'getItem'>): Link {
  const out: Link = { nutrition: false, inner: false, plan: null, profile: null, week: null, days: {} };

  const inner = read('beast:v1', store);
  if (inner) {
    out.inner = true;
    for (const [d, v] of Object.entries(nums(inner['sleep']))) put(out.days, d, { sleepH: v });
    for (const [d, v] of Object.entries(nums(inner['steps']))) put(out.days, d, { steps: v });
    for (const [d, v] of Object.entries(nums(inner['weight']))) put(out.days, d, { weight: v });
    for (const [d, v] of Object.entries(nums(inner['waist']))) put(out.days, d, { waist: v });
    for (const [d, v] of Object.entries(nums(inner['water']))) put(out.days, d, { waterL: v > 20 ? v / 1000 : v });
    if (Array.isArray(inner['log'])) {
      const mins: Record<string, number> = {};
      for (const e of inner['log'] as Rec[]) {
        if (!isObj(e) || typeof e['date'] !== 'string' || !TRAINING.has(String(e['kind']))) continue;
        const dur = Number(e['dur']) || 0;
        mins[e['date']] = (mins[e['date']] ?? 0) + dur / 60;
      }
      for (const [d, m] of Object.entries(mins)) put(out.days, d, { trainMin: Math.round(m) });
    }
    const nut = inner['nut'];
    if (isObj(nut) && nut['ok']) {
      out.profile = { sex: (nut['sex'] === 'f' ? 'f' : 'm') as Sex, age: Number(nut['age']) || undefined, heightCm: Number(nut['h']) || undefined, ...(Number(nut['bf']) ? { bf: Number(nut['bf']) } : {}) };
    }
  }

  const plan = read('beast:plan:v1', store);
  if (plan && Array.isArray(plan['week'])) out.week = plan['week'] as PlanSession[][];

  const nutri = read('beast-nutrition:v2', store);
  if (nutri) {
    out.nutrition = true;
    const who = nutri['profile'];
    if (isObj(who)) {
      out.profile = { ...out.profile, sex: (who['sex'] === 'f' ? 'f' : 'm') as Sex, age: Number(who['age']) || undefined, heightCm: Number(who['heightCm']) || undefined, weightKg: Number(who['weightKg']) || undefined, bf: Number(who['bf']) || null };
    }
    const p = nutri['plan'];
    if (isObj(p) && isObj(p['macros'])) {
      const m = p['macros'] as Rec;
      out.plan = { phase: p['phase'] as 'cut', kcal: Number(m['kcal']), p: Number(m['p']), c: Number(m['c']), f: Number(m['f']), maintenance: Number(p['maintenance']), ratePct: Number(p['ratePct']) || 0, start: String(p['startDate'] ?? '') };
    }
    for (const [d, v] of Object.entries(nums(nutri['weights']))) put(out.days, d, { weight: v });
    if (isObj(nutri['days'])) {
      for (const [d, meals] of Object.entries(nutri['days'] as Rec)) {
        if (!Array.isArray(meals)) continue;
        const t = { kcal: 0, p: 0, fiber: 0, n: 0 };
        for (const e of (meals as unknown[][]).flat() as Rec[]) {
          if (!isObj(e)) continue;
          t.kcal += Number(e['kcal']) || 0; t.p += Number(e['p']) || 0; t.fiber += Number(e['fiber']) || 0; t.n++;
        }
        if (t.n) put(out.days, d, { kcal: Math.round(t.kcal), protein: Math.round(t.p), fiber: Math.round(t.fiber) });
      }
    }
    if (isObj(nutri['drinks'])) {
      for (const [d, list] of Object.entries(nutri['drinks'] as Rec)) {
        if (!Array.isArray(list)) continue;
        const ml = (list as Rec[]).reduce((a, x) => a + (Number(x?.['ml']) || 0), 0);
        if (ml) put(out.days, d, { waterL: ml / 1000 });
      }
    }
  }
  return out;
}

/** The day as the rest of the app sees it. */
export const dayView = (s: State, link: Link, date: string): Day => ({ ...link.days[date], ...s.days[date] });

export const PHASE_FROM_NUTRITION: Record<'cut' | 'maintain' | 'reverse', PhaseId> = { cut: 'cut', maintain: 'maintain', reverse: 'reverse' };

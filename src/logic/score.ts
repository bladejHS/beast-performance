/* From raw logs to the numbers on screen: the twelve levers, the state of each hormone, the nine systems, the performance domains.
   A hormone with a recent blood value is read from that value. Otherwise its state is an estimate from habits, and the UI says so. */
import { BENCH, BENCHES, DOMAINS, type Bench, type DomainId } from '../data/performance.ts';
import { HORMONES, type Hormone } from '../data/hormones.ts';
import { SYSTEMS, type LeverId, type SysId } from '../data/systems.ts';
import type { Link } from './bridge.ts';
import { dayView } from './bridge.ts';
import { latest, type Status } from './labs.ts';
import { isHard, waterFor, weekPlan } from './plan.ts';
import { avgEA, avgOf, ffm, readiness, totalSleep } from './recovery.ts';
import type { State } from './store.ts';
import { clamp, diffDays, lastDays, mean, sd } from './util.ts';

export const scoreStatus = (v: number): Status => (v >= 70 ? 'good' : v >= 45 ? 'watch' : 'act');

const ramp = (v: number, lo: number, hi: number) => clamp(((v - lo) / (hi - lo)) * 100, 0, 100);

export function leverScores(s: State, link: Link, date: string): Record<LeverId, number | null> {
  const days = lastDays(date, 7).map((d) => dayView(s, link, d));
  const sleep = days.map(totalSleep).filter((v): v is number => v != null);
  const done = (id: string) => days.filter((d) => d.done?.includes(id)).length;
  const logged = days.filter((d) => d.done?.length).length;
  const share = (ids: string[]) => (logged >= 2 ? (mean(ids.map(done)) / logged) * 100 : null);
  const proteinGoal = link.plan?.p ?? 1.8 * s.profile.weightKg;
  const planned = weekPlan(link).filter((d) => d.some(isHard)).length;
  const avg = (f: (d: (typeof days)[number]) => number | undefined) => {
    const v = days.map(f).filter((x): x is number => x != null);
    return v.length ? mean(v) : null;
  };

  const sleepAvg = sleep.length ? mean(sleep) : null;
  const sleepScore = sleepAvg == null ? null : clamp(ramp(sleepAvg, 5.5, 8) - (sleep.length >= 3 ? Math.max(0, sd(sleep) - 0.75) * 20 : 0), 0, 100);
  const ea = avgEA(s, link, date);
  const hunger = avg((d) => d.hunger), energy = avg((d) => d.energy);
  const energyScore = ea != null ? ramp(ea, 20, 40) : energy != null ? clamp(ramp(energy, 1, 4.5) - (hunger != null ? Math.max(0, hunger - 3) * 15 : 0), 0, 100) : null;
  const protein = avg((d) => d.protein);
  const fiber = avg((d) => d.fiber);
  const steps = avg((d) => d.steps);
  const walks = done('walk');
  const stress = avg((d) => d.stress);
  const water = avg((d) => d.waterL);
  const trainDays = days.filter((d) => (d.trainMin ?? 0) >= 20).length;
  const hasTraining = days.some((d) => d.trainMin != null || d.rpe != null);
  const alcohol = avg((d) => d.alcohol);

  const l = latest(s);
  const micro = ['ferritin', 'vitd', 'b12', 'zn', 'mg', 'tsh'].map((id) => l[id]?.reading.status).filter((x): x is Status => !!x && x !== 'none');
  const score: Record<Status, number> = { good: 100, watch: 60, act: 25, urgent: 0, none: 0 };

  return {
    sleep: sleepScore,
    light: share(['light']),
    energy: energyScore,
    protein: protein != null ? ramp(protein / proteinGoal, 0.6, 1) : share(['meal1', 'meal2', 'meal3']),
    fiber: fiber != null ? ramp(fiber / 30, 0.4, 1) : share(['meal2']),
    fat: share(['meal3']),
    strength: hasTraining ? ramp(trainDays, 1, Math.max(3, planned - 1)) : share(['train']),
    cardio: steps != null ? clamp(ramp(steps, 3000, 9000) * 0.8 + (walks / 7) * 20, 0, 100) : share(['walk']),
    calm: stress != null ? clamp(100 - (stress - 1) * 25 + (done('breath') / 7) * 15, 0, 100) : share(['breath']),
    water: water != null ? ramp(water / waterFor(s.profile), 0.5, 1) : share(['water']),
    micro: micro.length ? mean(micro.map((x) => score[x])) : null,
    clean: alcohol != null ? clamp(100 - alcohol * 12, 0, 100) : null,
  };
}

/** An estimate from habits is never worded like a lab result. */
export const HABIT: Partial<Record<Status, string>> = { good: 'Obiceiuri bune', watch: 'Obiceiuri parțiale', act: 'Obiceiuri slabe' };

export interface HormoneState { h: Hormone; status: Status; score: number | null; source: 'blood' | 'habits' | 'none'; marker?: string; date?: string }

export function hormoneStates(s: State, link: Link, date: string): HormoneState[] {
  const lev = leverScores(s, link, date);
  const l = latest(s);
  return HORMONES.map((h) => {
    const rec = h.markers.map((m) => l[m]).filter((x) => x && x.reading.status !== 'none' && diffDays(x.date, date) <= 365);
    if (rec.length) {
      const order: Status[] = ['urgent', 'act', 'watch', 'good'];
      const worst = rec.sort((a, b) => order.indexOf(a!.reading.status) - order.indexOf(b!.reading.status))[0]!;
      const map: Record<Status, number> = { good: 90, watch: 60, act: 30, urgent: 5, none: 0 };
      return { h, status: worst.reading.status, score: map[worst.reading.status], source: 'blood' as const, marker: worst.id, date: worst.date };
    }
    const scores = h.levers.map((x) => lev[x]).filter((v): v is number => v != null);
    if (!scores.length) return { h, status: 'none' as Status, score: null, source: 'none' as const };
    const score = mean(scores);
    return { h, status: scoreStatus(score), score, source: 'habits' as const };
  });
}

export interface SystemState { id: SysId; n: string; short: string; score: number | null; status: Status; blood: number; known: number; total: number }

export function systemStates(states: HormoneState[]): SystemState[] {
  return SYSTEMS.map((sys) => {
    const list = states.filter((x) => x.h.sys === sys.id);
    const known = list.filter((x) => x.score != null);
    const score = known.length ? Math.round(mean(known.map((x) => x.score!))) : null;
    return { id: sys.id, n: sys.n, short: sys.short, score, status: score == null ? 'none' : scoreStatus(score), blood: list.filter((x) => x.source === 'blood').length, known: known.length, total: list.length };
  });
}

/** Stress and training on one side, sleep and recovery on the other. Negative: load wins. Positive: recovery has room. */
export function balance(s: State, link: Link, date: string): { value: number; drive: number; repair: number } | null {
  const stress = avgOf(s, link, date, 7, (d) => d.stress);
  const sleep = avgOf(s, link, date, 7, totalSleep);
  const load = avgOf(s, link, date, 7, (d) => (d.trainMin ? d.trainMin * (d.rpe ?? 5) : undefined));
  const hits = lastDays(date, 7).map((d) => readiness(s, link, d)?.score).filter((v): v is number => v != null);
  if (sleep == null && stress == null) return null;
  const parts = [stress != null ? ramp(stress, 1, 5) : null, load != null ? ramp(load, 100, 700) : null, s.phase.id === 'cut' ? 65 : s.phase.id === 'bulk' ? 35 : null].filter((v): v is number => v != null);
  const rep = [sleep != null ? ramp(sleep, 5.5, 8.5) : null, hits.length ? mean(hits) : null].filter((v): v is number => v != null);
  const drive = parts.length ? mean(parts) : 50, repair = rep.length ? mean(rep) : 50;
  return { value: Math.round(repair - drive), drive: Math.round(drive), repair: Math.round(repair) };
}

// ---- Performance benchmarks ----

export const LEVELS = ['Sub bază', 'Bază', 'Bun', 'Excelent', 'Elită'] as const;

export function benchTargets(b: Bench, s: State): [number, number, number, number] | null {
  const t = s.profile.sex === 'f' ? b.f : b.m;
  if (!t) return null;
  if (b.id === 'vo2' && s.profile.age > 30) {
    // VO2max falls by about 1% a year after 30; the levels follow it.
    const k = 1 - (s.profile.age - 30) * 0.008;
    return t.map((v) => Math.round(v * k * 10) / 10) as [number, number, number, number];
  }
  return t;
}

/** 25, 50, 75 and 100 at the four levels; straight lines between. */
export function benchScore(b: Bench, s: State, v: number): number {
  const t = benchTargets(b, s);
  if (!t) return 0;
  const pts = t.map((x, i) => [x, (i + 1) * 25] as const);
  const sign = b.better === 'high' ? 1 : -1;
  const x = v * sign;
  const first = pts[0]!, second = pts[1]!, last = pts[3]!;
  if (x <= first[0] * sign) {
    const step = Math.abs(second[0] - first[0]) || 1;
    return clamp(25 - (Math.abs(x - first[0] * sign) / step) * 25, 0, 25);
  }
  if (x >= last[0] * sign) return 100;
  for (let i = 0; i < 3; i++) {
    const a = pts[i]!, c = pts[i + 1]!;
    if (x >= a[0] * sign && x <= c[0] * sign) return a[1] + ((x - a[0] * sign) / ((c[0] - a[0]) * sign)) * 25;
  }
  return 0;
}

export const benchLevel = (score: number) => LEVELS[score >= 100 ? 4 : score >= 75 ? 3 : score >= 50 ? 2 : score >= 25 ? 1 : 0]!;

export function benchValue(s: State, link: Link, date: string, b: Bench): { v: number; date?: string } | null {
  const p = s.profile;
  const test = [...s.tests].filter((t) => t.bench === b.id).sort((a, c) => c.date.localeCompare(a.date))[0];
  switch (b.id) {
    case 'squat': case 'bench': case 'deadlift': {
      if (!test) return null;
      return { v: Math.round((test.v / p.weightKg) * 100) / 100, date: test.date };
    }
    case 'bf': return test ? { v: test.v, date: test.date } : p.bf != null ? { v: p.bf } : null;
    case 'whr': {
      const w = avgOf(s, link, date, 30, (d) => d.waist);
      return w ? { v: Math.round((w / p.heightCm) * 1000) / 1000 } : null;
    }
    case 'ffmi': {
      if (p.bf == null) return null;
      const h = p.heightCm / 100;
      return { v: Math.round((ffm(p) / (h * h)) * 10) / 10 };
    }
    case 'rhr': { const v = avgOf(s, link, date, 14, (d) => d.rhr); return v ? { v: Math.round(v) } : test ? { v: test.v, date: test.date } : null; }
    case 'sleepavg': { const v = avgOf(s, link, date, 14, totalSleep); return v ? { v: Math.round(v * 10) / 10 } : null; }
    case 'energyavg': { const v = avgOf(s, link, date, 14, (d) => d.energy); return v ? { v: Math.round(v * 10) / 10 } : null; }
    case 'readiness': {
      const v = lastDays(date, 14).map((d) => readiness(s, link, d)?.score).filter((x): x is number => x != null);
      return v.length >= 3 ? { v: Math.round(mean(v)) } : null;
    }
    case 'bp': { const v = avgOf(s, link, date, 14, (d) => d.bpS); return v ? { v: Math.round(v) } : null; }
    case 'labs': {
      const list = Object.values(latest(s)).filter((x) => x.reading.status !== 'none');
      return list.length >= 5 ? { v: Math.round((list.filter((x) => x.reading.status === 'good').length / list.length) * 100) } : null;
    }
    default: return test ? { v: test.v, date: test.date } : null;
  }
}

export interface DomainState { id: DomainId; n: string; score: number | null; have: number; total: number; weakest?: string }

export function domainStates(s: State, link: Link, date: string): DomainState[] {
  return DOMAINS.map((d) => {
    const benches = BENCHES.filter((b) => b.domain === d.id);
    const scored = benches.flatMap((b) => {
      const v = benchValue(s, link, date, b);
      return v ? [{ b, score: benchScore(b, s, v.v) }] : [];
    });
    const weakest = [...scored].sort((a, b) => a.score - b.score)[0]?.b.id;
    return { id: d.id, n: d.n, score: scored.length ? Math.round(mean(scored.map((x) => x.score))) : null, have: scored.length, total: benches.length, weakest };
  });
}

/** Where the next block should go: the lowest measured domain, unless the phase already decides. */
export function nextFocus(states: DomainState[]): DomainState | null {
  const known = states.filter((d) => d.score != null);
  return known.length >= 3 ? [...known].sort((a, b) => a.score! - b.score!)[0]! : null;
}

export { BENCH };

/* Readiness, training load and energy availability. All of it is arithmetic on the journal. */
import type { Link } from './bridge.ts';
import { dayView } from './bridge.ts';
import type { Day, Profile, State } from './store.ts';
import { clamp, lastDays, mean, sd } from './util.ts';

export interface Part { k: string; n: string; value: string; score: number }
export type Zone = 'push' | 'hold' | 'back';
export interface Readiness { score: number; zone: Zone; parts: Part[] }

const sleepScore = (h: number) => clamp(h <= 5 ? 10 : h <= 6 ? 10 + (h - 5) * 25 : h <= 7 ? 35 + (h - 6) * 25 : h <= 8 ? 60 + (h - 7) * 30 : 90 + (h - 8) * 20, 0, 100);
const scale = (v: number) => clamp((v - 1) * 25, 0, 100);

const WEIGHT: Record<string, number> = { sleep: 0.3, hrv: 0.3, rhr: 0.15, stress: 0.1, soreness: 0.1, energy: 0.05 };

/** Night workers sleep in pieces, so the nap counts. */
export const totalSleep = (d: Day) => (d.sleepH != null ? d.sleepH + (d.napMin ?? 0) / 60 : undefined);

export function readiness(s: State, link: Link, date: string): Readiness | null {
  const day = dayView(s, link, date);
  const past = lastDays(date, 29).slice(0, -1).map((d) => dayView(s, link, d));
  const parts: Part[] = [];
  const hours = totalSleep(day);
  if (hours != null) parts.push({ k: 'sleep', n: 'Somn', value: `${hours.toFixed(1).replace('.', ',')} h`, score: sleepScore(hours) });
  if (day.hrv) {
    const hist = past.map((d) => d.hrv).filter((v): v is number => !!v).map(Math.log);
    if (hist.length >= 5) {
      const z = (Math.log(day.hrv) - mean(hist)) / (sd(hist) || 0.05);
      parts.push({ k: 'hrv', n: 'HRV față de media ta', value: `${Math.round(day.hrv)} ms`, score: clamp(70 + z * 20, 0, 100) });
    }
  }
  if (day.rhr) {
    const hist = past.map((d) => d.rhr).filter((v): v is number => !!v);
    if (hist.length >= 5) parts.push({ k: 'rhr', n: 'Puls de repaus', value: `${day.rhr} bpm`, score: clamp(75 - (day.rhr - mean(hist)) * 6, 0, 100) });
  }
  if (day.stress != null) parts.push({ k: 'stress', n: 'Stres', value: `${day.stress}/5`, score: 100 - scale(day.stress) });
  if (day.soreness != null) parts.push({ k: 'soreness', n: 'Febră musculară', value: `${day.soreness}/5`, score: 100 - scale(day.soreness) });
  if (day.energy != null) parts.push({ k: 'energy', n: 'Energie', value: `${day.energy}/5`, score: scale(day.energy) });
  if (!parts.length) return null;
  const total = parts.reduce((a, p) => a + (WEIGHT[p.k] ?? 0), 0);
  const score = Math.round(parts.reduce((a, p) => a + p.score * (WEIGHT[p.k] ?? 0), 0) / total);
  return { score, zone: score >= 70 ? 'push' : score >= 45 ? 'hold' : 'back', parts };
}

export const ZONE: Record<Zone, { n: string; glyph: string; line: string }> = {
  push: { n: 'Mergi tare', glyph: '●', line: 'Fă sesiunea grea sau testele de azi.' },
  hold: { n: 'Lucrează controlat', glyph: '▲', line: 'Păstrează kilogramele, scade cu o serie, fără eșec.' },
  back: { n: 'Dă înapoi', glyph: '◆', line: 'Tehnică, zona 2 sau mobilitate. Azi recuperezi.' },
};

/** Session RPE load: minutes × how hard it felt (Foster). */
export const sessionLoad = (d: Day) => (d.trainMin && d.rpe ? d.trainMin * d.rpe : d.trainMin ? d.trainMin * 5 : 0);

export interface Load { week: number; prev: number; change: number | null; monotony: number | null; daily: { date: string; load: number }[] }

export function trainingLoad(s: State, link: Link, date: string): Load {
  const days = lastDays(date, 14).map((d) => ({ date: d, load: sessionLoad(dayView(s, link, d)) }));
  const last = days.slice(7).map((d) => d.load), first = days.slice(0, 7).map((d) => d.load);
  const week = last.reduce((a, b) => a + b, 0), prev = first.reduce((a, b) => a + b, 0);
  const spread = sd(last);
  return { week, prev, change: prev ? (week - prev) / prev : null, monotony: week && spread ? mean(last) / spread : null, daily: days };
}

/** Exercise calories above resting, from duration, effort and body weight. */
export function exerciseKcal(min: number, rpe: number, kg: number): number {
  const met = 2 + 0.7 * rpe;
  return Math.round(((met - 1) * 3.5 * kg * min) / 200);
}

export function ffm(p: Profile): number {
  const bf = p.bf ?? (p.sex === 'm' ? 18 : 27);
  return p.weightKg * (1 - bf / 100);
}

/** kcal per kg of fat-free mass left after exercise. Null without intake data. */
export function energyAvailability(p: Profile, day: Day): number | null {
  if (!day.kcal) return null;
  const ex = day.trainMin ? exerciseKcal(day.trainMin, day.rpe ?? 6, p.weightKg) : 0;
  return (day.kcal - ex) / ffm(p);
}

export function avgEA(s: State, link: Link, date: string, n = 7): number | null {
  const v = lastDays(date, n).map((d) => energyAvailability(s.profile, dayView(s, link, d))).filter((x): x is number => x != null);
  return v.length >= 3 ? mean(v) : null;
}

/** Weekly change in body weight from the two last 7-day averages. Percent of body weight. */
export function weightTrend(s: State, link: Link, date: string): { avg: number; pct: number | null } | null {
  const days = lastDays(date, 14).map((d) => dayView(s, link, d).weight);
  const now = days.slice(7).filter((v): v is number => !!v), before = days.slice(0, 7).filter((v): v is number => !!v);
  if (now.length < 3) return null;
  const avg = mean(now);
  return { avg, pct: before.length >= 3 ? ((avg - mean(before)) / mean(before)) * 100 : null };
}

export function series(s: State, link: Link, date: string, n: number, f: (d: Day) => number | undefined): { date: string; v: number | null }[] {
  return lastDays(date, n).map((d) => ({ date: d, v: f(dayView(s, link, d)) ?? null }));
}

export function avgOf(s: State, link: Link, date: string, n: number, f: (d: Day) => number | undefined): number | null {
  const v = series(s, link, date, n, f).map((x) => x.v).filter((x): x is number => x != null);
  return v.length ? mean(v) : null;
}

/* Turns the profile and the phase into numbers and a day: calories, macros, the timeline, the week. */
import { SESSIONS, WEEKS, type Session } from '../data/performance.ts';
import type { LeverId, PhaseId } from '../data/systems.ts';
import type { Link, PlanSession } from './bridge.ts';
import { ffm } from './recovery.ts';
import type { Profile, State } from './store.ts';
import { clamp, diffDays, fromMin, toMin, weekday } from './util.ts';

/** Mifflin-St Jeor, the same family of estimate used until real data exists. */
export function bmr(p: Profile): number {
  return Math.round(10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === 'm' ? 5 : -161));
}

export const estimatedMaintenance = (p: Profile) => Math.round(bmr(p) * p.activity);

export interface Targets {
  phase: PhaseId; kcal: number; p: number; c: number; f: number; fiber: number; waterL: number; maintenance: number;
  /** Percent of body weight per week. */
  rate: number; source: 'nutrition' | 'calc'; delta: number; week: number; notes: string[];
}

const round5 = (n: number) => Math.round(n / 5) * 5;

export const defaultRate = (id: PhaseId, p: Profile): number => {
  if (id === 'cut') return p.bf != null && p.bf < (p.sex === 'm' ? 12 : 21) ? 0.5 : 0.7;
  if (id === 'bulk') return p.level === 'adv' ? 0.15 : p.level === 'mid' ? 0.25 : 0.4;
  if (id === 'reverse') return 0.25;
  return 0;
};

/** Estimated daily exercise cost, used only for the floor of the cut. */
const dailyExercise = (p: Profile) => (p.trainDays.length * 400) / 7;

export function targets(s: State, link: Link, date: string): Targets {
  const p = s.profile, id = s.phase.id;
  const week = Math.max(1, Math.floor(diffDays(s.phase.start, date) / 7) + 1);
  const maintenance = s.phase.maintenance ?? (link.plan?.maintenance || estimatedMaintenance(p));
  const rate = s.phase.rate ?? defaultRate(id, p);
  const notes: string[] = [];
  const lean = ffm(p);

  // A Beast Nutrition plan in the same phase is the source of truth for the numbers.
  if (link.plan && link.plan.phase === id && link.plan.kcal > 0) {
    const m = link.plan;
    return { phase: id, kcal: m.kcal, p: m.p, c: m.c, f: m.f, fiber: Math.round((m.kcal / 1000) * 14), waterL: waterFor(p), maintenance, rate: m.ratePct || rate, source: 'nutrition', delta: m.kcal - maintenance, week, notes: ['Calorii și macronutrienți din Beast Nutrition.'] };
  }

  let kcal = maintenance, protein: number;
  if (id === 'cut') {
    const deficit = (p.weightKg * (rate / 100) * 7700) / 7;
    const floor = Math.max(maintenance * 0.75, 25 * lean + dailyExercise(p));
    kcal = Math.max(maintenance - deficit, floor);
    if (kcal === floor) notes.push('Deficitul a fost limitat ca să rămâi peste 25 kcal/kg de masă slabă.');
    protein = clamp(2.6 * lean, 1.8 * p.weightKg, 3.1 * lean);
  } else if (id === 'bulk') {
    const surplus = p.level === 'new' ? 0.15 : p.level === 'mid' ? 0.1 : 0.05;
    kcal = maintenance * (1 + surplus);
    protein = 2 * p.weightKg;
  } else if (id === 'reverse') {
    // Starts about 15% under maintenance and adds 100 kcal a week.
    kcal = Math.min(maintenance, maintenance * 0.85 + (week - 1) * 100);
    protein = 2 * p.weightKg;
    if (kcal >= maintenance) notes.push('Ai ajuns la menținere. Treci pe Menținere sau Lean bulk.');
  } else {
    protein = 2 * p.weightKg;
  }

  const fat = Math.max(p.weightKg * (id === 'cut' ? 0.8 : 1), (kcal * 0.22) / 9);
  const carbs = (kcal - protein * 4 - fat * 9) / 4;
  if (id === 'cut' && (protein * 4) / kcal > 0.35 && carbs < 2 * p.weightKg) notes.push('Proteine peste 35% din calorii cu carbohidrați puțini: într-o analiză, acest tipar a scăzut testosteronul. Adaugă carbohidrați dacă poți.');
  return { phase: id, kcal: round5(kcal), p: round5(protein), c: Math.max(0, round5(carbs)), f: round5(fat), fiber: Math.round((kcal / 1000) * 14), waterL: waterFor(p), maintenance, rate, source: 'calc', delta: round5(kcal - maintenance), week, notes };
}

export const waterFor = (p: Profile) => Math.round(p.weightKg * 0.035 * 10) / 10;

export interface Item { id: string; at: string; title: string; why: string; lever: LeverId; hormones: string[] }

/** The training the day holds: the Inner Beast plan when there is one, otherwise the template for the phase. */
export function dayPlan(s: State, link: Link, date: string): { own: Session | null; inner: PlanSession[] } {
  const wd = weekday(date);
  const inner = link.week?.[wd] ?? [];
  return { own: weekSessions(s)[wd] ?? null, inner };
}

/** Monday to Sunday. Sessions go on the training days in the order of the template. */
export function weekSessions(s: State): (Session | null)[] {
  const days = [...s.profile.trainDays].sort((a, b) => a - b).slice(0, 6);
  const n = clamp(days.length, 3, 6);
  const list = WEEKS[s.phase.id][n] ?? [];
  const out: (Session | null)[] = Array(7).fill(null);
  days.forEach((d, i) => { const id = list[i]; if (id) out[d] = SESSIONS[id] ?? null; });
  return out;
}

export function timeline(s: State, link: Link, date: string): Item[] {
  const p = s.profile, id = s.phase.id;
  const wake = toMin(p.wake), bed = toMin(p.bed) < wake ? toMin(p.bed) + 1440 : toMin(p.bed);
  const plan = dayPlan(s, link, date);
  const training = !!plan.own || plan.inner.length > 0;
  const t = toMin(p.trainTime);
  const items: (Omit<Item, 'at'> & { min: number })[] = [];
  const add = (min: number, x: string, title: string, why: string, lever: LeverId, hormones: string[]) => items.push({ id: x, min, title, why, lever, hormones });
  const tg = targets(s, link, date);
  const perMeal = Math.round((tg.p / 4) / 5) * 5;

  add(wake, 'wake', 'Trezire la ora fixă', 'Ora constantă sincronizează ceasul intern. Măsoară pulsul și HRV înainte să te ridici.', 'sleep', ['cortisol', 'melatonin', 'orexin']);
  add(wake + 5, 'water', 'Apă, 400–500 ml', 'Începi hidratat după noapte.', 'water', ['adh']);
  add(wake + 15, 'light', 'Lumină afară, 10–20 de minute', 'Oprește melatonina, ridică cortizolul când trebuie și îți fixează somnul de diseară.', 'light', ['cortisol', 'melatonin']);
  add(wake + 60, 'meal1', `Masa 1: ${perMeal} g proteine, legume sau fructe`, 'Aminoacizii pornesc alerta, iar proteina ține foamea jos.', 'protein', ['orexin', 'ghrelin', 'pyy']);
  add(wake + 75, 'creatine', 'Creatină 3–5 g', 'Forță, putere și recuperare, orice oră e bună.', 'micro', ['testosterone']);
  if (training) {
    add(t - 120, 'premeal', 'Masă înainte de antrenament, cu carbohidrați', 'Sesiunile grele au nevoie de glicogen.', 'energy', ['insulin', 'cortisol']);
    add(t - 45, 'caffeine', toMin(p.bed) - t < 540 && toMin(p.bed) - t > 0 ? 'Fără cafeină azi la sală' : 'Cafeină, maximum 200 mg, dacă sesiunea e importantă', 'Îmbunătățește forța și atenția. Seara strică somnul.', 'clean', ['adrenaline', 'noradrenaline']);
    add(t, 'train', plan.inner.length ? `Antrenament: ${plan.inner.map((x) => x.name).join(', ')}` : `Antrenament: ${plan.own?.n ?? ''}`, plan.own?.line ?? 'Sesiunea din planul tău.', 'strength', ['testosterone', 'gh', 'adrenaline', 'insulin']);
    add(t + (plan.own?.min ?? 70) + 30, 'postmeal', `După antrenament: ${perMeal} g proteine și carbohidrați`, 'Refaci glicogenul, pornești repararea.', 'protein', ['insulin', 'igf1', 'cortisol']);
  } else {
    add(wake + 240, 'recovery', 'Zi fără sesiune: plimbare și mobilitate, 30 de minute', 'Recuperarea activă îți crește pașii fără să adauge oboseală.', 'cardio', ['cortisol', 'insulin']);
  }
  add(wake + 300, 'meal2', `Masa 2: ${perMeal} g proteine, legume întâi, carbohidrații la final`, 'Ordinea alimentelor scade vârful de glicemie. Mănâncă în 20–30 de minute.', 'fiber', ['insulin', 'glp1', 'pyy']);
  add(wake + 335, 'walk', 'Mers 10 minute după masă', 'Cel mai ieftin mod de a controla glicemia.', 'cardio', ['insulin']);
  add(wake + 450, 'breath', 'Respirație 5 minute, expirație lungă', 'Coboară cortizolul și adrenalina de peste zi.', 'calm', ['cortisol', 'adrenaline']);
  add(Math.max(wake + 540, bed - 240), 'meal3', `Cină: ${perMeal} g proteine, legume, grăsimi bune`, 'Ultima masă mare, cu cel puțin 2–3 ore înainte de somn.', 'fat', ['leptin', 'adiponectin']);
  if (id === 'bulk' || id === 'cut') add(bed - 60, 'casein', id === 'bulk' ? 'Înainte de somn: 30–40 g cazeină sau brânză de vaci' : 'Dacă ești flămând: 20–30 g proteine lente', 'Proteina de seară susține repararea din timpul nopții.', 'protein', ['igf1']);
  add(bed - 70, 'dark', 'Lumină slabă, ecrane jos', 'Melatonina pornește doar când scade lumina.', 'light', ['melatonin']);
  add(bed - 15, 'cool', 'Cameră răcoroasă, 17–19 °C, telefon departe', 'Corpul trebuie să se răcească pentru somn profund.', 'sleep', ['melatonin', 'gh']);
  add(bed, 'sleep', 'Somn', id === 'cut' ? 'În deficit, ținta e 8–9 ore: somnul decide dacă pierzi grăsime sau mușchi.' : 'Somnul profund aduce pulsul mare de hormon de creștere.', 'sleep', ['gh', 'testosterone', 'leptin']);

  const seen = new Set<string>();
  return items.filter((x) => (seen.has(x.id) ? false : seen.add(x.id))).sort((a, b) => a.min - b.min).map(({ min, ...x }) => ({ ...x, at: fromMin(min) }));
}

/** Caffeine stops nine hours before bed. */
export const caffeineCutoff = (p: Profile) => fromMin(toMin(p.bed) - 540);

export const hoursInBed = (p: Profile) => ((toMin(p.wake) - toMin(p.bed) + 1440) % 1440) / 60;

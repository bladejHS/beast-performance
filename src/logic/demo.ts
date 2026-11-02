/* Sample data, loaded only on request from Settings, so every screen can be seen before there is anything to show. Clearly marked in the UI. */
import type { Day, Panel, State, TestResult } from './store.ts';
import { addDays, uid } from './util.ts';

/** Repeatable noise. */
function rng(seed: number) {
  let x = seed;
  return () => { x = (x * 1664525 + 1013904223) % 4294967296; return x / 4294967296; };
}

export function demoDays(today: string): Record<string, Day> {
  const r = rng(44), days: Record<string, Day> = {};
  let kg = 83.4;
  for (let i = 56; i >= 0; i--) {
    const date = addDays(today, -i);
    const hard = [0, 1, 3, 4].includes((new Date(`${date}T12:00:00`).getDay() + 6) % 7);
    const tired = i % 19 < 4;
    kg -= 0.05 + (r() - 0.5) * 0.12;
    const sleepH = Math.round((tired ? 6.1 : 7.5) * 10 + (r() - 0.5) * 12) / 10;
    days[date] = {
      sleepH, sleepQ: tired ? 3 : 4, stress: Math.round((tired ? 3.6 : 2.2) + r() * 1.2), energy: Math.round((tired ? 2.5 : 3.6) + r() * 1.2), hunger: Math.round(2.6 + r() * 1.5), soreness: Math.round(1.6 + r() * 2), libido: Math.round((tired ? 2.4 : 3.3) + r()), mood: Math.round(3 + r() * 1.4), morning: !tired,
      rhr: Math.round((tired ? 58 : 54) + r() * 3), hrv: Math.round((tired ? 55 : 72) + r() * 10),
      weight: Math.round(kg * 10) / 10, ...(i % 7 === 0 ? { waist: Math.round((86 - (56 - i) * 0.04) * 10) / 10 } : {}),
      ...(i % 3 === 0 ? { bpS: Math.round(118 + r() * 7), bpD: Math.round(74 + r() * 5) } : {}),
      steps: Math.round(7000 + r() * 5000), waterL: Math.round((2.4 + r() * 1.2) * 10) / 10, alcohol: i % 9 === 0 ? 2 : 0,
      kcal: Math.round(2350 + (r() - 0.5) * 280), protein: Math.round(170 + r() * 25), fiber: Math.round(24 + r() * 10),
      ...(hard ? { trainMin: 65 + Math.round(r() * 20), rpe: 7 + Math.round(r() * 2) } : {}),
      done: ['wake', 'light', 'meal1', 'meal2', 'walk', ...(r() > 0.35 ? ['breath'] : []), ...(hard ? ['train'] : [])],
      ...(tired && i % 2 === 0 ? { sym: { fatigue: 2, hunger: 1 } } : {}),
    };
  }
  return days;
}

const v = (x: number, unit: string) => ({ v: x, unit });

export function demoPanels(today: string): Panel[] {
  return [
    { id: uid(), date: addDays(today, -120), lab: 'Exemplu', fasted: true, values: { tt: v(612, 'ng/dL'), shbg: v(34, 'nmol/L'), tsh: v(1.6, 'mIU/L'), ft3: v(3.4, 'pg/mL'), glu: v(88, 'mg/dL'), ins: v(6.1, 'µIU/mL'), a1c: v(5.2, '%'), vitd: v(24, 'ng/mL'), ferritin: v(88, 'ng/mL'), hb: v(15.4, 'g/dL'), crp: v(0.8, 'mg/L'), apob: v(84, 'mg/dL') } },
    { id: uid(), date: addDays(today, -6), lab: 'Exemplu', fasted: true, values: { tt: v(438, 'ng/dL'), ft: v(8.4, 'ng/dL'), shbg: v(41, 'nmol/L'), e2: v(21, 'pg/mL'), lh: v(3.8, 'IU/L'), fsh: v(4.2, 'IU/L'), prl: v(11, 'ng/mL'), cort: v(17.5, 'µg/dL'), igf1: v(168, 'ng/mL'), tsh: v(2.1, 'mIU/L'), ft4: v(1.2, 'ng/dL'), ft3: v(2.6, 'pg/mL'), glu: v(84, 'mg/dL'), ins: v(4.6, 'µIU/mL'), a1c: v(5.1, '%'), apob: v(92, 'mg/dL'), ldl: v(108, 'mg/dL'), hdl: v(56, 'mg/dL'), tg: v(74, 'mg/dL'), crp: v(0.6, 'mg/L'), hb: v(15, 'g/dL'), hct: v(45, '%'), ferritin: v(41, 'ng/mL'), vitd: v(33, 'ng/mL'), b12: v(510, 'pg/mL'), mg: v(2, 'mg/dL'), alt: v(52, 'U/L'), ast: v(44, 'U/L'), ggt: v(19, 'U/L'), ck: v(640, 'U/L'), creat: v(1.32, 'mg/dL') } },
  ];
}

export function demoTests(today: string): TestResult[] {
  const t = (bench: string, x: number, ago = 14): TestResult => ({ id: uid(), date: addDays(today, -ago), bench, v: x });
  return [t('bf', 15), t('squat', 135), t('bench', 95), t('deadlift', 165), t('pullups', 12), t('grip', 56), t('vo2', 47), t('run5k', 24.3), t('sprint30', 4.7), t('cmj', 42), t('broad', 240), t('toe', 3)];
}

export function withDemo(s: State, today: string): State {
  return { ...s, demo: true, days: { ...demoDays(today), ...s.days }, panels: [...s.panels, ...demoPanels(today)], tests: [...s.tests, ...demoTests(today)], profile: { ...s.profile, bf: s.profile.bf ?? 15 } };
}

/** Removes only what the sample added: panels marked Exemplu and the journal, which is restored from nothing. */
export function withoutDemo(s: State): State {
  return { ...s, demo: false, days: {}, panels: s.panels.filter((p) => p.lab !== 'Exemplu'), tests: [] };
}

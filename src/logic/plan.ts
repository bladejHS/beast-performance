/* The day around the shift. Food plans live in Beast Nutrition and training plans in Inner Beast; this file only decides WHEN:
   when to sleep, when to get light, when to stop caffeine, when the Inner Beast session fits, when meals should fall.
   A cycle runs from waking to the next sleep, so a night shift stays one piece across midnight. */
import { FALLBACK_WEEK } from '../data/innerbeast.ts';
import { ROTATIONS, SHIFT, type ShiftId } from '../data/shifts.ts';
import type { LeverId } from '../data/systems.ts';
import type { Link, PlanSession } from './bridge.ts';
import type { Profile, Roster, State } from './store.ts';
import { addDays, clamp, dayKey, diffDays, fromMin, weekday } from './util.ts';

export const phaseWeek = (s: State, date: string) => Math.max(1, Math.floor(diffDays(s.phase.start, date) / 7) + 1);

export const waterFor = (p: Profile) => Math.round(p.weightKg * 0.035 * 10) / 10;

// ---- Roster ----

export function shiftOn(r: Roster, date: string): ShiftId {
  const o = r.overrides[date];
  if (o) return o;
  if (!r.pattern.length) return 'L';
  const n = r.pattern.length;
  return r.pattern[((diffDays(r.start, date) % n) + n) % n] ?? 'L';
}

export interface Anchor { label: string; index: number }

/** The choices for "where in the rotation are you today". */
export function anchorOptions(rotationId: string, today: string): Anchor[] {
  const rot = ROTATIONS.find((x) => x.id === rotationId);
  if (!rot?.pattern.length) return [];
  if (rot.weekly) {
    const wd = weekday(today), seen = new Set<ShiftId>(), out: Anchor[] = [];
    for (let w = 0; w * 7 < rot.pattern.length; w++) {
      const sh = rot.pattern[w * 7]!;
      if (!seen.has(sh)) { seen.add(sh); out.push({ label: SHIFT[sh].n, index: w * 7 + wd }); }
    }
    return out;
  }
  const count: Record<string, number> = {};
  return rot.pattern.map((sh, index) => {
    count[sh] = (count[sh] ?? 0) + 1;
    return { label: `${SHIFT[sh].n}, ziua ${count[sh]}`, index };
  });
}

export function setRotation(r: Roster, rotationId: string, index: number, today: string): Roster {
  const rot = ROTATIONS.find((x) => x.id === rotationId);
  return { ...r, rotation: rotationId, pattern: rot?.pattern ?? [], start: addDays(today, -index), set: true };
}

// ---- The cycle ----

export interface Frame {
  date: string; shift: ShiftId; prev: ShiftId; next: ShiftId;
  /** Minutes from this date's midnight; `bed` can run past 1440. */
  wake: number; bed: number;
  /** Sleep just before this cycle, minutes. */
  sleepMin: number;
  /** Hours since the previous shift ended, when both days have a shift. */
  gap: number | null;
  quick: boolean; conflict: boolean;
  /** Which night in a row this is, 0 when not a night. */
  nightN: number;
  nap: { at: number; min: number } | null;
  trainAt: number; cafStop: number; meals: number[];
}

const READY = 40;
const needMin = (p: Profile) => p.sleepNeed * 60;
/** Sleep starts this long after midnight on the morning after a night shift. */
const afterNight = (p: Profile) => 360 + p.commuteMin + 30;

function wakeOf(r: Roster, p: Profile, date: string): number {
  const sh = shiftOn(r, date), prev = shiftOn(r, addDays(date, -1));
  const leave = (start: number) => start - p.commuteMin - READY;
  if (prev === '3') {
    const nb = afterNight(p);
    if (sh === '3') return Math.min(nb + needMin(p), 900);
    if (sh === '2') return Math.min(nb + needMin(p), leave(840));
    if (sh === '1') return leave(360);
    return nb + 270; // Short recovery sleep, so tonight's sleep comes at night.
  }
  if (sh === '1') return leave(360);
  if (sh === '3') return 510;
  if (sh === 'L' && prev === '2') return 480;
  return 450;
}

function bedOf(r: Roster, p: Profile, date: string): number {
  const sh = shiftOn(r, date), next = shiftOn(r, addDays(date, 1));
  if (sh === '3') return 1440 + afterNight(p);
  const ideal = 1440 + wakeOf(r, p, addDays(date, 1)) - needMin(p) - 15;
  if (sh === '2') return Math.max(1320 + p.commuteMin + 60, Math.min(ideal, 1470));
  if (next === '3') return 1470; // Staying up a little makes the first night easier.
  return clamp(ideal, 1230, sh === '1' ? 1380 : 1410);
}

export function frame(s: State, date: string): Frame {
  const r = s.roster, p = s.profile;
  const shift = shiftOn(r, date), prev = shiftOn(r, addDays(date, -1)), next = shiftOn(r, addDays(date, 1));
  const wake = wakeOf(r, p, date), bed = bedOf(r, p, date);
  const sleepMin = wake + 1440 - bedOf(r, p, addDays(date, -1));
  const prevEnd = SHIFT[prev].end, start = SHIFT[shift].start;
  const gap = prevEnd != null && start != null ? (start + 1440 - prevEnd) / 60 : null;
  let nightN = 0;
  if (shift === '3') { nightN = 1; for (let i = 1; i < 14 && shiftOn(r, addDays(date, -i)) === '3'; i++) nightN++; }

  let nap: Frame['nap'] = null, trainAt = 600, meals: number[];
  if (shift === '1') {
    trainAt = 990;
    meals = [wake + 25, 570, 840 + s.profile.commuteMin + 15, 1110];
    if (sleepMin < 420) nap = { at: 915, min: 20 };
  } else if (shift === '2') {
    trainAt = wake + 120;
    meals = [wake + 45, 750, 1080];
  } else if (shift === '3') {
    if (prev === '3') { trainAt = wake + 120; nap = { at: 1140, min: 90 }; meals = [wake + 20, 1095, 1250]; }
    else { trainAt = 660; nap = { at: 900, min: 150 }; meals = [wake + 30, 780, 1095, 1250]; }
  } else {
    trainAt = prev === '3' ? wake + 180 : 600;
    meals = prev === '3' ? [wake + 25, 960, 1140] : [wake + 45, 780, 1140];
  }
  // Night shift: nine hours is out of reach, six is the tested minimum and the job needs the alertness.
  const cafStop = shift === '3' ? bed - 360 : bed - 540;
  return { date, shift, prev, next, wake, bed, sleepMin, gap, quick: gap != null && gap < 11, conflict: gap != null && gap <= 0, nightN, nap, trainAt, cafStop, meals };
}

/** The cycle running now: during a night shift this is still yesterday's date. */
export function activeDate(s: State, now: Date = new Date()): string {
  const today = dayKey(now), mins = now.getHours() * 60 + now.getMinutes();
  const prev = addDays(today, -1);
  return mins < frame(s, prev).bed - 1440 ? prev : today;
}

/** The week of Inner Beast: what it published here, or the copy of its plan. */
export const weekPlan = (link: Link): PlanSession[][] => link.week ?? FALLBACK_WEEK;
export const sessionsOn = (link: Link, date: string): PlanSession[] => weekPlan(link)[weekday(date)] ?? [];

const HARD = new Set(['amrap', 'workout', 'run', 'row', 'race', 'coach']);
const EASY_FOCUS = new Set(['slow', 'distance']);
export const isHard = (x: PlanSession) => HARD.has(x.kind) || (x.kind === 'rounds' && !EASY_FOCUS.has(x.focus ?? ''));
export const isTraining = (x: PlanSession) => isHard(x) || x.kind === 'rounds';

export interface Item { id: string; min: number; at: string; title: string; why: string; lever: LeverId; hormones: string[]; tomorrow: boolean }

export function timeline(s: State, link: Link, date: string): Item[] {
  const f = frame(s, date), n = f.shift, sh = SHIFT[n];
  const sessions = sessionsOn(link, date);
  const hard = sessions.filter(isHard), any = sessions.filter(isTraining);
  const items: Item[] = [];
  const add = (min: number, id: string, title: string, why: string, lever: LeverId, hormones: string[]) => items.push({ id, min, at: fromMin(min), title, why, lever, hormones, tomorrow: min >= 1440 });

  const slept = f.sleepMin / 60;
  add(f.wake, 'wake', 'Trezire', n === '1' ? 'Prima oră e grea: corpul crede că e încă noapte. Somnul de aseară decide cum merge ziua.' : f.prev === '3' ? 'Ora fixă de trezire ține ritmul stabil, chiar și după un somn de zi.' : 'Măsoară pulsul și HRV înainte să te ridici.', 'sleep', ['cortisol', 'melatonin', 'orexin']);
  add(f.wake + 5, 'water', 'Apă, 400–500 ml', 'Începi hidratat după somn.', 'water', ['adh']);

  if (n === '1') add(f.wake + 10, 'light', 'Lumină puternică imediat: toate becurile, apoi afară', 'Oprește melatonina și te trezește mai repede.', 'light', ['melatonin', 'cortisol']);
  else if (n === '3' && f.prev === '3') add(f.wake + 20, 'light', 'Afară la lumină, 20–30 de minute', 'Ține ceasul într-o poziție de compromis: nici zi, nici noapte completă.', 'light', ['melatonin', 'cortisol']);
  else if (n === '3') add(f.wake + 30, 'light', 'Dimineață liniștită, lumină normală', 'Prima noapte vine după o zi lungă. Păstrează energia.', 'light', ['melatonin']);
  else if (f.prev === '3') add(f.wake + 15, 'light', 'Afară cât mai mult azi', 'Lumina de zi te readuce pe programul de zi.', 'light', ['melatonin', 'cortisol']);
  else add(f.wake + 30, 'light', 'Lumină afară, 15–20 de minute', 'Fixează ceasul intern și somnul de diseară.', 'light', ['melatonin', 'cortisol']);

  f.meals.forEach((m, i) => {
    const main = (n === '1' && i === 2) || (n === '2' && i === 1) || (n === '3' && i === f.meals.length - 1) || (n === 'L' && i === 1);
    add(m, `meal${i + 1}`, main ? (n === '3' ? 'Masa principală, înainte de schimb' : 'Masa principală') : 'Masă', 'Cantitățile sunt în Beast Nutrition. Aici contează doar ora: legumele și proteinele întâi, carbohidrații la final.', 'protein', ['insulin', 'ghrelin', 'glp1']);
    if (main && !(n === '3')) add(m + 30, 'walk', 'Mers 10 minute după masă', 'Cel mai ieftin mod de a controla glicemia.', 'cardio', ['insulin']);
  });
  add(f.meals[0]! + 10, 'creatine', 'Creatină, dacă o iei', 'Merge la orice oră. Important e să nu sari peste.', 'micro', ['testosterone']);

  if (f.nap) add(f.nap.at, 'nap', f.nap.min >= 90 ? `Somn înainte de schimb, ${f.nap.min} de minute` : `Somn scurt, ${f.nap.min} de minute`, f.nap.min >= 90 ? 'Combinat cu cafeina de la începutul schimbului, dă cea mai bună alertă pe noapte.' : 'Ai dormit puțin azi-noapte. Nu trece de 30 de minute, ca să nu strici somnul de diseară.', 'sleep', ['cortisol', 'orexin']);

  if (any.length) {
    const short = f.sleepMin < 360;
    add(f.trainAt, 'train', `Antrenament: ${any.map((x) => x.name).join(', ')}`, hard.length && short ? `Ai dormit ${slept.toFixed(1).replace('.', ',')} ore. Păstrează tehnica și taie din volum.` : n === '2' ? 'Cea mai bună fereastră din rotație: ești odihnit și ai energie.' : n === '3' ? 'După somn. Termină cu minimum 3 ore înainte de schimb, ca să mai poți dormi.' : 'Planul e în Inner Beast. Aici e doar ora potrivită pentru schimbul tău.', 'strength', ['testosterone', 'gh', 'adrenaline', 'insulin']);
  } else if (sessions.length) {
    add(f.trainAt, 'train', `Recuperare: ${sessions.map((x) => x.name).join(', ')}`, n === '3' || f.prev === '3' ? 'Apa rece și respirația te trezesc: fă-le după somn, nu înainte.' : 'Din planul Inner Beast.', 'calm', ['cortisol', 'noradrenaline']);
  }

  const breathAt = n === '1' ? 1170 : n === '2' ? 780 : n === '3' ? 1270 : 1020;
  add(breathAt, 'breath', 'Respirație 5 minute, expirație lungă', 'Coboară cortizolul și adrenalina de peste zi.', 'calm', ['cortisol', 'adrenaline']);

  if (sh.start != null && sh.end != null) {
    add(sh.start, 'work', `Începe ${sh.n}`, n === '1' ? 'Dacă simți că moțăi, mișcă-te și stai la lumină.' : 'Ai grijă la hidratare pe tură.', 'water', []);
    if (n === '3') {
      add(sh.start + 15, 'caffeine', 'Cafeină, maximum 200 mg', 'Scade erorile pe tură. E primul lucru care te ține treaz după somnul de seară.', 'clean', ['adrenaline', 'noradrenaline']);
      add(sh.start + 30, 'nightlight', 'Lumină cât mai puternică în prima parte a nopții', 'Scade somnolența și ajută ceasul să se mute.', 'light', ['melatonin', 'cortisol']);
      add(sh.start + 240, 'snack', 'Noaptea: doar o gustare mică', 'Mesele mari noaptea strică toleranța la glucoză.', 'fiber', ['insulin', 'glp1']);
      add(sh.start + 360, 'dimlight', 'Lumină mai slabă spre final', 'Corpul trebuie să fie pregătit de somn când ajungi acasă.', 'light', ['melatonin']);
    }
    add(sh.end, 'workend', `Se termină ${sh.n}`, n === '3' ? 'Dacă ești somnolent, nu conduce: după noapte, riscul de aproape-accident e mare, mai ales după 45 de minute la volan.' : n === '1' ? 'Mănâncă înainte să te culci, dacă ai nevoie de un somn scurt.' : 'Ține lumina jos de acum, ca să poți adormi.', 'sleep', ['melatonin']);
    if (n === '3') add(sh.end + 5, 'shades', 'Ochelari de soare închiși pe drum', 'Lumina dimineții ar anula somnul de după.', 'light', ['melatonin']);
  }
  add(f.cafStop, 'cafstop', 'Ultima cafea', n === '3' ? 'Mai târziu de atât, cafeina îți strică somnul de zi.' : 'Mai târziu, cafeina îți scurtează somnul profund.', 'clean', ['melatonin', 'gh']);

  if (n === '3') add(f.bed - 15, 'dark', 'Cameră întunecată și răcoroasă, telefon pe silențios', 'Somnul de zi are nevoie de noapte artificială: draperii opace sau mască, 17–19 °C, liniște.', 'light', ['melatonin', 'gh']);
  else {
    add(f.bed - 45, 'dark', 'Lumină slabă, ecrane jos', 'Melatonina pornește doar când scade lumina.', 'light', ['melatonin']);
    add(f.bed - 10, 'cool', 'Cameră răcoroasă, 17–19 °C', 'Corpul trebuie să se răcească pentru somn profund.', 'sleep', ['melatonin', 'gh']);
  }
  const nextWake = wakeOf(s.roster, s.profile, addDays(date, 1)) + 1440 - f.bed;
  add(f.bed, 'sleep', `Somn, până la ${fromMin(f.bed + nextWake)}`, n === '3' ? 'Protejează-l ca pe un antrenament: somnul e cel care ridică testosteronul, indiferent de oră.' : 'Somnul profund aduce pulsul mare de hormon de creștere.', 'sleep', ['gh', 'testosterone', 'leptin']);

  const seen = new Set<string>();
  return items.filter((x) => (seen.has(x.id) ? false : seen.add(x.id))).sort((a, b) => a.min - b.min);
}

export interface Note { title: string; body: string; level: 'watch' | 'act' }

/** What the change of shift around this date asks for. */
export function transition(f: Frame): Note | null {
  if (f.conflict) return { level: 'act', title: 'Program imposibil', body: 'Schimbul de azi începe când se termină cel de ieri. Verifică orarul.' };
  if (f.quick) return { level: 'act', title: `Doar ${f.gap} ore între schimburi`, body: f.prev === '2' ? 'De la S2 la S1 pierzi somn cu adevărat. Culcă-te imediat ce ajungi, fără ecrane, și fă un somn scurt după schimb.' : 'Dormi direct după schimb cât poți, cu un somn scurt înainte să pleci.' };
  if (f.shift !== '3' && f.next === '3') return { level: 'watch', title: 'Mâine începe noaptea', body: 'Stai treaz ceva mai târziu diseară și dormi cât poți mâine dimineață. Mâine după-amiază, somn de 2,5 ore.' };
  if (f.shift === '3' && f.nightN === 1) return { level: 'watch', title: 'Prima noapte', body: 'E cea mai grea. Fă somnul de după-amiază, cafeină la început de schimb, atenție mare la drumul spre casă.' };
  if (f.shift === '3' && f.next !== '3') return { level: 'watch', title: 'Ultima noapte', body: 'Mâine dormi doar 4–5 ore dimineața, apoi te trezești. Așa adormi la ora normală seara.' };
  if (f.shift === '3' && f.nightN >= 4) return { level: 'watch', title: `Noaptea ${f.nightN} la rând`, body: 'Cercetătorii recomandă maximum 3. Oboseala se adună: atenție la condus și la sesiunile grele.' };
  if (f.prev === '3' && f.shift === 'L') return { level: 'watch', title: 'Zi de revenire', body: 'Te trezești azi devreme față de cât ai vrea, ca să poți dormi noaptea. Fără sesiuni grele.' };
  return null;
}

/** Early types pay on nights, late types on the first shift. */
export function chronoNote(f: Frame, p: Profile): string {
  if (p.chronotype === 'early' && f.shift === '3') return 'Ești matinal: noaptea e mai grea pentru tine, deci somnul de dinainte contează dublu.';
  if (p.chronotype === 'late' && f.shift === '1') return 'Ești nocturn: S1 e cel mai greu pentru tine. Începe să te culci mai devreme cu 2 zile înainte.';
  return '';
}

/** Next day good for a blood draw: morning free, slept at night, at least three days away from night shifts, not Sunday. */
export function bestBloodDay(s: State, today: string): string | null {
  for (let i = 1; i <= 35; i++) {
    const date = addDays(today, i), sh = shiftOn(s.roster, date);
    const clear = [1, 2, 3].every((k) => shiftOn(s.roster, addDays(date, -k)) !== '3');
    if (sh !== '1' && sh !== '3' && clear && weekday(date) !== 6) return date;
  }
  return null;
}

/** A sample taken within three days of a night shift says little about cortisol and testosterone. */
export const afterNights = (s: State, date: string) => [0, 1, 2, 3].some((k) => shiftOn(s.roster, addDays(date, -k)) === '3');

/* The local intelligence: rules written from the protocols, run on the user's own data. No network.
   Each finding says what was seen, why it matters and what to do; it never claims a diagnosis. */
import { PHASE } from '../data/phases.ts';
import { SYMPTOM } from '../data/symptoms.ts';
import { BIOMARKER } from '../data/biomarkers.ts';
import type { Link } from './bridge.ts';
import { dayView } from './bridge.ts';
import { latest, patterns } from './labs.ts';
import { caffeineCutoff } from './plan.ts';
import { avgEA, avgOf, readiness, trainingLoad, weightTrend } from './recovery.ts';
import type { State } from './store.ts';
import { diffDays, fmt, lastDays, mean, pearson, sd, toMin } from './util.ts';

export type Level = 'urgent' | 'act' | 'watch' | 'good';
export interface Finding { id: string; level: Level; title: string; seen: string; why: string; do: string[]; hormones?: string[]; link?: string }

const ORDER: Level[] = ['urgent', 'act', 'watch', 'good'];

export function findings(s: State, link: Link, date: string): Finding[] {
  const out: Finding[] = [];
  const p = s.profile, id = s.phase.id;
  const sleep = avgOf(s, link, date, 7, (d) => d.sleepH);
  const sleepVals = lastDays(date, 7).map((d) => dayView(s, link, d).sleepH).filter((v): v is number => v != null);
  const stress = avgOf(s, link, date, 7, (d) => d.stress);
  const ea = avgEA(s, link, date);
  const trend = weightTrend(s, link, date);
  const weekInPhase = Math.floor(diffDays(s.phase.start, date) / 7) + 1;
  const libido = avgOf(s, link, date, 14, (d) => d.libido);
  const energy = avgOf(s, link, date, 7, (d) => d.energy);
  const alcohol = lastDays(date, 7).reduce((a, d) => a + (dayView(s, link, d).alcohol ?? 0), 0);

  // Blood first: nothing else matters more.
  const l = latest(s);
  for (const x of Object.values(l)) {
    const b = BIOMARKER[x.id]!;
    if (x.reading.status === 'urgent') out.push({ id: `urgent-${x.id}`, level: 'urgent', title: `${b.n}: valoare critică`, seen: `Rezultat din ${x.date}.`, why: 'Valoarea e în afara limitelor de siguranță.', do: [(x.reading.side === 'low' ? b.low : b.high)?.doc ?? 'Contactează medicul astăzi.'], link: `#/analize/${x.id}` });
  }
  const pats = patterns(s);
  for (const pt of pats) out.push({ id: `pattern-${pt.id}`, level: pt.level, title: pt.title, seen: 'Din ultimele analize.', why: pt.body, do: [], link: '#/analize' });
  // A pattern already explains these markers, so they are not listed again one by one.
  const explained = new Set(pats.flatMap((p) => (p.id === 'muscleliver' ? ['alt', 'ast', 'ck'] : p.id === 'cystatin' ? ['creat'] : p.id === 'central' || p.id === 'primary' ? ['tt', 'lh'] : p.id === 'iron' ? ['ferritin'] : p.id === 'hct' ? ['hct'] : p.id === 'atherogenic' ? ['apob', 'ldl', 'tg'] : [])));
  const acts = Object.values(l).filter((x) => x.reading.status === 'act' && !explained.has(x.id)).slice(0, 6);
  for (const x of acts) {
    const b = BIOMARKER[x.id]!, fix = x.reading.side === 'low' ? b.low : b.high;
    if (!fix) continue;
    out.push({ id: `lab-${x.id}`, level: 'act', title: `${b.n} ${x.reading.side === 'low' ? 'scăzut' : 'crescut'}`, seen: `${String(x.value).replace('.', ',')} ${x.unit}, din ${x.date}.`, why: `Cauze frecvente: ${fix.why.slice(0, 3).join(', ').toLowerCase()}.`, do: fix.do.slice(0, 3), link: `#/analize/${x.id}` });
  }

  // Sleep is the strongest lever.
  if (sleep != null && sleepVals.length >= 3) {
    if (sleep < 7) out.push({ id: 'sleep', level: sleep < 6 ? 'act' : 'watch', title: 'Somnul e frâna numărul 1', seen: `Media ultimelor zile: ${fmt(sleep, 1)} ore.`, why: 'Afectează testosteronul, foamea, insulina și masa musculară în același timp.', do: ['Mută culcarea cu 30 de minute mai devreme, 7 zile la rând.', 'Lumină slabă cu o oră înainte.', `Cafeina stop la ${caffeineCutoff(p)}.`], hormones: ['testosterone', 'gh', 'cortisol', 'ghrelin'], link: '#/recuperare' });
    if (sd(sleepVals) > 1.25) out.push({ id: 'regular', level: 'watch', title: 'Somn neregulat', seen: `Variază cu ${fmt(sd(sleepVals), 1)} ore de la o noapte la alta.`, why: 'Regularitatea contează uneori mai mult decât durata.', do: ['Aceeași oră de trezire și în weekend.'], hormones: ['melatonin', 'cortisol'] });
  }

  // Energy.
  if (id === 'cut') {
    if (ea != null && ea < 25) out.push({ id: 'ea', level: 'act', title: 'Mănânci prea puțin pentru cât te antrenezi', seen: `Disponibilitate energetică: ${fmt(ea, 0)} kcal/kg de masă slabă.`, why: 'Sub 25 crește pierderea de mușchi. Sub 20, culturiștii naturali au pierdut peste 40% din greutate ca masă slabă.', do: ['Adaugă 150–250 kcal din carbohidrați.', 'Taie din cardio înainte să tai din mâncare.'], hormones: ['leptin', 't3', 'testosterone'], link: '#/protocol' });
    if (trend?.pct != null && trend.pct < -1) out.push({ id: 'fast', level: 'watch', title: 'Slăbești prea repede', seen: `${fmt(trend.pct, 2)}% pe săptămână.`, why: 'Peste 1% pe săptămână crește riscul de a pierde mușchi și forță.', do: ['Adaugă 100–200 kcal.'], hormones: ['testosterone', 'leptin'] });
    if (trend?.pct != null && trend.pct > -0.15 && weekInPhase >= 3) out.push({ id: 'stall', level: 'watch', title: 'Greutatea stă pe loc', seen: `Schimbare de ${fmt(trend.pct, 2)}% față de săptămâna trecută.`, why: 'O singură săptămână poate fi apă. Dacă se repetă 2 săptămâni, ajustează.', do: ['Verifică porțiile și pașii.', 'Scade 5% din calorii doar după 2 săptămâni fără schimbare.'], hormones: ['t3', 'leptin'] });
    if (weekInPhase >= 16) out.push({ id: 'longcut', level: 'act', title: `Săptămâna ${weekInPhase} de cut`, seen: 'Depășește blocul recomandat.', why: PHASE.cut.hormones, do: ['Treci pe reverse sau fă 2 săptămâni la menținere.'], link: '#/protocol' });
    else if (weekInPhase >= 8 && weekInPhase % 8 === 0) out.push({ id: 'break', level: 'watch', title: 'E momentul unei pauze de dietă', seen: `Ești în săptămâna ${weekInPhase}.`, why: 'Pauzele reduc foamea și pot limita scăderea metabolismului.', do: ['1–2 săptămâni la menținere.'], hormones: ['leptin', 't3', 'ghrelin'] });
    if (libido != null && libido <= 2 && energy != null && energy <= 2.5) out.push({ id: 'stop', level: 'act', title: 'Semnale clare că deficitul costă prea mult', seen: 'Libido și energie scăzute în ultimele două săptămâni.', why: 'Axa reproductivă se oprește când corpul simte foamete.', do: ['Treci pe reverse sau menținere minimum 2–4 săptămâni.'], hormones: ['testosterone', 'lh', 'gnrh'], link: '#/protocol' });
  }
  if (id === 'bulk' && trend?.pct != null) {
    if (trend.pct > 0.5) out.push({ id: 'bulkfast', level: 'watch', title: 'Crești prea repede', seen: `+${fmt(trend.pct, 2)}% pe săptămână.`, why: 'Peste 0,5% pe săptămână vine mai ales grăsime.', do: ['Scade 150 kcal, mai ales din grăsimi și dulciuri.'], hormones: ['insulin', 'adiponectin'] });
    if (trend.pct < 0.05) out.push({ id: 'bulkslow', level: 'watch', title: 'Nu crești', seen: `${fmt(trend.pct, 2)}% pe săptămână.`, why: 'Fără surplus mic, avansații progresează greu.', do: ['Adaugă 100–150 kcal din carbohidrați în jurul antrenamentului.'], hormones: ['igf1'] });
  }
  if (id === 'reverse' && trend?.pct != null && trend.pct > 0.35) out.push({ id: 'revfast', level: 'watch', title: 'Greutatea crește peste limită', seen: `+${fmt(trend.pct, 2)}% pe săptămână.`, why: 'Poate fi apă. Mai așteptăm o săptămână.', do: ['Ține caloriile o săptămână în loc să crești.'] });

  // Recovery.
  const ready = lastDays(date, 5).map((d) => readiness(s, link, d)?.score).filter((v): v is number => v != null);
  if (ready.length >= 4 && mean(ready) < 50) out.push({ id: 'deload', level: 'act', title: 'Ai nevoie de deload', seen: `Disponibilitate medie de ${Math.round(mean(ready))}/100.`, why: 'Câteva zile la rând sub 50 arată oboseală acumulată.', do: ['5–7 zile cu 40–50% din volum, aceleași greutăți.'], hormones: ['cortisol', 'testosterone'], link: '#/recuperare' });
  const load = trainingLoad(s, link, date);
  if (load.change != null && load.change > 0.4 && load.prev > 500) out.push({ id: 'spike', level: 'watch', title: 'Volum crescut brusc', seen: `+${Math.round(load.change * 100)}% față de săptămâna trecută.`, why: 'Salturile mari sunt momentul în care apar supraîncărcările.', do: ['Crește cu maximum 10–20% pe săptămână.'] });
  if (load.monotony != null && load.monotony > 2) out.push({ id: 'monotony', level: 'watch', title: 'Zile prea asemănătoare', seen: `Monotonie ${fmt(load.monotony, 1)}.`, why: 'Zilele grele trebuie să fie grele, iar cele ușoare ușoare.', do: ['Fă o zi clar ușoară între sesiunile grele.'] });

  if (stress != null && stress >= 3.8) out.push({ id: 'stress', level: 'watch', title: 'Stres ridicat', seen: `Media: ${fmt(stress, 1)} din 5.`, why: 'Stresul continuu ține cortizolul sus seara și strică somnul.', do: ['5 minute de respirație de 2 ori pe zi.', '20 de minute în natură.', 'Reduci o sesiune intensă săptămâna asta.'], hormones: ['cortisol', 'adrenaline', 'crh'], link: '#/hormoni/cortisol' });
  if (alcohol >= 8) out.push({ id: 'alcohol', level: 'watch', title: 'Mult alcool săptămâna asta', seen: `${alcohol} unități în 7 zile.`, why: 'Scade somnul profund, sinteza proteică și, în exces, testosteronul.', do: ['Maximum 2 ocazii pe săptămână, niciodată în ziua de antrenament greu.'], hormones: ['testosterone', 'gh'] });
  const today = dayView(s, link, date);
  if (today.lastCaffeine && toMin(today.lastCaffeine) > toMin(caffeineCutoff(p))) out.push({ id: 'caffeine', level: 'watch', title: 'Cafeină prea târziu', seen: `Ultima la ${today.lastCaffeine}.`, why: 'Cafeina luată cu 6 ore înainte de culcare a redus somnul, iar seara întârzie ceasul intern.', do: [`Limita ta e ${caffeineCutoff(p)}.`], hormones: ['melatonin'] });
  if (today.bpS && today.bpD && (today.bpS >= 140 || today.bpD >= 90)) out.push({ id: 'bp', level: 'act', title: 'Tensiune crescută', seen: `${today.bpS}/${today.bpD} mmHg.`, why: 'Repetată, peste 140/90 înseamnă hipertensiune.', do: ['Măsoară 7 zile, dimineața și seara.', 'Mergi la medic dacă rămâne peste 140/90.'], hormones: ['aldosterone', 'angiotensin'] });

  // Symptoms repeated over two weeks.
  const counts: Record<string, number> = {};
  for (const d of lastDays(date, 14)) for (const [k, v] of Object.entries(dayView(s, link, d).sym ?? {})) if (v > 0) counts[k] = (counts[k] ?? 0) + 1;
  const repeat = Object.entries(counts).filter(([, c]) => c >= 4).sort((a, b) => b[1] - a[1]).slice(0, 3);
  for (const [k, c] of repeat) {
    const sym = SYMPTOM[k];
    if (sym) out.push({ id: `sym-${k}`, level: 'watch', title: `${sym.n}: de ${c} ori în 14 zile`, seen: 'Din jurnal.', why: `Cauze frecvente: ${sym.causes.slice(0, 3).join(', ').toLowerCase()}.`, do: sym.fix.slice(0, 3), hormones: sym.hormones, link: `#/jurnal/${k}` });
  }

  if (!out.length && (sleep != null || stress != null)) out.push({ id: 'ok', level: 'good', title: 'Nimic de corectat azi', seen: 'Datele din ultimele 7 zile arată bine.', why: 'Continuă: consistența aduce cele mai multe rezultate.', do: [] });
  return out.sort((a, b) => ORDER.indexOf(a.level) - ORDER.indexOf(b.level));
}

export interface Verdict { title: string; body: string; next?: 'reverse' | 'maintain' | 'cut' | 'bulk' }

/** Should the phase continue? Answers from the exit rules of each phase. */
export function phaseVerdict(s: State, link: Link, date: string): Verdict {
  const id = s.phase.id, week = Math.floor(diffDays(s.phase.start, date) / 7) + 1;
  const p = s.profile, f = findings(s, link, date);
  const has = (x: string) => f.some((y) => y.id === x);
  if (id === 'cut') {
    if (has('stop') || has('longcut') || has('ea')) return { title: 'Oprește cut-ul', body: 'Ai atins condițiile de ieșire. Treci pe reverse 3–8 săptămâni, apoi menținere.', next: 'reverse' };
    if (p.bf != null && p.bf <= (p.sex === 'm' ? 10 : 18)) return { title: 'Ești la țintă', body: 'Sub acest nivel, costul hormonal crește rapid. Treci pe reverse.', next: 'reverse' };
    return { title: 'Continuă cut-ul', body: `Săptămâna ${week}. Blocul recomandat e de 8–14 săptămâni.` };
  }
  if (id === 'reverse') return week >= 5 ? { title: 'Pregătește ieșirea din reverse', body: 'Dacă ești la menținere și greutatea e stabilă 2 săptămâni, fă analizele și treci la următorul bloc.', next: 'maintain' } : { title: 'Continuă reverse', body: `Săptămâna ${week}. Crești caloriile treptat.` };
  if (id === 'bulk') {
    if (p.bf != null && p.bf >= (p.sex === 'm' ? 18 : 28)) return { title: 'Oprește bulk-ul', body: 'Ai depășit zona bună. Fă 2–4 săptămâni de menținere, apoi un cut.', next: 'maintain' };
    return week >= 20 ? { title: 'Pregătește sfârșitul bulk-ului', body: 'După 20 de săptămâni, o perioadă de menținere consolidează masa.', next: 'maintain' } : { title: 'Continuă lean bulk', body: `Săptămâna ${week}. Urmărește talia și forța.` };
  }
  return week >= 8 ? { title: 'Menținerea și-a făcut treaba', body: 'Dacă analizele și testele sunt bune, alege blocul următor după domeniul cel mai slab.' } : { title: 'Continuă menținerea', body: `Săptămâna ${week}. Faza ideală pentru analize și teste.` };
}

export interface Corr { title: string; r: number; n: number; line: string }

const PAIRS: { a: string; b: string; f: (d: ReturnType<typeof dayView>) => number | undefined; g: (d: ReturnType<typeof dayView>) => number | undefined; lag: number; up: string; down: string }[] = [
  { a: 'somn', b: 'energie', f: (d) => d.sleepH, g: (d) => d.energy, lag: 0, up: 'Când dormi mai mult, ai mai multă energie.', down: 'Mai mult somn nu îți crește energia.' },
  { a: 'somn', b: 'foame', f: (d) => d.sleepH, g: (d) => d.hunger, lag: 0, up: 'Mai mult somn vine cu mai multă foame.', down: 'Când dormi puțin, ți-e mai foame.' },
  { a: 'stres', b: 'somn', f: (d) => d.stress, g: (d) => d.sleepH, lag: 1, up: 'Stresul nu îți scurtează somnul.', down: 'După zile stresante dormi mai puțin.' },
  { a: 'alcool', b: 'HRV', f: (d) => d.alcohol, g: (d) => d.hrv, lag: 1, up: 'Alcoolul nu îți scade HRV-ul.', down: 'HRV-ul scade a doua zi după alcool.' },
  { a: 'antrenament', b: 'febră', f: (d) => (d.trainMin ? d.trainMin * (d.rpe ?? 5) : undefined), g: (d) => d.soreness, lag: 1, up: 'Sesiunile grele aduc febră a doua zi.', down: 'Sesiunile grele nu îți cresc febra.' },
  { a: 'somn', b: 'disponibilitate', f: (d) => d.sleepH, g: (d) => d.hrv, lag: 0, up: 'Somnul mai lung îți crește HRV-ul.', down: 'Somnul mai lung nu îți crește HRV-ul.' },
  { a: 'pași', b: 'energie', f: (d) => d.steps, g: (d) => d.energy, lag: 0, up: 'În zilele cu mai mulți pași ai mai multă energie.', down: 'În zilele cu mai mulți pași ești mai obosit.' },
];

/** Needs 14 shared days. Correlations are prompts for attention, not proof. */
export function correlations(s: State, link: Link, date: string): Corr[] {
  const days = lastDays(date, 60);
  const out: Corr[] = [];
  for (const q of PAIRS) {
    const pairs: [number, number][] = [];
    days.forEach((d, i) => {
      const x = q.f(dayView(s, link, d));
      const next = days[i + q.lag];
      const y = next ? q.g(dayView(s, link, next)) : undefined;
      if (x != null && y != null) pairs.push([x, y]);
    });
    if (pairs.length < 14) continue;
    const r = pearson(pairs);
    if (r == null || Math.abs(r) < 0.35) continue;
    out.push({ title: `${q.a} și ${q.b}`, r, n: pairs.length, line: r > 0 ? q.up : q.down });
  }
  return out.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
}

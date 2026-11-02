/* Work in three shifts: 06–14, 14–22, 22–06. What each one does to sleep and hormones, and what to do about it.
   Numbers quoted come from the abstracts of the cited papers. No controlled study compares training times in rotating shift workers,
   so the training windows here are practice (level D), built from the sleep and light evidence. */
import type { Step } from './hormones.ts';

export type ShiftId = '1' | '2' | '3' | 'L';

export interface Shift { id: ShiftId; n: string; short: string; label: string; start: number | null; end: number | null }

/** Minutes from the midnight of the day the shift starts. */
export const SHIFT: Record<ShiftId, Shift> = {
  '1': { id: '1', n: 'Schimbul 1', short: 'S1', label: '06:00–14:00', start: 360, end: 840 },
  '2': { id: '2', n: 'Schimbul 2', short: 'S2', label: '14:00–22:00', start: 840, end: 1320 },
  '3': { id: '3', n: 'Schimbul 3', short: 'S3', label: '22:00–06:00', start: 1320, end: 1800 },
  L: { id: 'L', n: 'Zi liberă', short: 'Liber', label: 'fără program', start: null, end: null },
};

const repeat = (s: ShiftId, n: number): ShiftId[] => Array(n).fill(s);
const week = (s: ShiftId, days = 5): ShiftId[] => [...repeat(s, days), ...repeat('L', 7 - days)];

export interface Rotation { id: string; n: string; line: string; pattern: ShiftId[]; weekly: boolean }

export const ROTATIONS: Rotation[] = [
  { id: 'week-forward', n: 'Săptămânal: 1, 2, 3', line: 'Luni–vineri, weekend liber, schimbul se schimbă înainte.', pattern: [...week('1'), ...week('2'), ...week('3')], weekly: true },
  { id: 'week-backward', n: 'Săptămânal: 3, 2, 1', line: 'Luni–vineri, weekend liber, schimbul se schimbă înapoi.', pattern: [...week('3'), ...week('2'), ...week('1')], weekly: true },
  { id: 'week-six', n: 'Săptămânal, 6 zile: 1, 2, 3', line: 'Luni–sâmbătă, duminica liberă.', pattern: [...week('1', 6), ...week('2', 6), ...week('3', 6)], weekly: true },
  { id: 'fast', n: 'Rapid: 1, 1, 2, 2, 3, 3, liber, liber', line: 'Rotație de 8 zile.', pattern: ['1', '1', '2', '2', '3', '3', 'L', 'L'], weekly: false },
  { id: 'custom', n: 'Fără tipar', line: 'Pui fiecare zi manual.', pattern: [], weekly: false },
];

export interface Guide { id: string; n: string; hard: string; sleep: string; light: string; caffeine: string; food: string; train: string; hormones: string; avoid: string[] }

export const GUIDES: Guide[] = [
  { id: '1', n: 'Schimbul 1, 06:00–14:00', hard: 'Pericolul e somnul scurt. Trezirea devreme taie din a doua parte a nopții.',
    sleep: 'Culcare devreme, în jur de 21:00. Somnul se câștigă seara, nu dimineața.',
    light: 'Lumină puternică imediat după trezire. După 19:00, lumină slabă.',
    caffeine: 'Doar dimineața. Oprești în jur de prânz.',
    food: 'Mic dejun la trezire, masa principală după schimb, cina devreme.',
    train: 'După schimb, cu masă și eventual un somn scurt înainte. După-amiaza nu încurcă ceasul intern.',
    hormones: 'Cortizolul urcă târziu față de ora trezirii, testosteronul are mai puțin somn în care să crească. Prima oră e mai grea.',
    avoid: ['Antrenament seara târziu.', 'Ecrane puternice după 20:00.', 'Somn lung după-amiaza.'] },
  { id: '2', n: 'Schimbul 2, 14:00–22:00', hard: 'Cel mai bun pentru somn. Pericolul e că ajungi târziu acasă, încă activat.',
    sleep: 'Culcare în jur de 23:45, trezire 07:30. Ține ora de trezire, chiar dacă poți dormi mai mult.',
    light: 'Afară dimineața. După schimb, lumină slabă.',
    caffeine: 'Până pe la începutul schimbului.',
    food: 'Masa principală înainte de schimb. Seara, după 22:00, doar ceva mic.',
    train: 'Dimineața, cu 3–4 ore înainte de schimb. E cea mai bună săptămână pentru sesiunile grele.',
    hormones: 'Somnul e aliniat cu ceasul intern, deci testosteronul, GH și cortizolul au cel mai bun ritm.',
    avoid: ['Telefon sau seriale până la 02:00.', 'Masă mare la 23:00.', 'Antrenament după 22:00.'] },
  { id: '3', n: 'Schimbul 3, 22:00–06:00', hard: 'Lucrezi când corpul vrea să doarmă și dormi când vrea să fie treaz. Ținta nu e să te adaptezi complet, ci să limitezi pagubele.',
    sleep: 'Direct după schimb, în jur de 07:00, în întuneric total, 6–7 ore. Plus un somn de 90 de minute înainte de schimb.',
    light: 'Lumină puternică în prima parte a nopții, mai slabă spre final, ochelari de soare închiși pe drum spre casă.',
    caffeine: 'La începutul schimbului. Ultima în jur de 01:00.',
    food: 'Masa principală înainte de schimb. Între 00:00 și 05:00, doar o gustare mică.',
    train: 'După somn, după-amiaza. Sesiunile grele, doar dacă ai dormit minimum 6 ore.',
    hormones: 'Melatonina e oprită de lumina de noapte, cortizolul se aplatizează, leptina scade, iar insulina și glicemia urcă.',
    avoid: ['Masă mare la 03:00.', 'Condus somnolent după schimb.', 'Alcool ca somnifer.', 'Duș rece sau cafea înainte de somnul de zi.'] },
  { id: 'after', n: 'După ultima noapte', hard: 'Trebuie să revii pe programul de zi fără să pierzi două zile.',
    sleep: 'Doar 4–5 ore dimineața, apoi te trezești. Seara te culci la ora normală.',
    light: 'Cât mai mult afară după trezire.',
    caffeine: 'Puțină, până la 14:00.',
    food: 'Mese la orele de zi.',
    train: 'Ușor sau deloc în prima zi. Prima sesiune grea, după o noapte normală.',
    hormones: 'Somnul de noapte readuce ritmul de cortizol și melatonină, dar efectele durează câteva zile.',
    avoid: ['Somn până la 16:00.', 'Maraton de somn în weekend.'] },
];

export const SHIFT_STEPS: Step[] = [
  { t: 'Nu încerca să devii om de noapte. Ajunge o adaptare parțială: oamenii parțial adaptați au avut dispoziție, oboseală și performanță aproape de nivelul de zi.', ev: 'B', refs: ['smith2009', 'smith2012'] },
  { t: 'Lumină puternică în prima parte a nopții, ochelari de soare cât mai închiși pe drum spre casă, somn devreme, în întuneric.', ev: 'B', refs: ['crowley2003', 'neil2014', 'slanger2016'] },
  { t: 'Somn înainte de schimb plus cafeină la început: combinația a dat cea mai bună alertă, mai bună decât fiecare separat.', ev: 'B', refs: ['schweitzer2006', 'niosh-naps'] },
  { t: 'Somnurile scurte în timpul schimbului scad somnolența, dacă firma permite. Durează câteva minute până te dezmeticești.', ev: 'B', refs: ['martingill2018', 'ruggiero2014'] },
  { t: 'Cafeina scade erorile pe tură de noapte. La zi, o doză luată cu 6 ore înainte de somn încă îl strică, deci nu mai bea după 01:00.', ev: 'A', refs: ['ker2010', 'drake2013'] },
  { t: 'Nu lua mese mari noaptea: mâncatul doar ziua a prevenit intoleranța la glucoză în munca de noapte simulată.', ev: 'B', refs: ['chellappa2021', 'grant2017'] },
  { t: 'Păstrează un bloc de somn la aceeași oră de cât mai multe ori: 4 ore fixe pe zi au fost de ajuns ca să stabilizeze ritmurile.', ev: 'C', refs: ['minors1981'] },
  { t: 'Rotația înainte (1, 2, 3) și rotația rapidă sunt mai bune decât rotația înapoi și cea lentă, pentru somn și alertă.', ev: 'A', refs: ['bambra2008', 'sallinen2010', 'neil2014'] },
  { t: 'Ținta recomandată de cercetători: maximum 3 nopți la rând, minimum 11 ore între schimburi. E un consens pe date limitate, iar între S2 și S1 ai doar 8 ore.', ev: 'D', refs: ['garde2020'] },
  { t: 'Melatonina după noapte a adăugat circa 24 de minute de somn de zi, dovezi slabe. Discută cu medicul, conținutul variază mult.', ev: 'B', refs: ['liira2014', 'erland2017'] },
  { t: 'Efortul mută și el ceasul intern: dimineața și între 13 și 16 îl avansează, între 19 și 22 îl întârzie. Evită efortul mare seara în S1.', ev: 'B', refs: ['youngstedt2019'] },
  { t: 'Contează tipul tău: matinalii suferă pe noapte, nocturnii pe S1. Adaptează orele de culcare la tine.', ev: 'B', refs: ['vetter2015'] },
];

export const SHIFT_RISKS: { t: string; refs: string[] }[] = [
  { t: 'Testosteron: la bărbații cu tulburare de somn din cauza turelor, în medie cu 100 ng/dL mai mic și simptome mai multe. Somnul e pârghia: testosteronul crește cât dormi, indiferent de oră.', refs: ['balasubramanian2020', 'axelsson2005'] },
  { t: 'Metabolism: când dormi și mănânci în contra ceasului intern, leptina scade cu 17%, glicemia crește cu 6%, insulina cu 22%, iar ritmul cortizolului se inversează.', refs: ['scheer2009'] },
  { t: 'Tensiune și inflamație: dezalinierea crește tensiunea pe 24 de ore cu 3/1,5 mmHg și markerii de inflamație cu 3–29%.', refs: ['morris2016'] },
  { t: 'Risc pe termen lung: infarct cu 23% mai frecvent, diabet cu 37% mai frecvent la bărbați, obezitate abdominală cu 35%.', refs: ['vyas2012', 'gan2015', 'sun2018'] },
  { t: 'Riscul cardiovascular apare mai ales după 5 ani de ture, apoi crește cu circa 7% la fiecare 5 ani.', refs: ['torquati2018'] },
  { t: 'Calorii: cei cu cel puțin 5 nopți pe lună mănâncă în medie cu 103 kcal pe zi mai mult.', refs: ['hulsegge2019'] },
  { t: 'Drum spre casă: după noapte, 37,5% din drumurile de test au avut aproape-accidente, toate după minimum 45 de minute de condus. După somn normal, niciunul.', refs: ['lee2016'] },
];

/** A shift worker's checks, on top of the usual ones. */
export const SHIFT_CHECKS = 'Tensiune acasă lunar, talie lunar, HbA1c, ApoB și testosteron o dată sau de două ori pe an, recoltate după minimum 2–3 zile fără noapte.';

export const SWD = 'Dacă de peste 3 luni ai insomnie sau somnolență legate de program, deși respecți protocolul, poate fi tulburare de somn din cauza turelor. Mergi la un medic de somn.';

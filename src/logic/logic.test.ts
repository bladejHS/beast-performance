import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BIOMARKER, BIOMARKERS } from '../data/biomarkers.ts';
import { HORMONES, HORMONE } from '../data/hormones.ts';
import { BENCH, BENCHES, DOMAINS, SUPPS } from '../data/performance.ts';
import { PHASES } from '../data/phases.ts';
import { REF } from '../data/refs.gen.ts';
import { GUIDES, ROTATIONS, SHIFT_RISKS, SHIFT_STEPS } from '../data/shifts.ts';
import { SYMPTOMS } from '../data/symptoms.ts';
import { AXES, GLANDS, LEVERS, SYSTEMS } from '../data/systems.ts';
import { searchKnowledge } from './ai.ts';
import { EMPTY_LINK, readLink } from './bridge.ts';
import { demoDays, withDemo } from './demo.ts';
import { correlations, findings, phaseVerdict } from './insights.ts';
import { classify, homaIr, latest, parseReport, patterns, toBase } from './labs.ts';
import { audit, domainsOf } from './audit.ts';
import { activeDate, afterNights, anchorOptions, bestBloodDay, frame, sessionsOn, setRotation, shiftOn, timeline, transition } from './plan.ts';
import { avgEA, energyAvailability, exerciseKcal, readiness, trainingLoad, weightTrend } from './recovery.ts';
import { benchScore, benchValue, domainStates, hormoneStates, leverScores, systemStates } from './score.ts';
import { empty, normalize, parseBackup, backupText, type Roster, type State } from './store.ts';
import { addDays, fromMin, pearson, toMin, weekday } from './util.ts';

const TODAY = '2026-11-02';
const base = (o: Partial<State> = {}): State => ({ ...empty(TODAY), ...o });

test('the database holds the 44 hormones of the list, in nine systems', () => {
  assert.equal(HORMONES.length, 44);
  assert.equal(new Set(HORMONES.map((h) => h.id)).size, 44);
  for (const sys of SYSTEMS) assert.ok(HORMONES.some((h) => h.sys === sys.id), sys.id);
});

test('every hormone has a protocol, a benefit, and sources that exist', () => {
  for (const h of HORMONES) {
    assert.ok(h.steps.length > 0, h.id);
    assert.ok(h.gain.length > 0, h.id);
    assert.ok(h.goal && h.what, h.id);
    for (const s of h.steps) for (const r of s.refs ?? []) assert.ok(REF[r], `${h.id}: ${r}`);
    for (const m of h.markers) assert.ok(BIOMARKER[m], `${h.id}: ${m}`);
  }
});

test('every marker with a range has a fix for each side that can go wrong', () => {
  for (const b of BIOMARKERS) {
    for (const r of b.refs ?? []) assert.ok(REF[r], `${b.id}: ${r}`);
    const ref = b.ref && (Array.isArray(b.ref) ? b.ref : b.ref.m);
    if (!ref) continue;
    if (ref[0] > 0) assert.ok(b.low, `${b.id} has no fix for low`);
    assert.ok(b.high, `${b.id} has no fix for high`);
    for (const f of [b.low, b.high]) if (f) assert.ok(f.do.length && f.doc && f.why.length, b.id);
  }
});

test('every symptom points to real markers and hormones', () => {
  for (const s of SYMPTOMS) {
    for (const m of s.check) assert.ok(BIOMARKER[m], `${s.id}: ${m}`);
    for (const h of s.hormones) assert.ok(HORMONE[h], `${s.id}: ${h}`);
    assert.ok(s.fix.length && s.doctor, s.id);
  }
});

test('protocols, benchmarks and supplements cite real sources and real sessions', () => {
  for (const p of PHASES) for (const r of p.refs) assert.ok(REF[r], r);
  for (const d of DOMAINS) {
    for (const s of d.steps) for (const r of s.refs ?? []) assert.ok(REF[r], `${d.id}: ${r}`);
    for (const t of d.tests) assert.ok(BENCH[t], t);
    assert.ok(d.dose && d.keep && d.target, d.id);
  }
  for (const b of BENCHES) for (const r of b.refs ?? []) assert.ok(REF[r], r);
  for (const s of SUPPS) for (const r of s.refs) assert.ok(REF[r], r);
  for (const x of [...SHIFT_STEPS, ...SHIFT_RISKS]) for (const r of x.refs ?? []) assert.ok(REF[r], r);
  assert.equal(GUIDES.length, 4);
  for (const r of ROTATIONS) assert.ok(r.pattern.every((x) => ['1', '2', '3', 'L'].includes(x)));
  assert.equal(GLANDS.length > 10, true);
  for (const a of AXES) for (const g of a.path) assert.ok(GLANDS.some((x) => x.id === g), g);
  assert.equal(LEVERS.length, 12);
});

test('units convert to the base unit', () => {
  const tt = BIOMARKER['tt']!;
  assert.ok(Math.abs(toBase(tt, 20, 'nmol/L') - 576.8) < 0.1);
  assert.equal(toBase(BIOMARKER['glu']!, 5, 'mmol/L'), 90.1);
});

test('classification: urgent beats act, act beats watch, lab range replaces ours', () => {
  const tsh = BIOMARKER['tsh']!;
  assert.equal(classify(tsh, 1.5, 'mIU/L', 'm').status, 'good');
  assert.equal(classify(tsh, 3.2, 'mIU/L', 'm').status, 'watch');
  assert.equal(classify(tsh, 6, 'mIU/L', 'm').status, 'act');
  assert.equal(classify(tsh, 25, 'mIU/L', 'm').status, 'urgent');
  assert.equal(classify(BIOMARKER['tt']!, 280, 'ng/dL', 'm').status, 'watch');
  assert.equal(classify(BIOMARKER['tt']!, 280, 'ng/dL', 'm', 300, 900).status, 'act');
  // A sex-specific cycle marker has no default for women, so it is not judged.
  assert.equal(classify(BIOMARKER['lh']!, 30, 'IU/L', 'f').status, 'none');
});

test('HOMA-IR is computed from a panel', () => {
  assert.ok(Math.abs(homaIr(90, 9) - 2) < 1e-9);
  const s = base({ panels: [{ id: 'a', date: TODAY, lab: '', fasted: true, values: { glu: { v: 90, unit: 'mg/dL' }, ins: { v: 9, unit: 'µIU/mL' } } }] });
  assert.equal(latest(s)['homa']?.value, 2);
  assert.equal(latest(s)['homa']?.reading.status, 'watch');
});

test('a pasted Romanian lab report is read line by line', () => {
  const text = `Testosteron total  5.12 ng/mL  2.49 - 8.36
Testosteron liber 92 pg/mL
Glucoza serica: 92 mg/dL (74 - 106)
TSH 1,82 µUI/mL [0.27 - 4.2]
Colesterol HDL 56 mg/dL
Colesterol LDL 110 mg/dL
Feritina 96,3 ng/mL
25-OH Vitamina D 28,5 ng/mL
K 4.3 mmol/L
Ceva necunoscut 12`;
  const p = Object.fromEntries(parseReport(text).map((x) => [x.id, x]));
  assert.equal(p['tt']?.v, 5.12);
  assert.equal(p['tt']?.unit, 'ng/mL');
  assert.equal(p['tt']?.lo, 2.49);
  assert.equal(p['ft']?.v, 92);
  assert.equal(p['ft']?.unit, 'pg/mL');
  assert.equal(p['glu']?.hi, 106);
  assert.equal(p['tsh']?.v, 1.82);
  assert.equal(p['hdl']?.v, 56);
  assert.equal(p['ldl']?.v, 110);
  assert.equal(p['ferritin']?.v, 96.3);
  assert.equal(p['vitd']?.v, 28.5);
  assert.equal(p['k']?.v, 4.3);
  assert.equal(Object.keys(p).length, 9);
});

test('patterns read markers together', () => {
  const panel = (values: State['panels'][number]['values']) => [{ id: 'a', date: TODAY, lab: '', fasted: true, values }];
  const cut = base({ phase: { ...empty(TODAY).phase, id: 'cut' }, panels: panel({ tt: { v: 200, unit: 'ng/dL' }, lh: { v: 2.5, unit: 'IU/L' } }) });
  assert.ok(patterns(cut).some((p) => p.id === 'central'));
  const primary = base({ panels: panel({ tt: { v: 200, unit: 'ng/dL' }, lh: { v: 14, unit: 'IU/L' } }) });
  assert.ok(patterns(primary).some((p) => p.id === 'primary'));
  const muscle = base({ panels: panel({ alt: { v: 70, unit: 'U/L' }, ck: { v: 900, unit: 'U/L' }, ggt: { v: 20, unit: 'U/L' } }) });
  assert.ok(patterns(muscle).some((p) => p.id === 'muscleliver'));
});

const MONDAY = '2026-11-02';
/** Monday to Sunday, repeated, starting on MONDAY. */
const roster = (...p: Roster['pattern']): Roster => ({ rotation: 'x', pattern: p, start: MONDAY, overrides: {}, set: true });
const withRoster = (r: Roster, o: Partial<State> = {}) => base({ roster: r, ...o });

test('the rotation repeats, in both directions of time, and a single day can be changed', () => {
  const r = roster('1', '2', '3', 'L');
  assert.equal(shiftOn(r, MONDAY), '1');
  assert.equal(shiftOn(r, addDays(MONDAY, 6)), '3');
  assert.equal(shiftOn(r, addDays(MONDAY, -1)), 'L');
  assert.equal(shiftOn({ ...r, overrides: { [MONDAY]: 'L' } }, MONDAY), 'L');
  assert.equal(shiftOn({ ...r, pattern: [] }, MONDAY), 'L');
});

test('picking where you are today lines the rotation up', () => {
  const opts = anchorOptions('week-forward', MONDAY);
  assert.equal(opts.length, 3);
  const r = setRotation(empty(MONDAY).roster, 'week-forward', opts[2]!.index, MONDAY);
  assert.equal(shiftOn(r, MONDAY), '3');
  assert.equal(shiftOn(r, addDays(MONDAY, 5)), 'L');
  assert.equal(shiftOn(r, addDays(MONDAY, 7)), '1');
  const wed = '2026-11-04', q = setRotation(empty(wed).roster, 'week-forward', anchorOptions('week-forward', wed)[1]!.index, wed);
  assert.equal(shiftOn(q, wed), '2');
  assert.equal(shiftOn(q, '2026-11-07'), 'L');
  assert.equal(anchorOptions('custom', MONDAY).length, 0);
});

test('shift 1: up before the commute, in bed early, enough sleep', () => {
  const s = withRoster(roster('1'));
  const f = frame(s, MONDAY);
  assert.equal(f.wake, 360 - 30 - 40);
  assert.equal(fromMin(f.wake), '04:50');
  assert.equal(fromMin(f.bed), '21:05');
  assert.ok(f.sleepMin >= 7.5 * 60);
  assert.equal(f.meals[2], 885);
  assert.equal(fromMin(f.cafStop), '12:05');
  assert.ok(f.trainAt > 840);
  assert.equal(f.quick, false);
});

test('shift 2: trains in the morning and sleeps after work', () => {
  const s = withRoster(roster('2'));
  const f = frame(s, MONDAY);
  assert.equal(fromMin(f.wake), '07:30');
  assert.ok(f.trainAt < 840 - 180);
  assert.ok(f.bed >= 1320 + 30);
  assert.ok(f.cafStop >= 840 && f.cafStop <= 960);
});

test('shift 3: one cycle across midnight, nap before, sleep after, caffeine until 01:00', () => {
  const s = withRoster(roster('3'));
  const f = frame(s, MONDAY);
  assert.equal(f.bed, 1440 + 360 + 30 + 30);
  assert.equal(fromMin(f.bed), '07:00');
  assert.equal(fromMin(f.wake), '14:30');
  assert.equal(fromMin(f.cafStop), '01:00');
  assert.equal(f.nap?.min, 90);
  assert.ok(f.nap!.at + f.nap!.min < 1320);
  assert.ok(f.trainAt + 75 < f.nap!.at);
  const items = timeline(s, EMPTY_LINK, MONDAY);
  const at = (id: string) => items.find((x) => x.id === id)?.min ?? -1;
  assert.ok(at('work') < at('nightlight') && at('nightlight') < at('snack') && at('snack') < at('workend'));
  assert.ok(at('shades') > at('workend'));
  assert.equal(items.at(-1)?.id, 'sleep');
  assert.equal(items.at(-1)?.tomorrow, true);
  assert.equal(items[0]?.id, 'wake');
});

test('first night gets a long nap; nights are counted', () => {
  const s = withRoster(roster('L', '3', '3', '3', '3', '3', 'L'));
  const first = frame(s, addDays(MONDAY, 1));
  assert.equal(first.nightN, 1);
  assert.equal(first.nap?.min, 150);
  assert.equal(transition(first)?.title, 'Prima noapte');
  assert.equal(frame(s, addDays(MONDAY, 4)).nightN, 4);
  assert.ok(transition(frame(s, addDays(MONDAY, 4)))?.title.includes('Noaptea 4'));
});

test('the last night and the day after: short sleep, back to night sleep', () => {
  const s = withRoster(roster('3', '3', 'L', 'L'));
  assert.equal(transition(frame(s, addDays(MONDAY, 1)))?.title, 'Ultima noapte');
  const off = frame(s, addDays(MONDAY, 2));
  assert.equal(off.prev, '3');
  assert.equal(off.sleepMin, 270);
  assert.ok(off.bed < 1440);
  assert.equal(transition(off)?.title, 'Zi de revenire');
});

test('short turnarounds are flagged with the real gap', () => {
  const s = withRoster(roster('2', '1', 'L'));
  const f = frame(s, addDays(MONDAY, 1));
  assert.equal(f.gap, 8);
  assert.equal(f.quick, true);
  assert.ok(transition(f)?.title.includes('8 ore'));
  assert.ok(f.sleepMin < 6 * 60);
  assert.ok(findings(s, EMPTY_LINK, MONDAY).some((x) => x.id === 'quick'));
  const fwd = frame(withRoster(roster('1', '2')), addDays(MONDAY, 1));
  assert.equal(fwd.gap, 24);
  assert.equal(fwd.quick, false);
});

test('during a night shift the running cycle is still yesterday', () => {
  const s = withRoster(roster('3'));
  assert.equal(activeDate(s, new Date('2026-11-03T03:00:00')), MONDAY);
  assert.equal(activeDate(s, new Date('2026-11-03T06:30:00')), MONDAY);
  assert.equal(activeDate(s, new Date('2026-11-03T08:00:00')), '2026-11-03');
  const day = withRoster(roster('1'));
  assert.equal(activeDate(day, new Date('2026-11-03T03:00:00')), '2026-11-03');
});

test('the Inner Beast session goes on the hour that fits, and its plan is never replaced', () => {
  const link = { ...EMPTY_LINK, week: [[{ id: 'b', name: 'Heavy Bag Training', kind: 'rounds', min: 40, focus: 'power' }], [], [], [], [], [], []] };
  const train = (s: State) => timeline(s, link, MONDAY).find((x) => x.id === 'train');
  assert.ok(train(withRoster(roster('2')))?.title.includes('Heavy Bag'));
  assert.equal(train(withRoster(roster('2')))?.min, frame(withRoster(roster('2')), MONDAY).trainAt);
  assert.equal(timeline(withRoster(roster('2')), link, addDays(MONDAY, 1)).find((x) => x.id === 'train'), undefined);
  // Without Inner Beast in this browser, the copy of its plan is used.
  assert.equal(sessionsOn(EMPTY_LINK, MONDAY)[0]?.name, 'Shadow Boxing');
});

test('after short sleep a hard session is cut down, not cancelled', () => {
  const s = withRoster(roster('2', '1'));
  const link = { ...EMPTY_LINK, week: Array(7).fill([{ id: 'c', name: 'Calisthenics', kind: 'workout', min: 60 }]) };
  assert.ok(timeline(s, link, addDays(MONDAY, 1)).find((x) => x.id === 'train')?.why.includes('taie din volum'));
});

test('the app carries no calories, macros or training template anywhere in the timeline', () => {
  const s = withRoster(roster('1', '2', '3', 'L'));
  for (let i = 0; i < 4; i++) for (const x of timeline(s, EMPTY_LINK, addDays(MONDAY, i))) assert.ok(!/\d+ ?(g|kcal)\b/.test(x.title), x.title);
});

test('blood draws wait for a clean morning', () => {
  const s = withRoster(roster('3', '3', '3', '3', '3', 'L', 'L', '1', '1', '1', '1', '1', 'L', 'L', '2', '2', '2', '2', '2', 'L', 'L'));
  const d = bestBloodDay(s, MONDAY)!;
  assert.equal(d, addDays(MONDAY, 12));
  assert.ok(afterNights(s, MONDAY));
  assert.equal(afterNights(s, addDays(MONDAY, 12)), false);
  const panel = { id: 'a', date: addDays(MONDAY, 5), lab: '', fasted: true, values: { tt: { v: 500, unit: 'ng/dL' } } };
  assert.ok(patterns({ ...s, panels: [panel] }).some((p) => p.id === 'nights'));
});

test('the Inner Beast week is read per domain, without judging it as a whole', () => {
  const rows = audit(EMPTY_LINK);
  assert.equal(rows.find((x) => x.id === 'strength')?.sessions.includes('Calisthenics'), true);
  assert.equal(rows.find((x) => x.id === 'mobility')?.level, 'good');
  assert.ok((rows.find((x) => x.id === 'conditioning')?.min ?? 0) > 90);
  assert.deepEqual(domainsOf({ id: 'x', name: 'Mobility', kind: 'routine', min: 30 }), ['mobility']);
});

test('the plan in Beast Nutrition is checked, not rewritten', () => {
  const link = { ...EMPTY_LINK, plan: { phase: 'cut' as const, kcal: 2000, p: 170, c: 240, f: 40, maintenance: 2700, ratePct: 0.6, start: TODAY } };
  assert.ok(findings(base(), link, TODAY).some((x) => x.id === 'bnfat'));
  assert.equal(findings(base({ profile: { ...empty(TODAY).profile, weightKg: 60 } }), link, TODAY).some((x) => x.id === 'bnfat'), false);
});

test('readiness needs baseline days for HRV and reacts to bad nights', () => {
  const days: State['days'] = {};
  for (let i = 10; i >= 1; i--) days[addDays(TODAY, -i)] = { hrv: 70 + (i % 3), rhr: 52 };
  const good = base({ days: { ...days, [TODAY]: { sleepH: 8.5, hrv: 74, rhr: 51, stress: 1, soreness: 1 } } });
  const bad = base({ days: { ...days, [TODAY]: { sleepH: 4.5, hrv: 50, rhr: 60, stress: 5, soreness: 5 } } });
  assert.equal(readiness(good, EMPTY_LINK, TODAY)?.zone, 'push');
  assert.equal(readiness(bad, EMPTY_LINK, TODAY)?.zone, 'back');
  assert.equal(readiness(base(), EMPTY_LINK, TODAY), null);
});

test('energy availability subtracts exercise', () => {
  const p = { ...empty(TODAY).profile, weightKg: 80, bf: 15 };
  assert.equal(energyAvailability(p, {}), null);
  const kcal = exerciseKcal(60, 7, 80);
  assert.ok(kcal > 300 && kcal < 800);
  assert.ok(Math.abs((energyAvailability(p, { kcal: 2400, trainMin: 60, rpe: 7 }) ?? 0) - (2400 - kcal) / 68) < 1e-9);
});

test('training load compares two weeks', () => {
  const days: State['days'] = {};
  for (let i = 0; i < 7; i++) days[addDays(TODAY, -i)] = { trainMin: 60, rpe: 8 };
  const l = trainingLoad(base({ days }), EMPTY_LINK, TODAY);
  assert.equal(l.week, 3360);
  assert.equal(l.change, null);
});

test('weight trend reads two 7-day averages', () => {
  const days: State['days'] = {};
  for (let i = 0; i < 14; i++) days[addDays(TODAY, -i)] = { weight: i < 7 ? 79 : 80 };
  const t = weightTrend(base({ days }), EMPTY_LINK, TODAY);
  assert.equal(t?.avg, 79);
  assert.equal(t?.pct, -1.25);
});

test('correlations stay quiet below 14 shared days', () => {
  const r = pearson([[1, 2], [2, 4], [3, 6]]);
  assert.ok(Math.abs((r ?? 0) - 1) < 1e-9);
  assert.equal(correlations(base(), EMPTY_LINK, TODAY).length, 0);
  const s = withDemo(base(), TODAY);
  assert.ok(correlations(s, EMPTY_LINK, TODAY).length >= 0);
});

test('findings: too little sleep, too little energy, and the exit from a cut', () => {
  const days: State['days'] = {};
  for (let i = 0; i < 7; i++) days[addDays(TODAY, -i)] = { sleepH: 5.4, kcal: 1500, trainMin: 70, rpe: 8, libido: 1, energy: 2 };
  const s = base({ days, phase: { ...empty(TODAY).phase, id: 'cut', start: addDays(TODAY, -30) }, profile: { ...empty(TODAY).profile, bf: 12 } });
  const f = findings(s, EMPTY_LINK, TODAY);
  assert.ok(f.some((x) => x.id === 'sleep' && x.level === 'act'));
  assert.ok(f.some((x) => x.id === 'ea'));
  assert.ok(f.some((x) => x.id === 'stop'));
  assert.equal(phaseVerdict(s, EMPTY_LINK, TODAY).next, 'reverse');
});

test('a critical lab value comes first', () => {
  const s = base({ panels: [{ id: 'a', date: TODAY, lab: '', fasted: true, values: { k: { v: 6.6, unit: 'mmol/L' }, tt: { v: 900, unit: 'ng/dL' } } }] });
  assert.equal(findings(s, EMPTY_LINK, TODAY)[0]?.level, 'urgent');
});

test('hormone states prefer blood, then habits, and say which', () => {
  const s = withDemo(base(), TODAY);
  const states = hormoneStates(s, EMPTY_LINK, TODAY);
  assert.equal(states.length, 44);
  assert.equal(states.find((x) => x.h.id === 'testosterone')?.source, 'blood');
  assert.equal(states.find((x) => x.h.id === 'melatonin')?.source, 'habits');
  assert.equal(systemStates(states).length, 9);
  const blank = hormoneStates(base(), EMPTY_LINK, TODAY);
  assert.ok(blank.every((x) => x.status === 'none'));
  assert.ok(Object.values(leverScores(base(), EMPTY_LINK, TODAY)).every((v) => v == null));
});

test('benchmark scoring: four levels, both directions, and age for VO2max', () => {
  const s = base({ profile: { ...empty(TODAY).profile, age: 30 } });
  const squat = BENCH['squat']!, run = BENCH['run5k']!, vo2 = BENCH['vo2']!;
  assert.equal(benchScore(squat, s, 1.5), 50);
  assert.equal(benchScore(squat, s, 2.5), 100);
  assert.equal(benchScore(squat, s, 3), 100);
  assert.equal(benchScore(run, s, 25), 50);
  assert.equal(benchScore(run, s, 18), 100);
  assert.ok(benchScore(run, s, 40) < 25);
  const older = base({ profile: { ...empty(TODAY).profile, age: 50 } });
  assert.ok(benchScore(vo2, older, 46) > benchScore(vo2, s, 46));
});

test('lifts are scored per kilo of body weight', () => {
  const s = base({ profile: { ...empty(TODAY).profile, weightKg: 80 }, tests: [{ id: 't', date: TODAY, bench: 'squat', v: 160 }] });
  assert.equal(benchValue(s, EMPTY_LINK, TODAY, BENCH['squat']!)?.v, 2);
});

test('domains need data, and the demo fills all of them', () => {
  assert.ok(domainStates(base(), EMPTY_LINK, TODAY).every((d) => d.score == null || d.id === 'muscle'));
  const s = withDemo(base(), TODAY);
  assert.ok(domainStates(s, EMPTY_LINK, TODAY).every((d) => d.score != null), JSON.stringify(domainStates(s, EMPTY_LINK, TODAY)));
});

test('sibling apps are read, with what was typed here on top', () => {
  const data: Record<string, string> = {
    'beast:v1': JSON.stringify({ sleep: { [TODAY]: 7.5 }, steps: { [TODAY]: 9000 }, weight: {}, log: [{ date: TODAY, kind: 'run', dur: 1800 }, { date: TODAY, kind: 'breath', dur: 600 }], nut: { ok: '2026-01-01', sex: 'm', age: 29, h: 182 } }),
    'beast:plan:v1': JSON.stringify({ week: [[{ id: 'a', name: 'Shadow Boxing', kind: 'rounds', min: 30 }]] }),
    'beast-nutrition:v2': JSON.stringify({ profile: { sex: 'm', age: 29, heightCm: 182, weightKg: 81, bf: 14, activity: 1.6 }, plan: { phase: 'cut', macros: { kcal: 2200, p: 180, c: 220, f: 70 }, maintenance: 2800, ratePct: 0.6, startDate: TODAY }, weights: { [TODAY]: 81 }, days: { [TODAY]: [[{ kcal: 500, p: 40, fiber: 8 }], [{ kcal: 700, p: 50, fiber: 10 }]] }, drinks: { [TODAY]: [{ ml: 500 }, { ml: 750 }] } }),
  };
  const link = readLink({ getItem: (k) => data[k] ?? null });
  assert.ok(link.nutrition && link.inner);
  assert.equal(link.plan?.kcal, 2200);
  assert.equal(link.days[TODAY]?.sleepH, 7.5);
  assert.equal(link.days[TODAY]?.trainMin, 30);
  assert.equal(link.days[TODAY]?.kcal, 1200);
  assert.equal(link.days[TODAY]?.protein, 90);
  assert.equal(link.days[TODAY]?.waterL, 1.25);
  assert.equal(link.week?.[0]?.[0]?.name, 'Shadow Boxing');
  assert.equal(link.profile?.bf, 14);
});

test('a broken sibling save is ignored', () => {
  const link = readLink({ getItem: () => '{not json' });
  assert.equal(link.nutrition, false);
  assert.equal(link.inner, false);
});

test('energy availability averages need three days', () => {
  const s = withDemo(base(), TODAY);
  assert.ok((avgEA(s, EMPTY_LINK, TODAY) ?? 0) > 20);
  assert.equal(avgEA(base(), EMPTY_LINK, TODAY), null);
  assert.ok(Object.keys(demoDays(TODAY)).length > 50);
});

test('backups leave the key out and refuse other files', () => {
  const s = base({ ai: { key: 'sk-secret', chat: [] } });
  const text = backupText(s);
  assert.ok(!text.includes('sk-secret'));
  assert.equal(parseBackup(text).v, 1);
  assert.throws(() => parseBackup('{}'));
  assert.throws(() => parseBackup('nope'));
  assert.equal(normalize(null, TODAY).phase.id, 'maintain');
});

test('the knowledge search finds hormones, markers and symptoms', () => {
  assert.equal(searchKnowledge('cortizol')[0]?.href.includes('cortisol') || searchKnowledge('cortizol')[0]?.href.includes('cort'), true);
  assert.ok(searchKnowledge('foame constanta').some((h) => h.href === '#/jurnal/hunger'));
  assert.ok(searchKnowledge('viteza sprint').some((h) => h.href === '#/performanta/speed'));
  assert.ok(searchKnowledge('schimb noapte somn').some((h) => h.href === '#/protocol'));
  assert.equal(searchKnowledge('').length, 0);
});

test('helpers', () => {
  assert.equal(toMin('07:30'), 450);
  assert.equal(fromMin(1860), '07:00');
  assert.equal(weekday(MONDAY), 0);
});

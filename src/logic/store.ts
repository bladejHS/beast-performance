/* Everything the user logs. It stays in this browser, under its own key; the sibling apps are only read (see bridge.ts). */
import type { ShiftId } from '../data/shifts.ts';
import type { PhaseId } from '../data/systems.ts';
import { dayKey } from './util.ts';

export type Sex = 'm' | 'f';
export type Level = 'new' | 'mid' | 'adv';

export interface Profile {
  sex: Sex; age: number; heightCm: number; weightKg: number;
  /** Body fat, percent. */
  bf: number | null;
  level: Level;
  /** Door to door, one way. */
  commuteMin: number;
  /** Hours of sleep wanted in 24 hours. */
  sleepNeed: number;
  chronotype: 'early' | 'mid' | 'late';
}

export interface Roster {
  rotation: string;
  pattern: ShiftId[];
  /** The date of pattern[0]. */
  start: string;
  /** Single days changed by hand. */
  overrides: Record<string, ShiftId>;
  /** False until the user has chosen a rotation. */
  set: boolean;
}

export interface PhaseState {
  id: PhaseId; start: string;
  /** The Beast Nutrition phase last followed, to notice when it changes there. */
  synced?: string;
  history: { id: PhaseId; start: string; end: string }[];
}

/** One day of the journal. Every field is optional: a day can be half filled. */
export interface Day {
  sleepH?: number; napMin?: number; sleepQ?: number; bedtime?: string;
  stress?: number; energy?: number; mood?: number; hunger?: number; soreness?: number; libido?: number;
  morning?: boolean;
  rhr?: number; hrv?: number; spo2?: number; temp?: number;
  weight?: number; waist?: number; bpS?: number; bpD?: number;
  steps?: number; waterL?: number; alcohol?: number; caffeineMg?: number; lastCaffeine?: string; sunMin?: number;
  kcal?: number; protein?: number; fiber?: number;
  trainMin?: number; rpe?: number; trainType?: string;
  /** Symptom id → 1 mild, 2 clear, 3 strong. */
  sym?: Record<string, number>;
  /** Protocol steps done today. */
  done?: string[];
  note?: string;
}

export interface LabValue { v: number; unit: string; lo?: number; hi?: number }
export interface Panel { id: string; date: string; lab: string; fasted: boolean; values: Record<string, LabValue> }
export interface TestResult { id: string; date: string; bench: string; v: number }
export interface ChatMsg { role: 'user' | 'assistant'; text: string; source?: 'local' | 'claude' }

export interface State {
  v: 1;
  /** Day the notice was accepted, empty before onboarding. */
  accepted: string;
  profile: Profile;
  roster: Roster;
  phase: PhaseState;
  days: Record<string, Day>;
  panels: Panel[];
  tests: TestResult[];
  focus: string[];
  ai: { key: string; chat: ChatMsg[] };
  /** Sample data loaded from Settings; removed with one click. */
  demo: boolean;
}

export const KEY = 'beast-performance:v1';

export const defaultProfile = (): Profile => ({ sex: 'm', age: 30, heightCm: 180, weightKg: 80, bf: null, level: 'mid', commuteMin: 30, sleepNeed: 7.5, chronotype: 'mid' });

export const defaultRoster = (today: string): Roster => ({ rotation: 'custom', pattern: [], start: today, overrides: {}, set: false });

export const empty = (today: string = dayKey()): State => ({
  v: 1, accepted: '', profile: defaultProfile(), roster: defaultRoster(today),
  phase: { id: 'maintain', start: today, history: [] },
  days: {}, panels: [], tests: [], focus: [], ai: { key: '', chat: [] }, demo: false,
});

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);

/** Older or hand-edited saves get the fields added since. */
export function normalize(raw: unknown, today: string = dayKey()): State {
  const base = empty(today);
  if (!isObj(raw)) return base;
  const r = raw as Partial<State>;
  return {
    ...base, ...r, v: 1,
    profile: { ...base.profile, ...(isObj(r.profile) ? r.profile : {}) },
    roster: { ...base.roster, ...(isObj(r.roster) ? r.roster : {}) },
    phase: { ...base.phase, ...(isObj(r.phase) ? r.phase : {}) },
    days: isObj(r.days) ? (r.days as Record<string, Day>) : {},
    panels: Array.isArray(r.panels) ? r.panels.filter((p) => isObj(p) && typeof p.date === 'string' && isObj(p.values)) : [],
    tests: Array.isArray(r.tests) ? r.tests.filter((t) => isObj(t) && typeof t.bench === 'string') : [],
    focus: Array.isArray(r.focus) ? r.focus : [],
    ai: { key: '', chat: [], ...(isObj(r.ai) ? r.ai : {}) },
  };
}

export function load(): State {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
    return normalize(raw ? JSON.parse(raw) : null);
  } catch {
    // A damaged save is kept aside, so the empty state that follows cannot overwrite it.
    try { if (raw) localStorage.setItem(`${KEY}:damaged`, raw); } catch { /* storage refused */ }
    return empty();
  }
}

/** False when the browser refused to save. */
export function save(s: State): boolean {
  try { localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch { return false; }
}

export function parseBackup(text: string): State {
  let data: unknown;
  try { data = JSON.parse(text); } catch { throw new Error('Fișierul nu este un backup Beast Performance.'); }
  if (!isObj(data) || data['v'] !== 1 || !isObj(data['days'])) throw new Error('Fișierul nu este un backup Beast Performance.');
  return normalize(data);
}

/** The key never leaves the device in a backup. */
export const backupText = (s: State) => JSON.stringify({ ...s, ai: { ...s.ai, key: '' } }, null, 1);

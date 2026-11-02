/* Dates are local calendar days written as YYYY-MM-DD, compared as strings. */

const pad = (n: number) => String(n).padStart(2, '0');

export const dayKey = (d: Date = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

export const diffDays = (a: string, b: string) => Math.round((new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime()) / 864e5);

/** Monday = 0. */
export const weekday = (date: string) => (new Date(`${date}T12:00:00`).getDay() + 6) % 7;

export const lastDays = (date: string, n: number) => Array.from({ length: n }, (_, i) => addDays(date, -(n - 1 - i)));

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);

export function sd(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
}

/** Pearson correlation; null with too few pairs or no spread. */
export function pearson(pairs: [number, number][]): number | null {
  if (pairs.length < 3) return null;
  const xs = pairs.map((p) => p[0]), ys = pairs.map((p) => p[1]);
  const mx = mean(xs), my = mean(ys);
  let num = 0, dx = 0, dy = 0;
  for (const [x, y] of pairs) { num += (x - mx) * (y - my); dx += (x - mx) ** 2; dy += (y - my) ** 2; }
  return dx && dy ? num / Math.sqrt(dx * dy) : null;
}

export const uid = () => Math.random().toString(36).slice(2, 10);

export function toMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Wraps around midnight. */
export function fromMin(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

/** Number with a Romanian decimal comma. */
export const fmt = (v: number, digits = 0) => v.toFixed(digits).replace('.', ',');

/** Keeps the digits a lab value was given with. */
export function fmtVal(v: number): string {
  const d = Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2;
  return fmt(v, d).replace(/,?0+$/, (m) => (m.startsWith(',') ? '' : m));
}

/** Parses "12,5" and "12.5". */
export function num(s: string): number | null {
  const v = Number(String(s).trim().replace(',', '.'));
  return String(s).trim() !== '' && Number.isFinite(v) ? v : null;
}

export const strip = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const MONTHS = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'nov', 'dec'];
export const DAYS = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];

export function dateLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return `${d} ${MONTHS[(m ?? 1) - 1]} ${y}`;
}

export const shortDate = (date: string) => date.slice(8).replace(/^0/, '') + ' ' + MONTHS[Number(date.slice(5, 7)) - 1];

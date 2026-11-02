/* The app's running state, shared by the screens. */
import { readLink, EMPTY_LINK, type Link } from '../logic/bridge.ts';
import { load, save, type Day, type State } from '../logic/store.ts';
import { dayKey } from '../logic/util.ts';

export interface Ctx { s: State; link: Link; today: string }

export const ctx: Ctx = { s: load(), link: EMPTY_LINK, today: dayKey() };

export function refresh() {
  ctx.today = dayKey();
  try { ctx.link = readLink(localStorage); } catch { ctx.link = EMPTY_LINK; }
}

let warned = false;

export function persist() {
  if (!save(ctx.s) && !warned) { warned = true; toast('Browserul a refuzat salvarea. Descarcă un backup din Setări.'); }
}

export const day = (date: string): Day => (ctx.s.days[date] ??= {});

export type Action = (el: HTMLElement, ev: Event) => void;
export const actions: Record<string, Action> = {};

/** Re-renders the current screen. Set by main.ts. */
export const render = { now: () => {} };

let timer = 0;
export function toast(text: string) {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div');
  el.className = 'toast'; el.setAttribute('role', 'status'); el.textContent = text;
  document.body.append(el);
  clearTimeout(timer);
  timer = window.setTimeout(() => el.remove(), 2600);
}

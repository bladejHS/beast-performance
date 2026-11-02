import './styles.css';
import { ai } from './screens/ai.ts';
import { bloodwork } from './screens/bloodwork.ts';
import { hormones } from './screens/hormones.ts';
import { journal } from './screens/journal.ts';
import { onboarding } from './screens/onboarding.ts';
import { overview } from './screens/overview.ts';
import { performance } from './screens/performance.ts';
import { protocol } from './screens/protocol.ts';
import { recovery } from './screens/recovery.ts';
import { settings, sources } from './screens/settings.ts';
import { systems } from './screens/systems.ts';
import { actions, ctx, refresh, render } from './ui/ctx.ts';
import { art, emblem, esc } from './ui/parts.ts';

interface Mod { id: string; n: string; short: string; icon: string; screen: (p?: string) => string }

const MODS: Mod[] = [
  { id: '', n: 'Health Overview', short: 'Overview', icon: 'overview', screen: overview },
  { id: 'protocol', n: 'Protocolul de azi', short: 'Azi', icon: 'protocol', screen: protocol },
  { id: 'performanta', n: 'Performance Protocols', short: 'Performanță', icon: 'performance', screen: performance },
  { id: 'hormoni', n: 'Hormone Database', short: 'Hormoni', icon: 'hormones', screen: hormones },
  { id: 'analize', n: 'Bloodwork & Biomarkers', short: 'Analize', icon: 'blood', screen: bloodwork },
  { id: 'sisteme', n: 'Endocrine Systems', short: 'Sisteme', icon: 'endocrine', screen: systems },
  { id: 'jurnal', n: 'Symptoms & Health Tracking', short: 'Jurnal', icon: 'tracking', screen: journal },
  { id: 'recuperare', n: 'Recovery & Physiological Data', short: 'Recovery', icon: 'recovery', screen: recovery },
  { id: 'ai', n: 'AI Health Intelligence', short: 'AI', icon: 'ai', screen: ai },
];
const EXTRA: Record<string, (p?: string) => string> = { setari: settings, surse: sources };
const BAR = ['', 'protocol', null, 'jurnal', 'ai'];

let sheet = false;

const route = () => {
  const [, id = '', param] = location.hash.split('/');
  return { id, param };
};

function shell(active: string, body: string): string {
  const link = (m: Mod) => `<a href="#/${m.id}" ${m.id === active ? 'aria-current="page"' : ''}><img src="${art(m.icon)}" alt="" width="26" height="26"><span>${esc(m.n)}</span></a>`;
  const barItem = (id: string | null) => {
    if (id === null) return `<li><button class="wolf" data-act="sheet" aria-label="Toate modulele"><img src="${emblem()}" alt="" width="58" height="68"></button></li>`;
    const m = MODS.find((x) => x.id === id)!;
    return `<li><a href="#/${m.id}" ${m.id === active ? 'aria-current="page"' : ''}><img src="${art(m.icon)}" alt="" width="26" height="26"><span>${esc(m.short)}</span></a></li>`;
  };
  return `<div class="shell">
    <nav class="rail" aria-label="Module">
      <a class="brand" href="#/" style="padding:0 6px 14px;background:none"><img src="${emblem()}" alt="" width="44" height="52" style="width:44px;height:52px;filter:none"><span style="display:block"><b style="font:italic 800 19px/1 var(--display);color:var(--t1);display:block;font-stretch:86%">BEAST</b><span style="font:500 10.5px/1.2 var(--display);letter-spacing:.15em;color:var(--t2)">PERFORMANCE</span></span></a>
      ${MODS.map(link).join('')}
      <a class="end" href="#/setari" ${active === 'setari' ? 'aria-current="page"' : ''}><span>Setări</span></a>
    </nav>
    <main id="main">${body}</main>
    <nav class="bar" aria-label="Meniu"><ul>${BAR.map(barItem).join('')}</ul></nav>
  </div>
  ${sheet ? `<div class="sheet" data-act="sheet"><div><div class="between" style="margin-bottom:10px"><h2>Toate modulele</h2><button class="btn quiet" data-act="sheet">Închide</button></div><div class="mods">${MODS.map((m) => `<a class="mod" href="#/${m.id}"><img src="${art(m.icon)}" alt="" width="36" height="36"><b>${esc(m.n)}</b></a>`).join('')}<a class="mod" href="#/setari"><b>Setări</b></a></div></div></div>` : ''}`;
}

function draw() {
  const root = document.getElementById('app')!;
  refresh();
  if (!ctx.s.accepted) { root.innerHTML = onboarding(); return; }
  const { id, param } = route();
  const mod = MODS.find((m) => m.id === id);
  const screen = mod?.screen ?? EXTRA[id] ?? overview;
  const y = scrollY;
  root.innerHTML = shell(mod || EXTRA[id] ? id : '', screen(param));
  scrollTo(0, y);
}

render.now = draw;

addEventListener('hashchange', () => { sheet = false; draw(); scrollTo(0, 0); });

actions['sheet'] = (el, ev) => {
  if (el.classList.contains('sheet') && ev.target !== el) return;
  sheet = !sheet;
  draw();
};

document.addEventListener('click', (ev) => {
  const el = (ev.target as HTMLElement).closest<HTMLElement>('[data-act]');
  if (!el) return;
  // A control inside the sheet must not also close it.
  const fn = actions[el.dataset['act']!];
  if (fn) fn(el, ev);
});
document.addEventListener('keydown', (ev) => {
  const el = ev.target as HTMLElement;
  if (ev.key === 'Enter' && el.dataset['enter']) { ev.preventDefault(); actions[el.dataset['enter']]?.(el, ev); }
  if ((ev.key === 'Enter' || ev.key === ' ') && el.getAttribute('role') === 'button' && el.dataset['act']) { ev.preventDefault(); actions[el.dataset['act']]?.(el, ev); }
  if (ev.key === 'Escape' && sheet) { sheet = false; draw(); }
});
document.addEventListener('change', (ev) => {
  const el = ev.target as HTMLElement;
  if (el.dataset['change']) actions[el.dataset['change']]?.(el, ev);
});
document.addEventListener('input', (ev) => {
  const el = ev.target as HTMLElement;
  if (el.dataset['input']) actions[el.dataset['input']]?.(el, ev);
});

// Hover and touch layer for charts: nearest point of the series under the pointer.
document.addEventListener('pointermove', (ev) => {
  const chart = (ev.target as HTMLElement).closest?.('.chart') as HTMLElement | null;
  document.querySelectorAll('.chart .tip').forEach((t) => { if (t.parentElement !== chart) t.remove(); });
  if (!chart?.dataset['pts']) return;
  const pts = JSON.parse(chart.dataset['pts']) as { x: number; y: number; t: string }[];
  const box = chart.getBoundingClientRect(), x = (ev.clientX - box.left) / box.width;
  const p = pts.reduce((a, b) => (Math.abs(b.x - x) < Math.abs(a.x - x) ? b : a));
  let tip = chart.querySelector<HTMLElement>('.tip');
  if (!tip) { tip = document.createElement('div'); tip.className = 'tip'; chart.append(tip); }
  tip.textContent = p.t;
  tip.style.left = `${Math.max(16, Math.min(84, p.x * 100))}%`;
  tip.style.top = `${p.y * 100}%`;
});

draw();

// The app can be installed and works offline. Only the built version registers a worker.
if ('serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register('sw.js').catch(() => {});

// Sibling apps may have changed while this one was in the background.
document.addEventListener('visibilitychange', () => { if (!document.hidden && !document.querySelector('input:focus,textarea:focus')) draw(); });

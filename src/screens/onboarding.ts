import { DISCLAIMER, PHASES, RED_FLAGS } from '../data/phases.ts';
import type { PhaseId } from '../data/systems.ts';
import { PHASE_FROM_NUTRITION } from '../logic/bridge.ts';
import { ctx, actions, persist, render } from '../ui/ctx.ts';
import { emblem, esc, plain } from '../ui/parts.ts';
import { profileFields } from './settings.ts';

let step = 0, seeded = false;

actions['onext'] = () => { step++; render.now(); };
actions['oback'] = () => { step--; render.now(); };
actions['ophase'] = (el) => { ctx.s.phase.id = el.dataset['id'] as PhaseId; ctx.s.phase.start = ctx.today; persist(); render.now(); };
actions['odone'] = () => {
  ctx.s.accepted = ctx.today;
  persist();
  location.hash = '#/protocol';
  render.now();
};

/** Starts from what the sibling apps already know. */
function seed() {
  if (seeded) return;
  seeded = true;
  const p = ctx.link.profile;
  if (p) ctx.s.profile = { ...ctx.s.profile, ...Object.fromEntries(Object.entries(p).filter(([, v]) => v != null)) };
  if (ctx.link.plan) ctx.s.phase.id = PHASE_FROM_NUTRITION[ctx.link.plan.phase];
}

export function onboarding(): string {
  seed();
  const dots = `<p class="faint" style="text-align:center">Pasul ${step + 1} din 3</p>`;
  if (step === 0) return `<div class="onb"><div>
    <img class="logo" src="${emblem()}" alt="Emblema Beast Performance" width="680" height="801">
    <h1 style="text-align:center">Beast Performance</h1>
    <p class="muted">Inner Beast îți dă disciplina. Beast Nutrition îți dă combustibilul. Aici le legi: hormoni, analize, recuperare și performanță, într-un singur protocol zilnic.</p>
    <p class="muted">Nu trebuie să știi ce face fiecare hormon. Urmezi ziua, iar aplicația îți spune ce câștigi.</p>
    <div class="panel flat stack"><h3>Important</h3><p class="muted">${esc(DISCLAIMER)}</p><details><summary class="small" style="cursor:pointer">Semnale pentru care mergi direct la medic</summary>${plain(RED_FLAGS)}</details></div>
    <button class="btn go" data-act="onext">Am înțeles, mergem</button>
    ${dots}
  </div></div>`;
  if (step === 1) return `<div class="onb"><div>
    <h1>În ce fază ești?</h1>
    <p class="muted">Protocolul se schimbă cu faza. O poți schimba oricând.</p>
    <div class="phasecards">${PHASES.map((p) => `<button data-act="ophase" data-id="${p.id}" aria-pressed="${ctx.s.phase.id === p.id}"><b>${esc(p.n)}</b><small>${esc(p.line)}</small></button>`).join('')}</div>
    <div class="row"><button class="btn" data-act="oback">Înapoi</button><button class="btn go grow" data-act="onext">Continuă</button></div>
    ${dots}
  </div></div>`;
  return `<div class="onb"><div>
    <h1>Despre tine</h1>
    <p class="muted">${ctx.link.profile ? 'Am preluat ce știu aplicațiile tale. Verifică și completează.' : 'Din astea calculez caloriile și orele zilei.'}</p>
    ${profileFields(ctx.s.profile)}
    <div class="row"><button class="btn" data-act="oback">Înapoi</button><button class="btn go grow" data-act="odone">Construiește protocolul</button></div>
    ${dots}
  </div></div>`;
}

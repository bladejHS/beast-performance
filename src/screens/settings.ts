import { DISCLAIMER } from '../data/phases.ts';
import { REFS } from '../data/refs.gen.ts';
import { withDemo, withoutDemo } from '../logic/demo.ts';
import { backupText, empty as emptyState, parseBackup, type Level, type Profile, type Sex } from '../logic/store.ts';
import { num } from '../logic/util.ts';
import { ctx, actions, persist, render, toast } from '../ui/ctx.ts';
import { esc, head } from '../ui/parts.ts';
import { rotationPicker } from './protocol.ts';

actions['pf'] = (el) => {
  const input = el as HTMLInputElement, k = input.dataset['k'] as keyof Profile, p = ctx.s.profile as unknown as Record<string, unknown>;
  const text = input.type === 'time' || input.tagName === 'SELECT';
  const v = text ? input.value : num(input.value);
  if (k === 'bf') p[k] = v;
  else if (v != null && v !== '') p[k] = v;
  persist(); toast('Salvat');
};

actions['savekey'] = () => {
  ctx.s.ai.key = (document.getElementById('key') as HTMLInputElement).value.trim();
  persist(); render.now(); toast(ctx.s.ai.key ? 'Cheie salvată pe acest dispozitiv' : 'Cheie ștearsă');
};

actions['backup'] = () => {
  const url = URL.createObjectURL(new Blob([backupText(ctx.s)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url; a.download = `beast-performance-${ctx.today}.json`; a.click();
  URL.revokeObjectURL(url);
};

actions['restore'] = () => (document.getElementById('file') as HTMLInputElement).click();

actions['file'] = (el) => {
  const f = (el as HTMLInputElement).files?.[0];
  if (!f) return;
  void f.text().then((t) => {
    try {
      const key = ctx.s.ai.key;
      ctx.s = parseBackup(t);
      ctx.s.ai.key = key;
      persist(); render.now(); toast('Backup restaurat');
    } catch (e) { toast((e as Error).message); }
  });
};

actions['demo'] = () => {
  ctx.s = ctx.s.demo ? withoutDemo(ctx.s) : withDemo(ctx.s, ctx.today);
  persist(); render.now(); toast(ctx.s.demo ? 'Date de exemplu încărcate' : 'Date de exemplu șterse');
};

actions['wipe'] = (el) => {
  if (el.dataset['armed'] !== '1') { el.dataset['armed'] = '1'; el.textContent = 'Apasă din nou pentru a șterge tot'; return; }
  ctx.s = { ...emptyState(ctx.today), accepted: ctx.s.accepted };
  persist(); render.now(); toast('Date șterse');
};

const f = (k: keyof Profile, label: string, v: unknown, type = 'text') => `<div class="field"><label for="p-${k}">${esc(label)}</label><input id="p-${k}" ${type === 'time' ? 'type="time"' : 'inputmode="decimal"'} data-change="pf" data-k="${k}" value="${esc(String(v ?? '').replace('.', ','))}"></div>`;
const sel = (k: keyof Profile, label: string, v: string, opts: [string, string][]) => `<div class="field"><label for="p-${k}">${esc(label)}</label><select id="p-${k}" data-change="pf" data-k="${k}">${opts.map(([id, n]) => `<option value="${id}" ${id === v ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div>`;

export const profileFields = (p: Profile) => `
  <div class="fields">
    ${sel('sex', 'Sex', p.sex as Sex, [['m', 'Bărbat'], ['f', 'Femeie']])}
    ${f('age', 'Vârstă', p.age)}
    ${f('heightCm', 'Înălțime, cm', p.heightCm)}
    ${f('weightKg', 'Greutate, kg', p.weightKg)}
    ${f('bf', 'Grăsime corporală, %', p.bf)}
    ${sel('level', 'Experiență', p.level as Level, [['new', 'Începător'], ['mid', 'Intermediar'], ['adv', 'Avansat']])}
    ${f('commuteMin', 'Drum până la muncă, minute', p.commuteMin)}
    ${f('sleepNeed', 'Somn dorit, ore', p.sleepNeed)}
    ${sel('chronotype', 'Tipul tău', p.chronotype, [['early', 'Matinal'], ['mid', 'Intermediar'], ['late', 'Nocturn']])}
  </div>`;

export function settings(): string {
  const { s, link } = ctx;
  const conn = (ok: boolean, n: string, line: string) => `<li class="between" style="padding:8px 0"><span>${esc(n)}<span class="faint" style="display:block">${esc(line)}</span></span><span class="st ${ok ? 'st-good' : 'st-none'}"><i>${ok ? '●' : '○'}</i>${ok ? 'Conectat' : 'Fără date'}</span></li>`;
  return `
  ${head('overview', 'Setări', 'Profil, legături, date.')}
  <section class="panel stack"><h2>Schimburi</h2>${rotationPicker()}<a class="btn" href="#/protocol">Vezi banda de zile</a></section>
  <section class="panel"><h2>Profil</h2>${profileFields(s.profile)}</section>
  <section class="panel stack">
    <h2>Legături</h2>
    <ul class="rows">${conn(link.inner, 'Inner Beast', 'Planul de antrenament, somn, pași, greutate, sesiuni făcute')}${conn(link.nutrition, 'Beast Nutrition', 'Faza, calorii și proteine notate, apă. Planul rămâne acolo.')}</ul>
    <p class="faint">Se citesc automat dacă aplicațiile sunt deschise în același browser. Nu scriem nimic în ele.</p>
  </section>
  <section class="panel stack">
    <h2>Claude</h2>
    <p class="muted">Opțional. GitHub Pages nu are server, așa că browserul tău vorbește direct cu Anthropic, cu cheia ta. Plătești consumul tău. Cheia stă doar pe acest dispozitiv și nu intră în backup, dar orice cod de pe bladejhs.github.io o poate citi, deci folosește o cheie cu limită de cheltuieli.</p>
    <div class="field"><label for="key">Cheie API Anthropic</label><input id="key" type="password" autocomplete="off" value="${esc(s.ai.key)}" placeholder="sk-ant-..."></div>
    <button class="btn" data-act="savekey">Salvează cheia</button>
  </section>
  <section class="panel stack">
    <h2>Datele tale</h2>
    <p class="muted">Totul rămâne în acest browser. Ține un backup dacă îți schimbi telefonul.</p>
    <div class="row wrap"><button class="btn" data-act="backup">Descarcă backup</button><button class="btn" data-act="restore">Restaurează</button><input id="file" type="file" accept="application/json" data-change="file" hidden></div>
    <button class="btn" data-act="demo">${s.demo ? 'Șterge datele de exemplu' : 'Încarcă date de exemplu'}</button>
    ${s.demo ? '<p class="faint">Ștergerea scoate tot jurnalul și testele, inclusiv ce ai adăugat peste exemplu.</p>' : ''}
    <button class="btn danger" data-act="wipe">Șterge toate datele</button>
  </section>
  <section class="panel stack">
    <h2>Despre</h2>
    <p class="muted">${esc(DISCLAIMER)}</p>
    <a class="btn" href="#/surse">Surse (${REFS.length})</a>
    <p class="faint">Versiunea ${esc(__BUILD__)}.</p>
  </section>`;
}

export function sources(): string {
  return `
  ${head('hormones', 'Surse', 'Toate studiile și ghidurile citate în aplicație.')}
  <p class="muted" style="margin-bottom:6px">Fiecare link PubMed a fost verificat prin API-ul NCBI. Cifrele citate vin din rezumatele studiilor.</p>
  <ul class="faint" style="margin-bottom:12px"><li>A: meta-analize sau ghiduri</li><li>B: studii controlate</li><li>C: studii mici sau mecanism</li><li>D: practică de antrenor</li></ul>
  <ol class="rows">${REFS.map((r) => `<li style="padding:8px 0"><a href="${esc(r.u)}" target="_blank" rel="noopener"><b class="small">${esc(r.a)}, ${r.y}.</b> <span class="muted small">${esc(r.t)}. ${esc(r.j)}.</span></a></li>`).join('')}</ol>`;
}

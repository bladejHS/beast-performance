/* AI Health Intelligence has two levels. The local one answers from the app's own knowledge and needs no network.
   The Claude one is optional: with the user's own API key the browser calls the Anthropic API directly, because GitHub Pages has no server.
   The summary sent is the one shown in `contextFor`; nothing else leaves the device. */
import { BIOMARKERS } from '../data/biomarkers.ts';
import { HORMONES } from '../data/hormones.ts';
import { DOMAINS } from '../data/performance.ts';
import { PHASE } from '../data/phases.ts';
import { GUIDES, SHIFT } from '../data/shifts.ts';
import { SYMPTOMS } from '../data/symptoms.ts';
import type { Link } from './bridge.ts';
import { dayView } from './bridge.ts';
import { findings, phaseVerdict } from './insights.ts';
import { latest } from './labs.ts';
import { frame, phaseWeek, shiftOn } from './plan.ts';
import { avgOf, readiness, totalSleep } from './recovery.ts';
import { domainStates } from './score.ts';
import type { ChatMsg, State } from './store.ts';
import { addDays, fromMin, lastDays, strip } from './util.ts';

export const MODEL = 'claude-opus-5-5';

export interface LocalHit { title: string; text: string; href: string; score: number }

const words = (s: string) => strip(s).split(/[^a-z0-9-]+/).filter((w) => w.length > 2);

/** Plain keyword search over the knowledge base. */
export function searchKnowledge(q: string): LocalHit[] {
  const qw = words(q);
  if (!qw.length) return [];
  const hits: LocalHit[] = [];
  const score = (name: string, body: string) => {
    const n = strip(name), b = strip(body);
    let v = 0;
    for (const w of qw) { if (n.includes(w)) v += 5; else if (b.includes(w)) v += 1; }
    return v;
  };
  for (const h of HORMONES) {
    const v = score(`${h.n} ${h.en}`, `${h.what} ${h.goal} ${h.gain.join(' ')}`);
    if (v) hits.push({ title: h.n, text: `${h.goal} ${h.steps[0]?.t ?? ''}`, href: `#/hormoni/${h.id}`, score: v });
  }
  for (const b of BIOMARKERS) {
    const v = score(`${b.n} ${b.aliases.join(' ')}`, b.what);
    if (v) hits.push({ title: b.n, text: b.what, href: `#/analize/${b.id}`, score: v });
  }
  for (const y of SYMPTOMS) {
    const v = score(y.n, y.causes.join(' '));
    if (v) hits.push({ title: y.n, text: `Primul pas: ${y.fix[0] ?? ''}`, href: `#/jurnal/${y.id}`, score: v });
  }
  for (const g of GUIDES) {
    const v = score(`${g.n} schimb tura noapte`, `${g.hard} ${g.sleep} ${g.light} ${g.caffeine} ${g.food} ${g.train}`);
    if (v) hits.push({ title: g.n, text: `${g.hard} ${g.sleep}`, href: '#/protocol', score: v });
  }
  for (const d of DOMAINS) {
    const v = score(d.n, `${d.line} ${d.target}`);
    if (v) hits.push({ title: d.n, text: d.dose, href: `#/performanta/${d.id}`, score: v });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, 5);
}

/** The whole context the model sees: a short summary, never the raw journal. */
export function contextFor(s: State, link: Link, date: string): string {
  const p = s.profile, f = frame(s, date), next = lastDays(addDays(date, 7), 7).map((d) => SHIFT[shiftOn(s.roster, d)].short);
  const l = Object.values(latest(s)).filter((x) => x.reading.status !== 'none');
  const avg = (f: Parameters<typeof avgOf>[4]) => {
    const v = avgOf(s, link, date, 7, f);
    return v == null ? 'necunoscut' : v.toFixed(1);
  };
  const r = readiness(s, link, date);
  const fs = findings(s, link, date).slice(0, 8).map((f) => `- [${f.level}] ${f.title}: ${f.seen}`);
  const dom = domainStates(s, link, date).filter((d) => d.score != null).map((d) => `${d.n} ${d.score}/100`);
  const sym = Object.entries(dayView(s, link, date).sym ?? {}).map(([k, v]) => `${k}:${v}`);
  return [
    `Profil: ${p.sex === 'm' ? 'bărbat' : 'femeie'}, ${p.age} ani, ${p.heightCm} cm, ${p.weightKg} kg, grăsime ${p.bf ?? 'necunoscută'}%, nivel ${p.level}.`,
    `Fază: ${PHASE[s.phase.id].n}, săptămâna ${phaseWeek(s, date)}.`,
    `Azi: ${SHIFT[f.shift].n}, ${SHIFT[f.shift].label}. Trezire ${fromMin(f.wake)}, somn ${fromMin(f.bed)}, a dormit înainte ${(f.sleepMin / 60).toFixed(1)} ore. Următoarele 7 zile: ${next.join(', ')}.`,
    `Medii 7 zile: somn ${avg(totalSleep)} h, stres ${avg((d) => d.stress)}/5, energie ${avg((d) => d.energy)}/5, pași ${avg((d) => d.steps)}.`,
    `Disponibilitate azi: ${r ? `${r.score}/100` : 'necunoscută'}.`,
    `Domenii de performanță: ${dom.join(', ') || 'fără teste'}.`,
    `Analize recente: ${l.slice(0, 40).map((x) => `${x.id}=${x.value} ${x.unit} (${x.reading.status}, ${x.date})`).join('; ') || 'niciuna'}.`,
    `Simptome azi: ${sym.join(', ') || 'niciunul'}.`,
    `Zile în jurnal, ultimele 30: ${lastDays(date, 30).filter((d) => s.days[d]).length}.`,
    `Verdict de fază: ${phaseVerdict(s, link, date).title}.`,
    'Observații:', ...(fs.length ? fs : ['- niciuna']),
  ].join('\n');
}

export const SYSTEM = `Ești analistul din Beast Performance, o aplicație personală de performanță și sănătate hormonală, pentru un sportiv natural.
Răspunzi în română, simplu, pentru cineva care nu știe ce face fiecare hormon: mai întâi ce să facă, apoi de ce.
Obiectivul lui este performanță maximă în toate domeniile: definire, forță, masă, condiționare, viteză, recuperare, sănătate.
Lucrează în trei schimburi: 06:00–14:00, 14:00–22:00, 22:00–06:00. Ține cont de schimb la orice sfat despre somn, lumină, cafea și ora antrenamentului.
Planul de mâncare și macronutrienții sunt în Beast Nutrition, planul de antrenament e în Inner Beast. Nu construi alte planuri: spui doar ce să ajusteze în ele.
Reguli:
- Folosește datele din context. Dacă o informație lipsește, spune ce trebuie măsurat.
- Separă ce arată studiile de ce e practică de antrenor. Nu inventa cifre sau studii.
- Nu pui diagnostice. Când un rezultat cere un medic, spui asta clar și spui ce fel de medic.
- Nu recomanzi anabolizanți, SARMs, peptide, T3, clenbuterol, DNP, EPO, nici doze de medicamente.
- Ține-te de limitele EFSA la suplimente: vitamina D 4.000 UI, zinc 25 mg, magneziu din suplimente 250 mg, cafeină 200 mg pe doză și 400 mg pe zi.
- Maximum 200 de cuvinte, doar dacă nu ți se cere mai mult.`;

export type AiResult = { ok: true; text: string } | { ok: false; error: string };

/** Streams the answer. The SDK is loaded only when the user actually asks, so the app stays light without a key. */
export async function askClaude(key: string, context: string, chat: ChatMsg[], onText: (full: string) => void): Promise<AiResult> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  // Browser calls are safe here only because the key is the user's own and stays on the user's device.
  const client = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true });
  const messages = chat.slice(-12).map((m) => ({ role: m.role, content: m.text }));
  const first = messages[0];
  if (first?.role === 'user') first.content = `Datele mele:\n${context}\n\nÎntrebare: ${first.content}`;
  try {
    let text = '';
    const stream = client.beta.messages.stream({
      model: MODEL, max_tokens: 8000, system: SYSTEM, messages,
      thinking: { type: 'adaptive' }, output_config: { effort: 'medium' },
      betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',
    });
    stream.on('text', (delta) => { text += delta; onText(text); });
    const final = await stream.finalMessage();
    if (final.stop_reason === 'refusal') return { ok: false, error: 'Modelul a refuzat cererea. Reformulează întrebarea.' };
    return { ok: true, text };
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return { ok: false, error: 'Cheia API nu e validă. Verifică-o în Setări.' };
    if (e instanceof Anthropic.RateLimitError) return { ok: false, error: 'Prea multe cereri. Încearcă peste un minut.' };
    if (e instanceof Anthropic.APIConnectionError) return { ok: false, error: 'Nu am putut ajunge la Anthropic. Verifică internetul.' };
    if (e instanceof Anthropic.APIError) return { ok: false, error: `Eroare de la API (${e.status ?? 'necunoscut'}).` };
    return { ok: false, error: 'Cererea a eșuat. Încearcă din nou.' };
  }
}

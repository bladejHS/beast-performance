import { askClaude, contextFor, MODEL, searchKnowledge } from '../logic/ai.ts';
import { correlations, findings, phaseVerdict } from '../logic/insights.ts';
import { domainStates, nextFocus } from '../logic/score.ts';
import { ctx, actions, persist, render, toast } from '../ui/ctx.ts';
import { esc, head, hormoneTags, plain, status } from '../ui/parts.ts';

const LEVEL = { urgent: ['urgent', 'Acum'], act: ['act', 'Prioritar'], watch: ['watch', 'De urmărit'], good: ['good', 'În regulă'] } as const;
const QUICK = ['De ce sunt obosit?', 'Ce fac cu testosteronul?', 'Cum îmi cresc VO2max?', 'Cum scap de foame în cut?'];
let busy = false;

function reply(q: string) {
  const hits = searchKnowledge(q);
  if (!hits.length) return 'Nu am găsit asta în baza locală. Încearcă numele unui hormon, al unei analize sau al unui simptom. Cu o cheie Anthropic din Setări pot răspunde la orice întrebare.';
  return hits.map((h) => `${h.title}: ${h.text}`).join('\n\n');
}

async function send(q: string) {
  const text = q.trim();
  if (!text || busy) return;
  const { s, link, today } = ctx;
  s.ai.chat.push({ role: 'user', text });
  if (!s.ai.key) {
    s.ai.chat.push({ role: 'assistant', text: reply(text), source: 'local' });
    persist(); render.now();
    return;
  }
  busy = true;
  const answer = { role: 'assistant' as const, text: '', source: 'claude' as const };
  const history = s.ai.chat.slice();
  s.ai.chat.push(answer);
  render.now();
  const res = await askClaude(s.ai.key, contextFor(s, link, today), history, (full) => {
    answer.text = full;
    const el = document.querySelector('.msg.ai:last-of-type');
    if (el) el.textContent = full;
  });
  busy = false;
  if (res.ok) answer.text = res.text;
  else { answer.text = res.error; }
  persist(); render.now();
}

actions['ask'] = () => {
  const input = document.getElementById('ask') as HTMLInputElement;
  const q = input.value;
  input.value = '';
  void send(q);
};
actions['quick'] = (el) => { void send(el.dataset['q'] ?? ''); };
actions['clearchat'] = () => { ctx.s.ai.chat = []; persist(); render.now(); toast('Conversație ștearsă'); };
actions['showctx'] = () => {
  const el = document.getElementById('ctxbox');
  if (el) { el.hidden = !el.hidden; el.textContent = contextFor(ctx.s, ctx.link, ctx.today); }
};

export function ai(): string {
  const { s, link, today } = ctx;
  const fs = findings(s, link, today), v = phaseVerdict(s, link, today), cs = correlations(s, link, today).slice(0, 5);
  const focus = nextFocus(domainStates(s, link, today));
  const urgent = fs.filter((f) => f.level === 'urgent');
  return `
  ${head('ai', 'AI Health Intelligence', 'Îți citește datele și îți spune ce să faci, în ordine.')}
  ${urgent.length ? `<section class="panel stack">${urgent.map((f) => `${status('urgent', f.title)}<p class="muted">${esc(f.do[0] ?? '')}</p>`).join('')}</section>` : ''}
  <div class="two">
    <section class="panel stack"><h2>Verdict de fază</h2><h3>${esc(v.title)}</h3><p class="muted">${esc(v.body)}</p><a class="btn" href="#/protocol">Vezi faza</a></section>
    <section class="panel stack"><h2>Următorul bloc</h2>${focus ? `<h3>${esc(focus.n)}, ${focus.score}/100</h3><p class="muted">E cel mai slab domeniu măsurat. Pune-l în doza de progres și ține-le pe celelalte în menținere.</p><a class="btn" href="#/performanta/${focus.id}">Deschide protocolul</a>` : '<p class="muted">Introdu teste la cel puțin 3 domenii.</p><a class="btn" href="#/performanta">Mergi la teste</a>'}</section>
  </div>
  <section>
    <h2>Ce am observat</h2>
    ${fs.length ? `<ol class="rows">${fs.filter((f) => f.level !== 'urgent').map((f) => `<li class="find" style="padding:11px 0">${status(LEVEL[f.level][0], LEVEL[f.level][1])}<h3>${esc(f.title)}</h3><p class="faint">${esc(f.seen)}</p><p class="muted">${esc(f.why)}</p>${f.do.length ? plain(f.do) : ''}${f.hormones ? hormoneTags(f.hormones) : ''}${f.link ? `<a class="small" style="text-decoration:underline;margin-top:4px" href="${f.link}">Detalii</a>` : ''}</li>`).join('')}</ol>` : '<p class="muted">Am nevoie de câteva zile de jurnal sau de analize. Începe cu un check-in.</p>'}
  </section>
  <section>
    <h2>Tipare în datele tale</h2>
    ${cs.length ? `<ul class="rows">${cs.map((c) => `<li style="padding:9px 0"><b>${esc(c.line)}</b><div class="faint">Legătură ${Math.abs(c.r) >= 0.6 ? 'puternică' : 'moderată'} în ${c.n} zile. Arată o asociere, nu o cauză.</div></li>`).join('')}</ul>` : '<p class="muted">Apar după minimum 14 zile cu aceleași date notate.</p>'}
  </section>
  <section>
    <div class="between"><h2>Întreabă</h2>${s.ai.chat.length ? '<button class="btn quiet" data-act="clearchat">Șterge</button>' : ''}</div>
    <p class="faint" style="margin-bottom:8px">${s.ai.key ? `Răspunde Claude (${MODEL}), cu un rezumat al datelor tale.` : 'Răspunde baza locală, fără internet. Pentru răspunsuri libere, adaugă o cheie Anthropic în Setări.'}</p>
    <div class="chat">${s.ai.chat.slice(-10).map((m) => `<div class="msg ${m.role === 'user' ? 'me' : 'ai'}">${esc(m.text)}</div>`).join('')}</div>
    <div class="chips" style="margin:10px -16px 0">${QUICK.map((q) => `<button class="chip" data-act="quick" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>
    <div class="askrow"><label class="sr" for="ask">Întrebarea ta</label><input id="ask" class="inp" data-enter="ask" placeholder="Scrie o întrebare"><button class="btn go" data-act="ask">Trimite</button></div>
    ${s.ai.key ? '<button class="btn quiet" style="margin-top:6px" data-act="showctx">Vezi ce date se trimit</button><pre id="ctxbox" class="fix small" style="white-space:pre-wrap" hidden></pre>' : ''}
    <p class="faint" style="margin-top:8px">Nu pune diagnostice. Pentru un rezultat îngrijorător, mergi la medic.</p>
  </section>`;
}

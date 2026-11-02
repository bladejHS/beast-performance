import { PHASE } from '../data/phases.ts';
import { findings } from '../logic/insights.ts';
import { statusCounts, STATUS } from '../logic/labs.ts';
import { targets } from '../logic/plan.ts';
import { avgEA, avgOf, readiness, series, weightTrend, ZONE } from '../logic/recovery.ts';
import { balance, domainStates, hormoneStates, scoreStatus, systemStates } from '../logic/score.ts';
import { fmt, dateLabel } from '../logic/util.ts';
import { ctx } from '../ui/ctx.ts';
import { emblem, empty, esc, meter, ring, spark, status } from '../ui/parts.ts';

const LEVEL = { urgent: 'urgent', act: 'act', watch: 'watch', good: 'good' } as const;

export function overview(): string {
  const { s, link, today } = ctx;
  const states = hormoneStates(s, link, today);
  const sys = systemStates(states);
  const tg = targets(s, link, today);
  const fs = findings(s, link, today).slice(0, 3);
  const r = readiness(s, link, today);
  const sleep = avgOf(s, link, today, 7, (d) => d.sleepH);
  const trend = weightTrend(s, link, today);
  const ea = avgEA(s, link, today);
  const bal = balance(s, link, today);
  const counts = statusCounts(s);
  const domains = domainStates(s, link, today);
  const tally = { good: 0, watch: 0, act: 0, urgent: 0, none: 0 };
  for (const x of states) tally[x.status]++;
  const blood = states.filter((x) => x.source === 'blood').length, habits = states.filter((x) => x.source === 'habits').length;

  const stat = (label: string, value: string, sub: string, sp: string, href: string) => `<a class="panel stat" href="${href}"><small>${esc(label)}</small><b>${value}</b><small>${esc(sub)}</small>${sp}</a>`;
  const sparkOf = (f: Parameters<typeof series>[4], color?: string) => spark(series(s, link, today, 21, f).map((x) => x.v), color);

  return `
  <div class="ov">
    <div>
      <div class="ringbox">${ring(states)}<img class="wolf" src="${emblem()}" alt="" width="680" height="801"></div>
      <div class="ringcap">${(['good', 'watch', 'act', 'none'] as const).filter((k) => tally[k]).map((k) => status(k, `${tally[k]} ${STATUS[k].n.toLowerCase()}`)).join('')}</div>
      <p class="faint" style="text-align:center;margin-top:4px">${blood + habits ? `${blood ? `${blood} din analize, ` : ''}${habits} estimați din obiceiuri. Atinge un segment pentru hormon.` : 'Fiecare segment e un hormon. Se aprind pe măsură ce notezi și adaugi analize.'}</p>
    </div>
    <div class="stack">
      <p class="muted">${esc(dateLabel(today))}</p>
      <h1>Health Overview</h1>
      <p class="muted"><b style="color:var(--t1)">${esc(PHASE[s.phase.id].n)}, săptămâna ${tg.week}.</b> ${esc(PHASE[s.phase.id].line)}</p>
      <section>
        <h2>Ce contează azi</h2>
        ${fs.length ? `<ol class="prio">${fs.map((f) => `<li><a class="panel" href="${f.link ?? '#/ai'}" style="display:block">${status(LEVEL[f.level], f.level === 'urgent' ? 'Acum' : f.level === 'act' ? 'Prioritar' : f.level === 'watch' ? 'De urmărit' : 'În regulă')}<div class="ttl">${esc(f.title)}</div><div class="faint">${esc(f.do[0] ?? f.seen)}</div></a></li>`).join('')}</ol>` : empty('Începe cu primul check-in', 'Două minute dimineața: somn, stres, energie. Din ele apar prioritățile.', '#/jurnal', 'Fă check-in')}
      </section>
      <a class="btn go" href="#/protocol">Deschide protocolul de azi</a>
    </div>
  </div>

  ${bal ? `<section class="panel"><div class="between"><h3>Încărcare și recuperare</h3><span class="faint">${bal.value < -10 ? 'Încărcarea câștigă' : bal.value > 10 ? 'Ai rezervă' : 'În echilibru'}</span></div>
    <div class="balance" role="img" aria-label="Încărcare ${bal.drive}, recuperare ${bal.repair}"><i style="left:${50 + bal.value / 2}%"></i></div>
    <div class="between small muted"><span>Stres, antrenament, deficit</span><span>Somn, refacere</span></div></section>` : ''}

  <section class="stats" aria-label="Valori cheie">
    ${stat('Disponibilitate azi', r ? String(r.score) : '–', r ? ZONE[r.zone].n : 'Fără check-in', sparkOf((d) => d.hrv, 'var(--sky)'), '#/recuperare')}
    ${stat('Somn, media pe 7 zile', sleep != null ? `${fmt(sleep, 1)} h` : '–', sleep != null && sleep < 7.5 ? 'Ținta: 7,5–9 ore' : 'Ținta: 7,5–9 ore', sparkOf((d) => d.sleepH), '#/recuperare')}
    ${stat('Greutate', trend ? `${fmt(trend.avg, 1)} kg` : '–', trend?.pct != null ? `${trend.pct > 0 ? '+' : ''}${fmt(trend.pct, 2)}% pe săptămână` : 'Media pe 7 zile', sparkOf((d) => d.weight), '#/recuperare')}
    ${stat('Energie disponibilă', ea != null ? fmt(ea, 0) : '–', ea != null ? 'kcal/kg masă slabă' : 'Necesită calorii', '', '#/protocol')}
  </section>

  <div class="two">
    <section><h2>Cele nouă sisteme</h2><ul class="bars">${sys.map((x) => `<li><a href="#/sisteme"><span class="blab">${esc(x.short)}</span>${meter(x.score, x.status)}<span class="num tab" style="text-align:right">${x.score ?? '–'}</span></a></li>`).join('')}</ul></section>
    <section><h2>Performanță</h2><ul class="bars">${domains.map((d) => `<li><a href="#/performanta/${d.id}"><span class="blab">${esc(d.n)}</span>${meter(d.score, d.score == null ? 'none' : scoreStatus(d.score))}<span class="num tab" style="text-align:right">${d.score ?? '–'}</span></a></li>`).join('')}</ul></section>
  </div>

  <section>
    <h2>Ultimele analize</h2>
    ${counts.good + counts.watch + counts.act + counts.urgent
      ? `<a class="panel row wrap" href="#/analize">${status('good', `${counts.good} optim`)} ${status('watch', `${counts.watch} de urmărit`)} ${status('act', `${counts.act} de corectat`)} ${counts.urgent ? status('urgent', `${counts.urgent} la medic`) : ''}</a>`
      : empty('Nu ai analize introduse', 'Lipește rezultatele și primești, pentru fiecare valoare, ce înseamnă și ce faci.', '#/analize/adauga', 'Adaugă analize')}
  </section>`;
}

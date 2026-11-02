/* Reads the Inner Beast week and says what it covers, domain by domain, with the same doses the studies use.
   It does not change the plan: the plan stays in Inner Beast. */
import type { DomainId } from '../data/performance.ts';
import type { Link, PlanSession } from './bridge.ts';
import { weekPlan } from './plan.ts';

export type Cover = 'good' | 'watch' | 'act' | 'none';
export interface DomainCover { id: DomainId; min: number; sessions: string[]; level: Cover; note: string }

const LEGS = /leg|squat|lunge|wall sit/i;

/** Which domains a session feeds. */
export function domainsOf(x: PlanSession): DomainId[] {
  switch (x.kind) {
    case 'workout': case 'amrap': return ['strength', 'muscle'];
    case 'run': case 'row': case 'race': return ['conditioning'];
    case 'walk': return ['health', 'recovery'];
    case 'routine': return ['mobility'];
    case 'shower': return ['recovery'];
    case 'wimhof': case 'breath': return ['recovery', 'focus'];
    case 'rounds':
      if (x.focus === 'slow' || x.focus === 'distance') return ['focus'];
      if (x.focus === 'legs') return ['strength', 'conditioning'];
      if (x.focus === 'power' || x.focus === 'rope' || x.focus === 'ladder') return ['speed', 'conditioning'];
      return ['conditioning', 'speed'];
    default: return [];
  }
}

export function audit(link: Link): DomainCover[] {
  const week = weekPlan(link).flat();
  const of = (id: DomainId) => {
    const list = week.filter((x) => domainsOf(x).includes(id));
    return { min: list.reduce((a, x) => a + x.min, 0), sessions: [...new Set(list.map((x) => x.name))] };
  };
  const row = (id: DomainId, level: (min: number) => [Cover, string]): DomainCover => {
    const c = of(id), [lv, note] = level(c.min);
    return { id, ...c, level: lv, note };
  };
  const legs = week.filter((x) => LEGS.test(x.name)).reduce((a, x) => a + x.min, 0);
  return [
    row('strength', (m) => (m >= 120 ? [legs >= 45 ? 'good' : 'watch', legs >= 45 ? 'Volum bun.' : 'Trunchiul e bine acoperit. Picioarele au puțină încărcare: forța lor e cea care se transferă în sprint.'] : ['act', 'Sub 2 ore pe săptămână.'])),
    row('muscle', (m) => (m >= 120 ? ['good', 'Sesiuni separate pentru împins și tras, de câte o dată pe săptămână. Studiile arată mai mult câștig cu fiecare grupă de 2 ori pe săptămână.'] : ['watch', 'Volum mic pentru hipertrofie.'])),
    row('conditioning', (m) => (m >= 90 ? ['good', 'Rundele de box dau intensitate mare. Lipsește zona 2 lungă, dacă vrei VO2max mai mare.'] : ['watch', 'Puține minute de efort.'])),
    row('speed', (m) => (m > 0 ? ['watch', 'Rundele și coarda lucrează viteza brațelor și a picioarelor. Nu există sprinturi cu pauză completă.'] : ['act', 'Lipsesc sprinturile și săriturile.'])),
    row('recovery', (m) => (m > 0 ? ['good', 'Zi liberă, duș alternativ, Wim Hof și mobilitate.'] : ['watch', 'Fără zi de recuperare.'])),
    row('mobility', (m) => (m >= 30 ? ['good', 'Întindere înainte de calistenie și o zi de mobilitate.'] : ['watch', 'Puțină mobilitate.'])),
    row('focus', (m) => (m > 0 ? ['good', 'Meditație, respirație și box tehnic.'] : ['watch', 'Fără practică mentală.'])),
  ];
}

/* The four phases and the safety rules that apply to all of them. */
import type { PhaseId } from './systems.ts';

export interface Phase {
  id: PhaseId; n: string; line: string; goal: string; length: string;
  recover: string[]; hormones: string; exit: string[]; blood: string; honest: string; refs: string[];
}

export const PHASES: Phase[] = [
  { id: 'cut', n: 'Cut', line: 'Pierzi grăsime, păstrezi mușchiul și forța.', goal: 'Definire maximă fără să dărâmi hormonii.', length: '8–14 săptămâni, cu pauze',
    recover: ['Somn 8–9 ore în 24 de ore, cu un somn scurt pe schimbul de noapte.', 'Fără stimulente pentru a compensa oboseala.', 'Deload la 4–6 săptămâni.'],
    hormones: 'Scad normal leptina, T3, testosteronul și IGF-1, cresc grelina și foamea. Nu e o boală, dar e semnalul că ai un timp limitat în deficit.',
    exit: ['Ai ajuns la țintă.', 'Disponibilitatea energetică sub 25 kcal/kg FFM mai mult de 2 săptămâni.', 'Forța a scăzut peste 10%.', 'Libido absent, somn stricat, frig constant.', 'Sub 10% grăsime la bărbați sau sub 18% la femei, fără un motiv competițional.', 'La femei: ciclul dispare.'],
    blood: 'Testează cu 4 săptămâni înainte de a începe. La final, așteaptă 3–4 săptămâni la menținere.',
    honest: 'Pauzele de dietă nu au schimbat hormonii la sportivi în studiul ICECAP, dar au redus foamea. Refeed-urile de 2 zile au păstrat mai bine masa slabă într-un studiu pe oameni antrenați.',
    refs: ['helms2014', 'helms2014b', 'garthe2011', 'peos2021', 'campbell2020', 'dietbreak2025', 'mountjoy2023', 'fagerberg2018', 'nedeltcheva2010'] },
  { id: 'reverse', n: 'Reverse diet', line: 'Revii la menținere, cu grijă, după un cut.', goal: 'Hormonii revin, foamea scade, grăsimea nu explodează.', length: '3–8 săptămâni',
    recover: ['Somn 8+ ore.', 'E faza în care sistemul nervos își revine.'],
    hormones: 'Leptina, T3, testosteronul și libidoul revin. Greutatea crește întâi din apă și glicogen, nu din grăsime.',
    exit: ['Ai ajuns la menținerea estimată.', 'Greutatea e stabilă 2 săptămâni.', 'Energia și libidoul au revenit.'],
    blood: 'Fă analizele după 6–8 săptămâni de la sfârșitul deficitului.',
    honest: 'Nu există un studiu controlat care să arate că reverse diet aduce metabolismul peste nivelul normal. Îl folosim pentru control și pentru a evita mâncatul haotic. Layne Norton, autorul metodei din Beast Nutrition, recunoaște că datele sunt puține.',
    refs: ['trexler2014', 'fagerberg2018', 'rossow2013'] },
  { id: 'bulk', n: 'Lean bulk', line: 'Construiești mușchi și forță cu grăsime minimă.', goal: 'Masă și recorduri, cu talia sub control.', length: '12–24 de săptămâni',
    recover: ['Somn 8 ore în 24 de ore.', 'Fără băi reci în 4–6 ore după forță.'],
    hormones: 'Testosteronul, IGF-1 și T3 sunt sus. Urmărește insulina, trigliceridele, ApoB și tensiunea: surplusul mare le strică.',
    exit: ['Peste 15–18% grăsime la bărbați sau 25–28% la femei.', 'Talia a crescut peste 4 cm.', 'Forța nu mai crește de 4 săptămâni.', 'Glicemia, tensiunea sau ApoB se înrăutățesc.'],
    blood: 'Testează la mijlocul blocului dacă ai ApoB sau glicemia la limită.',
    honest: 'Surplusul exact nu e stabilit. Peste un anumit punct, caloriile în plus devin grăsime, nu mușchi.',
    refs: ['iraki2019', 'slater2019', 'schoenfeld2017', 'schoenfeld2016f', 'morton2018'] },
  { id: 'maintain', n: 'Menținere', line: 'Mănânci cât consumi și construiești performanță.', goal: 'Cea mai bună fază pentru motor, viteză, analize și sănătate.', length: '4–12 săptămâni între blocuri',
    recover: ['Somn 7,5–9 ore.', 'Deload la 4–8 săptămâni.'],
    hormones: 'Toate axele sunt în repaus și se refac. Analizele spun acum adevărul despre tine.',
    exit: ['Ai făcut analizele și testele.', 'Ești odihnit și vrei un nou obiectiv.'],
    blood: 'Faza ideală pentru analize complete.',
    honest: 'Începătorii pot câștiga mușchi și pierde grăsime la menținere. Avansații progresează mai ales prin blocuri.',
    refs: ['schwingshackl2014', 'bosquet2007', 'bell2023'] },
];

export const PHASE = Object.fromEntries(PHASES.map((p) => [p.id, p])) as Record<PhaseId, Phase>;

/** Any of these beats any protocol in this app. */
export const RED_FLAGS: string[] = [
  'Durere în piept, leșin sau lipsă de aer la efort mic',
  'Slăbiciune bruscă pe o parte a corpului sau vorbire încurcată',
  'Vărsături cu sânge sau scaun negru',
  'Durere de cap violentă, bruscă, sau cu tulburări de vedere',
  'Urină închisă la culoare după efort, cu dureri musculare mari',
  'Nodul în testicul sau în sân',
  'Sete extremă și urinat foarte des, cu scădere în greutate',
  'Gânduri de autovătămare sau restricție alimentară pe care nu o poți opri',
  'Ai adormit la volan sau ai fost aproape de un accident după schimb',
];

export const DISCLAIMER = 'Beast Performance e un instrument educațional. Nu pune diagnostice și nu înlocuiește medicul. Intervalele sunt orientative: are prioritate intervalul laboratorului tău.';
